import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { calculateAccuratePrayerTimes } from './prayerCalculation';

export interface PrayerBellsConfig {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
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

  async scheduleWeeklyPrayerNotifications(
    cityNameAr: string,
    cityNameEn: string,
    lat: number,
    lng: number,
    bells: PrayerBellsConfig,
    method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna' = 'umm_al_qura'
  ): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Cancel previous scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const now = new Date();
      // Schedule for the next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + dayOffset);

        const times = calculateAccuratePrayerTimes(lat, lng, targetDate, method);

        const dailyPrayers = [
          { key: 'fajr' as const, nameAr: 'الفجر', nameEn: 'Fajr', hours: times.fajr.hours, minutes: times.fajr.minutes },
          { key: 'dhuhr' as const, nameAr: 'الظهر', nameEn: 'Dhuhr', hours: times.dhuhr.hours, minutes: times.dhuhr.minutes },
          { key: 'asr' as const, nameAr: 'العصر', nameEn: 'Asr', hours: times.asr.hours, minutes: times.asr.minutes },
          { key: 'maghrib' as const, nameAr: 'المغرب', nameEn: 'Maghrib', hours: times.maghrib.hours, minutes: times.maghrib.minutes },
          { key: 'isha' as const, nameAr: 'العشاء', nameEn: 'Isha', hours: times.isha.hours, minutes: times.isha.minutes }
        ];

        for (const prayer of dailyPrayers) {
          if (!bells[prayer.key]) continue;

          const triggerDate = new Date(targetDate);
          triggerDate.setHours(prayer.hours, prayer.minutes, 0, 0);

          // Only schedule future times
          if (triggerDate.getTime() > now.getTime()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `الله أكبر • حان الآن موعد أذان ${prayer.nameAr}`,
                body: `حي على الصلاة • موعد صلاة ${prayer.nameAr} بتوقيت ${cityNameAr}`,
                sound: true,
                data: { prayer: prayer.key, date: triggerDate.toISOString() }
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate
              } as any
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('scheduleWeeklyPrayerNotifications error:', e);
    }
  },

  async sendTestNotification(cityNameAr: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('الله أكبر • حان الآن موعد الصلاة', {
              body: `حي على الصلاة • تجربة أذان رفيق المسلم بتوقيت ${cityNameAr}`,
              icon: '/favicon.ico'
            });
          }
        }
        return;
      }

      const hasPerm = await this.requestPermissions();
      if (hasPerm) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'الله أكبر • حان الآن موعد الصلاة',
            body: `حي على الصلاة • تجربة أذان رفيق المسلم بتوقيت ${cityNameAr}`,
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
