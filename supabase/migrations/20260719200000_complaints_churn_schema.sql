-- Big Sprint Part 3: Complaint Tracker + Churn Pipeline
-- Tables: complaints, follow_up_tasks, churn_records
-- Auto-creates a follow_up_task whenever a complaint is inserted.

-- Enums -----------------------------------------------------------------

create type public.complaint_validity as enum ('valid', 'invalid');
create type public.complaint_status as enum ('open', 'resolved');
create type public.churn_type as enum ('known', 'unknown');
create type public.deposit_status as enum ('keep', 'use', 'refund');

-- complaints ------------------------------------------------------------

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  logged_by uuid not null references public.users (id),
  category text not null,
  description text not null,
  validity public.complaint_validity not null,
  status public.complaint_status not null default 'open',
  resolution_notes text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint complaints_resolved_at_check check (
    (status = 'open' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create index complaints_client_id_idx on public.complaints (client_id);
create index complaints_status_opened_at_idx
  on public.complaints (status, opened_at)
  where status = 'open';
create index complaints_logged_by_idx on public.complaints (logged_by);

-- follow_up_tasks -------------------------------------------------------
-- Generic enough for other sources later; complaint_id is nullable.
-- Only complaints create rows for now (via trigger below).

create table public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints (id) on delete cascade,
  assigned_to uuid not null references public.users (id),
  description text not null,
  due_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint follow_up_tasks_completed_at_check check (
    (completed = false and completed_at is null)
    or (completed = true and completed_at is not null)
  )
);

create index follow_up_tasks_complaint_id_idx on public.follow_up_tasks (complaint_id);
create index follow_up_tasks_assigned_to_idx on public.follow_up_tasks (assigned_to);
create index follow_up_tasks_open_due_idx
  on public.follow_up_tasks (due_date)
  where completed = false;

-- Auto-create follow-up when a complaint is logged.
-- assigned_to = logged_by, due_date = opened_at + 3 days,
-- description generated from category + client context.

create or replace function public.create_follow_up_for_complaint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.follow_up_tasks (
    complaint_id,
    assigned_to,
    description,
    due_date
  ) values (
    new.id,
    new.logged_by,
    format(
      'Follow up on %s complaint: %s',
      new.category,
      left(new.description, 120)
    ),
    (new.opened_at at time zone 'utc')::date + 3
  );
  return new;
end;
$$;

create trigger complaints_auto_follow_up
  after insert on public.complaints
  for each row
  execute function public.create_follow_up_for_complaint();

revoke execute on function public.create_follow_up_for_complaint() from public;
revoke execute on function public.create_follow_up_for_complaint() from anon;
revoke execute on function public.create_follow_up_for_complaint() from authenticated;

-- churn_records ---------------------------------------------------------
-- resolved_at null = still active/unresolved churn risk.
-- risk_score + signals jsonb are computed on-demand (profile view / nightly).

create table public.churn_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  churn_type public.churn_type not null,
  reason text,
  deposit_status public.deposit_status,
  risk_score numeric(5, 2),
  signals jsonb not null default '{}'::jsonb,
  flagged_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index churn_records_client_id_idx on public.churn_records (client_id);
create index churn_records_active_idx
  on public.churn_records (flagged_at desc)
  where resolved_at is null;
create index churn_records_risk_score_idx
  on public.churn_records (risk_score desc nulls last)
  where resolved_at is null;

-- At most one active (unresolved) churn record per client.
create unique index churn_records_one_active_per_client_uidx
  on public.churn_records (client_id)
  where resolved_at is null;

-- RLS: client-scoped (same pattern as interactions) ----------------------
-- CSR: rows for clients under companies they own (POC assigned_csr_id).
-- TL/HOD/Admin/Sysadmin: full access.
-- Writes for CSR go through server actions that validate ownership;
-- CSR still gets SELECT via RLS for UI reads.

alter table public.complaints enable row level security;

create policy "complaints_csr_read_own"
  on public.complaints for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = complaints.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "complaints_elevated_roles_full_access"
  on public.complaints for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

alter table public.follow_up_tasks enable row level security;

-- CSR sees tasks linked to their clients' complaints, OR assigned to them
-- (covers future non-complaint sources where complaint_id is null).
create policy "follow_up_tasks_csr_read_own"
  on public.follow_up_tasks for select
  to authenticated
  using (
    assigned_to = auth.uid()
    or exists (
      select 1
      from public.complaints c
      join public.clients cl on cl.id = c.client_id
      where c.id = follow_up_tasks.complaint_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "follow_up_tasks_elevated_roles_full_access"
  on public.follow_up_tasks for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

alter table public.churn_records enable row level security;

create policy "churn_records_csr_read_own"
  on public.churn_records for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = churn_records.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "churn_records_elevated_roles_full_access"
  on public.churn_records for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
