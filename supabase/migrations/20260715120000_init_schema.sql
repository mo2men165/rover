-- Sprint 1: core schema (companies, clients, campaign_services, data_lists,
-- commissions, and the public.users profile table mapped to auth.users).

create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------

create type public.campaign_type as enum ('cold_calling', 'texting');
create type public.source_type as enum ('res', 'self_provided');
create type public.service_tier as enum ('starter', 'pro', 'growth', 'legacy', 'payg');
create type public.rate_type as enum ('standard', 'promo');
create type public.commission_type as enum ('data', 'upsell');
create type public.user_role as enum ('csr', 'tl', 'hod', 'admin', 'sysadmin');
create type public.user_status as enum ('invited', 'active');

-- users (profile table mapped 1:1 to auth.users) -------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role public.user_role not null,
  start_date date,
  status public.user_status not null default 'invited',
  created_at timestamptz not null default now()
);

-- companies ---------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- clients -------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  name text not null,
  email text,
  phone text,
  title_at_company text,
  is_poc boolean not null default false,
  created_at timestamptz not null default now()
);

create index clients_company_id_idx on public.clients (company_id);

-- campaign_services -----------------------------------------------------

create table public.campaign_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  type public.campaign_type not null,
  -- name is only meaningful for cold_calling campaigns; left null for texting
  name text,
  seat_count int not null,
  source_type public.source_type not null,
  service_type public.service_tier,
  rate_type public.rate_type,
  assigned_csr_id uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index campaign_services_company_id_idx on public.campaign_services (company_id);
create index campaign_services_assigned_csr_id_idx on public.campaign_services (assigned_csr_id);

-- data_lists ------------------------------------------------------------

create table public.data_lists (
  id uuid primary key default gen_random_uuid(),
  campaign_service_id uuid not null references public.campaign_services (id),
  list_date date not null,
  records_count int not null,
  records_accepted int not null,
  duplicates int not null,
  entered_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index data_lists_campaign_service_id_idx on public.data_lists (campaign_service_id);

-- commissions -------------------------------------------------------------

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  csr_id uuid not null references public.users (id),
  type public.commission_type not null,
  month date not null,
  amount numeric not null,
  source_note text not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index commissions_csr_id_idx on public.commissions (csr_id);
