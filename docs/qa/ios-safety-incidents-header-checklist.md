# iPhone Layout Regression Test Checklist — Safety & Incidents Header

Run this checklist after every release that touches:
- `src/pages/worker/WorkerIncidentsPage.tsx`
- `src/pages/subcontractor/SubcontractorIncidentsPage.tsx`
- `src/components/worker/WorkerLayout.tsx` / `SubcontractorLayout.tsx`
- Global safe-area utilities or `index.css` padding tokens
- Any shared mobile header / nav components

## Scope

Verify the **"Safety & Incidents"** page header (title + **Report** button) renders fully below the iOS safe area and remains tappable across iPhone browsers and PWA modes.

## Devices & Modes

Test on at least one device per row. Prefer a device with a notch or Dynamic Island.

| Device                | Safari | Chrome iOS | PWA (Add to Home Screen) |
|-----------------------|:------:|:----------:|:------------------------:|
| iPhone 15 / 15 Pro    |   ☐    |     ☐      |            ☐             |
| iPhone 13 / 14        |   ☐    |     ☐      |            ☐             |
| iPhone SE (small)     |   ☐    |     ☐      |            ☐             |

## Routes to Verify

- ☐ `/worker/incidents`
- ☐ `/subcontractor/incidents`

## Header Visibility Checks

For each route × device × mode:

- ☐ Page title **"Safety & Incidents"** (worker) / **"Incidents & Damage"** (subcontractor) is fully visible — not clipped under the notch, status bar, or browser chrome.
- ☐ **Report** button (top-right) is fully visible and not clipped on the right edge.
- ☐ Tapping the **Report** button reliably opens `/worker/incidents/new` or `/subcontractor/incidents/new`.
- ☐ Header sits below `env(safe-area-inset-top)` — visible breathing room above the title.
- ☐ Title and Report button align on a single row at standard widths; wrap cleanly on iPhone SE without overlap.
- ☐ Title does not overflow horizontally; long text truncates or wraps inside its flex container.

## Orientation

- ☐ Portrait: header renders correctly.
- ☐ Landscape: header respects `safe-area-inset-left/right`; Report button still tappable.

## PWA-Specific

- ☐ Installed PWA opens in standalone mode (no Safari chrome).
- ☐ Header padding still leaves space below status bar (no underlap).
- ☐ Pull-to-refresh / scroll does not push header into the unsafe area.

## Regression Sanity (Adjacent Pages)

Confirm no regression introduced on related mobile pages:

- ☐ `/worker` (home) header unaffected
- ☐ `/worker/schedule` header unaffected
- ☐ `/worker/more` header unaffected
- ☐ `/subcontractor` (home) header unaffected
- ☐ `/subcontractor/schedule` header unaffected

## Functional Smoke

- ☐ Empty state renders ("No incident reports filed.") with **File a Report** button visible.
- ☐ List of existing reports scrolls without the header overlapping cards.
- ☐ Tapping a report row navigates to the detail page.

## CSS Contract (Code Review)

When reviewing diffs, confirm the page container preserves:

```tsx
className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-4 ..."
```

And the header row preserves:

```tsx
<div className="flex items-start justify-between gap-3 flex-wrap">
  <h1 className="... min-w-0 flex-1">…</h1>
  <Link className="shrink-0">…</Link>
</div>
```

Reject the change if any of these are removed without an equivalent shared safe-area wrapper replacing them.

## Sign-off

- Tester: __________________________
- Release / commit: __________________
- Date: ____________________________
- Result: ☐ Pass  ☐ Fail (file bug with screenshots from each failing device/mode)
