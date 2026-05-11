import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.praetoriagroup.opshub',
  appName: 'Praetoria Ops Hub',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },
  },
};

export default config;
