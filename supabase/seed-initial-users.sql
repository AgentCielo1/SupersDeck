-- =============================================================================
-- SupersDeck — seed initial users
-- =============================================================================
-- Run this AFTER both Candiany and Adam have clicked their magic-link emails
-- and signed in at least once (which creates their auth.users + profiles
-- rows via the trigger). This sets their full_name and locks in roles by
-- email — no UUIDs needed.
-- =============================================================================

update profiles
   set full_name = 'Candiany Rodriguez',
       role = 'admin'
 where lower(email) = lower('CandianyRodriguez@gmail.com');

update profiles
   set full_name = 'Adam Nunez',
       role = 'super'
 where lower(email) = lower('adam21nunez@gmail.com');

-- Verify (run as a separate query):
-- select email, full_name, role from profiles order by role, email;
