import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Certkeep',
  slug: 'certkeep',
  scheme: 'certkeep',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.quvantic.certkeep',
    supportsTablet: true,
    associatedDomains: ['applinks:certkeep-app.quvantic.com'],
  },
  android: {
    package: 'com.quvantic.certkeep',
    adaptiveIcon: {
      backgroundColor: '#0F6B66',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        data: [{ scheme: 'https', host: 'certkeep-app.quvantic.com', pathPrefix: '/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-asset',
    'expo-splash-screen',
    [
      'expo-notifications',
      {
        color: '#0F6B66',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Certkeep uses photos you choose as certificate and insurance documents.',
        cameraPermission: 'Certkeep uses the camera to capture certificates and certificates of insurance.',
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
