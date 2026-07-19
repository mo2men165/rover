-- Big Sprint Part 4: Upsell Pipeline
-- Table: upsell_opportunities (staged kanban)
-- Links: upsells.upsell_opportunity_id → originating pipeline row (nullable)

-- Enums -----------------------------------------------------------------

create type public.upsell_stage as enum (
  'opportunity',
  'pitched',
  'pending',
  'won',
  'lost'
);

-- upsell_opportunities --------------------------------------------------
-- Pipeline tracking before a payment-confirmed upsell is logged.
-- Terminal stages: won (auto-creates upsells row), lost (requires lost_reason).
-- snooze_until is only meaningful while stage = 'pending'.

create table public.upsell_opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  csr_id uuid not null references public.users (id),
  upsell_type public.upsell_type not null,
  stage public.upsell_stage not null default 'opportunity',
  snooze_until date,
  quantity int not null default 1,
  notes text,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint upsell_opportunities_quantity_chk check (quantity >= 1),
  constraint upsell_opportunities_snooze_chk check (
    snooze_until is null or stage = 'pending'
  ),
  constraint upsell_opportunities_lost_reason_chk check (
    (stage = 'lost' and lost_reason is not null and length(trim(lost_reason)) > 0)
    or (stage <> 'lost' and lost_reason is null)
  )
);

create index upsell_opportunities_client_id_idx
  on public.upsell_opportunities (client_id);
create index upsell_opportunities_csr_id_idx
  on public.upsell_opportunities (csr_id);
create index upsell_opportunities_stage_idx
  on public.upsell_opportunities (stage);
create index upsell_opportunities_active_idx
  on public.upsell_opportunities (stage, created_at desc)
  where stage in ('opportunity', 'pitched', 'pending');
create index upsell_opportunities_pending_snooze_idx
  on public.upsell_opportunities (snooze_until)
  where stage = 'pending' and snooze_until is not null;

-- Keep updated_at fresh on every update.
create or replace function public.set_upsell_opportunity_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger upsell_opportunities_set_updated_at
  before update on public.upsell_opportunities
  for each row
  execute function public.set_upsell_opportunity_updated_at();

-- Link existing terminal upsells back to the pipeline (nullable so
-- CSRs can still log a confirmed upsell with no prior opportunity).

alter table public.upsells
  add column upsell_opportunity_id uuid
    references public.upsell_opportunities (id);

create unique index upsells_upsell_opportunity_id_uidx
  on public.upsells (upsell_opportunity_id)
  where upsell_opportunity_id is not null;

-- RLS: client-scoped (same pattern as complaints / interactions) --------
-- CSR: rows for clients under companies they own (POC assigned_csr_id).
-- TL/HOD/Admin/Sysadmin: full access.
-- CSR writes go through server actions (service-role + ownership checks);
-- CSR still gets SELECT via RLS for board / profile reads.

alter table public.upsell_opportunities enable row level security;

create policy "upsell_opportunities_csr_read_own"
  on public.upsell_opportunities for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = upsell_opportunities.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "upsell_opportunities_elevated_roles_full_access"
  on public.upsell_opportunities for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
