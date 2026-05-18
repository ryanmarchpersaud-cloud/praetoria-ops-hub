// Lightweight platform detection helpers used to gate features that are
// not yet production-ready on native iOS/Android (e.g. OAuth providers
// that need extra Capacitor wiring before we ship them on the App Store).

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  };
  try {
    if (w.Capacitor?.isNativePlatform?.()) return true;
    const p = w.Capacitor?.getPlatform?.();
    if (p && p !== 'web') return true;
  } catch {
    // ignore
  }
  return false;
}

export function isIOSNative(): boolean {
  if (!isNativeApp()) return false;
  try {
    const w = window as unknown as { Capacitor?: { getPlatform?: () => string } };
    return w.Capacitor?.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}

export function isAndroidNative(): boolean {
  if (!isNativeApp()) return false;
  try {
    const w = window as unknown as { Capacitor?: { getPlatform?: () => string } };
    return w.Capacitor?.getPlatform?.() === 'android';
  } catch {
    return false;
  }
}
