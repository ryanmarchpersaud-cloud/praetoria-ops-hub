# iOS Build 11 Release Checklist

**Status:** Pending — contingent on Apple Review outcome for Build 10.  
**Created:** 2026-06-08  
**Applies to:** iOS Version 1.1 Build 11 (future)  
**Does NOT apply to:** Build 10 (already in Apple Review; do not modify).

---

## Context

Build 10 is currently in Apple Review. The following items are reserved for a **future** Build 11 release, triggered by either:

1. **Apple rejection of Build 10** → Build 11 addresses Apple's feedback + the items below.
2. **Apple approval of Build 10** → Build 11 may be prepared later as a security/maintenance update.

---

## Pre-Archive Checklist

### 1. Security Fixes (already confirmed in codebase, must be included)

These fixes were merged after Build 10 was archived. They must be present in the Build 11 bundle.

| # | Fix | File(s) | Verification |
|---|-----|---------|------------|
| 1.1 | **Agreement print XSS sanitization** | `src/pages/AgreementDetailPage.tsx` | `DOMPurify.sanitize()` applied to `agreement.body_html` before print-window write. HTML entity encoding (`esc`) on all dynamic fields in the print template. |
| 1.2 | **Incident print XSS sanitization** | `src/components/incident/IncidentPrintButton.tsx` | HTML entity encoding (`esc`) on all dynamic fields (`report.description`, `report.location`, `report.people_involved`, etc.) in the print template. |
| 1.3 | **Pay Stub print XSS sanitization** | `src/components/PayStubDetailDialog.tsx` | HTML entity encoding (`esc`) inside `buildPrintHtml()` applied to `displayName`, `displayRole`, `employeeAddress`, `companyName`, `runNumber`, `employeeId`, `stub.notes`, `company.physical_address`, `company.phone`, `company.support_email`/`email`, and earnings/deduction/employer-contribution labels. Same defensive pattern as 1.1 and 1.2. Merged after Build 10. |

### 2. Apple Review Feedback (conditional)

| # | Item | Status |
|---|------|--------|
| 2.1 | If Apple rejects Build 10, capture exact rejection reason(s) and ticket number | Pending |
| 2.2 | Map each rejection reason to required code/config changes | Pending |
| 2.3 | Verify fixes compile and pass local smoke tests | Pending |
| 2.4 | Update `Info.plist` or entitlements if required by Apple | Pending |

### 3. Customer Invoice / Receipt / PDF / Billing / Quote Visibility

| # | Item | Verification |
|---|------|--------------|
| 3.1 | Customer can view invoice list in portal | `/portal/PortalBilling.tsx` |
| 3.2 | Customer can open individual invoice detail | `/pages/portal/PortalBilling.tsx` or detail route |
| 3.3 | Customer can view/download/print invoice PDF | `InvoicePrint.tsx` or embedded PDF viewer |
| 3.4 | Paid invoice receipt PDF is accessible | Receipt generation / `FinanceReceipts` route |
| 3.5 | Billing history loads without error | Billing history API call + rendering |
| 3.6 | Saved card display is visible on billing/payment settings | `/pages/PaymentsSettingsPage.tsx` or `/portal/PortalAccount.tsx` — card-on-file list renders |
| 3.7 | Customer can view quote list in portal | `/pages/portal/PortalQuotes.tsx` |
| 3.8 | Customer can open individual quote detail | Quote detail route in customer portal |
| 3.9 | Customer can view/download/print quote PDF | `QuotePrint.tsx` or embedded PDF viewer |
| 3.10 | Portal routing (deep links, back navigation, refresh) works without 404 or blank screens | All portal routes: `/portal/*` |

### 4. Profile & Security / Password Visibility

| # | Item | Verification |
|---|------|--------------|
| 4.1 | Profile page renders for authenticated user | `/portal/PortalAccount.tsx` or `/pages/AccountPrivacyPage.tsx` |
| 4.2 | Change password form is accessible and functional | `/pages/ChangePassword.tsx` |
| 4.3 | Password visibility toggle (show/hide) works on iOS Safari/WKWebView | UI input `type` toggle |
| 4.4 | Security settings (2FA, sessions, etc.) render correctly | Security section in account settings |

### 5. Full iOS QA Before Archive / Upload

| # | Item | Verification Method |
|---|------|---------------------|
| 5.1 | App launches to correct initial route (login or dashboard) | Manual smoke test on physical device or Simulator |
| 5.2 | Safe-area insets respected on iPhone 15 Pro, iPhone SE, iPad | Visual inspection; confirm `contentInset: 'always'` in Capacitor config |
| 5.3 | All portal tabs/navigations work without 404s | Walk through admin, worker, subcontractor, customer portals |
| 5.4 | PDFs render inside `iframe` or `embed` tags (Safari/WKWebView can block pop-ups) | Test invoice PDF, agreement PDF, receipt PDF |
| 5.5 | Camera/upload flows work if touched (worker photos, incident photos) | `src/lib/nativeCamera.ts` — confirm permissions in `Info.plist` |
| 5.6 | Status bar styling correct (`DARK` style, white background) | `capacitor.config.ts` plugins.StatusBar config |
| 5.7 | No console errors or network failures on launch | Safari Web Inspector attached to Simulator/device |
| 5.8 | Service worker / PWA manifest does not interfere with Capacitor | `src/main.tsx` skips SW registration when in Capacitor |
| 5.9 | Low-memory / crash-reload detection functional | `src/main.tsx` iOS OOM logic — verify `sessionStorage` markers |
| 5.10 | Payment flows (Stripe) open correctly in SFSafariViewController or external browser | Test card save, checkout — confirm `window.open` or redirect behavior |
| 5.11 | Auth session persists across app backgrounding | Login → background app → foreground → confirm still authenticated |
| 5.12 | Build number and version string match in Xcode and App Store Connect | `ios/App/App/Info.plist` CFBundleShortVersionString and CFBundleVersion |

---

## Archive & Upload Steps (for Build 11 only)

1. `git pull` latest `main` (must include the two XSS fixes).
2. `npm install` to ensure lockfile alignment.
3. `npm run build` → verify `dist/` contains updated assets.
4. `npx cap sync ios` → copies `dist/` into `ios/App/App/public`.
5. Open `ios/App/App.xcodeproj` in Xcode on a Mac.
6. Bump **Build** number (e.g., 10 → 11). Do **not** change Version unless required.
7. Select **Any iOS Device (arm64)** as destination.
8. **Product → Archive**.
9. In Organizer, validate and **Distribute App → App Store Connect → Upload**.
10. In App Store Connect, verify the new build appears under the correct version.

---

## Explicit Do-Not-Change List for Build 11 Preparation

Unless Apple feedback specifically requires it, do **not** modify:

- Android / Google Play build or store listing
- `capacitor.config.ts` appId or appName
- Supabase schema, RLS policies, or Edge Functions
- Stripe integration, payment flows, or webhook handlers
- Auth provider configuration, roles, or routing guards
- Customer, admin, worker, or subcontractor portal business logic
- Existing invoice/receipt/quote display code (unless fixing a confirmed bug)

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Release Owner | | | ☐ |
| QA Lead | | | ☐ |
| Security Review | | | ☐ |

---

*This document is a living plan. Update sections 2.1–2.4 immediately upon receiving Apple Review feedback.*
