import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ErrorState, LoadingBlock, Screen, StatusPill } from '@/components/ui';
import { errorMessage } from '@/data/errors';
import { expiryPhrase } from '@/domain/dates';
import { STATUS_LABEL } from '@/domain/labels';
import type { PersonDetail } from '@/domain/types';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { organization, repo } = useSession();
  const { colors, displayFont, bodyFont, bodyMedium } = useTheme();
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization || !id) return;
    let cancelled = false;
    void repo
      .getPerson(organization.organizationId, id)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [id, organization, repo]);

  return (
    <Screen>
      <BackHeader title="Person" />
      {!detail && !error ? <LoadingBlock label="Loading person" /> : null}
      {error ? <ErrorState title="Person unavailable" body={error} onRetry={() => router.back()} /> : null}
      {detail ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.name, { color: colors.ink, fontFamily: displayFont }]}>{detail.person.fullName}</Text>
          <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
            {detail.person.title}
            {detail.person.trade ? ` · ${detail.person.trade}` : ''}
          </Text>
          <Text style={{ color: colors.ink, fontFamily: bodyMedium }}>{detail.person.email}</Text>
          {detail.fromCache ? <Text style={{ color: colors.amber, fontFamily: bodyFont }}>Saved on this device.</Text> : null}
          {detail.rows.map((row) => (
            <Pressable
              key={row.requirementId}
              accessibilityRole="button"
              accessibilityLabel={`${row.name}, ${STATUS_LABEL[row.status]}`}
              onPress={() => router.push(`/requirements/${row.requirementId}`)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <View style={styles.row}>
                <Text style={[styles.req, { color: colors.ink, fontFamily: displayFont }]}>{row.name}</Text>
                <StatusPill status={row.status} />
              </View>
              <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
                {row.status === 'missing' ? 'No document on file' : expiryPhrase(row.daysRemaining, row.expiresOn)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  name: { fontSize: 34 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  req: { fontSize: 20, flex: 1 },
});
