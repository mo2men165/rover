-- Big Sprint Part 5: Index Panel query indexes
-- Composite indexes for LIMIT-1 "latest per client/type" lookups on profile load.
-- No new tables — read/aggregation layer only.

-- interactions: last meeting / last check-in by client + type
create index if not exists interactions_client_type_occurred_at_idx
  on public.interactions (client_id, type, occurred_at desc);

-- interactions: latest check-in across eligible types (OR/IN plan)
create index if not exists interactions_client_checkin_occurred_at_idx
  on public.interactions (client_id, occurred_at desc)
  where type in ('call', 'email', 'sms', 'whatsapp', 'slack');

-- complaints: most recent issue for a client (any status)
create index if not exists complaints_client_opened_at_idx
  on public.complaints (client_id, opened_at desc);

-- upsells: most recent confirmed upsell for a company
create index if not exists upsells_company_created_at_idx
  on public.upsells (company_id, created_at desc);

-- upsell_opportunities: latest non-terminal opp for a client
-- (active_idx already covers stage filter; this adds client-leading lookup)
create index if not exists upsell_opportunities_client_created_at_idx
  on public.upsell_opportunities (client_id, created_at desc)
  where stage in ('opportunity', 'pitched', 'pending');
