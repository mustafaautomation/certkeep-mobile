import { useRouter } from 'expo-router';
import { useState } from 'react';

import { OrgSheet } from '@/components/org-sheet';
import { Screen } from '@/components/ui';
import { VaultHome } from '@/components/vault-home';
import type { RequirementStatus } from '@/domain/types';
import { useSession } from '@/session/SessionProvider';
import { Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export default function VaultScreen() {
  const router = useRouter();
  const { organization, vault, vaultLoading, vaultError, reloadVault } = useSession();
  const { colors, bodyFont } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RequirementStatus | 'all'>('all');
  const [orgOpen, setOrgOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!organization) {
    return (
      <Screen>
        <Text style={{ color: colors.ink, fontFamily: bodyFont, padding: 24 }}>
          This account is not on a Certkeep workspace yet.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <VaultHome
        organization={organization}
        snapshot={vault}
        loading={vaultLoading}
        error={vaultError}
        refreshing={refreshing}
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
        onRefresh={() => {
          setRefreshing(true);
          void reloadVault().finally(() => setRefreshing(false));
        }}
        onOpenRequirement={(requirementId) => router.push(`/requirements/${requirementId}`)}
        onOpenOrg={() => setOrgOpen(true)}
      />
      <OrgSheet visible={orgOpen} onClose={() => setOrgOpen(false)} />
    </Screen>
  );
}
