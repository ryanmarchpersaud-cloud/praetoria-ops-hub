// Native-aware photo picker.
//
// On iPad/iPadOS, the WKWebView native <input type="file" accept="image/*">
// "Take Photo" path crashes because iOS tries to present the camera UI as a
// popover with no anchor source view (iPad requires popover anchoring).
// Using @capacitor/camera on iOS routes through the native UIImagePicker /
// PHPicker presentation flow, which handles popover anchoring correctly.
//
// On web (and Android), we fall back to the existing HTML file input.

import { isIOSNative } from './platform';

export type CameraSource = 'camera' | 'gallery' | 'prompt';

/**
 * Returns true when we should use the native Capacitor Camera plugin
 * instead of the HTML file input.
 */
export function shouldUseNativeCamera(): boolean {
  return isIOSNative();
}

/**
 * Open the native camera / photo picker on iOS. Returns a File ready to
 * upload, or null if the user cancelled.
 */
export async function pickNativePhoto(source: CameraSource = 'prompt'): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource: CapSource } = await import('@capacitor/camera');

  const sourceMap: Record<CameraSource, any> = {
    camera: CapSource.Camera,
    gallery: CapSource.Photos,
    prompt: CapSource.Prompt,
  };

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: sourceMap[source],
      saveToGallery: false,
      width: 2048,
    });

    if (!photo?.webPath) return null;

    // Fetch the webPath blob. On iOS WKWebView this occasionally returns
    // an empty blob (cache race) — retry once before giving up so we
    // don't bubble a misleading "upload failed" to the worker.
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(photo.webPath);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const b = await res.blob();
        if (b.size > 0) { blob = b; break; }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!blob || blob.size === 0) {
      throw new Error('Camera returned an empty photo — please retake it.');
    }

    const ext = photo.format || 'jpg';
    return new File([blob], `photo-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
  } catch (err: any) {
    // User cancelled — Capacitor throws { message: 'User cancelled photos app' }
    if (err?.message?.toLowerCase?.().includes('cancel')) return null;
    throw err;
  }
}
