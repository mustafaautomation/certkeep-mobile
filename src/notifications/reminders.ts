import { Platform } from 'react-native';

import { tightestAlerts } from '@/domain/alerts';
import type { Alert } from '@/domain/types';

export interface ReminderNotice {
  title: string;
  body: string;
  requirementId: string;
}

type Listener = (notice: ReminderNotice) => void;

const listeners = new Set<Listener>();
const timers = new Set<ReturnType<typeof setTimeout>>();

export function subscribeReminders(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishReminder(notice: ReminderNotice): void {
  listeners.forEach((listener) => listener(notice));
}

export async function armExpiryReminders(alerts: readonly Alert[]): Promise<{ scheduled: number; mode: 'device' | 'preview' }> {
  const pending = tightestAlerts(alerts).filter((alert) => !alert.readAt).slice(0, 6);
  const device = await scheduleOnDevice(pending);
  if (device !== null) return { scheduled: device, mode: 'device' };

  pending.forEach((alert, index) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      publishReminder({ title: alert.title, body: alert.body, requirementId: alert.requirementId });
    }, 900 * (index + 1));
    timers.add(timer);
  });
  return { scheduled: pending.length, mode: 'preview' };
}

async function scheduleOnDevice(alerts: readonly Alert[]): Promise<number | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;
    for (const [index, alert] of alerts.entries()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alert.title,
          body: alert.body,
          data: { requirementId: alert.requirementId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 + index,
        },
      });
    }
    return alerts.length;
  } catch {
    return null;
  }
}
