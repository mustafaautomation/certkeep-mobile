import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors, bodySemi, displayFont } = useTheme();
  return (
    <View style={styles.backRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" testID="back" onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <Text style={[styles.backTitle, { color: colors.ink, fontFamily: displayFont ?? bodySemi }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  backTitle: { fontSize: 22, flex: 1 },
});
