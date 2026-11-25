import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { errorMessage } from '@/data/errors';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function MagicLinkScreen() {
  const { email, token } = useLocalSearchParams<{ email?: string; token?: string }>();
  const router = useRouter();
  const { consumeMagicLink, mode } = useSession();
  const { colors, displayFont, bodyFont } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const address = typeof email === 'string' ? email : 'your inbox';
  const preview = typeof token === 'string' ? token : '';

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>Check {address}</Text>
        <Text style={[styles.body, { color: colors.muted, fontFamily: bodyFont }]}>
          {mode === 'mock'
            ? 'This demo has no mail server. Open the sign-in link on this device to finish.'
            : 'Open the sign-in link in that email. It returns you to Certkeep.'}
        </Text>
        {preview ? (
          <Button
            label="Open the sign-in link"
            testID="open-magic-link"
            busy={busy}
            onPress={() => {
              setBusy(true);
              void consumeMagicLink(preview)
                .catch((caught) => setError(errorMessage(caught)))
                .finally(() => setBusy(false));
            }}
          />
        ) : (
          <Text style={{ color: colors.ink, fontFamily: bodyFont }}>
            No Certkeep account uses that email. Try the demo workspace or check the address.
          </Text>
        )}
        {error ? <Text style={{ color: colors.coral, fontFamily: bodyFont }}>{error}</Text> : null}
        <Button label="Back to sign in" tone="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 14 },
  title: { fontSize: 34, lineHeight: 40 },
  body: { fontSize: 16, lineHeight: 23 },
});
