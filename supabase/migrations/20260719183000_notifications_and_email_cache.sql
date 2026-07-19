-- Notifications (EOD prompt) + email cache stubs for Gmail Phase 2.
-- EOD cron at 6pm America/New_York is NOT wired here — needs scheduler
-- credentials (Supabase scheduled Edge Function). Schema + UI are ready.

create type public.notification_kind as enum (
  'eod_no_interaction',
  'open_email_threads'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where dismissed_at is null;

alter table public.notifications enable row level security;

create policy "notifications_own_read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_own_update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_elevated_insert"
  on public.notifications for insert
  to authenticated
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));

create type public.email_thread_status as enum ('open', 'done', 'ignored');

create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  gmail_address text not null,
  refresh_token_enc text,
  history_id text,
  watch_expiry timestamptz,
  connected_at timestamptz not null default now(),
  unique (user_id)
);

create table public.email_threads (
  id uuid primary key default gen_random_uuid(),
  email_account_id uuid not null references public.email_accounts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  gmail_thread_id text not null,
  client_id uuid references public.clients (id),
  subject text,
  status public.email_thread_status not null default 'open',
  last_message_at timestamptz,
  summary text,
  resolved_at timestamptz,
  resolved_by uuid references public.users (id),
  interaction_id uuid references public.interactions (id),
  created_at timestamptz not null default now(),
  unique (email_account_id, gmail_thread_id)
);

create index email_threads_user_open_idx
  on public.email_threads (user_id, last_message_at desc)
  where status = 'open';

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads (id) on delete cascade,
  gmail_message_id text not null,
  from_address text,
  to_addresses text[],
  subject text,
  snippet text,
  body_text text,
  direction public.interaction_direction,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (thread_id, gmail_message_id)
);

alter table public.email_accounts enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;

create policy "email_accounts_own"
  on public.email_accounts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "email_threads_own"
  on public.email_threads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "email_messages_own"
  on public.email_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.email_threads t
      where t.id = email_messages.thread_id
        and t.user_id = auth.uid()
    )
  );

create policy "email_messages_elevated_all"
  on public.email_messages for all
  to authenticated
  using (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'))
  with check (public.current_user_role() in ('tl', 'hod', 'admin', 'sysadmin'));
