import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pgmanager.app',
  appName: 'PG Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
