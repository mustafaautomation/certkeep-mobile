import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock, StatusPill } from '@/components/ui';
import { expiryPhrase } from '@/domain/dates';
import { STATUS_LABEL } from '@/domain/labels';
import { roleLabel } from '@/domain/roles';
import type { ComplianceSummary, Membership, RequirementRow, RequirementStatus, VaultSnapshot } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { statusColor } from '@/theme/tokens';

const FILTERS: (RequirementStatus | 'all')[] = ['all', 'expiring', 'expired', 'missing', 'compliant'];

export function VaultHome({
  organization,
  snapshot,
  loading,
  error,
  refreshing,
  query,
  filter,
  onQuery,
  onFilter,
  onRefresh,
  onOpenRequirement,
  onOpenOrg,
}: {
  organization: Membership;
  snapshot: VaultSnapshot | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  query: string;
  filter: RequirementStatus | 'all';
  onQuery: (value: string) => void;
  onFilter: (value: RequirementStatus | 'all') => void;
  onRefresh: () => void;
  onOpenRequirement: (requirementId: string) => void;
  onOpenOrg: () => void;
}) {
  const { colors, displayFont, bodyFont, bodyMedium, bodySemi } = useTheme();
  const rows = (snapshot?.rows ?? []).filter((row) => {
    const matchesFilter = filter === 'all' || row.status === filter;
    const haystack = `${row.subjectName} ${row.name} ${row.documentNumber ?? ''}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });
  const greeting = organization.role === 'employee' || organization.role === 'vendor' ? 'Your vault' : 'Compliance vault';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.brass, fontFamily: bodyMedium }]}>CERTKEEP</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Workspace ${organization.organization.name}`} onPress={onOpenOrg} testID="org-switcher">
          <Text style={[styles.org, { color: colors.ink, fontFamily: displayFont }]}>{organization.organization.name}</Text>
          <Text style={[styles.role, { color: colors.muted, fontFamily: bodyFont }]}>
            {organization.displayName} · {roleLabel(organization.role)}
          </Text>
        </Pressable>
        <Text style={[styles.greeting, { color: colors.ink, fontFamily: displayFont }]}>{greeting}</Text>
      </View>

      {snapshot?.fromCache ? (
        <View style={[styles.banner, { backgroundColor: colors.expiringBg }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
          <Text style={{ color: colors.ink, fontFamily: bodyFont, flex: 1 }}>Showing the vault saved on this device.</Text>
        </View>
      ) : null}

      {snapshot ? <StatGrid summary={snapshot.summary} filter={filter} onFilter={onFilter} /> : null}

      <TextInput
        accessibilityLabel="Search people, vendors, or documents"
        testID="vault-search"
        value={query}
        onChangeText={onQuery}
        placeholder="Search people, vendors, documents"
        placeholderTextColor={colors.muted}
        style={[styles.search, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface, fontFamily: bodyFont }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((item) => {
          const selected = item === filter;
          const label = item === 'all' ? 'All' : STATUS_LABEL[item];
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              testID={`filter-${item}`}
              onPress={() => onFilter(item)}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.teal : colors.surface, borderColor: selected ? colors.teal : colors.line },
              ]}
            >
              <Text style={{ color: selected ? colors.onTeal : colors.ink, fontFamily: bodySemi }}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && !snapshot ? <LoadingBlock label="Opening the vault" /> : null}
      {error && !snapshot ? <ErrorState title="The vault did not load" body={error} onRetry={onRefresh} /> : null}
      {snapshot && rows.length === 0 ? (
        <EmptyState
          title="Nothing in this lane"
          body={query ? 'No requirement matches that search.' : 'This filter is clear. The rest of the vault is still on the other chips.'}
          actionLabel={filter === 'all' ? undefined : 'Show all'}
          onAction={filter === 'all' ? undefined : () => onFilter('all')}
        />
      ) : null}
      <View style={styles.list}>
        {rows.map((row) => (
          <RequirementCard key={row.requirementId} row={row} onPress={() => onOpenRequirement(row.requirementId)} />
        ))}
      </View>
    </ScrollView>
  );
}

function StatGrid({
  summary,
  filter,
  onFilter,
}: {
  summary: ComplianceSummary;
  filter: RequirementStatus | 'all';
  onFilter: (value: RequirementStatus | 'all') => void;
}) {
  const items: RequirementStatus[] = ['compliant', 'expiring', 'expired', 'missing'];
  return (
    <View style={styles.stats}>
      {items.map((status) => (
        <Pressable
          key={status}
          accessibilityRole="button"
          accessibilityLabel={`${STATUS_LABEL[status]} ${summary[status]}`}
          testID={`stat-${status}`}
          onPress={() => onFilter(filter === status ? 'all' : status)}
          style={styles.statPress}
        >
          <StatCard status={status} count={summary[status]} selected={filter === status} />
        </Pressable>
      ))}
    </View>
  );
}

function StatCard({ status, count, selected }: { status: RequirementStatus; count: number; selected: boolean }) {
  const { colors, displayFont, bodyMedium } = useTheme();
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? statusColor(colors, status) : colors.line,
        },
      ]}
    >
      <Text testID={`stat-value-${status}`} style={[styles.statCount, { color: statusColor(colors, status), fontFamily: displayFont }]}>
        {count}
      </Text>
      <Text style={[styles.statLabel, { color: colors.muted, fontFamily: bodyMedium }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function RequirementCard({ row, onPress }: { row: RequirementRow; onPress: () => void }) {
  const { colors, bodyFont, bodySemi, displayFont } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.subjectName}, ${row.name}, ${STATUS_LABEL[row.status]}`}
      testID={`requirement-${row.requirementId}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.accent, { backgroundColor: statusColor(colors, row.status) }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.subject, { color: colors.ink, fontFamily: displayFont }]}>{row.subjectName}</Text>
          <StatusPill status={row.status} />
        </View>
        <Text style={[styles.reqName, { color: colors.ink, fontFamily: bodySemi }]}>{row.name}</Text>
        <Text style={[styles.meta, { color: colors.muted, fontFamily: bodyFont }]}>
          {row.status === 'missing' ? 'No document on file' : expiryPhrase(row.daysRemaining, row.expiresOn)}
          {row.review === 'pending' ? ' · Needs review' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  header: { gap: 4 },
  kicker: { letterSpacing: 2.2, fontSize: 12 },
  org: { fontSize: 28, lineHeight: 34 },
  role: { fontSize: 14 },
  greeting: { fontSize: 20, marginTop: 8 },
  banner: { borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statPress: { width: '48%', flexGrow: 1 },
  stat: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 2 },
  statCount: { fontSize: 32 },
  statLabel: { fontSize: 13 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  filters: { gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  list: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accent: { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  subject: { fontSize: 18, flex: 1 },
  reqName: { fontSize: 15 },
  meta: { fontSize: 13 },
});
