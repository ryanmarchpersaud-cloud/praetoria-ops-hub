// Lightweight, no-op-friendly debug logger for tracing iPhone-specific
// freeze/perf bugs in the Praetoria app. Logs are written via console.debug
// so they are suppressed by default in production-like consoles but remain
// visible when the developer or user enables "verbose" / "debug" log level
// in iOS Safari Web Inspector.
//
// Usage:
//   import { iosLog } from '@/lib/iosDebug';
//   iosLog('incident:photo-upload:start', { count: files.length });
//
// Tagging convention (keep stable for grep):
//   incident:open
//   incident:photo:tap
//   incident:gallery:select
//   incident:camera:capture
//   incident:file:attach
//   incident:submit
//   paystub:open
//   paystub:print
//   paystub:pdf
//   paystub:share
//   modal:open / modal:close

const PREFIX = '[praetoria]';

export function iosLog(tag: string, data?: Record<string, unknown>) {
  try {
    if (data && Object.keys(data).length > 0) {
      // eslint-disable-next-line no-console
      console.debug(PREFIX, tag, data);
    } else {
      // eslint-disable-next-line no-console
      console.debug(PREFIX, tag);
    }
  } catch {
    // Never let logging crash the app on iOS.
  }
}

// Detect iOS / iPadOS WKWebView (Capacitor) so we can apply tighter
// memory budgets — WKWebView on iPhones routinely terminates the renderer
// when the JS heap or graphics memory spikes (OOM "crash" in App Store
// Connect). Safari on desktop is fine; the issue is mobile WebKit.
export function isIOSWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document);
  return isIOS;
}

// ────────────────────────────────────────────────────────────────────────────
// Low-memory mode (iOS-specific OOM mitigation)
// ────────────────────────────────────────────────────────────────────────────
// iPhones can run out of memory in the WKWebView when the user takes a fresh
// full-resolution camera photo. The renderer is killed by iOS and the app
// appears to "crash". We detect a constrained device up front and apply two
// mitigations: (1) auto-reduce processing resolution to a much smaller max
// edge, and (2) skip the in-app image preview entirely (the <img> blob URL
// preview is what usually pushes graphics memory over the limit on iOS).

const LOW_MEM_FLAG = 'praetoria:lowMem';

function getDeviceMemoryGB(): number | null {
  try {
    const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    return typeof dm === 'number' ? dm : null;
  } catch { return null; }
}

/** True when we should aggressively reduce image work. */
export function isLowMemoryDevice(): boolean {
  try { if (sessionStorage.getItem(LOW_MEM_FLAG) === '1') return true; } catch { /* ignore */ }
  if (isIOSWebView()) return true;
  const dm = getDeviceMemoryGB();
  if (dm !== null && dm <= 2) return true;
  return false;
}

/** Mark this session as low-memory (e.g. after an OOM-style reload). */
export function markLowMemorySession(): void {
  try { sessionStorage.setItem(LOW_MEM_FLAG, '1'); } catch { /* ignore */ }
}

/**
 * When low memory is detected, callers should skip building the in-app blob
 * URL preview thumbnail — biggest contributor to iOS WKWebView graphics
 * memory pressure when staging multiple camera shots.
 */
export function shouldSkipImagePreview(): boolean {
  return isLowMemoryDevice();
}

/** Recommended max edge for image processing on this device. */
export function recommendedMaxImageEdge(): number {
  if (isLowMemoryDevice()) return 800;
  if (isIOSWebView()) return 1280;
  return 1920;
}

/**
 * Best-effort client-side image downscaler. iPhone HEIC/JPEGs are often
 * 4–8 MB each which causes long uploads, main-thread stalls, and WKWebView
 * OOM crashes on iOS. Resizes to a max edge of `maxWidth` and re-encodes
 * to JPEG.
 *
 * Strategy:
 *  1. Prefer `createImageBitmap` — decodes off the main thread and releases
 *     memory deterministically via `.close()`. This is the single biggest
 *     win for avoiding iOS WebView OOM crashes when handling multiple
 *     full-resolution camera photos.
 *  2. Fall back to <img> + canvas for older browsers.
 *  3. On any failure (including HEIC that can't be decoded), return the
 *     original file rather than crash the flow.
 */
export async function downscaleImageIfLarge(
  file: File,
  maxWidth?: number,
  qualityBytes = 1_500_000,
): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) {
    return file;
  }
  if (file.size < 200_000) return file;

  // Tighter budget on iOS WKWebView to avoid renderer OOM termination.
  const effectiveMaxWidth = maxWidth ?? (isIOSWebView() ? 1280 : 1920);

  // HEIC/HEIF: try createImageBitmap first (iOS 17+ WKWebView decodes HEIC
  // natively). If it fails, return original — the network upload will
  // handle it as-is rather than crashing the tab.
  const isHeic = /heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name);

  // ---- Path 1: createImageBitmap (preferred, lower memory) ----
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width <= effectiveMaxWidth && file.size < qualityBytes && !isHeic) {
          return file;
        }
        const scale = Math.min(1, effectiveMaxWidth / bitmap.width);
        const targetW = Math.max(1, Math.round(bitmap.width * scale));
        const targetH = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.82),
        );
        // Release canvas pixels eagerly to help iOS reclaim graphics memory.
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) return file;
        const newName = file.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg');
        return new File([blob], newName, { type: 'image/jpeg' });
      } finally {
        try { bitmap.close(); } catch { /* ignore */ }
      }
    } catch {
      // HEIC decode unsupported on this iOS version, or other decode error.
      if (isHeic) return file;
      // Fall through to <img> path for non-HEIC images.
    }
  }

  // ---- Path 2: <img> + canvas fallback ----
  if (isHeic) return file;

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let done = false;

    const cleanup = () => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    };

    const timeoutId = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve(file);
    }, 8000);

    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timeoutId);
      try {
        if (img.width <= effectiveMaxWidth && file.size < qualityBytes) {
          cleanup();
          resolve(file);
          return;
        }
        const scale = Math.min(1, effectiveMaxWidth / img.width);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(file); return; }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(
          (blob) => {
            // Release pixels.
            canvas.width = 0;
            canvas.height = 0;
            cleanup();
            if (!blob) { resolve(file); return; }
            const newName = file.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg');
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.82,
        );
      } catch {
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(file);
    };

    img.src = url;
  });
}

/** Yield to the event loop so iOS WKWebView can GC between heavy operations. */
export function yieldToBrowser(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
