# Property Photos — Public → Private Bucket Migration Plan

**Status:** PLANNED — not scheduled. Do not execute without explicit approval.
**Owner:** Security phase 2.
**Current risk:** Accepted for current release. Bucket `property-photos` is public; object keys are unguessable UUIDs.

---

## 1. Goal

Move the `property-photos` Supabase Storage bucket from **public** to **private**, and serve all property images via short-lived signed URLs, without breaking image rendering in Admin, Customer, Worker, or Subcontractor portals (web + iOS + Android).

---

## 2. Inventory — every place public property photo URLs are used

This list must be re-verified with a fresh `rg "property-photos"` and `rg "property_photo"` sweep at execution time. Current known surfaces:

### Database / storage
- Bucket: `property-photos` (public today)
- Tables referencing photo URLs/paths:
  - `properties` — `verification_photos`, `hazard_photos`, any `*_photo_url` columns
  - `property_site_alerts` — alert/hazard images
  - `visit_photos` — `photo_url` (separate bucket today, but audit for cross-reference)
  - `customer_documents` — if any property images stored here
  - `incident_reports` — site photo attachments referencing property images

### Components / routes (web)
- Admin:
  - `src/pages/PropertyDetail*.tsx`
  - `src/components/properties/PropertyPhotoGallery.tsx` (or equivalent)
  - `src/components/properties/PropertyHazardsCard.tsx`
  - `src/pages/admin/Properties*.tsx`
  - Service Management / Dispatch screens that preview property images
- Customer portal:
  - `src/pages/portal/PortalProperties.tsx`
  - `src/pages/portal/PortalPropertyDetail.tsx`
- Worker portal:
  - `src/pages/worker/WorkerVisitDetail.tsx`
  - `src/pages/worker/WorkerPropertyBrief.tsx` (site hazards, alerts)
  - Field forms that embed property images
- Subcontractor portal:
  - `src/pages/subcontractor/SubVisitDetail.tsx`
  - Property brief views
- Print/PDF:
  - Incident print (`IncidentPrintButton.tsx`) — images must inline as data URLs or signed URLs valid for the print window lifetime
  - Agreement print — same constraint
  - Invoice print — usually no property photos, but verify

### Mobile shells
- iOS Capacitor: WKWebView loading live web bundle — signed URLs work the same as desktop; verify CORS and cache behavior.
- Android TWA: Chrome Custom Tab — same as desktop browser; verify.

---

## 3. Signed URL strategy

### Generation
- Centralize in a single helper: `src/lib/storage/propertyPhotos.ts`
  ```ts
  export async function getPropertyPhotoUrl(path: string, expiresIn = 3600): Promise<string>
  export async function getPropertyPhotoUrls(paths: string[], expiresIn = 3600): Promise<Record<string,string>>
  ```
- Backed by `supabase.storage.from('property-photos').createSignedUrl(path, expiresIn)`.
- Default TTL: **1 hour** (3600s). Print views: **15 min** is enough; pages with long dwell time refresh in-place.

### Refresh
- React hook `usePropertyPhotoUrl(path)` returns `{ url, loading, error }` and refreshes when:
  - TTL < 5 minutes remaining and component is mounted
  - `visibilitychange` fires to `visible` after the tab was hidden longer than TTL
- Batch hook `usePropertyPhotoUrls(paths[])` to avoid N+1 storage calls; one `createSignedUrls` round-trip.

### Storage path convention
- Keep existing paths; do **not** rename. Migration is bucket-visibility only.
- Confirm no DB column stores a fully-qualified public URL. If any do, add a migration that strips the public prefix down to just the storage path, and update all writers to store paths only.

---

## 4. Portal-by-portal loading rules

| Portal | Loader | Notes |
|---|---|---|
| Admin | `usePropertyPhotoUrls` batch | Pre-fetch on property detail mount; show skeleton until resolved |
| Customer | `usePropertyPhotoUrl` per image | RLS already restricts which properties they can list; signed URL adds defense in depth |
| Worker | `usePropertyPhotoUrls` batch | Pre-fetch on visit start; cache in memory for offline-tolerant view |
| Subcontractor | `usePropertyPhotoUrls` batch | Same as worker |
| Print views | Pre-resolve all signed URLs **before** opening print window; embed as `<img src="...">` with TTL ≥ expected print duration |

---

## 5. Mobile considerations

- **iOS (Capacitor):** WKWebView honors signed URL query strings. Verify the bucket's S3-style query auth doesn't break under iOS image cache. Test on a real device, not just simulator.
- **Android (TWA):** Loads the same web bundle in Chrome; behavior matches desktop Chrome. Verify on a low-RAM device that image refresh on signed-URL expiry doesn't flicker.
- **Offline / poor connectivity:** Worker portal may cache last-known signed URL. Display fallback placeholder when both network and cached URL are stale.

---

## 6. Migration steps (execution runbook)

1. **Audit** — run `rg "property-photos|property_photo"` and update the inventory in section 2.
2. **Centralize** — introduce `propertyPhotos.ts` helper + hooks. Refactor every call site to use them, but **keep bucket public** during this PR. Ship and verify no regressions.
3. **Print pre-resolution** — update Incident/Agreement print to pre-resolve signed URLs before opening the print window.
4. **Flip bucket** — `supabase.storage.updateBucket('property-photos', { public: false })` via migration.
5. **Tighten storage RLS** — add SELECT policies on `storage.objects` for the bucket, gated by `is_ops_staff` OR customer-owns-property OR worker-assigned-to-property OR sub-assigned-to-property.
6. **Smoke test all four portals on web + iOS + Android.**
7. **Monitor** edge function logs and Sentry for 24h for broken-image reports.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Missed call site renders broken image | Med | Centralized helper + grep audit + QA matrix |
| Signed URL expires mid-session | Med | Auto-refresh hook + visibilitychange handler |
| Print view loses images when URL expires before user prints | Low | Pre-resolve with 15-min TTL right before opening window |
| iOS WKWebView caches signed URL past expiry | Low | Add `cache: 'no-store'` on fetch; use `<img>` with `key={url}` to force reload |
| Storage RLS misconfigured → users see 403 on their own properties | Med | Stage on test environment; verify each portal role manually before flip |
| Performance regression from N+1 signed URL calls | Med | Mandatory batch hook for any list view |

---

## 8. QA checklist

Run as **each** of: admin, ops_manager, customer, worker (assigned), worker (unassigned), subcontractor (assigned), subcontractor (unassigned).

- [ ] Property detail page — all photos render
- [ ] Property hazard photos render in site brief
- [ ] Property verification photos render
- [ ] Visit detail page — property photos render
- [ ] Field form with embedded property photo renders
- [ ] Incident print — photos render in print preview AND in PDF
- [ ] Agreement print — embedded images render
- [ ] Customer portal property list thumbnails render
- [ ] Worker mobile (iOS) — photos render on real device
- [ ] Worker mobile (Android TWA) — photos render on real device
- [ ] Unassigned worker gets 403 on direct storage URL (no leak)
- [ ] Logged-out user gets 403 on direct storage URL
- [ ] Photo upload flow still works for admin and worker
- [ ] Photo deletion flow still works
- [ ] No console errors or broken-image icons in any portal
- [ ] Image refresh works after tab is hidden 2+ hours

---

## 9. Rollback plan

If broken images are reported post-flip:
1. **Immediate:** `supabase.storage.updateBucket('property-photos', { public: true })` — single migration, < 1 minute.
2. The centralized helper continues to work (signed URLs on a public bucket are valid; public URLs are also valid).
3. Diagnose the broken portal/route, patch, re-test in staging.
4. Re-flip when green.

No code rollback required because the helper layer is bucket-visibility-agnostic.

---

## 10. Out of scope for this migration

- Migrating `visit-photos`, `customer-documents`, `agreement-pdfs`, or any other bucket. Each is its own decision.
- Renaming storage paths or restructuring folder layout.
- Changing photo upload UX.
- Image optimization / CDN layer.
