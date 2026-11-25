import { useRouter } from 'expo-router';
import { useState } from 'react';

import { SignInForm } from '@/components/sign-in-form';
import { Screen } from '@/components/ui';
import { errorMessage } from '@/data/errors';
import { useSession } from '@/session/SessionProvider';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithPassword, requestMagicLink, signInDemo } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <SignInForm
        email={email}
        password={password}
        error={error}
        busy={busy}
        onChangeEmail={setEmail}
        onChangePassword={setPassword}
        onSubmit={() => {
          if (!email.trim() || !password) {
            setError('Enter the email and password for the workspace.');
            return;
          }
          void run(() => signInWithPassword(email, password));
        }}
        onMagic={() => {
          if (!email.trim()) {
            setError('Enter an email and Certkeep will send the link there.');
            return;
          }
          void run(async () => {
            const result = await requestMagicLink(email);
            router.push({ pathname: '/magic-link', params: { email: result.email, token: result.previewToken ?? '' } });
          });
        }}
        onDemo={() => void run(() => signInDemo())}
      />
    </Screen>
  );
}
