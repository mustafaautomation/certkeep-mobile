import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { subscribeReminders, type ReminderNotice } from '@/notifications/reminders';
import { useTheme } from '@/theme/ThemeProvider';

export function NoticeHost() {
  const { colors, bodyFont, bodySemi } = useTheme();
  const [notice, setNotice] = useState<ReminderNotice | null>(null);

  useEffect(() => subscribeReminders(setNotice), []);

  if (!notice) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={`${notice.title}. ${notice.body}`}
      testID="reminder-notice"
      style={[styles.notice, { backgroundColor: colors.tealDeep }]}
    >
      <Text style={[styles.title, { color: colors.onTeal, fontFamily: bodySemi }]}>{notice.title}</Text>
      <Text style={{ color: colors.onTeal, fontFamily: bodyFont }}>{notice.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    top: 72,
    right: 16,
    width: 280,
    zIndex: 20,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  title: { fontSize: 15 },
});
