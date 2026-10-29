import { StorageService } from './storage';
import type { PrayerKey } from './notificationService';

// Optional, private prayer tracker. Stays on the device; only the last 30 days are kept.
const LOG_KEY = 'rafeeq_prayer_log_v1';
const KEEP_DAYS = 30;

type PrayerLog = Record<string, PrayerKey[]>; // YYYY-MM-DD (local) -> prayers marked as prayed

export const localDateKey = (d = new Date()) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const PrayerLogService = {
  async getDay(dateKey = localDateKey()): Promise<PrayerKey[]> {
    const log = await StorageService.getObject<PrayerLog>(LOG_KEY, {});
    return log[dateKey] || [];
  },

  /** Several days at once (for the weekly strip); missing days come back empty. */
  async getDays(dateKeys: string[]): Promise<Record<string, PrayerKey[]>> {
    const log = await StorageService.getObject<PrayerLog>(LOG_KEY, {});
    const out: Record<string, PrayerKey[]> = {};
    dateKeys.forEach((k) => { out[k] = log[k] || []; });
    return out;
  },

  async toggle(key: PrayerKey, dateKey = localDateKey()): Promise<PrayerKey[]> {
    const log = await StorageService.getObject<PrayerLog>(LOG_KEY, {});
    const day = log[dateKey] || [];
    const next = day.includes(key) ? day.filter((k) => k !== key) : [...day, key];
    const kept = Object.keys(log).sort().slice(-(KEEP_DAYS - 1)).filter((k) => k !== dateKey);
    const trimmed: PrayerLog = {};
    kept.forEach((k) => { trimmed[k] = log[k]; });
    trimmed[dateKey] = next;
    await StorageService.setObject(LOG_KEY, trimmed);
    return next;
  }
};
