-- RLS follow-up for assigned_csr_id moving to companies. Every policy
-- that scoped a csr's access via campaign_services.assigned_csr_id now
-- needs to check companies.assigned_csr_id instead — either directly
-- (companies itself) or via a join (campaign_services, data_lists,
-- clients). The old versions of these 4 policies were already dropped
-- in the preceding schema migration (had to happen before that
-- migration could drop campaign_services.assigned_csr_id).

create policy "companies_csr_read_own"
  on public.companies for select
  to authenticated
  using (assigned_csr_id = auth.uid());

create policy "campaign_services_csr_read_own"
  on public.campaign_services for select
  to authenticated
  using (
    exists (
      select 1 from public.companies co
      where co.id = campaign_services.company_id
        and co.assigned_csr_id = auth.uid()
    )
  );

create policy "data_lists_csr_read_own"
  on public.data_lists for select
  to authenticated
  using (
    exists (
      select 1 from public.campaign_services cs
      join public.companies co on co.id = cs.company_id
      where cs.id = data_lists.campaign_service_id
        and co.assigned_csr_id = auth.uid()
    )
  );

-- clients (Sprint 1 policy — not touched by the earlier Sprint 2 RLS
-- migration, still references cs.assigned_csr_id via campaign_services)
create policy "clients_csr_scoped"
  on public.clients for all
  to authenticated
  using (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.companies co
      where co.id = clients.company_id
        and co.assigned_csr_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'csr'
    and exists (
      select 1 from public.companies co
      where co.id = clients.company_id
        and co.assigned_csr_id = auth.uid()
    )
  );
