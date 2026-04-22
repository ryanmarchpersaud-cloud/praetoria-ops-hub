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

/**
 * Best-effort client-side image downscaler. iPhone HEIC/JPEGs are often
 * 4–8 MB each which causes long uploads and main-thread stalls on Safari.
 * Resizes to a max edge of `maxWidth` and re-encodes to JPEG.
 *
 * Falls back to the original file on any failure (HEIC sometimes can't be
 * decoded by canvas in older Safari) so we never block the upload flow.
 */
export async function downscaleImageIfLarge(
  file: File,
  maxWidth = 1920,
  qualityBytes = 1_500_000,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 200_000) return file;

  // HEIC/HEIF often can't be drawn to canvas in iOS Safari; skip and let
  // the network upload handle it as-is rather than crashing the tab.
  if (/heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name)) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let done = false;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    };

    // Safety timeout — never let a stuck decode freeze the upload flow.
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
        if (img.width <= maxWidth && file.size < qualityBytes) {
          cleanup();
          resolve(file);
          return;
        }
        const scale = Math.min(1, maxWidth / img.width);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              resolve(file);
              return;
            }
            const newName = file.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg');
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85,
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
