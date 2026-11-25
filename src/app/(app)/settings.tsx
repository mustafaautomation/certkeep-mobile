import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { roleLabel } from '@/domain/roles';
import { useSession } from '@/session/SessionProvider';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { session, organization, memberships, offline, setOffline, signOut, switchOrganization, mode } = useSession();
  const { colors, preference, setPreference, displayFont, bodyFont, bodySemi, bodyMedium } = useTheme();
  const [busy, setBusy] = useState(false);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.brass, fontFamily: bodyMedium }]}>ACCOUNT</Text>
        <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>{session?.displayName}</Text>
        <Text style={{ color: colors.muted, fontFamily: bodyFont }}>{session?.email}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontFamily: bodySemi }}>Appearance</Text>
          <View style={styles.row}>
            {THEMES.map((item) => {
              const selected = preference === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item} theme`}
                  testID={`theme-${item}`}
                  onPress={() => setPreference(item)}
                  style={[styles.themeChip, { backgroundColor: selected ? colors.teal : colors.bg, borderColor: colors.line }]}
                >
                  <Text style={{ color: selected ? colors.onTeal : colors.ink, fontFamily: bodySemi }}>
                    {item[0]?.toUpperCase()}
                    {item.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontFamily: bodySemi }}>Workspaces</Text>
          {memberships.map((membership) => {
            const selected = membership.organizationId === organization?.organizationId;
            return (
              <Pressable
                key={membership.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`settings-org-${membership.organization.slug}`}
                onPress={() => void switchOrganization(membership.organizationId)}
                style={[styles.org, { borderColor: colors.line, backgroundColor: selected ? colors.compliantBg : colors.bg }]}
              >
                <Text style={{ color: colors.ink, fontFamily: bodySemi }}>{membership.organization.name}</Text>
                <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
                  {roleLabel(membership.role)} · {membership.organization.plan === 'pro' ? 'Pro' : 'Trial'}
                  {membership.organization.stripeCustomerId ? ' · Stripe test customer on file' : ''}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
            Billing stays on the Certkeep web app in Stripe test mode.
          </Text>
        </View>
        <View style={[styles.card, styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontFamily: bodySemi }}>Offline mode</Text>
            <Text style={{ color: colors.muted, fontFamily: bodyFont }}>Read the saved vault. Filing waits until you reconnect.</Text>
          </View>
          <Switch
            accessibilityLabel="Offline mode"
            testID="offline-switch"
            value={offline}
            onValueChange={(value) => void setOffline(value)}
            trackColor={{ true: colors.teal, false: colors.line }}
          />
        </View>
        <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
          Data: {mode === 'mock' ? 'Demo vault on this device' : 'Connected Supabase project'}
        </Text>
        <Button
          label="Sign out"
          tone="danger"
          testID="sign-out"
          busy={busy}
          onPress={() => {
            setBusy(true);
            void signOut().finally(() => setBusy(false));
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  kicker: { letterSpacing: 2.2, fontSize: 12 },
  title: { fontSize: 32 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  themeChip: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  org: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
