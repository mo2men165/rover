-- Sprint 2: RLS updates.
--
-- companies.data_source_type/tier/skip_tracing_type/skip_trace_rate,
-- campaign_services.package_price, and data_lists.skip_trace_rate now
-- directly drive get_commissions() payout math. Sprint 1 granted csr
-- "for all" (read+write) on companies/campaign_services/data_lists
-- scoped to their own rows — left as-is, a csr could edit their own
-- company's data-sourcing config, package_price, or skip_trace_rate and
-- inflate their own commission. Tightening all three to csr-read-only.
--
-- Legitimate writes going forward:
--   - companies (data-sourcing config): elevated roles only, via the
--     existing *_elevated_roles_full_access policy — no client-side csr
--     write path is needed today.
--   - data_lists: Admin-only data list entry, via the regular
--     authenticated client — already covered by the existing
--     *_elevated_roles_full_access policies (admin is in that list).
--   - campaign_services mutations driven by CSR-facing upsell logging
--     (seat_count increment, new texting service, tier upgrade): csr no
--     longer has table-level write access, so these go through a
--     service-role server action (mirrors lib/actions/invite-user.ts)
--     that validates the business rule server-side before writing.

drop policy "companies_csr_scoped" on public.companies;

create policy "companies_csr_read_own"
  on public.companies for select
  to authenticated
  using (
    exists (
      select 1 from public.campaign_services cs
      where cs.company_id = companies.id
        and cs.assigned_csr_id = auth.uid()
    )
  );

drop policy "campaign_services_csr_scoped" on public.campaign_services;

create policy "campaign_services_csr_read_own"
  on public.campaign_services for select
  to authenticated
  using (assigned_csr_id = auth.uid());

drop policy "data_lists_csr_scoped" on public.data_lists;

create policy "data_lists_csr_read_own"
  on public.data_lists for select
  to authenticated
  using (
    exists (
      select 1 from public.campaign_services cs
      where cs.id = data_lists.campaign_service_id
        and cs.assigned_csr_id = auth.uid()
    )
  );

-- upsells ---------------------------------------------------------------
-- csr: read only their own logged upsells. Inserts happen through the
-- log-upsell server action (service-role client, validates csr_id and
-- business rules server-side) — no direct insert policy needed for csr.
-- tl/hod/admin/sysadmin: full read/write, matching the elevated-roles
-- pattern used for campaign_services/data_lists/clients/companies.

alter table public.upsells enable row level security;

create policy "upsells_csr_read_own"
  on public.upsells for select
  to authenticated
  using (csr_id = auth.uid());

create policy "upsells_elevated_roles_full_access"
  on public.upsells for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
