import { Capacitor } from '@capacitor/core';

export async function configureStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Prevent the webview from rendering under the status bar
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#ffffffff' });
  } catch {
    // StatusBar plugin not available — ignore
  }
}
