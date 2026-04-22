/**
 * iPhone-only visual regression — header cutoff detector
 *
 * Captures Safety & Incidents and other key signed-in subpages on simulated
 * iPhone viewports after layout changes and FAILS if the page title or the
 * top-right action button is clipped by the iOS safe-area top inset.
 *
 * For each (mode × viewport × page) combination we:
 *   1. Inject a real iOS-like safe-area top inset (browsers don't expose insets
 *      headlessly).
 *   2. Snapshot the top header strip to /test-results/iphone-header-cutoff/
 *      so reviewers can eyeball the regression diff.
 *   3. Assert the title heading + the trailing action pill are fully below the
 *      unsafe area, on-screen horizontally, and meet a minimum tap target.
 *
 * Auto-skips when preview is unauthenticated (redirects to /login).
 *
 * Pair with: e2e/safety-incidents-header.spec.ts (functional click coverage)
 *            docs/qa/ios-safety-incidents-header-checklist.md (manual QA)
 */
import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";
import path from "node:path";

const SAFE_AREA_TOP_PX = 47; // notch-class iPhones
const HEADER_STRIP_HEIGHT = 180; // px captured from the top for the snapshot
const SNAPSHOT_DIR = "test-results/iphone-header-cutoff";

const IPHONE_VIEWPORTS = [
  { name: "iphone-15-pro", width: 393, height: 852 },
  { name: "iphone-se", width: 375, height: 667 },
] as const;

const MODES = [
  {
    name: "safari",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    standalone: false,
  },
  {
    name: "pwa",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    standalone: true,
  },
] as const;

/**
 * Subpages we want guarded against header cutoff.
 * `actionRegex` is the trailing top-right pill (Report / Edit / Add etc.).
 * `actionRegex: null` means the page has no trailing action — only title is checked.
 */
const PAGES = [
  {
    label: "worker-safety-incidents",
    path: "/worker/incidents",
    titleRegex: /safety\s*&\s*incidents/i,
    actionRegex: /^report$/i,
  },
  {
    label: "worker-home",
    path: "/worker",
    titleRegex: /(good\s*(morning|afternoon|evening)|welcome|today)/i,
    actionRegex: null,
  },
  {
    label: "worker-schedule",
    path: "/worker/schedule",
    titleRegex: /schedule/i,
    actionRegex: null,
  },
  {
    label: "worker-more",
    path: "/worker/more",
    titleRegex: /more/i,
    actionRegex: null,
  },
  {
    label: "subcontractor-incidents",
    path: "/subcontractor/incidents",
    titleRegex: /incidents\s*&\s*damage/i,
    actionRegex: /^report$/i,
  },
  {
    label: "subcontractor-home",
    path: "/subcontractor",
    titleRegex: /(home|welcome|today|good\s*(morning|afternoon|evening))/i,
    actionRegex: null,
  },
] as const;

async function injectSafeArea(page: Page, inset: number, standalone: boolean) {
  await page.addInitScript(
    ({ inset, standalone }) => {
      const style = document.createElement("style");
      style.id = "__test_safe_area__";
      // Force a real top inset so calc(env(safe-area-inset-top, 0px) + …) resolves.
      style.textContent = `
        :root { --__test_safe_area_top: ${inset}px; }
        @supports (padding: env(safe-area-inset-top)) {
          html { --safe-area-inset-top: ${inset}px; }
        }
      `;
      document.documentElement.style.setProperty(
        "scroll-padding-top",
        `${inset}px`,
      );
      document.head.appendChild(style);

      if (standalone) {
        const mm = window.matchMedia.bind(window);
        // @ts-expect-error test override
        window.matchMedia = (q: string) => {
          if (q.includes("display-mode: standalone")) {
            return {
              matches: true,
              media: q,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false,
            } as MediaQueryList;
          }
          return mm(q);
        };
      }
    },
    { inset, standalone },
  );
}

for (const mode of MODES) {
  for (const viewport of IPHONE_VIEWPORTS) {
    for (const pageDef of PAGES) {
      const id = `${mode.name}__${viewport.name}__${pageDef.label}`;

      test.describe(`iPhone header cutoff · ${id}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          userAgent: mode.userAgent,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
        });

        test(`header + action stay below safe area (${id})`, async ({
          page,
        }) => {
          await injectSafeArea(page, SAFE_AREA_TOP_PX, mode.standalone);
          await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });

          if (/\/login/i.test(page.url())) {
            test.skip(
              true,
              "Unauthenticated preview — seed a signed-in session to run this check.",
            );
            return;
          }

          // ---------- Snapshot 1: top strip (notch context) ----------
          const stripPath = path.join(SNAPSHOT_DIR, `${id}__strip.png`);
          await page.screenshot({
            path: stripPath,
            clip: {
              x: 0,
              y: 0,
              width: viewport.width,
              height: Math.min(HEADER_STRIP_HEIGHT, viewport.height),
            },
          });

          // ---------- Title ----------
          const title = page.getByRole("heading", { name: pageDef.titleRegex }).first();
          await expect(title, `title heading for ${pageDef.label}`).toBeVisible({
            timeout: 10_000,
          });

          const titleBox = await title.boundingBox();
          expect(titleBox, "title bounding box").not.toBeNull();
          if (!titleBox) return;

          // ---------- Snapshot 2: full header row element ----------
          // Walk up from the title to the nearest .page-header-row, header,
          // or sticky/top container so we capture the WHOLE row (title +
          // trailing action), not just the strip.
          const headerRow = title
            .locator(
              "xpath=ancestor-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' page-header-row ') or self::header][1]",
            )
            .first();

          const headerRowExists = (await headerRow.count()) > 0;
          const headerRowPath = path.join(SNAPSHOT_DIR, `${id}__header-row.png`);
          let headerRowBox: Awaited<ReturnType<typeof title.boundingBox>> = null;

          if (headerRowExists) {
            try {
              await headerRow.screenshot({ path: headerRowPath });
              headerRowBox = await headerRow.boundingBox();
            } catch {
              // element-level screenshot can fail if the row is partially off-screen;
              // fall back to a viewport-clipped capture using the bounding box.
              headerRowBox = await headerRow.boundingBox();
              if (headerRowBox) {
                await page.screenshot({
                  path: headerRowPath,
                  clip: {
                    x: Math.max(0, headerRowBox.x),
                    y: Math.max(0, headerRowBox.y),
                    width: Math.min(headerRowBox.width, viewport.width),
                    height: Math.min(headerRowBox.height, viewport.height),
                  },
                });
              }
            }
          }

          // Header row itself must clear the safe-area inset.
          if (headerRowBox) {
            expect(
              headerRowBox.y,
              `${pageDef.label}: headerRow.top ${headerRowBox.y}px must clear safe-area inset (${SAFE_AREA_TOP_PX}px). Snapshot: ${headerRowPath}`,
            ).toBeGreaterThanOrEqual(SAFE_AREA_TOP_PX);
          }

          expect(
            titleBox.y,
            `${pageDef.label}: title.top ${titleBox.y}px must clear safe-area inset (${SAFE_AREA_TOP_PX}px). Snapshot: ${stripPath}`,
          ).toBeGreaterThanOrEqual(SAFE_AREA_TOP_PX);

          expect(
            titleBox.x,
            `${pageDef.label}: title clipped on left edge`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            titleBox.x + titleBox.width,
            `${pageDef.label}: title clipped on right edge`,
          ).toBeLessThanOrEqual(viewport.width + 1);

          // ---------- Trailing action button (optional) ----------
          if (pageDef.actionRegex) {
            const action = page.getByRole("button", { name: pageDef.actionRegex }).first();
            await expect(action, `${pageDef.label}: action button`).toBeVisible();

            const btnBox = await action.boundingBox();
            expect(btnBox, "action bounding box").not.toBeNull();
            if (!btnBox) return;

            expect(
              btnBox.y,
              `${pageDef.label}: action.top ${btnBox.y}px must clear safe-area inset (${SAFE_AREA_TOP_PX}px). Snapshot: ${headerRowPath}`,
            ).toBeGreaterThanOrEqual(SAFE_AREA_TOP_PX);

            expect(
              btnBox.x,
              `${pageDef.label}: action clipped on left edge`,
            ).toBeGreaterThanOrEqual(0);
            expect(
              btnBox.x + btnBox.width,
              `${pageDef.label}: action clipped on right edge. Snapshot: ${snapshotPath}`,
            ).toBeLessThanOrEqual(viewport.width + 1);

            // Minimum tap target.
            expect(btnBox.width, `${pageDef.label}: action too narrow`).toBeGreaterThanOrEqual(40);
            expect(btnBox.height, `${pageDef.label}: action too short`).toBeGreaterThanOrEqual(32);

            // Title and action must not overlap horizontally on the same row.
            const sameRow = Math.abs(titleBox.y - btnBox.y) < Math.max(titleBox.height, btnBox.height);
            if (sameRow) {
              const titleRight = titleBox.x + titleBox.width;
              expect(
                titleRight,
                `${pageDef.label}: title overlaps action button on the same row. Snapshot: ${snapshotPath}`,
              ).toBeLessThanOrEqual(btnBox.x + 1);
            }
          }
        });
      });
    }
  }
}
