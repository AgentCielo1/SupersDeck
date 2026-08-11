#!/usr/bin/env bash
# =============================================================================
#  dev-sim.sh — run the app against the LOCAL Supabase stack, for simulation
# =============================================================================
#  .env.local points NEXT_PUBLIC_SUPABASE_URL at production (izfz). The route
#  simulator signs in against the local stack, and a session minted on one
#  Supabase project can never validate against another — the app answered every
#  authenticated request with a 307 to /login, which looked like an auth bug in
#  the scenario rather than a target mismatch.
#
#  This starts the dev server bound to the local stack so the simulator and the
#  app share an identity provider. It exists so nobody is ever tempted to point
#  a write-heavy simulation at the production project to "make the test pass".
# =============================================================================
set -uo pipefail
export NEXT_PUBLIC_SUPABASE_URL="${SIM_SUPABASE_URL:-http://127.0.0.1:54421}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${SIM_SUPABASE_ANON_KEY:?set SIM_SUPABASE_ANON_KEY}"
# MUST be a real service_role key. Defaulting this to the anon key made every
# getServerSupabase() call subject to RLS, so service-role routes 404'd exactly
# like converted ones — and I mis-read that as "the conversion broke the public
# intake" and reverted two handlers on false evidence. A test rig that silently
# downgrades a privilege level fabricates the failure it is meant to detect.
if [ -z "${SIM_SUPABASE_SERVICE_KEY:-}" ]; then
  echo "REFUSING: set SIM_SUPABASE_SERVICE_KEY to the local stack's service_role key." >&2
  echo "  Without it, service-role routes run as anon and fail in ways that look like app bugs." >&2
  exit 1
fi
export SUPABASE_SERVICE_ROLE_KEY="$SIM_SUPABASE_SERVICE_KEY"

# Guard: the key must actually carry role=service_role.
_role=$(printf '%s' "$SIM_SUPABASE_SERVICE_KEY" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | sed -n 's/.*"role":"\([a-z_]*\)".*/\1/p')
if [ "$_role" != "service_role" ]; then
  echo "REFUSING: SIM_SUPABASE_SERVICE_KEY carries role=\"$_role\", not service_role." >&2
  exit 1
fi

case "$NEXT_PUBLIC_SUPABASE_URL" in
  *supabase.co*) echo "REFUSING: dev-sim must not point at a hosted project ($NEXT_PUBLIC_SUPABASE_URL)" >&2; exit 1;;
esac

echo "dev-sim → $NEXT_PUBLIC_SUPABASE_URL"
exec npx next dev -p "${PORT:-3010}"
