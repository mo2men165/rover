-- Missing `set search_path` on the two Sprint 3 trigger functions, flagged
-- by the security advisor. Every other function in this codebase
-- (current_user_role, get_commissions, and the companies-level trigger
-- these replace) sets this explicitly -- an oversight in the original
-- schema migration, fixed here.

create or replace function public.set_client_package_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.package_tier is not null then
    new.package_price := case new.package_tier
      when 'starter' then 450
      when 'pro' then 1215
      when 'growth' then 6775
    end;
  end if;
  return new;
end;
$$;

create or replace function public.set_client_skip_trace_rate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.skip_trace_rate_tier is not null and new.skip_trace_rate_tier <> 'custom' then
    new.skip_trace_rate := new.skip_trace_rate_tier::text::numeric;
  end if;
  return new;
end;
$$;
