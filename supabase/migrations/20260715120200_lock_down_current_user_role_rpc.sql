-- Sprint 1: security-advisor follow-up. current_user_role() is used
-- internally by RLS policies but was also exposed as a public RPC
-- endpoint (/rest/v1/rpc/current_user_role) callable by anon. Restrict
-- execution to the authenticated role only.

revoke execute on function public.current_user_role() from public;
revoke execute on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;
