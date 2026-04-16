import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.praetoriagroup.opshub',
  appName: 'Praetoria Ops Hub',
  webDir: 'dist',
  // No server.url — production builds serve from the local dist bundle.
  // For development hot-reload, temporarily uncomment and set:
  // server: {
  //   url: 'https://a05370e8-ed19-4688-b1ac-4d4a239ef9ea.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#ffffffff',
    },
  },
};

export default config;
