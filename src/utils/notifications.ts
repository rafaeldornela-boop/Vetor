import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { VetorSettings } from '../types';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const CHANNEL_ID = 'vetor-reminders';

/**
 * Verifica se a plataforma atual é nativa (Android) ou Web
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isNotificationSupported = (): boolean => {
  if (isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Cria o canal de notificação oficial no Android
 */
async function ensureNotificationChannel() {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Lembretes de Autocuidado',
      description: 'Lembretes diários para pausas, respiração e hábitos saudáveis',
      importance: 4, // High
      visibility: 1, // Public
      vibration: true,
    });
  } catch (err) {
    console.warn('Não foi possível registrar o canal de notificação:', err);
  }
}

/**
 * Obtém o status da permissão (Nativo ou Web)
 */
export const getAppNotificationPermission = async (): Promise<NotificationStatus> => {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'default';
    }
  }

  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationStatus;
};

// Síncrono para compatibilidade legada da interface web
export const getNotificationPermission = (): NotificationStatus => {
  if (isNativePlatform()) {
    return 'default';
  }
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationStatus;
};

/**
 * Solicita permissão para notificações (Nativo no Android ou Web Notification API)
 */
export const requestAppNotificationPermission = async (): Promise<NotificationStatus> => {
  if (isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      const status = await LocalNotifications.requestPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    } catch (err) {
      console.warn('Erro ao solicitar permissão nativa:', err);
      return 'default';
    }
  }

  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationStatus;
  } catch (err) {
    console.warn('Não foi possível solicitar permissão para notificações:', err);
    return Notification.permission as NotificationStatus;
  }
};

export const requestNotificationPermission = requestAppNotificationPermission;

/**
 * Dispara uma notificação imediata
 */
export const sendLocalNotification = (
  title = 'Vetor · Pausa de Autocuidado',
  body = 'Um momento para respirar e cuidar do próximo passo possível.'
): boolean => {
  if (isNativePlatform()) {
    LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    }).catch((err) => console.warn('Erro ao disparar notificação nativa:', err));
    return true;
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body,
      tag: 'vetor-daily-reminder',
      lang: 'pt-BR',
    });

    setTimeout(() => {
      try {
        notif.close();
      } catch {}
    }, 10000);

    return true;
  } catch (err) {
    console.warn('Erro ao disparar notificação local:', err);
    return false;
  }
};

/**
 * Calcula um horário aleatório entre início e fim
 */
export const getRandomTimeBetween = (start = '09:00', end = '21:00'): string => {
  const [startH, startM] = (start || '09:00').split(':').map((v) => parseInt(v, 10));
  const [endH, endM] = (end || '21:00').split(':').map((v) => parseInt(v, 10));

  const validStartH = isNaN(startH) ? 9 : Math.min(23, Math.max(0, startH));
  const validStartM = isNaN(startM) ? 0 : Math.min(59, Math.max(0, startM));
  const validEndH = isNaN(endH) ? 21 : Math.min(23, Math.max(0, endH));
  const validEndM = isNaN(endM) ? 0 : Math.min(59, Math.max(0, endM));

  let startTotalMins = validStartH * 60 + validStartM;
  let endTotalMins = validEndH * 60 + validEndM;

  if (endTotalMins <= startTotalMins) {
    endTotalMins = Math.min(23 * 60 + 59, startTotalMins + 60);
  }

  const randomMins = Math.floor(
    startTotalMins + Math.random() * (endTotalMins - startTotalMins + 1)
  );
  const h = Math.floor(randomMins / 60);
  const m = randomMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Sincroniza e agenda notificações nativas no Android usando o AlarmManager do sistema.
 * Suporta tanto horário fixo diário quanto horários sorteados para os próximos 7 dias.
 */
export const syncNativeReminders = async (settings: VetorSettings): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    await ensureNotificationChannel();

    // Limpa quaisquer agendamentos anteriores para evitar duplicidade
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    if (!settings.reminderEnabled) {
      return;
    }

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      return;
    }

    const title = 'Vetor · Pausa de Autocuidado';
    const body = settings.reminderText?.trim() || 'Um momento para respirar e cuidar do próximo passo possível.';
    const mode = settings.reminderMode || 'fixed';

    if (mode === 'fixed') {
      // Horário fixo: agendamento repetitivo diário nativo
      const [hourStr, minStr] = (settings.reminderTime || '09:00').split(':');
      const hour = parseInt(hourStr, 10) || 9;
      const minute = parseInt(minStr, 10) || 0;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1001,
            title,
            body,
            channelId: CHANNEL_ID,
            schedule: {
              on: {
                hour,
                minute,
              },
              allowWhileIdle: true,
            },
          },
        ],
      });
    } else {
      // Horário sorteado: agenda 7 notificações para os próximos 7 dias, cada uma em horário aleatório dentro da janela
      const windowStart = settings.reminderWindowStart || '09:00';
      const windowEnd = settings.reminderWindowEnd || '21:00';
      const notifications = [];
      const now = new Date();

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + dayOffset);

        const randomTime = getRandomTimeBetween(windowStart, windowEnd);
        const [randH, randM] = randomTime.split(':').map((v) => parseInt(v, 10));

        targetDate.setHours(randH, randM, 0, 0);

        // Se para o dia de hoje o horário sorteado já passou, pula para amanhã
        if (targetDate.getTime() <= now.getTime()) {
          continue;
        }

        notifications.push({
          id: 2000 + dayOffset,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: targetDate,
            allowWhileIdle: true,
          },
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    }
  } catch (err) {
    console.warn('Erro ao sincronizar notificações nativas no Android:', err);
  }
};
