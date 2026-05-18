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

    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    const ext = photo.format || 'jpg';
    const file = new File([blob], `photo-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
    return file;
  } catch (err: any) {
    // User cancelled — Capacitor throws { message: 'User cancelled photos app' }
    if (err?.message?.toLowerCase?.().includes('cancel')) return null;
    throw err;
  }
}
