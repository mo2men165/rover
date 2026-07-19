-- Big Sprint Part 2: Interaction Log
-- interactions table + HubSpot contact id on clients (needed for auto-post;
-- was referenced as seed data but is not present on the live schema yet).

-- Enums -----------------------------------------------------------------

create type public.interaction_type as enum (
  'email',
  'call',
  'sms',
  'whatsapp',
  'slack',
  'meeting',
  'note'
);

create type public.interaction_direction as enum (
  'inbound',
  'outbound',
  'internal'
);

create type public.interaction_source as enum (
  'manual',
  'gmail',
  'fathom',
  'hubspot_sync'
);

-- clients.hs_object_id ----------------------------------------------------
-- HubSpot contact object id used when posting notes. Nullable: clients
-- created in ROVER before a HubSpot match exist without one.

alter table public.clients
  add column hs_object_id text;

create unique index clients_hs_object_id_uidx
  on public.clients (hs_object_id)
  where hs_object_id is not null;

-- interactions ------------------------------------------------------------

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  logged_by uuid not null references public.users (id),
  type public.interaction_type not null,
  direction public.interaction_direction not null,
  source public.interaction_source not null default 'manual',
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Idempotency for Gmail/Fathom/HubSpot imports (null for manual logs).
  external_id text,
  -- HubSpot note sync outcome. Never blocks the ROVER insert.
  hubspot_synced boolean not null default false,
  hubspot_sync_note text
);

create index interactions_client_id_idx on public.interactions (client_id);
create index interactions_occurred_at_idx on public.interactions (occurred_at desc);
create index interactions_logged_by_idx on public.interactions (logged_by);

-- One imported event per source+external_id (manual rows leave external_id null).
create unique index interactions_source_external_id_uidx
  on public.interactions (source, external_id)
  where external_id is not null;

-- RLS ---------------------------------------------------------------------
-- Same client-scoped pattern as monthly_payment_confirmations / payg_requests:
-- CSR reads only interactions for clients under companies they own (via
-- company_assigned_csr_id on the POC). Writes go through service-role
-- server actions / jobs that validate ownership server-side.
-- TL/HOD/Admin/Sysadmin: full access.

alter table public.interactions enable row level security;

create policy "interactions_csr_read_own"
  on public.interactions for select
  to authenticated
  using (
    exists (
      select 1 from public.clients cl
      where cl.id = interactions.client_id
        and public.company_assigned_csr_id(cl.company_id) = auth.uid()
    )
  );

create policy "interactions_elevated_roles_full_access"
  on public.interactions for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
