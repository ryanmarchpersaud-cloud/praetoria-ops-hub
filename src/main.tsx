import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureStatusBar } from "./lib/statusBar";
import { isIOSWebView, markLowMemorySession } from "./lib/iosDebug";

// Configure native status bar (no-op on web)
configureStatusBar();

// iOS OOM-reload detection — when the WKWebView renderer is killed by iOS
// after a memory spike (typically taking a fresh full-resolution camera
// photo), the page is reloaded automatically. We mark the session as
// low-memory so subsequent photo capture skips previews and downscales
// more aggressively, preventing a repeat crash.
try {
  if (isIOSWebView()) {
    const navEntry = (performance.getEntriesByType?.('navigation') || [])[0] as PerformanceNavigationTiming | undefined;
    const wasReloaded = navEntry?.type === 'reload' || (performance as any).navigation?.type === 1;
    const lastBoot = Number(sessionStorage.getItem('praetoria:lastBoot') || '0');
    const now = Date.now();
    // Reload within 60s of the previous boot in this tab → treat as crash recovery.
    if (wasReloaded && lastBoot && (now - lastBoot) < 60_000) {
      markLowMemorySession();
    }
    sessionStorage.setItem('praetoria:lastBoot', String(now));
  }
} catch { /* never let boot detection crash the app */ }


// Service worker registration — only in production, never in iframes/preview
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (!isPreviewHost && !isInIframe && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
} else if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
}

createRoot(document.getElementById("root")!).render(<App />);