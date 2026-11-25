import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Screen } from '@/components/ui';
import { tightestAlerts } from '@/domain/alerts';
import { armExpiryReminders } from '@/notifications/reminders';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AlertsScreen() {
  const { vault, markAlertRead } = useSession();
  const router = useRouter();
  const { colors, displayFont, bodyFont, bodyMedium, bodySemi } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alerts = tightestAlerts(vault?.alerts ?? []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.brass, fontFamily: bodyMedium }]}>REMINDERS</Text>
        <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>Expiry alerts</Text>
        <Text style={[styles.copy, { color: colors.muted, fontFamily: bodyFont }]}>
          Certkeep raises a reminder at 30, 14, and 7 days. The tightest window for each document is shown here.
        </Text>
        <Button
          label="Arm expiry reminders"
          testID="arm-reminders"
          busy={busy}
          onPress={() => {
            setBusy(true);
            void armExpiryReminders(vault?.alerts ?? [])
              .then((result) => {
                const where = result.mode === 'device' ? 'on this device' : 'in this preview';
                setMessage(
                  result.scheduled === 0
                    ? 'Nothing is waiting. The inbox is clear.'
                    : `${result.scheduled} reminder${result.scheduled === 1 ? '' : 's'} armed ${where}.`,
                );
              })
              .finally(() => setBusy(false));
          }}
        />
        {message ? (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.ink, fontFamily: bodyFont }}>
            {message}
          </Text>
        ) : null}
        {alerts.length === 0 ? (
          <EmptyState title="No expiry alerts" body="Nothing in this workspace is inside the 30-day window." />
        ) : null}
        {alerts.map((alert) => (
          <Pressable
            key={alert.id}
            accessibilityRole="button"
            accessibilityLabel={alert.title}
            testID={`alert-${alert.requirementId}`}
            onPress={() => {
              void markAlertRead(alert.id).finally(() => router.push(`/requirements/${alert.requirementId}`));
            }}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, opacity: alert.readAt ? 0.62 : 1 }]}
          >
            <View style={styles.row}>
              <Text style={[styles.window, { color: colors.amber, fontFamily: bodySemi }]}>{alert.windowDays}-day</Text>
              {!alert.readAt ? <View style={[styles.unread, { backgroundColor: colors.coral }]} /> : null}
            </View>
            <Text style={[styles.cardTitle, { color: colors.ink, fontFamily: bodySemi }]}>{alert.title}</Text>
            <Text style={{ color: colors.muted, fontFamily: bodyFont }}>{alert.body}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  kicker: { letterSpacing: 2.2, fontSize: 12 },
  title: { fontSize: 32 },
  copy: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  window: { fontSize: 13 },
  unread: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 16 },
});
