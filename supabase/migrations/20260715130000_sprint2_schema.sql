-- Sprint 2: data-source / skip-tracing config moved to the client
-- (companies) level, texting tiers, package pricing, upsells, and a
-- computed commission RPC replacing the old manual commissions table.
--
-- campaign_services.source_type/service_type (Sprint 1) modeled "who
-- supplies the data" and "which data package" per individual service.
-- That's wrong: a client's data-sourcing arrangement is a single
-- decision covering every service they're subscribed to, not something
-- that varies service-by-service. This migration moves that decision up
-- to companies, and splits it into two independent RES/self-provided
-- decisions a client can mix: who supplies the raw data, and who does
-- skip tracing on it.

-- Enums -------------------------------------------------------------------

create type public.provider_type as enum ('res', 'self_provided');
create type public.data_source_tier as enum ('package', 'payg', 'legacy');
create type public.skip_trace_rate_tier as enum ('0.09', '0.07', '0.0525', 'custom');
create type public.texting_tier as enum ('50k', '75k', '100k');
create type public.upsell_type as enum (
  'add_cc_seat',
  'add_texting_service',
  'dwy_lm',
  'dfy_lm',
  'texting_package_upgrade'
);

-- companies -------------------------------------------------------------
-- data_source_type/tier: who supplies the raw calling/texting data, and
--   (if res) which data package tier. tier is only meaningful when
--   data_source_type = 'res' (excluded from commission when 'legacy').
-- skip_tracing_type/rate: who does skip tracing, and (if res) at what
--   rate. rate_tier is a closed set of 3 standard rates plus 'custom'
--   for a manually entered rate; skip_trace_rate is the numeric value
--   actually used in commission math (auto-set from rate_tier unless
--   rate_tier = 'custom', enforced by trigger below).

alter table public.companies
  add column data_source_type public.provider_type,
  add column data_source_tier public.data_source_tier,
  add column skip_tracing_type public.provider_type,
  add column skip_trace_rate_tier public.skip_trace_rate_tier,
  add column skip_trace_rate numeric;

-- Backfill from the existing per-service source_type/service_type
-- (still present on campaign_services at this point in the migration).
-- 2 of 8 companies in current data have conflicting values across their
-- services (a res/pro cold_calling row alongside a self_provided
-- texting row) — preferring the cold_calling row's value to resolve,
-- per explicit confirmation for Coastal Property Group / Golden Gate
-- Acquisitions.
update public.companies c
set data_source_type = sub.source_type::text::public.provider_type,
    data_source_tier = case
      when sub.source_type = 'self_provided' then null
      when sub.service_type = 'legacy' then 'legacy'::public.data_source_tier
      when sub.service_type = 'payg' then 'payg'::public.data_source_tier
      else 'package'::public.data_source_tier
    end
from (
  select distinct on (cs.company_id)
    cs.company_id, cs.source_type, cs.service_type
  from public.campaign_services cs
  order by cs.company_id, (cs.type = 'cold_calling') desc, cs.created_at
) sub
where sub.company_id = c.id;

-- No prior skip-tracing concept existed (data_lists had 0 rows before
-- this migration) — default every existing company to res / $0.07 as a
-- starting point; adjust per-client once the settings UI exists.
update public.companies
set skip_tracing_type = 'res',
    skip_trace_rate_tier = '0.07',
    skip_trace_rate = 0.07
where skip_tracing_type is null;

alter table public.companies
  alter column data_source_type set not null,
  alter column skip_tracing_type set not null;

alter table public.companies
  add constraint companies_data_source_tier_chk
    check ((data_source_type = 'res') = (data_source_tier is not null)),
  add constraint companies_skip_trace_rate_chk
    check ((skip_tracing_type = 'res') = (skip_trace_rate_tier is not null and skip_trace_rate is not null));

-- skip_trace_rate is a hardcoded lookup from skip_trace_rate_tier,
-- except 'custom' where the caller-supplied numeric value is kept as-is.
create or replace function public.set_company_skip_trace_rate()
returns trigger
language plpgsql
as $$
begin
  if new.skip_trace_rate_tier is not null and new.skip_trace_rate_tier <> 'custom' then
    new.skip_trace_rate := new.skip_trace_rate_tier::text::numeric;
  end if;
  return new;
end;
$$;

create trigger companies_set_skip_trace_rate
  before insert or update of skip_trace_rate_tier on public.companies
  for each row execute function public.set_company_skip_trace_rate();

-- campaign_services -----------------------------------------------------
-- Drop the old per-service source_type/service_type — superseded by the
-- company-level fields above. texting_tier/package_price stay per-service
-- since price and texting package size genuinely vary by service.

alter table public.campaign_services
  drop column source_type,
  drop column service_type;

drop type public.source_type;
drop type public.service_tier;

alter table public.campaign_services
  add column texting_tier public.texting_tier,
  add column package_price numeric;

alter table public.campaign_services
  add constraint campaign_services_texting_tier_requires_texting_chk
  check (texting_tier is null or type = 'texting');

-- data_lists ----------------------------------------------------------------
-- records_skip_traced may be less than records_accepted (client chooses
-- how many to skip trace). skip_trace_rate defaults to the company's
-- configured rate (applied by the data-list-entry form) but remains a
-- per-list numeric snapshot, editable for one-off discounts — this also
-- means past months' commissions aren't retroactively changed if a
-- company's rate changes later.

alter table public.data_lists
  add column records_skip_traced int,
  add column skip_trace_rate numeric not null default 0.07;

alter table public.data_lists
  add constraint data_lists_skip_traced_le_accepted_chk
  check (records_skip_traced is null or records_skip_traced <= records_accepted);

-- upsells ---------------------------------------------------------------
-- campaign_service_id is nullable only for 'add_texting_service', where
-- the campaign_services row doesn't exist yet at the moment the upsell is
-- logged — it's backfilled once the new service row is created.

create table public.upsells (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  campaign_service_id uuid references public.campaign_services (id),
  csr_id uuid not null references public.users (id),
  upsell_type public.upsell_type not null,
  quantity int not null default 1,
  unit_amount numeric not null,
  total_amount numeric generated always as (quantity * unit_amount) stored,
  from_tier text,
  to_tier text,
  notes text,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index upsells_company_id_idx on public.upsells (company_id);
create index upsells_csr_id_idx on public.upsells (csr_id);
create index upsells_campaign_service_id_idx on public.upsells (campaign_service_id);

-- unit_amount is a hardcoded lookup by upsell_type, never client-supplied.
-- Enforced here (not just in application code) so it holds even for a
-- direct table write.

create or replace function public.set_upsell_unit_amount()
returns trigger
language plpgsql
as $$
begin
  new.unit_amount := case new.upsell_type
    when 'add_cc_seat' then 100
    when 'add_texting_service' then 150
    when 'dwy_lm' then 150
    when 'dfy_lm' then 200
    when 'texting_package_upgrade' then 75
  end;
  return new;
end;
$$;

create trigger upsells_set_unit_amount
  before insert or update of upsell_type on public.upsells
  for each row execute function public.set_upsell_unit_amount();

-- commissions ---------------------------------------------------------------
-- Replaced by a computed RPC (below). The table has never held data
-- (0 rows) — dropping outright rather than leaving an unused table.

drop table public.commissions;
drop type public.commission_type;

-- get_commissions -----------------------------------------------------------
-- Monthly commission per CSR, computed from that CSR's campaign_services'
-- data_lists whose list_date falls in the given month, plus that CSR's
-- upsells logged (created_at) in the given month.
--
-- Two independent commission terms per data_lists row, gated by the
-- parent company's data-sourcing config:
--   data term       = 0.02 * package_price
--                      only if data_source_type = 'res' and
--                      data_source_tier is distinct from 'legacy'
--   skip trace term = 0.03 * records_skip_traced * skip_trace_rate
--                      only if data_source_type = 'res' AND
--                      skip_tracing_type = 'res' — RES skip tracing on
--                      client-supplied data does not commission.
--
-- security definer so it can read across all CSRs' rows regardless of
-- caller; access is filtered inside the query instead: csr sees only
-- their own row, tl/hod/admin/sysadmin see every CSR's row.

create or replace function public.get_commissions(p_month date)
returns table (
  csr_id uuid,
  csr_name text,
  data_commission numeric,
  upsell_commission numeric,
  total_commission numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with month_bounds as (
    select date_trunc('month', p_month)::date as start_date,
           (date_trunc('month', p_month) + interval '1 month')::date as end_date
  ),
  data_comm as (
    select cs.assigned_csr_id as csr_id,
           sum(
             case when co.data_source_type = 'res' and co.data_source_tier is distinct from 'legacy'
                  then 0.02 * coalesce(cs.package_price, 0)
                  else 0
             end
             +
             case when co.data_source_type = 'res' and co.skip_tracing_type = 'res'
                  then 0.03 * coalesce(dl.records_skip_traced, 0) * coalesce(dl.skip_trace_rate, 0)
                  else 0
             end
           ) as amount
    from public.data_lists dl
    join public.campaign_services cs on cs.id = dl.campaign_service_id
    join public.companies co on co.id = cs.company_id
    cross join month_bounds mb
    where dl.list_date >= mb.start_date
      and dl.list_date < mb.end_date
    group by cs.assigned_csr_id
  ),
  upsell_comm as (
    select u.csr_id, sum(u.total_amount) as amount
    from public.upsells u
    cross join month_bounds mb
    where u.created_at >= mb.start_date
      and u.created_at < mb.end_date
    group by u.csr_id
  )
  select
    u.id as csr_id,
    u.name as csr_name,
    coalesce(dc.amount, 0) as data_commission,
    coalesce(uc.amount, 0) as upsell_commission,
    coalesce(dc.amount, 0) + coalesce(uc.amount, 0) as total_commission
  from public.users u
  left join data_comm dc on dc.csr_id = u.id
  left join upsell_comm uc on uc.csr_id = u.id
  where u.role = 'csr'
    and (
      public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin')
      or u.id = auth.uid()
    )
$$;

-- Lock down execution the same way current_user_role() was locked down
-- in Sprint 1 (avoid re-exposing an RPC to anon by default).
revoke execute on function public.get_commissions(date) from public;
revoke execute on function public.get_commissions(date) from anon;
grant execute on function public.get_commissions(date) to authenticated;
