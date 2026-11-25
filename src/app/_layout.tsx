import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NoticeHost } from '@/components/notice-host';
import { useSession, SessionProvider } from '@/session/SessionProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { ready, session } = useSession();
  const { fontsReady, mode, colors } = useTheme();
  const router = useRouter();
  const prepared = ready && fontsReady;

  useEffect(() => {
    if (prepared) void SplashScreen.hideAsync().catch(() => undefined);
  }, [prepared]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let subscription: { remove: () => void } | undefined;
    void import('expo-notifications')
      .then((Notifications) => {
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const requirementId = response.notification.request.content.data?.requirementId;
          if (typeof requirementId === 'string') router.push(`/requirements/${requirementId}`);
        });
      })
      .catch(() => undefined);
    return () => subscription?.remove();
  }, [router]);

  if (!prepared) return null;

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NoticeHost />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!session} redirectTo="/(app)">
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="magic-link" />
          <Stack.Screen name="auth/callback" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)} redirectTo="/sign-in">
          <Stack.Screen name="(app)" />
          <Stack.Screen name="people/[id]" />
          <Stack.Screen name="vendors/[id]" />
          <Stack.Screen name="requirements/[id]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
