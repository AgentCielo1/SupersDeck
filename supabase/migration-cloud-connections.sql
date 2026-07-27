-- Cloud-storage connections (Dropbox today; provider-agnostic by design).
-- ONE row per org (single-org deploy → id 'default'). Holds the OAuth refresh
-- token, so: RLS ON with NO policies = service-role only. The browser never
-- sees tokens; all cloud calls go through /api/cloud/* server routes.
create table if not exists cloud_connections (
  id text primary key default 'default',
  provider text not null default 'dropbox',
  app_key text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  account_email text,
  account_name text,
  connected_by text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cloud_connections enable row level security;
-- Intentionally NO policies: only the service-role key (server) can read/write.
