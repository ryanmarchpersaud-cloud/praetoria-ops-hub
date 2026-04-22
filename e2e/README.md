# E2E Regression — Safety & Incidents Header

End-to-end Playwright regression suite that runs after every release to verify
the Safety & Incidents page header (title + Report button) on iPhone Safari
and iPhone PWA (standalone) modes for both Worker and Subcontractor portals.

## What it covers

For each combination of:

- **Modes:** Safari, PWA standalone (`display-mode: standalone`)
- **Viewports:** iPhone 15 Pro (393×852), iPhone SE (375×667)
- **Pages:** `/worker/incidents`, `/subcontractor/incidents`

the test asserts:

1. The page title heading is visible and rendered fully **below the simulated
   iOS safe-area top inset** (47px).
2. The title and the **Report** button stay **inside the viewport** (no left/right clipping).
3. The Report button meets a **minimum tap-target size** (≥ 40×32 CSS px).
4. Tapping the Report button navigates to the **"new incident"** route
   (`/worker/incidents/new` or `/subcontractor/incidents/new`).

Tests are auto-skipped when the preview is unauthenticated (redirect to
`/login`). Seed a worker or subcontractor session before running for full coverage.

## Running

```bash
# Run the full suite
bunx playwright test e2e/safety-incidents-header.spec.ts

# Run a single mode/device
bunx playwright test e2e/safety-incidents-header.spec.ts -g "iPhone SE"
```

## When to run

After any change to:

- `src/pages/worker/WorkerIncidentsPage.tsx`
- `src/pages/subcontractor/SubcontractorIncidentsPage.tsx`
- `src/components/worker/WorkerLayout.tsx`
- `src/components/subcontractor/SubcontractorLayout.tsx`
- Global safe-area utilities (`src/index.css`, Tailwind config padding tokens)

Pair this with the manual checklist at
[`docs/qa/ios-safety-incidents-header-checklist.md`](../docs/qa/ios-safety-incidents-header-checklist.md)
for full release coverage.
