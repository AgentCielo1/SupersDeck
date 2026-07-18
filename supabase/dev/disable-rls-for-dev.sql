-- =============================================================================
-- ██  DEV ONLY — DISABLE Row Level Security  ██  NEVER RUN AGAINST PRODUCTION
-- =============================================================================
--
--   ⚠⚠⚠  THIS SCRIPT REMOVES EVERY ROW-LEVEL SECURITY BARRIER  ⚠⚠⚠
--   Running it against the production Supabase project would let the anon
--   key read and write EVERY table. It lives under supabase/dev/ on purpose
--   and REFUSES to run until you explicitly mark the session as a throwaway
--   dev database (see the guard below).
--
--   Production uses supabase/auth-setup.sql instead, which RE-ENABLES RLS
--   with per-role policies. If you are looking at this file while wiring
--   prod, you want auth-setup.sql — not this.
--
-- Why this exists (dev / phase 1-3 single-user mode only):
--   Supabase enables RLS by default on new tables. With RLS on and no policies
--   attached, the `anon` role can't see or modify anything — which makes the
--   whole app look empty even though the rows are in Postgres. For a local /
--   throwaway dev project with a single super and no auth, disabling RLS is
--   the quickest way to get moving.
--
-- How to run (dev database ONLY):
--   1. Confirm you are connected to a DEV project (check the project ref in
--      the Supabase dashboard URL — not the one Vercel prod points at).
--   2. Run the whole file in one go (SQL editor "Run", or psql -f). The
--      transaction below aborts everything unless you first opt in by
--      uncommenting the SET line.
--
-- =============================================================================

begin;

-- ─── GUARD ── uncomment the next line ONLY on a throwaway dev database ───────
-- set local app.i_am_a_disposable_dev_database = 'yes';

do $$
begin
  if coalesce(current_setting('app.i_am_a_disposable_dev_database', true), '') <> 'yes' then
    raise exception using
      message = 'REFUSING to disable RLS: this script is for throwaway DEV databases only.',
      detail  = 'Disabling RLS on production would expose every table to the anon key.',
      hint    = 'If (and only if) this is a disposable dev database, uncomment the "set local app.i_am_a_disposable_dev_database" line above and re-run. For production, use supabase/auth-setup.sql instead.';
  end if;
end $$;

alter table buildings                disable row level security;
alter table units                    disable row level security;
alter table compliance_templates     disable row level security;
alter table compliance_items         disable row level security;
alter table vendor_categories        disable row level security;
alter table vendor_discovery_sources disable row level security;
alter table vendors                  disable row level security;
alter table work_orders              disable row level security;
alter table work_order_updates       disable row level security;
alter table heat_logs                disable row level security;
alter table certifications           disable row level security;

commit;

-- Re-enabling later (phase 4+): run supabase/auth-setup.sql, which turns RLS
-- back on for every table and installs the per-role policies. Sample policy:
--
--   alter table buildings enable row level security;
--   create policy "super reads own buildings"
--     on buildings for select to authenticated
--     using (auth.uid() in (select user_id from building_supers where building_id = buildings.id));
