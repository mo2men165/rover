-- Free-text provider names when data / skip-trace source is client-provided.
-- Displayed on the clients list instead of the generic "Self-Provided" / "Client" label.
--
-- Callers: apply_migration / migrations pipeline.
-- Downstream: create-client.ts, add-client-wizard.tsx, clients/page.tsx,
-- data-package-card.tsx, database.types.ts, clients/[companyId]/page.tsx.
-- User: "when … data or skip … source is client provided we prompt … actual
-- provider name and that is the name we display … if source not known enter Unknown"

alter table public.clients
  add column if not exists data_source_provider_name text,
  add column if not exists skip_trace_provider_name text;

-- Names only meaningful for self_provided sources.
alter table public.clients
  drop constraint if exists clients_data_source_provider_name_chk;

alter table public.clients
  add constraint clients_data_source_provider_name_chk
  check (
    data_source_provider_name is null
    or data_source_type = 'self_provided'
  );

alter table public.clients
  drop constraint if exists clients_skip_trace_provider_name_chk;

alter table public.clients
  add constraint clients_skip_trace_provider_name_chk
  check (
    skip_trace_provider_name is null
    or skip_tracing_type = 'self_provided'
  );

-- POC-only profile fields (associates must leave these null).
alter table public.clients
  drop constraint if exists clients_profile_fields_require_poc_chk;

alter table public.clients
  add constraint clients_profile_fields_require_poc_chk
  check (
    is_poc or (
      buy_box is null
      and script is null
      and pinned_notes is null
      and custom_script_url is null
      and lifecycle_stage is null
      and lead_source is null
      and package_commitment is null
      and monthly_skip_trace_expected is null
      and data_source_provider_name is null
      and skip_trace_provider_name is null
    )
  );

-- Backfill existing self_provided rows so the list has something to show.
update public.clients
set data_source_provider_name = 'Unknown'
where is_poc
  and data_source_type = 'self_provided'
  and data_source_provider_name is null;

update public.clients
set skip_trace_provider_name = 'Unknown'
where is_poc
  and skip_tracing_type = 'self_provided'
  and skip_trace_provider_name is null;
