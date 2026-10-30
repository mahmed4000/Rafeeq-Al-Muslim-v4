import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { calculateAccuratePrayerTimes, PrayerOffsets, toArabicNumber } from './prayerCalculation';
import { cityNow } from './cityTime';
import { tr } from '../i18n/language';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_NAMES_AR: Record<PrayerKey, string> = {
  fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء'
};
const PRAYER_NAMES_EN: Record<PrayerKey, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha'
};

export interface PrayerBellsConfig {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

/** Alerts for one prayer: a reminder before the adhan, the adhan itself, and the iqama. */
export interface PrayerAlertSetting {
  before: boolean;
  beforeMinutes: number;
  adhan: boolean;
  iqama: boolean;
  iqamaMinutes: number;
}

export interface PrayerAlertsConfig {
  enabled: boolean;
  sameForAll: boolean;
  prayers: Record<PrayerKey, PrayerAlertSetting>;
}

// Pre-adhan reminder ("Dhuhr shortly"), on by default for every prayer.
export const PRE_ADHAN_DEFAULT_MINUTES = 5;

/** Turns the 5-minute pre-adhan reminder on for every prayer (one-time update of saved settings). */
export function withPreAdhanDefault(config: PrayerAlertsConfig): PrayerAlertsConfig {
  const prayers = { ...config.prayers };
  PRAYER_KEYS.forEach((key) => { prayers[key] = { ...prayers[key], before: true, beforeMinutes: PRE_ADHAN_DEFAULT_MINUTES }; });
  return { ...config, prayers };
}

// Arabic count of minutes: "٥ دقائق" for 3-10, "دقيقة" otherwise.
const minutesAr = (n: number) => `${toArabicNumber(n)} ${n >= 3 && n <= 10 ? 'دقائق' : 'دقيقة'}`;

// Common iqama gaps used by many mosques; users adjust them to their own mosque.
const DEFAULT_IQAMA: Record<PrayerKey, number> = { fajr: 25, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 };

export function defaultAlertsConfig(bells?: PrayerBellsConfig): PrayerAlertsConfig {
  const prayers = {} as Record<PrayerKey, PrayerAlertSetting>;
  PRAYER_KEYS.forEach((key) => {
    prayers[key] = {
      before: true,
      beforeMinutes: PRE_ADHAN_DEFAULT_MINUTES,
      adhan: bells ? bells[key] : true,
      iqama: false,
      iqamaMinutes: DEFAULT_IQAMA[key]
    };
  });
  return { enabled: true, sameForAll: false, prayers };
}

/** The adhan on/off per prayer, for screens that still show simple bells. */
export function bellsFromAlerts(config: PrayerAlertsConfig): PrayerBellsConfig {
  const bells = {} as PrayerBellsConfig;
  PRAYER_KEYS.forEach((key) => { bells[key] = config.enabled && config.prayers[key].adhan; });
  return bells;
}

/** Daily adhkar reminders, placed a number of minutes after Fajr (morning) and Asr (evening). */
export interface AzkarReminderSetting {
  enabled: boolean;
  minutesAfter: number;
}
export interface AzkarRemindersConfig {
  morning: AzkarReminderSetting;
  evening: AzkarReminderSetting;
}
export const AZKAR_REMINDER_MINUTES = { min: 5, max: 120, step: 5 };

export function defaultAzkarReminders(): AzkarRemindersConfig {
  return { morning: { enabled: false, minutesAfter: 15 }, evening: { enabled: false, minutesAfter: 15 } };
}

const PRAYER_ID_PREFIX = 'prayer-';
const AZKAR_ID_PREFIX = 'azkar-';
const CHANNEL_ADHAN = 'prayer-adhan';
const CHANNEL_REMINDER = 'prayer-reminder';
const CHANNEL_AZKAR = 'azkar-reminder';
// iOS keeps at most 64 pending local notifications: 56 for prayers, 8 for adhkar reminders.
const MAX_PRAYER_ALERTS = 56;
const AZKAR_DAYS = 4;

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN, {
    name: tr('الأذان', 'Adhan'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default'
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDER, {
    name: tr('التذكير قبل الصلاة والإقامة', 'Pre-prayer and iqama reminders'),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default'
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_AZKAR, {
    name: tr('تذكير الأذكار', 'Adhkar reminders'),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default'
  });
}

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const perm = await Notification.requestPermission();
          return perm === 'granted';
        }
        return false;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('requestPermissions error:', e);
      return false;
    }
  },

  async hasPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /** One-time cleanup of alerts scheduled by older versions (they had random ids). */
  async clearLegacyScheduled(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  },

  /** Opens the app's page in the system settings (to allow notifications). */
  openSystemSettings() {
    Linking.openSettings().catch(() => {});
  },

  /**
   * Replace the scheduled prayer alerts (only ours, identified by prefix) with
   * the coming days for the given settings. Never prompts the user: call
   * requestPermissions() from a user action first. Called on every app start
   * so the window keeps rolling forward.
   */
  async schedulePrayerAlerts(
    cityNameAr: string,
    lat: number,
    lng: number,
    config: PrayerAlertsConfig,
    method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna' = 'umm_al_qura',
    asrMethod: 'standard' | 'hanafi' = 'standard',
    timeZone?: string,
    offsets?: PrayerOffsets
  ): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      if (!(await this.hasPermission())) return;
      await ensureChannels();

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item: any) => typeof item?.identifier === 'string' && item.identifier.startsWith(PRAYER_ID_PREFIX))
          .map((item: any) => Notifications.cancelScheduledNotificationAsync(item.identifier))
      );
      if (!config.enabled) return;

      const perDay = PRAYER_KEYS.reduce((sum, key) => {
        const s = config.prayers[key];
        return sum + (s.before ? 1 : 0) + (s.adhan ? 1 : 0) + (s.iqama ? 1 : 0);
      }, 0);
      if (perDay === 0) return;
      const days = Math.max(1, Math.min(7, Math.floor(MAX_PRAYER_ALERTS / perDay)));

      const now = new Date();
      // Days are the city's days; each alert fires at the prayer's absolute instant,
      // so it is right even when the device is set to another time zone.
      const cityToday = cityNow(timeZone);
      for (let dayOffset = 0; dayOffset < days; dayOffset++) {
        const day = new Date(cityToday.getFullYear(), cityToday.getMonth(), cityToday.getDate() + dayOffset, 12);
        const times = calculateAccuratePrayerTimes(lat, lng, day, method, asrMethod, timeZone, offsets);

        for (const key of PRAYER_KEYS) {
          const s = config.prayers[key];
          const name = tr(PRAYER_NAMES_AR[key], PRAYER_NAMES_EN[key]);
          const at = new Date(times[key].at.getTime());
          at.setSeconds(0, 0);

          const alerts: { kind: string; date: Date; title: string; body: string; channel: string }[] = [];
          if (s.before) {
            alerts.push({
              kind: 'before',
              date: new Date(at.getTime() - s.beforeMinutes * 60000),
              title: tr(`${name} بعد قليل`, `${name} shortly`),
              body: tr(`الأذان بعد ${minutesAr(s.beforeMinutes)} · ${cityNameAr}`, `Adhan in ${s.beforeMinutes} minutes · ${cityNameAr}`),
              channel: CHANNEL_REMINDER
            });
          }
          if (s.adhan) {
            alerts.push({
              kind: 'adhan',
              date: at,
              title: tr(`حان الآن موعد أذان ${name}`, `It's time for the ${name} adhan`),
              body: tr(`حي على الصلاة · ${cityNameAr}`, `Hayya ʿala as-salah · ${cityNameAr}`),
              channel: CHANNEL_ADHAN
            });
          }
          if (s.iqama) {
            alerts.push({
              kind: 'iqama',
              date: new Date(at.getTime() + s.iqamaMinutes * 60000),
              title: tr(`إقامة صلاة ${name}`, `${name} iqama`),
              body: tr(`بعد الأذان بـ ${s.iqamaMinutes} دقيقة`, `${s.iqamaMinutes} minutes after the adhan`),
              channel: CHANNEL_REMINDER
            });
          }

          for (const alert of alerts) {
            if (alert.date.getTime() <= now.getTime()) continue;
            await Notifications.scheduleNotificationAsync({
              identifier: `${PRAYER_ID_PREFIX}${dayOffset}-${key}-${alert.kind}`,
              content: {
                title: alert.title,
                body: alert.body,
                sound: true,
                data: { prayer: key, kind: alert.kind, date: alert.date.toISOString() }
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: alert.date,
                channelId: alert.channel
              }
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('schedulePrayerAlerts error:', e);
    }
  },

  /**
   * Replace the scheduled adhkar reminders (only ours, by prefix) for the coming
   * days. Same rules as schedulePrayerAlerts: never prompts, runs on every start.
   */
  async scheduleAzkarReminders(
    lat: number,
    lng: number,
    config: AzkarRemindersConfig,
    method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna' = 'umm_al_qura',
    asrMethod: 'standard' | 'hanafi' = 'standard',
    timeZone?: string,
    offsets?: PrayerOffsets
  ): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      if (!(await this.hasPermission())) return;
      await ensureChannels();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item: any) => typeof item?.identifier === 'string' && item.identifier.startsWith(AZKAR_ID_PREFIX))
          .map((item: any) => Notifications.cancelScheduledNotificationAsync(item.identifier))
      );
      if (!config.morning.enabled && !config.evening.enabled) return;

      const now = Date.now();
      const cityToday = cityNow(timeZone);
      for (let dayOffset = 0; dayOffset < AZKAR_DAYS; dayOffset++) {
        const day = new Date(cityToday.getFullYear(), cityToday.getMonth(), cityToday.getDate() + dayOffset, 12);
        const times = calculateAccuratePrayerTimes(lat, lng, day, method, asrMethod, timeZone, offsets);
        const reminders = [
          { kind: 'morning', setting: config.morning, base: times.fajr.at, title: tr('أذكار الصباح', 'Morning adhkar'), categoryId: 'morning' },
          { kind: 'evening', setting: config.evening, base: times.asr.at, title: tr('أذكار المساء', 'Evening adhkar'), categoryId: 'evening' }
        ];
        for (const r of reminders) {
          if (!r.setting.enabled) continue;
          const date = new Date(r.base.getTime() + r.setting.minutesAfter * 60000);
          date.setSeconds(0, 0);
          if (date.getTime() <= now) continue;
          await Notifications.scheduleNotificationAsync({
            identifier: `${AZKAR_ID_PREFIX}${dayOffset}-${r.kind}`,
            content: { title: r.title, body: tr('تذكير بقراءة الأذكار', 'A reminder to read your adhkar'), sound: true, data: { azkar: r.categoryId } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_AZKAR }
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('scheduleAzkarReminders error:', e);
    }
  },

  async sendTestNotification(cityNameAr: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(tr('حان الآن موعد الصلاة', 'It is now time for prayer'), {
              body: tr(`تجربة تنبيه رفيق المسلم · ${cityNameAr}`, `Muslim Companion test alert · ${cityNameAr}`),
              icon: '/favicon.ico'
            });
          }
        }
        return;
      }

      const hasPerm = await this.requestPermissions();
      if (hasPerm) {
        await ensureChannels();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tr('حان الآن موعد الصلاة', 'It is now time for prayer'),
            body: tr(`تجربة تنبيه رفيق المسلم · ${cityNameAr}`, `Muslim Companion test alert · ${cityNameAr}`),
            sound: true
          },
          trigger: null // Deliver immediately
        });
      }
    } catch (e) {
      console.warn('sendTestNotification error:', e);
    }
  }
};
