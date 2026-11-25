import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { LoadingBlock, Screen } from '@/components/ui';
import { errorMessage } from '@/data/errors';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; token_hash?: string }>();
  const router = useRouter();
  const { consumeMagicLink } = useSession();
  const { colors, bodyFont } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const token = first(params.token) || first(params.token_hash);
  const missingToken = token.length === 0;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void consumeMagicLink(token).catch((caught) => {
      if (!cancelled) setError(errorMessage(caught));
    });
    return () => {
      cancelled = true;
    };
  }, [consumeMagicLink, token]);

  return (
    <Screen>
      {missingToken ? (
        <>
          <Text style={{ color: colors.coral, fontFamily: bodyFont, padding: 24 }}>That sign-in link is missing its token.</Text>
          <Text accessibilityRole="link" onPress={() => router.replace('/sign-in')} style={{ color: colors.teal, paddingHorizontal: 24, fontFamily: bodyFont }}>
            Return to sign in
          </Text>
        </>
      ) : error ? (
        <>
          <Text style={{ color: colors.coral, fontFamily: bodyFont, padding: 24 }}>{error}</Text>
          <Text accessibilityRole="link" onPress={() => router.replace('/sign-in')} style={{ color: colors.teal, paddingHorizontal: 24, fontFamily: bodyFont }}>
            Return to sign in
          </Text>
        </>
      ) : (
        <LoadingBlock label="Signing you in" />
      )}
    </Screen>
  );
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
