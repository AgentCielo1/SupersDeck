-- =============================================================================
-- Set a password for a user directly in Postgres
-- =============================================================================
-- Bypasses SMTP entirely. Useful when:
--   - Custom SMTP is broken / not yet configured
--   - You want to seed initial users without sending emails
--   - You need to reset a forgotten password without the recovery flow
--
-- Run this in the Supabase SQL Editor. The pgcrypto extension is already
-- enabled on every Supabase project, so crypt()/gen_salt() just work.
--
-- After running, the user can sign in at /login on the "Password" tab using
-- the email + the password you set here.
-- =============================================================================

-- Candiany (admin)
update auth.users
   set encrypted_password = crypt('CandyAdmin2026!', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where lower(email) = lower('CandianyRodriguez@gmail.com');

-- Adam (super) — only runs if Adam's user already exists in auth.users.
-- If he doesn't yet, create him first via Supabase dashboard:
--   Authentication → Users → Add user → "Create new user" → enter email,
--   check "Auto Confirm User", you can skip password (we'll set it here).
update auth.users
   set encrypted_password = crypt('AdamSuper2026!', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where lower(email) = lower('adam21nunez@gmail.com');

-- Verify (run as a separate query):
-- select email, email_confirmed_at, last_sign_in_at from auth.users
-- where lower(email) in (lower('CandianyRodriguez@gmail.com'), lower('adam21nunez@gmail.com'));
