import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        title="That page is not in the vault"
        body="The link may be old. Head back to the workspace."
        actionLabel="Go to Certkeep"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
