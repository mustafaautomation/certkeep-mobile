import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STATUS_LABEL } from '@/domain/labels';
import type { RequirementStatus } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { statusBackground, statusColor } from '@/theme/tokens';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 0 : insets.top;
  const bottom = Platform.OS === 'web' ? 0 : insets.bottom;
  return (
    <View style={[styles.canvas, { backgroundColor: colors.canvas }]}>
      <View style={[styles.frame, { backgroundColor: colors.bg, paddingTop: top, paddingBottom: bottom }, style]}>
        {children}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  busy,
  tone = 'primary',
  testID,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  testID?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, bodySemi } = useTheme();
  const background =
    tone === 'primary' ? colors.teal : tone === 'danger' ? colors.expiredBg : tone === 'secondary' ? colors.surface : 'transparent';
  const color = tone === 'primary' ? colors.onTeal : tone === 'danger' ? colors.coral : colors.ink;
  const borderColor = tone === 'ghost' ? 'transparent' : colors.line;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || busy) }}
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor, opacity: disabled ? 0.5 : pressed ? 0.86 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={color} /> : null}
      {!busy && icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonLabel, { color, fontFamily: bodySemi }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  testID,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  keyboardType?: 'default' | 'email-address';
  testID?: string;
  error?: string;
  hint?: string;
}) {
  const { colors, bodyFont, bodyMedium } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: bodyMedium }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.input,
            borderColor: error ? colors.coral : colors.line,
            fontFamily: bodyFont,
          },
        ]}
      />
      {error ? <Text style={[styles.hint, { color: colors.coral, fontFamily: bodyFont }]}>{error}</Text> : null}
      {!error && hint ? <Text style={[styles.hint, { color: colors.muted, fontFamily: bodyFont }]}>{hint}</Text> : null}
    </View>
  );
}

export function StatusPill({ status }: { status: RequirementStatus }) {
  const { colors, bodySemi } = useTheme();
  return (
    <View
      accessibilityLabel={STATUS_LABEL[status]}
      style={[styles.pill, { backgroundColor: statusBackground(colors, status) }]}
    >
      <View style={[styles.dot, { backgroundColor: statusColor(colors, status) }]} />
      <Text style={[styles.pillText, { color: statusColor(colors, status), fontFamily: bodySemi }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const { colors, displayFont, bodyFont } = useTheme();
  return (
    <View style={styles.stateBlock}>
      <View style={[styles.stateMark, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Ionicons name="file-tray-outline" size={28} color={colors.teal} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.ink, fontFamily: displayFont }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: colors.muted, fontFamily: bodyFont }]}>{body}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} tone="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  const { colors, displayFont, bodyFont } = useTheme();
  return (
    <View style={styles.stateBlock}>
      <View style={[styles.stateMark, { backgroundColor: colors.expiredBg, borderColor: colors.line }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.coral} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.ink, fontFamily: displayFont }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: colors.muted, fontFamily: bodyFont }]}>{body}</Text>
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  const { colors, bodyFont } = useTheme();
  return (
    <View accessibilityLabel={label} style={styles.loading}>
      <ActivityIndicator color={colors.teal} />
      <Text style={{ color: colors.muted, fontFamily: bodyFont }}>{label}</Text>
      <View style={[styles.skeleton, { backgroundColor: colors.line }]} />
      <View style={[styles.skeleton, styles.skeletonShort, { backgroundColor: colors.line }]} />
    </View>
  );
}

export function Mark({ size = 36 }: { size?: number }) {
  const { colors, displayBold } = useTheme();
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.teal }]}>
      <Text style={{ color: colors.onTeal, fontFamily: displayBold, fontSize: size * 0.46 }}>C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 480 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLabel: { fontSize: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  hint: { fontSize: 13 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12 },
  stateBlock: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 12 },
  stateMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: { fontSize: 24, textAlign: 'center' },
  stateBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  loading: { gap: 12, paddingVertical: 24 },
  skeleton: { height: 72, borderRadius: 16, opacity: 0.45 },
  skeletonShort: { width: '70%' },
  mark: { alignItems: 'center', justifyContent: 'center' },
});
