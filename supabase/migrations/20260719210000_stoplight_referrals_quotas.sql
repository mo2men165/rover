-- Big Sprint Part 6: Stoplight Report — referrals + CSR quotas
-- Tables: referrals, csr_quotas, stoplight_week_reviews
-- Dummy 2026-Q3 quota seed for active CSRs (HOD/Admin editable later).

-- Enums -----------------------------------------------------------------

create type public.referral_status as enum ('pitched', 'converted');

-- referrals -------------------------------------------------------------
-- referring_client_id: existing client who made the intro (nullable if
--   the pitch was logged before picking a referrer).
-- referred_client_id: null until conversion links an onboarded client.
-- csr_id: who made the pitch (always set).
-- notes: free-text from the pitch log UI.
-- status / timestamps: pitched_at always set; converted_at set when
--   status flips to converted (enforced by check).

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referring_client_id uuid references public.clients (id),
  referred_client_id uuid references public.clients (id),
  csr_id uuid not null references public.users (id),
  status public.referral_status not null default 'pitched',
  notes text,
  pitched_at timestamptz not null default now(),
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referrals_converted_at_chk check (
    (status = 'pitched' and converted_at is null)
    or (status = 'converted' and converted_at is not null)
  ),
  constraint referrals_converted_requires_referred_chk check (
    status = 'pitched' or referred_client_id is not null
  )
);

create index referrals_csr_id_idx on public.referrals (csr_id);
create index referrals_referring_client_id_idx on public.referrals (referring_client_id);
create index referrals_referred_client_id_idx on public.referrals (referred_client_id);
create index referrals_pitched_at_idx on public.referrals (pitched_at desc);
create index referrals_converted_at_idx
  on public.referrals (converted_at desc)
  where status = 'converted';

-- At most one open pitch per CSR + referring client (avoids duplicates
-- while still allowing multiple pitches from the same referrer after
-- earlier ones convert or if referring_client_id is null).
create unique index referrals_one_open_pitch_per_pair_uidx
  on public.referrals (csr_id, referring_client_id)
  where status = 'pitched' and referring_client_id is not null;

-- csr_quotas ------------------------------------------------------------
-- quarter text format: 'YYYY-Qn' (e.g. '2026-Q3').
-- records_target is a records-count goal (NOT dollars — see Stoplight
-- Gap to Goal vs Data Sold split in app code).

create table public.csr_quotas (
  id uuid primary key default gen_random_uuid(),
  csr_id uuid not null references public.users (id),
  quarter text not null,
  records_target int not null check (records_target >= 0),
  created_at timestamptz not null default now(),
  constraint csr_quotas_quarter_format_chk check (quarter ~ '^\d{4}-Q[1-4]$'),
  constraint csr_quotas_csr_quarter_uidx unique (csr_id, quarter)
);

create index csr_quotas_quarter_idx on public.csr_quotas (quarter);

-- stoplight_week_reviews ------------------------------------------------
-- Friday review/confirm: one row per CSR per week (week_start = Monday UTC).
-- CSR confirms their own week; TL/HOD can confirm on their behalf.

create table public.stoplight_week_reviews (
  id uuid primary key default gen_random_uuid(),
  csr_id uuid not null references public.users (id),
  week_start date not null,
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid not null references public.users (id),
  notes text,
  created_at timestamptz not null default now(),
  constraint stoplight_week_reviews_monday_chk check (
    extract(isodow from week_start) = 1
  ),
  constraint stoplight_week_reviews_csr_week_uidx unique (csr_id, week_start)
);

create index stoplight_week_reviews_week_start_idx
  on public.stoplight_week_reviews (week_start desc);

-- Dummy 2026-Q3 quotas for active CSRs ----------------------------------
-- Scaled loosely by current POC book size so the Gap column isn't
-- uniformly empty/huge. HOD/Admin can edit via the simple quotas table UI.

insert into public.csr_quotas (csr_id, quarter, records_target)
select u.id, '2026-Q3',
  case
    when u.name = 'Scott Cooper' then 25000
    when u.name = 'Bob Root' then 8000
    when u.name = 'Max Williams' then 7000
    when u.name = 'Kevin Williams' then 6000
    when u.name = 'Mike Pierce' then 6000
    else 5000
  end
from public.users u
where u.role = 'csr' and u.status = 'active';

-- RLS -------------------------------------------------------------------
-- CSR: read own rows; writes via service-role server actions.
-- TL/HOD/Admin/Sysadmin: full access.

alter table public.referrals enable row level security;

create policy "referrals_csr_read_own"
  on public.referrals for select
  to authenticated
  using (csr_id = auth.uid());

create policy "referrals_elevated_roles_full_access"
  on public.referrals for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

alter table public.csr_quotas enable row level security;

create policy "csr_quotas_csr_read_own"
  on public.csr_quotas for select
  to authenticated
  using (csr_id = auth.uid());

create policy "csr_quotas_elevated_roles_full_access"
  on public.csr_quotas for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

alter table public.stoplight_week_reviews enable row level security;

create policy "stoplight_week_reviews_csr_read_own"
  on public.stoplight_week_reviews for select
  to authenticated
  using (csr_id = auth.uid());

create policy "stoplight_week_reviews_elevated_roles_full_access"
  on public.stoplight_week_reviews for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
