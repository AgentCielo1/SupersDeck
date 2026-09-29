-- =============================================================================
-- SupersDeck — policy health: let the app SEE its own RLS policies
-- =============================================================================
-- Four times a missing policy broke production silently (units UPDATE, the
-- cron's building read, the work-orders storage bucket, work_orders UPDATE).
-- /api/health now compares the live policy list against the manifest in
-- src/lib/policy-manifest.ts and turns degraded when anything is missing —
-- this function is how the server reads that list. PostgREST does not expose
-- pg_catalog, hence the SECURITY DEFINER wrapper.
--
-- Service-role only: the policy layout is not for anonymous or ordinary
-- authenticated callers.
--
-- Run in the Supabase SQL editor. Idempotent.
-- =============================================================================

create or replace function public.list_app_policies()
returns table(schemaname text, tablename text, policyname text, cmd text, permissive text)
language sql
stable
security definer
set search_path = public
as $$
  select p.schemaname::text, p.tablename::text, p.policyname::text,
         p.cmd::text, p.permissive::text
    from pg_policies p
   where p.schemaname in ('public', 'storage');
$$;

revoke all on function public.list_app_policies() from public;
revoke all on function public.list_app_policies() from anon;
revoke all on function public.list_app_policies() from authenticated;
grant execute on function public.list_app_policies() to service_role;

-- ------------------------------- verify --------------------------------------
--   select count(*) from public.list_app_policies();   -- expect > 30
-- Then GET /api/health with Authorization: Bearer <CRON_SECRET> — the
-- response's `policies` block lists anything missing (expect none).
