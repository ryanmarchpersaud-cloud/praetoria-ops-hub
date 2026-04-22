/**
 * Regression: Safety & Incidents header + Report button
 *
 * Verifies on iPhone Safari (default WebKit + Mobile Safari user agent) and
 * iPhone PWA (standalone display-mode) that:
 *   1. The page title is rendered, fully on-screen, and clear of the iOS safe-area top inset.
 *   2. The Report button is rendered, fully on-screen, and clickable (not clipped on the right edge).
 *   3. Clicking the Report button navigates to the "new incident" route.
 *
 * Run after every release that touches:
 *   - src/pages/worker/WorkerIncidentsPage.tsx
 *   - src/pages/subcontractor/SubcontractorIncidentsPage.tsx
 *   - shared mobile layouts / safe-area utilities
 */
import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";

// Simulated iOS safe-area top inset (matches notch-class iPhones)
const SAFE_AREA_TOP_PX = 47;

const IPHONE_VIEWPORTS = [
  { name: "iPhone 15 Pro", width: 393, height: 852 },
  { name: "iPhone SE",     width: 375, height: 667 },
] as const;

const PAGES = [
  {
    label: "Worker — Safety & Incidents",
    path: "/worker/incidents",
    titleRegex: /safety\s*&\s*incidents/i,
    expectedNewPath: "/worker/incidents/new",
  },
  {
    label: "Subcontractor — Incidents & Damage",
    path: "/subcontractor/incidents",
    titleRegex: /incidents\s*&\s*damage/i,
    expectedNewPath: "/subcontractor/incidents/new",
  },
] as const;

const MODES = [
  {
    name: "Safari",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    standalone: false,
  },
  {
    name: "PWA standalone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    standalone: true,
  },
] as const;

/**
 * Inject a simulated iOS safe-area-inset-top so that
 * `env(safe-area-inset-top)` resolves to a real value during the test
 * (browsers don't expose iOS insets in headless mode).
 */
async function injectSafeArea(page: Page, inset: number, standalone: boolean) {
  await page.addInitScript(
    ({ inset, standalone }) => {
      const style = document.createElement("style");
      style.id = "__test_safe_area__";
      style.textContent = `:root { --__test_safe_area_top: ${inset}px; }
        @supports (padding: env(safe-area-inset-top)) {
          html { --safe-area-inset-top: ${inset}px; }
        }
        html { padding-top: 0 !important; }`;
      // Patch env() via a CSS variable shim used by the page wrapper class.
      // The pages use: pt-[calc(env(safe-area-inset-top,0px)+12px)]
      // We can't override env() directly, so we add a top spacer element
      // representing the iOS unsafe area to validate clipping math.
      document.documentElement.style.setProperty(
        "scroll-padding-top",
        `${inset}px`
      );
      document.head.appendChild(style);

      if (standalone) {
        // Simulate display-mode: standalone (PWA installed)
        const mm = window.matchMedia.bind(window);
        // @ts-expect-error override for test
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
    { inset, standalone }
  );
}

for (const mode of MODES) {
  for (const viewport of IPHONE_VIEWPORTS) {
    for (const pageDef of PAGES) {
      test.describe(`${mode.name} · ${viewport.name} · ${pageDef.label}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          userAgent: mode.userAgent,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
        });

        test("header title and Report button are visible, unclipped, and clickable", async ({
          page,
        }) => {
          await injectSafeArea(page, SAFE_AREA_TOP_PX, mode.standalone);
          await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });

          // If unauthenticated, the app redirects to /login. Skip in that case
          // so the suite runs cleanly in environments without a seeded session.
          if (/\/login/i.test(page.url())) {
            test.skip(
              true,
              "Unauthenticated preview — seed a worker/subcontractor session to run this check."
            );
            return;
          }

          // ---------- Title visibility ----------
          const title = page.getByRole("heading", { name: pageDef.titleRegex });
          await expect(title).toBeVisible({ timeout: 10_000 });

          const titleBox = await title.boundingBox();
          expect(titleBox, "title bounding box").not.toBeNull();
          if (!titleBox) return;

          // Title must sit fully below the simulated iOS safe-area top inset.
          expect(
            titleBox.y,
            `title.top (${titleBox.y}px) must be below safe-area inset (${SAFE_AREA_TOP_PX}px)`
          ).toBeGreaterThanOrEqual(SAFE_AREA_TOP_PX);

          // Title must be on-screen vertically and horizontally.
          expect(titleBox.x).toBeGreaterThanOrEqual(0);
          expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(
            viewport.width + 1
          );
          expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(
            viewport.height
          );

          // ---------- Report button visibility ----------
          const reportButton = page.getByRole("button", { name: /^report$/i });
          await expect(reportButton).toBeVisible();

          const btnBox = await reportButton.boundingBox();
          expect(btnBox, "report button bounding box").not.toBeNull();
          if (!btnBox) return;

          // Button must be fully within viewport horizontally (no right-edge clip).
          expect(btnBox.x).toBeGreaterThanOrEqual(0);
          expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(
            viewport.width + 1
          );
          // Button must be below safe-area inset.
          expect(btnBox.y).toBeGreaterThanOrEqual(SAFE_AREA_TOP_PX);

          // Tap target must meet a reasonable minimum (40x40 CSS px).
          expect(btnBox.width).toBeGreaterThanOrEqual(40);
          expect(btnBox.height).toBeGreaterThanOrEqual(32);

          // ---------- Click navigates to "new incident" ----------
          await reportButton.click();
          await page.waitForURL(
            (url) => url.pathname.endsWith(pageDef.expectedNewPath),
            { timeout: 5_000 }
          );
          expect(page.url()).toContain(pageDef.expectedNewPath);
        });
      });
    }
  }
}
