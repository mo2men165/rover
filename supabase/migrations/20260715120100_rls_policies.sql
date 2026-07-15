-- Sprint 1: Row Level Security for all Sprint 1 tables.

-- Helper: current caller's role, read from public.users.
-- security definer so it can read public.users without recursing through
-- the RLS policy being evaluated on that same table.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid()
$$;

-- users -------------------------------------------------------------------
-- everyone (any authenticated user) can read; only sysadmin can write.

alter table public.users enable row level security;

create policy "users_select_all"
  on public.users for select
  to authenticated
  using (true);

create policy "users_write_sysadmin_only"
  on public.users for all
  to authenticated
  using (public.current_user_role() = 'sysadmin')
  with check (public.current_user_role() = 'sysadmin');

-- companies -----------------------------------------------------------------
-- csr: read/write only companies with a campaign_service assigned to them.
-- tl/hod/admin/sysadmin: read/write all.
--
-- Note: a csr cannot INSERT a brand new company row under this policy,
-- since no campaign_services row can reference it yet at insert time.
-- Company creation this sprint is expected to happen via tl/hod/admin/
-- sysadmin, or a future flow that creates company + campaign_service
-- together. Flagging this in case csr-side company creation is needed.

alter table public.companies enable row level security;

create policy "companies_csr_scoped"
  on public.companies for all
  to authenticated
  using (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.company_id = companies.id
        and cs.assigned_csr_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.company_id = companies.id
        and cs.assigned_csr_id = auth.uid()
    )
  );

create policy "companies_elevated_roles_full_access"
  on public.companies for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- clients ---------------------------------------------------------------
-- csr: read/write only clients whose company has a campaign_service
-- assigned to them. tl/hod/admin/sysadmin: read/write all.

alter table public.clients enable row level security;

create policy "clients_csr_scoped"
  on public.clients for all
  to authenticated
  using (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.company_id = clients.company_id
        and cs.assigned_csr_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.company_id = clients.company_id
        and cs.assigned_csr_id = auth.uid()
    )
  );

create policy "clients_elevated_roles_full_access"
  on public.clients for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- campaign_services -------------------------------------------------------
-- csr: read/write only rows where they are the assigned_csr_id.
-- tl/hod/admin/sysadmin: read/write all.

alter table public.campaign_services enable row level security;

create policy "campaign_services_csr_scoped"
  on public.campaign_services for all
  to authenticated
  using (
    public.current_user_role() = 'csr'
    and assigned_csr_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'csr'
    and assigned_csr_id = auth.uid()
  );

create policy "campaign_services_elevated_roles_full_access"
  on public.campaign_services for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- data_lists --------------------------------------------------------------
-- csr: read/write only data_lists whose campaign_service is assigned to
-- them. tl/hod/admin/sysadmin: read/write all.

alter table public.data_lists enable row level security;

create policy "data_lists_csr_scoped"
  on public.data_lists for all
  to authenticated
  using (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.id = data_lists.campaign_service_id
        and cs.assigned_csr_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.campaign_services cs
      where cs.id = data_lists.campaign_service_id
        and cs.assigned_csr_id = auth.uid()
    )
  );

create policy "data_lists_elevated_roles_full_access"
  on public.data_lists for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- commissions ---------------------------------------------------------------
-- csr: read only their own rows.
-- tl/hod: read all rows (no write access specified/granted).
-- admin/sysadmin: insert/update (and by extension can also read, granted
-- below). No delete policy is created for any role, since none was
-- specified — RLS defaults to deny, so commissions are effectively
-- undeletable until a delete policy is explicitly added.

alter table public.commissions enable row level security;

create policy "commissions_csr_read_own"
  on public.commissions for select
  to authenticated
  using (csr_id = auth.uid());

create policy "commissions_tl_hod_read_all"
  on public.commissions for select
  to authenticated
  using (public.current_user_role() in ('tl', 'hod'));

create policy "commissions_admin_sysadmin_read_all"
  on public.commissions for select
  to authenticated
  using (public.current_user_role() in ('admin', 'sysadmin'));

create policy "commissions_admin_sysadmin_insert"
  on public.commissions for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'sysadmin'));

create policy "commissions_admin_sysadmin_update"
  on public.commissions for update
  to authenticated
  using (public.current_user_role() in ('admin', 'sysadmin'))
  with check (public.current_user_role() in ('admin', 'sysadmin'));
