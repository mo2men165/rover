-- Sprint 3: move CSR/package ownership from companies to the POC client,
-- decouple commission entirely from data_lists, add monthly payment
-- confirmation + PAYG request tracking, and multi-service data lists.
--
-- companies is reduced to pure documentation (id, name, created_at) --
-- everything that drives business logic or commission math now lives on
-- the client row where is_poc = true. A company's non-POC clients keep
-- all these new columns NULL (enforced below) since they're not
-- meaningful outside the POC row.

-- package_tier ----------------------------------------------------------
-- Sub-tier of data_source_tier = 'package', carrying a fixed price:
-- starter = 450, pro = 1215, growth = 6775. Only meaningful when
-- data_source_tier = 'package' (payg/legacy don't have a package_tier).

create type public.package_tier as enum ('starter', 'pro', 'growth');

-- clients: new POC-only config columns -----------------------------------

alter table public.clients
  add column assigned_csr_id uuid references public.users (id),
  add column data_source_type public.provider_type,
  add column data_source_tier public.data_source_tier,
  add column package_tier public.package_tier,
  add column package_price numeric,
  add column package_start_date date,
  add column package_end_date date,
  add column skip_tracing_type public.provider_type,
  add column skip_trace_rate_tier public.skip_trace_rate_tier,
  add column skip_trace_rate numeric;

-- All of the above are meaningful only on the is_poc = true row for a
-- company -- enforced here rather than left as a convention, since these
-- fields directly drive commission math.
alter table public.clients
  add constraint clients_package_fields_require_poc_chk
    check (
      is_poc or (
        assigned_csr_id is null
        and data_source_type is null
        and data_source_tier is null
        and package_tier is null
        and package_price is null
        and package_start_date is null
        and package_end_date is null
        and skip_tracing_type is null
        and skip_trace_rate_tier is null
        and skip_trace_rate is null
      )
    ),
  add constraint clients_data_source_tier_chk
    check (data_source_type is null or (data_source_type = 'res') = (data_source_tier is not null)),
  add constraint clients_package_tier_chk
    check (package_tier is null or data_source_tier = 'package'),
  add constraint clients_skip_trace_rate_chk
    check (skip_tracing_type is null or (skip_tracing_type = 'res') = (skip_trace_rate_tier is not null and skip_trace_rate is not null)),
  add constraint clients_package_dates_chk
    check (package_start_date is null or package_end_date is null or package_end_date >= package_start_date);

create index clients_assigned_csr_id_idx on public.clients (assigned_csr_id) where is_poc;

-- package_price is a hardcoded lookup from package_tier (mirrors the
-- skip_trace_rate_tier pattern below), except this trigger only fires
-- when package_tier itself is written -- a later direct update to
-- package_price alone (promo/discounted override) is left untouched.
create or replace function public.set_client_package_price()
returns trigger
language plpgsql
as $$
begin
  if new.package_tier is not null then
    new.package_price := case new.package_tier
      when 'starter' then 450
      when 'pro' then 1215
      when 'growth' then 6775
    end;
  end if;
  return new;
end;
$$;

create trigger clients_set_package_price
  before insert or update of package_tier on public.clients
  for each row execute function public.set_client_package_price();

-- skip_trace_rate is a hardcoded lookup from skip_trace_rate_tier, except
-- 'custom' where the caller-supplied numeric value is kept as-is --
-- identical logic to the companies-level trigger this replaces.
create or replace function public.set_client_skip_trace_rate()
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

create trigger clients_set_skip_trace_rate
  before insert or update of skip_trace_rate_tier on public.clients
  for each row execute function public.set_client_skip_trace_rate();

-- Backfill from companies onto each company's POC client row. Every
-- company in current data has exactly one is_poc = true client (verified
-- before writing this migration), so no ambiguous-POC handling is
-- needed here -- if a future company ever has zero or multiple POC
-- clients, this UPDATE simply leaves that company's config unmigrated
-- (matched 0 rows) rather than silently picking one.
--
-- package_tier is left NULL for all 43 currently 'package'-tier
-- companies -- there is no existing data to infer starter/pro/growth
-- from, so per the same "flag, don't guess" principle as POC ambiguity,
-- these are left for manual assignment. Their existing package_price
-- carries over unchanged (this UPDATE sets package_price directly, not
-- via package_tier, so the price trigger above does not fire).
update public.clients cl
set assigned_csr_id = co.assigned_csr_id,
    data_source_type = co.data_source_type,
    data_source_tier = co.data_source_tier,
    package_price = co.package_price,
    skip_tracing_type = co.skip_tracing_type,
    skip_trace_rate_tier = co.skip_trace_rate_tier,
    skip_trace_rate = co.skip_trace_rate
from public.companies co
where cl.company_id = co.id
  and cl.is_poc = true;

-- Drop the RLS policies that depend on companies.assigned_csr_id /
-- data_lists.campaign_service_id before dropping those columns.
-- Replacement policies are created in the follow-up RLS migration
-- (applied immediately after this one).
drop policy "companies_csr_read_own" on public.companies;
drop policy "campaign_services_csr_read_own" on public.campaign_services;
drop policy "data_lists_csr_read_own" on public.data_lists;
drop policy "clients_csr_scoped" on public.clients;

-- companies: strip down to pure documentation ----------------------------

alter table public.companies
  drop constraint companies_data_source_tier_chk,
  drop constraint companies_skip_trace_rate_chk;

drop trigger companies_set_skip_trace_rate on public.companies;
drop function public.set_company_skip_trace_rate();

alter table public.companies
  drop column assigned_csr_id,
  drop column package_price,
  drop column data_source_type,
  drop column data_source_tier,
  drop column skip_tracing_type,
  drop column skip_trace_rate_tier,
  drop column skip_trace_rate;

-- data_list_services: multi-service data lists ---------------------------
-- One data_lists row (with its single set of records_count/accepted/
-- duplicates/skip_traced totals) can now cover multiple campaign_services
-- under the same company. data_lists had 0 rows at the time of this
-- migration, so the old single campaign_service_id column is dropped
-- outright rather than backfilled into the join table.

alter table public.data_lists
  drop column campaign_service_id;

create table public.data_list_services (
  data_list_id uuid not null references public.data_lists (id) on delete cascade,
  campaign_service_id uuid not null references public.campaign_services (id),
  primary key (data_list_id, campaign_service_id)
);

create index data_list_services_campaign_service_id_idx on public.data_list_services (campaign_service_id);

-- monthly_payment_confirmations -------------------------------------------
-- One row per package client per calendar month, created when the
-- assigned CSR marks that month's payment as confirmed. Never backfilled
-- -- a month with no confirmation simply never generates package
-- commission for that client (enforced in get_commissions, not here).

create table public.monthly_payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  month date not null,
  confirmed_by uuid not null references public.users (id),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint monthly_payment_confirmations_month_first_of_month_chk
    check (month = date_trunc('month', month)::date),
  constraint monthly_payment_confirmations_client_month_uniq
    unique (client_id, month)
);

create index monthly_payment_confirmations_client_id_idx on public.monthly_payment_confirmations (client_id);

-- payg_requests -------------------------------------------------------------
-- Fully independent of data_lists -- a PAYG pull/skip-trace request the
-- CSR creates for a client, later flagged paid. pull_rate defaults to the
-- standard PAYG rate ($0.04/record) but is CSR-editable per request.

create table public.payg_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  records_to_pull int not null,
  records_to_skip_trace int not null default 0,
  pull_rate numeric not null default 0.04,
  skip_trace_rate numeric not null default 0.07,
  created_by uuid not null references public.users (id),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payg_requests_paid_at_chk check (paid = (paid_at is not null))
);

create index payg_requests_client_id_idx on public.payg_requests (client_id);
create index payg_requests_created_by_idx on public.payg_requests (created_by);

-- company_assigned_csr_id -------------------------------------------------
-- security definer helper mirroring current_user_role(): RLS policies on
-- companies/campaign_services/data_lists/clients need a company's
-- assigned CSR (now on the POC client row), but querying clients
-- directly from within a clients RLS policy would self-recurse. This
-- function bypasses RLS the same way current_user_role() does for users.

create or replace function public.company_assigned_csr_id(p_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select assigned_csr_id
  from public.clients
  where company_id = p_company_id
    and is_poc
  limit 1
$$;

revoke execute on function public.company_assigned_csr_id(uuid) from public;
revoke execute on function public.company_assigned_csr_id(uuid) from anon;
grant execute on function public.company_assigned_csr_id(uuid) to authenticated;
