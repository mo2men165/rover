-- Upsell commission now follows the same one-month payout lag as package
-- and PAYG: p_month is the payout month; upsells logged in the prior
-- month (activity_month) count toward this payout.

create or replace function public.get_commissions(p_month date)
returns table (
  csr_id uuid,
  csr_name text,
  package_commission numeric,
  payg_commission numeric,
  upsell_commission numeric,
  total_commission numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with activity_month as (
    select (date_trunc('month', p_month) - interval '1 month')::date as start_date,
           date_trunc('month', p_month)::date as end_date
  ),
  package_comm as (
    select cl.assigned_csr_id as csr_id,
           sum(0.02 * coalesce(cl.package_price, 0)) as amount
    from public.monthly_payment_confirmations mpc
    join public.clients cl on cl.id = mpc.client_id
    cross join activity_month am
    where mpc.confirmed_at >= am.start_date
      and mpc.confirmed_at < am.end_date
      and cl.assigned_csr_id is not null
    group by cl.assigned_csr_id
  ),
  payg_comm as (
    select pr.created_by as csr_id,
           sum(
             0.02 * pr.records_to_pull * pr.pull_rate
             + 0.03 * pr.records_to_skip_trace * pr.skip_trace_rate
           ) as amount
    from public.payg_requests pr
    cross join activity_month am
    where pr.paid = true
      and pr.paid_at >= am.start_date
      and pr.paid_at < am.end_date
    group by pr.created_by
  ),
  upsell_comm as (
    select u.csr_id, sum(u.total_amount) as amount
    from public.upsells u
    cross join activity_month am
    where u.created_at >= am.start_date
      and u.created_at < am.end_date
    group by u.csr_id
  )
  select
    us.id as csr_id,
    us.name as csr_name,
    coalesce(pc.amount, 0) as package_commission,
    coalesce(pg.amount, 0) as payg_commission,
    coalesce(uc.amount, 0) as upsell_commission,
    coalesce(pc.amount, 0) + coalesce(pg.amount, 0) + coalesce(uc.amount, 0) as total_commission
  from public.users us
  left join package_comm pc on pc.csr_id = us.id
  left join payg_comm pg on pg.csr_id = us.id
  left join upsell_comm uc on uc.csr_id = us.id
  where us.role = 'csr'
    and (
      public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin')
      or us.id = auth.uid()
    )
$$;
