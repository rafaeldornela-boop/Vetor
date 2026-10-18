import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.vetortcc.app',
  appName: 'Vetor TCC',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    backgroundColor: '#f7f6f2',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#376c5c',
    },
  },
};

export default config;
