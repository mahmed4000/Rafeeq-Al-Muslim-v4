import { getHijriParts } from './hijriDate';

const RAMADAN = 9;

export interface RamadanInfo {
  /** Hijri year of this Ramadan. */
  year: number;
  /** Gregorian dates (noon) of each fasting day, day 1 first. */
  days: Date[];
}

const noonOf = (d: Date, plusDays = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + plusDays, 12);

/**
 * The Ramadan that is running on `today`'s date, or else the next one: its Hijri year and the
 * Gregorian date of each day, from the Umm al-Qura calendar with the user's Hijri correction.
 * A fasting day is a whole Gregorian day (it begins at Fajr, so maghrib's Hijri roll-over does
 * not apply here).
 */
export function findRamadan(today: Date, hijriAdjust = 0): RamadanInfo | null {
  const start = noonOf(today);
  let first: Date | null = null;
  const current = getHijriParts(start, hijriAdjust);
  if (current.month === RAMADAN) {
    first = noonOf(start, -(current.day - 1));
  } else {
    for (let i = 1; i <= 400; i++) {
      const d = noonOf(start, i);
      const parts = getHijriParts(d, hijriAdjust);
      if (parts.month === RAMADAN && parts.day === 1) { first = d; break; }
    }
  }
  if (!first) return null;
  const year = getHijriParts(first, hijriAdjust).year;
  const days: Date[] = [];
  for (let i = 0; i < 30; i++) {
    const d = noonOf(first, i);
    if (getHijriParts(d, hijriAdjust).month !== RAMADAN) break;
    days.push(d);
  }
  return { year, days };
}

/** Today's day of Ramadan (1–30), or 0 outside Ramadan. */
export function ramadanDay(today: Date, hijriAdjust = 0): number {
  const parts = getHijriParts(noonOf(today), hijriAdjust);
  return parts.month === RAMADAN ? parts.day : 0;
}
