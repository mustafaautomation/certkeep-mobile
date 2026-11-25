import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { isManager } from '@/domain/roles';
import type { RequirementStatus } from '@/domain/types';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { statusColor } from '@/theme/tokens';

export default function DirectoryScreen() {
  const { organization, vault } = useSession();
  const router = useRouter();
  const { colors, displayFont, bodyFont, bodySemi, bodyMedium } = useTheme();
  const [segment, setSegment] = useState<'people' | 'vendors'>('vendors');
  const [query, setQuery] = useState('');

  const cards = useMemo(() => {
    if (!vault) return [];
    if (segment === 'people') {
      return vault.people
        .filter((person) => `${person.fullName} ${person.title}`.toLowerCase().includes(query.trim().toLowerCase()))
        .map((person) => ({
          id: person.id,
          title: person.fullName,
          subtitle: person.title,
          href: `/people/${person.id}` as const,
          statuses: vault.rows.filter((row) => row.subjectId === person.id).map((row) => row.status),
        }));
    }
    return vault.vendors
      .filter((vendor) => `${vendor.name} ${vendor.trade}`.toLowerCase().includes(query.trim().toLowerCase()))
      .map((vendor) => ({
        id: vendor.id,
        title: vendor.name,
        subtitle: vendor.trade,
        href: `/vendors/${vendor.id}` as const,
        statuses: vault.rows.filter((row) => row.subjectId === vendor.id).map((row) => row.status),
      }));
  }, [query, segment, vault]);

  if (organization && !isManager(organization.role)) return <Redirect href="/(app)" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kicker, { color: colors.brass, fontFamily: bodyMedium }]}>DIRECTORY</Text>
        <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>People and vendors</Text>
        <View style={styles.segment}>
          {(['vendors', 'people'] as const).map((item) => {
            const selected = segment === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`directory-${item}`}
                onPress={() => setSegment(item)}
                style={[styles.segmentButton, { backgroundColor: selected ? colors.teal : colors.surface, borderColor: colors.line }]}
              >
                <Text style={{ color: selected ? colors.onTeal : colors.ink, fontFamily: bodySemi }}>
                  {item === 'vendors' ? 'Vendors' : 'People'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          accessibilityLabel="Search the directory"
          value={query}
          onChangeText={setQuery}
          placeholder={segment === 'vendors' ? 'Search vendors' : 'Search people'}
          placeholderTextColor={colors.muted}
          style={[styles.search, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface, fontFamily: bodyFont }]}
        />
        {cards.length === 0 ? (
          <EmptyState title="No one matches" body="Try another name, or switch between vendors and people." />
        ) : null}
        {cards.map((card) => (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={card.title}
            testID={`directory-card-${card.id}`}
            onPress={() => router.push(card.href)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.cardTitle, { color: colors.ink, fontFamily: displayFont }]}>{card.title}</Text>
              <Text style={{ color: colors.muted, fontFamily: bodyFont }}>{card.subtitle}</Text>
              <StatusDots statuses={card.statuses} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

function StatusDots({ statuses }: { statuses: RequirementStatus[] }) {
  const { colors } = useTheme();
  if (statuses.length === 0) return null;
  return (
    <View style={styles.dots}>
      {statuses.map((status, index) => (
        <View key={`${status}-${index}`} style={[styles.dot, { backgroundColor: statusColor(colors, status) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  kicker: { letterSpacing: 2.2, fontSize: 12 },
  title: { fontSize: 32 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 22 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
