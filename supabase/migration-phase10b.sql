-- =============================================================================
-- Phase 10b — auto-translation columns on work_orders
-- =============================================================================
-- Idempotent. Safe to re-run.
--
-- When a tenant submits a WO in a non-English language (very common in your
-- portfolio — the lobby QR poster is bilingual EN/ES for a reason), the
-- server detects the language and stores both the original text (in `title`
-- and `description`) AND an English translation (`title_en` /
-- `description_en`). `source_language` stores the ISO 639-1 code that came
-- back from detection ('es', 'en', 'zh', etc).
--
-- Admin/super views render English; the tenant track page renders original.
-- Both versions print on the WO form so a vendor + tenant can both read it.
-- =============================================================================

alter table work_orders
  add column if not exists title_en        text,
  add column if not exists description_en  text,
  add column if not exists source_language text;
