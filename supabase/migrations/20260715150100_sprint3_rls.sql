-- Sprint 3 RLS follow-up: every policy that scoped a csr's access via
-- companies.assigned_csr_id (or joined through campaign_service_id on
-- data_lists) now needs to check clients.assigned_csr_id on the POC row
-- instead, via the company_assigned_csr_id() helper added in the
-- preceding schema migration.
--
-- clients_csr_scoped is also tightened from full read/write to read-only
-- (renamed clients_csr_read_own), mirroring the exact tightening the
-- Sprint 2 RLS migration applied to companies: clients now carries
-- package_price/data_source_type/assigned_csr_id/etc, which directly
-- drive commission math, so a csr must not be able to write these via a
-- direct table policy. No client-side code currently writes to `clients`
-- (verified before this migration), so this is not a regression. Going
-- forward, all client-profile and "Add to Data Package" writes go
-- through a service-role server action that validates ownership and
-- business rules server-side, matching the log-upsell.ts /
-- create-data-list.ts pattern.

create policy "companies_csr_read_own"
  on public.companies for select
  to authenticated
  using (public.company_assigned_csr_id(companies.id) = auth.uid());

create policy "campaign_services_csr_read_own"
  on public.campaign_services for select
  to authenticated
  using (public.company_assigned_csr_id(campaign_services.company_id) = auth.uid());

create policy "data_lists_csr_read_own"
  on public.data_lists for select
  to authenticated
  using (
    exists (
      select 1 from public.data_list_services dls
      join public.campaign_services cs on cs.id = dls.campaign_service_id
      where dls.data_list_id = data_lists.id
        and public.company_assigned_csr_id(cs.company_id) = auth.uid()
    )
  );

create policy "clients_csr_read_own"
  on public.clients for select
  to authenticated
  using (public.company_assigned_csr_id(clients.company_id) = auth.uid());

-- data_list_services --------------------------------------------------------

alter table public.data_list_services enable row level security;

create policy "data_list_services_csr_read_own"
  on public.data_list_services for select
  to authenticated
  using (
    exists (
      select 1 from public.campaign_services cs
      where cs.id = data_list_services.campaign_service_id
        and public.company_assigned_csr_id(cs.company_id) = auth.uid()
    )
  );

create policy "data_list_services_elevated_roles_full_access"
  on public.data_list_services for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- monthly_payment_confirmations -----------------------------------------
-- csr: read only their own clients' confirmations. Inserts ("Mark as
-- paid") happen through a service-role server action that validates the
-- client is one of the csr's own package clients for the current month
-- -- no direct insert policy needed for csr.

alter table public.monthly_payment_confirmations enable row level security;

create policy "monthly_payment_confirmations_csr_read_own"
  on public.monthly_payment_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = monthly_payment_confirmations.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "monthly_payment_confirmations_elevated_roles_full_access"
  on public.monthly_payment_confirmations for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

-- payg_requests -----------------------------------------------------------
-- csr: read only their own clients' requests. Create/mark-paid happen
-- through a service-role server action (validates client ownership),
-- same pattern as monthly_payment_confirmations above.

alter table public.payg_requests enable row level security;

create policy "payg_requests_csr_read_own"
  on public.payg_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = payg_requests.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "payg_requests_elevated_roles_full_access"
  on public.payg_requests for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
