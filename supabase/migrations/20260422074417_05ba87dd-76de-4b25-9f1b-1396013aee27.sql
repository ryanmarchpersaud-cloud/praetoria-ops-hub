-- ──────────────────────────────────────────────────────────────────────────
-- Phase 3: Lock down the public `attachments` bucket via path-based RLS.
--
-- Strategy: keep bucket public for outbound-facing assets (brand logos,
-- incident-share PDFs that are emailed to external parties like police/EMS/WCB),
-- but block anonymous direct-URL access to user-to-user content (messaging
-- files, incident photos). Only authenticated users can read those paths.
--
-- Stripe webhook hardening: dedupe table for event-id idempotency.
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Stripe webhook event dedupe table
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role (edge function) can read/write. No client policies = no client access.
-- Service role bypasses RLS so the webhook function works without explicit policies.

-- 2. Path-based public read policy on the `attachments` bucket.
-- Drop any prior catch-all public read; replace with a narrower policy that
-- only allows anonymous reads on whitelisted prefixes.
DO $$
BEGIN
  -- Remove the default permissive public read if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'attachments_public_read'
  ) THEN
    DROP POLICY "attachments_public_read" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read attachments'
  ) THEN
    DROP POLICY "Public read attachments" ON storage.objects;
  END IF;
END $$;

-- Anonymous users can only read brand assets and outbound incident shares.
CREATE POLICY "attachments_anon_read_whitelisted_prefixes"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'attachments'
  AND (
    name LIKE 'praetoria-logo-%'
    OR name LIKE 'company-logo-%'
    OR name LIKE 'incident-shares/%'
  )
);

-- Authenticated users can read everything in attachments (existing behavior).
CREATE POLICY "attachments_authenticated_read_all"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Authenticated users can upload to attachments (existing behavior).
CREATE POLICY "attachments_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Authenticated users can update their own uploads (for upsert flows).
CREATE POLICY "attachments_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'attachments' AND owner = auth.uid());