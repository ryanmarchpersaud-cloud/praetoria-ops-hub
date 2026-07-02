# Property Owner Portal — Roadmap & Immediate Polish

This is a **planning document only**. No new finance, payments, statements, approvals, board, or role features will be built until each phase is explicitly approved. Only the small header/status polish below will be shipped now.

---

## Current Foundation (Locked — do not modify)
Home · Properties · Maintenance · Expenses · Documents · Account
RLS, roles, routes, signed URLs, tenant privacy, Admin/Tenant/Worker/Sub/Customer portals, Finance, HR, Stripe, saved cards, pay stubs, iOS/Android packaging — **untouched**.

---

## Immediate Work (safe polish only — ship now)

1. **Header title readability** — `src/components/owner/OwnerLayout.tsx`
   - "Property Owner Portal" → explicit white/light gray
   - Proper spacing, truncation, cannot collide with bell
   - Mobile-tested
2. **Friendly status labels** — extend `src/lib/statusLabel.ts`
   - `in_progress` → "In Progress", `on_hold` → "On Hold", `awaiting_parts` → "Awaiting Parts", etc.
   - Apply across OwnerHome, OwnerMaintenance, OwnerExpenses, OwnerProperties where raw enums still show.

Nothing else changes in this pass.

---

## Roadmap (each phase requires separate approval before build)

### Phase 5D — Owner Dashboard Enhancements
KPIs on `/owner`: assigned properties, total units, occupied, vacant, open maintenance, recent maintenance activity, recent owner-visible expenses, statement shortcut, documents shortcut, Praetoria contact card, "Items needing review" placeholder.
Read-only. Uses existing `pm_` tables + owner-scoped RLS. No new writes.

### Phase 5E — Properties / Units / Occupancy (Owner View)
Per-property drill-down: units list, occupied/vacant, lease active/ending/ended, rent summary (only if `owner_visible`), owner-visible manager notes, per-unit maintenance summary.
Strict exclusions enforced by RLS: tenant email/phone, emergency contacts, insurance, occupants, vehicles, pets, tenant private docs, deletion requests, admin notes, worker/sub private notes.

### Phase 5F — Maintenance / Work Orders (Owner View expansion)
Owner-visible requests + WOs with status, priority, property/unit, category, completion note, before/after photos (only when `owner_visible=true`), owner-facing summary.
Hidden: internal/tenant/worker/sub notes, sub pricing unless explicitly flagged.

### Phase 5G — Expenses (Owner View expansion)
Owner-visible expenses with category, date, property/unit, status, subtotal/GST/PST/total, owner note, owner-visible receipts (signed URLs).
Hidden: admin notes, unrelated properties, private receipts, internal accounting.

### Phase 5H — Documents (Owner View expansion)
Owner-visible categories: PM agreement, inspection reports, WO summaries, owner notices, property docs, owner-visible receipts, future monthly statements. Signed URLs only.

### Phase 5I — Owner Statements *(future, approval-gated)*
Fields: period, rent charged/collected, property expenses, maintenance expenses, management fees, taxes, adjustments/credits, net payout. Status: draft → reviewed → finalized → sent. PDF/print. Owner sees only after Admin finalizes/marks visible. **No automation, no payouts.**

### Phase 5J — Owner Approvals *(future, approval-gated)*
Maintenance estimate approval, large repair, expense approval, funding request. Approve/decline + comments + history + emergency exception notes. **Admin controls what is routed to owner. No auto-approvals.**

### Phase 5K — Messages / Updates *(future)*
Owner ↔ Admin messages, property notices, maintenance updates, statement notices, approval notifications. Built after 5I + 5J.

### Future (parked — not on active roadmap)
- **Board Member / Condo / Association**: new `board_member` role, board dashboard, minutes, agendas, budgets, voting, common-area maintenance, building notices. Kept separate from rental owners.
- **Property Manager / Leasing Agent roles**: scoped access to tenants, leases, units, maintenance, notices, documents, inspections, owner comms. **No Admin/Finance/Stripe/HR/payroll/SIN/bank access.**

---

## Explicitly NOT building (until separately approved)
Live rent payments · Stripe rent · owner payouts · automated statements · owner approvals · board portal · voting · finance automation · recurring billing · saved-card charging.

## Untouched invariants
Android/Google Play/iOS/App Store/icons/signing/package name · Stripe/saved cards/invoice payment logic · Customer/Tenant/Worker/Subcontractor portals · HR/Finance/pay stubs · service jobs/visits · auth/roles/RLS outside approved scope.

---

**Approve this plan** to ship the immediate header + status-label polish. Each Phase 5D+ item will be planned and approved individually before any build.
