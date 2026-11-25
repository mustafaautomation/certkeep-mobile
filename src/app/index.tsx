import { Redirect } from 'expo-router';

import { LoadingBlock, Screen } from '@/components/ui';
import { useSession } from '@/session/SessionProvider';

export default function Index() {
  const { ready, session } = useSession();
  if (!ready) {
    return (
      <Screen>
        <LoadingBlock label="Opening Certkeep" />
      </Screen>
    );
  }
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href="/(app)" />;
}
