import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Mark, TextField } from '@/components/ui';
import { DEMO_PASSWORD } from '@/data/seed';
import { useTheme } from '@/theme/ThemeProvider';

const SAMPLES = [
  { label: 'Maya Chen · Compliance', email: 'maya@harborline.demo' },
  { label: 'Leo Park · Employee', email: 'leo@harborline.demo' },
  { label: 'Priya Shah · Vendor', email: 'priya@northstar.demo' },
];

export function SignInForm({
  email,
  password,
  error,
  busy,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onMagic,
  onDemo,
}: {
  email: string;
  password: string;
  error: string | null;
  busy: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  onMagic: () => void;
  onDemo: () => void;
}) {
  const { colors, displayFont, bodyFont, bodyMedium } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: colors.tealDeep }]}>
        <Mark size={48} />
        <Text style={[styles.kicker, { color: colors.brass, fontFamily: bodyMedium }]}>CERTKEEP</Text>
        <Text style={[styles.title, { color: colors.onTeal, fontFamily: displayFont }]}>Licenses and COIs, before they lapse.</Text>
        <Text style={[styles.subtitle, { color: colors.onTeal, fontFamily: bodyFont }]}>
          Harborline keeps every certificate, license, and insurance document with the person or vendor who owes it.
        </Text>
      </View>
      <View style={styles.form}>
        <TextField
          label="Work email"
          value={email}
          onChangeText={onChangeEmail}
          placeholder="maya@harborline.demo"
          keyboardType="email-address"
          testID="sign-in-email"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={onChangePassword}
          placeholder="Password"
          secureTextEntry
          testID="sign-in-password"
          hint={`Demo password: ${DEMO_PASSWORD}`}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.coral, fontFamily: bodyFont }}>
            {error}
          </Text>
        ) : null}
        <Button label="Sign in" onPress={onSubmit} busy={busy} testID="sign-in-submit" />
        <Button label="Email me a magic link" onPress={onMagic} tone="secondary" disabled={busy} testID="magic-link" />
        <Button label="Try the demo" onPress={onDemo} tone="ghost" disabled={busy} testID="try-demo" />
        <Text style={[styles.sampleLabel, { color: colors.muted, fontFamily: bodyMedium }]}>Fill a demo account</Text>
        <View style={styles.samples}>
          {SAMPLES.map((sample) => (
            <Button
              key={sample.email}
              label={sample.label}
              tone="secondary"
              onPress={() => {
                onChangeEmail(sample.email);
                onChangePassword(DEMO_PASSWORD);
              }}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 10 },
  kicker: { letterSpacing: 2.4, fontSize: 12 },
  title: { fontSize: 36, lineHeight: 42 },
  subtitle: { fontSize: 16, lineHeight: 23, opacity: 0.9 },
  form: { padding: 20, gap: 12 },
  sampleLabel: { marginTop: 8, fontSize: 13 },
  samples: { gap: 8 },
});
