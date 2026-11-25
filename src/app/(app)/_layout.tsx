import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { tightestAlerts } from '@/domain/alerts';
import { isManager } from '@/domain/roles';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppTabs() {
  const { organization, vault } = useSession();
  const { colors, bodyMedium } = useTheme();
  const manager = organization ? isManager(organization.role) : false;
  const unread = tightestAlerts(vault?.alerts ?? []).filter((alert) => !alert.readAt).length;
  const tint = (color: unknown) => (typeof color === 'string' ? color : colors.teal);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: manager ? 'Vault' : 'My vault',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" color={tint(color)} size={size} />,
          tabBarButtonTestID: 'tab-vault',
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          href: manager ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={tint(color)} size={size} />,
          tabBarButtonTestID: 'tab-directory',
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={tint(color)} size={size} />,
          tabBarButtonTestID: 'tab-alerts',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={tint(color)} size={size} />,
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tabs>
  );
}
