import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { roleLabel } from '@/domain/roles';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export function OrgSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { memberships, organization, switchOrganization } = useSession();
  const { colors, displayFont, bodyFont, bodySemi } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close workspace switcher" style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>Workspaces</Text>
          {memberships.map((membership) => {
            const selected = membership.organizationId === organization?.organizationId;
            return (
              <Pressable
                key={membership.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${membership.organization.name}, ${roleLabel(membership.role)}`}
                testID={`org-${membership.organization.slug}`}
                onPress={() => {
                  void switchOrganization(membership.organizationId).then(onClose);
                }}
                style={[styles.row, { borderColor: colors.line, backgroundColor: selected ? colors.compliantBg : colors.bg }]}
              >
                <Text style={[styles.name, { color: colors.ink, fontFamily: bodySemi }]}>{membership.organization.name}</Text>
                <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
                  {roleLabel(membership.role)} · {membership.organization.plan === 'pro' ? 'Pro' : 'Trial'}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  title: { fontSize: 28, marginBottom: 6 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  name: { fontSize: 16 },
});
