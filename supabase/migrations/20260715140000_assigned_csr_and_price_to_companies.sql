-- Correction: assigned_csr_id and package_price move from
-- campaign_services to companies.
--
-- A client has exactly one CSR who handles all of their cold calling
-- and texting, regardless of campaign count ("Brad's CSR", not a
-- per-campaign assignment). The original per-service assignment was
-- meant to handle a potential CC-vs-LM CSR split, but LM isn't modeled
-- as a campaign_service type in Phase 1, so that conflict doesn't
-- currently exist — revisit CSR assignment for LM specifically when
-- that service is built.
--
-- Likewise, a client subscribes to one data package covering every
-- service they're on, not a separate price per campaign.

alter table public.companies
  add column assigned_csr_id uuid references public.users (id),
  add column package_price numeric;

-- Backfill assigned_csr_id: only where every campaign_service for the
-- company already agrees on the same CSR. Companies with historically
-- mixed CSRs across campaigns are left NULL rather than guessed.
update public.companies c
set assigned_csr_id = sub.assigned_csr_id
from (
  select company_id, (array_agg(assigned_csr_id))[1] as assigned_csr_id
  from public.campaign_services
  group by company_id
  having count(distinct assigned_csr_id) = 1
) sub
where sub.company_id = c.id;

-- Explicit manual resolution for the 1 flagged conflict: Coastal
-- Property Group (Kevin Williams on one campaign, Scott Cooper on
-- another) — assigned to Scott Cooper per explicit instruction.
update public.companies
set assigned_csr_id = (select id from public.users where email = 'scott@res-va.com')
where name = 'Coastal Property Group';

-- Backfill package_price: dummy/demo data only at this point (per
-- explicit confirmation) — 23 companies have 2+ distinct prices across
-- their campaigns (demo seed data assumed per-campaign pricing). Using
-- max() as a simple, deterministic placeholder rather than leaving
-- these NULL; replace with the real per-client number once real data
-- supersedes the demo set.
update public.companies c
set package_price = sub.max_price
from (
  select company_id, max(package_price) as max_price
  from public.campaign_services
  where package_price is not null
  group by company_id
) sub
where sub.company_id = c.id;

-- Drop the RLS policies that depend on campaign_services.assigned_csr_id
-- before dropping the column itself. Replacement policies referencing
-- companies.assigned_csr_id are created in the follow-up RLS migration
-- (applied immediately after this one — there's no window where these
-- tables are left without a csr-scoping policy in practice).
drop policy "companies_csr_read_own" on public.companies;
drop policy "campaign_services_csr_read_own" on public.campaign_services;
drop policy "data_lists_csr_read_own" on public.data_lists;
drop policy "clients_csr_scoped" on public.clients;

-- Drop the old per-service columns (and their dependent index/FK,
-- dropped automatically with the column).
alter table public.campaign_services
  drop column assigned_csr_id,
  drop column package_price;

-- get_commissions -----------------------------------------------------------
-- Data commission is now two independently-computed terms combined:
--   package term    = 0.02 * companies.package_price, counted exactly
--                      once per company per month (not per campaign,
--                      not per data_lists row) — gated on whether the
--                      company has at least one data_lists entry that
--                      month across ANY of its campaign_services.
--   skip trace term = 0.03 * records_skip_traced * skip_trace_rate,
--                      still summed per data_lists row, since it
--                      genuinely scales with the records actually
--                      skip-traced across however many lists were
--                      entered that month.
-- Both terms remain gated by the company's data_source_type/tier and
-- skip_tracing_type exactly as before.

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
  package_comm as (
    select
      co.assigned_csr_id as csr_id,
      sum(
        case when co.data_source_type = 'res' and co.data_source_tier is distinct from 'legacy'
             then 0.02 * coalesce(co.package_price, 0)
             else 0
        end
      ) as amount
    from public.companies co
    cross join month_bounds mb
    where co.assigned_csr_id is not null
      and exists (
        select 1
        from public.data_lists dl
        join public.campaign_services cs on cs.id = dl.campaign_service_id
        where cs.company_id = co.id
          and dl.list_date >= mb.start_date
          and dl.list_date < mb.end_date
      )
    group by co.assigned_csr_id
  ),
  skip_trace_comm as (
    select co.assigned_csr_id as csr_id,
           sum(
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
      and co.assigned_csr_id is not null
    group by co.assigned_csr_id
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
    coalesce(pc.amount, 0) + coalesce(sc.amount, 0) as data_commission,
    coalesce(uc.amount, 0) as upsell_commission,
    coalesce(pc.amount, 0) + coalesce(sc.amount, 0) + coalesce(uc.amount, 0) as total_commission
  from public.users u
  left join package_comm pc on pc.csr_id = u.id
  left join skip_trace_comm sc on sc.csr_id = u.id
  left join upsell_comm uc on uc.csr_id = u.id
  where u.role = 'csr'
    and (
      public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin')
      or u.id = auth.uid()
    )
$$;
