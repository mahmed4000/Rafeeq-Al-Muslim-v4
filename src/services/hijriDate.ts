import { toArabicNumber } from './prayerCalculation';
import { getUiLanguage } from '../i18n/language';

export interface FormattedDateInfo {
  hijriFormatted: string;
  hijriDay: string;
  hijriMonth: string;
  hijriYear: string;
  gregorianFormatted: string;
  gregorianDayName: string;
  gregorianDate: string;
}

export const HIJRI_MONTHS = [
  'المحرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوّال',
  'ذو القعدة',
  'ذو الحجة'
];

export const GREGORIAN_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

const WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

const HIJRI_MONTHS_EN = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Akhir', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'];
const GREGORIAN_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Hijri month name (month 1-12) in the interface language. */
export function hijriMonthName(month: number): string {
  return (getUiLanguage() === 'en' ? HIJRI_MONTHS_EN : HIJRI_MONTHS)[month - 1] || '';
}

/** Gregorian month name (index 0-11) in the interface language. */
export function gregorianMonthName(monthIndex: number): string {
  return (getUiLanguage() === 'en' ? GREGORIAN_MONTHS_EN : GREGORIAN_MONTHS)[monthIndex] || '';
}

/** Weekday name (0 = Sunday) in the interface language. */
export function weekdayName(dayIndex: number): string {
  return (getUiLanguage() === 'en' ? WEEKDAYS_EN : WEEKDAYS)[dayIndex] || '';
}

function fallbackKuwaiti(date: Date): { day: number; month: number; year: number } {
  const today = new Date(date);
  let day = today.getDate();
  let month = today.getMonth();
  let year = today.getFullYear();
  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  if (y < 1583) b = 0;
  if (y === 1582) {
    if (m > 10) b = -10;
    if (m === 10) {
      b = 0;
      if (day > 4) b = -10;
    }
  }
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
  let bb = jd;
  if (jd > 2299160) {
    const aa = Math.floor((jd - 1867216.25) / 36524.25);
    bb = jd + 1 + aa - Math.floor(aa / 4);
  }
  const cc = Math.floor((bb - 122.1) / 365.25);
  const dd = Math.floor(365.25 * cc);
  const ee = Math.floor((bb - dd) / 30.6001);
  day = bb - dd - Math.floor(30.6001 * ee);
  month = ee - 1;
  if (ee > 13) {
    month = ee - 13;
  }
  const iyear = 10631 / 30;
  const epochastro = 1948084;
  const shift1 = 8.01 / 60;
  let z = jd - epochastro;
  const cyc = Math.floor(z / 10631);
  z = z - 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const iy = 30 * cyc + j;
  z = z - Math.floor(j * iyear + shift1);
  let im = Math.floor((z + 28.5001) / 29.5);
  if (im === 13) im = 12;
  const id = z - Math.floor(29.5001 * im - 29);
  return { day: Math.max(1, Math.min(30, id)), month: Math.max(1, Math.min(12, im)), year: iy };
}

export const HIJRI_ADJUST_LIMIT = 2;

/** The same wall-clock time `days` days later; used to apply the user's Hijri correction. */
function shiftDays(date: Date, days: number): Date {
  if (!days) return date;
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Umm al-Qura Hijri day/month/year as numbers (month 1-12), with an arithmetic fallback.
 * `adjustmentDays` moves only the Hijri date (local moon-sighting correction).
 */
export function getHijriParts(gregorian: Date, adjustmentDays = 0): { day: number; month: number; year: number } {
  const date = shiftDays(gregorian, adjustmentDays);
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      }).formatToParts(date);
      const get = (type: string) => parseInt((parts.find((p) => p.type === type)?.value || '').replace(/[^0-9]/g, ''), 10);
      const day = get('day');
      const month = get('month');
      const year = get('year');
      if (day && month && year) return { day, month, year };
    }
  } catch {}
  return fallbackKuwaiti(date);
}

/** `adjustmentDays` moves only the Hijri date; the Gregorian date and weekday stay as given. */
export function getFullDateInfo(date = new Date(), adjustmentDays = 0): FormattedDateInfo {
  const d = new Date(date);
  const hijriDate = shiftDays(d, adjustmentDays);

  if (getUiLanguage() === 'en') {
    const h = getHijriParts(d, adjustmentDays);
    const gregorianDate = `${d.getDate()} ${gregorianMonthName(d.getMonth())} ${d.getFullYear()}`;
    return {
      hijriFormatted: `${h.day} ${hijriMonthName(h.month)} ${h.year} AH`,
      hijriDay: String(h.day),
      hijriMonth: hijriMonthName(h.month),
      hijriYear: String(h.year),
      gregorianFormatted: `${weekdayName(d.getDay())}, ${gregorianDate}`,
      gregorianDayName: weekdayName(d.getDay()),
      gregorianDate
    };
  }

  // 1. Gregorian date components
  const dayIndex = d.getDay();
  const gregorianDayName = WEEKDAYS[dayIndex] || 'اليوم';
  const gregorianDayNum = d.getDate();
  const gregorianMonthLabel = GREGORIAN_MONTHS[d.getMonth()] || '';
  const gregorianYearNum = d.getFullYear();

  const gregorianDayAr = toArabicNumber(gregorianDayNum);
  const gregorianYearAr = toArabicNumber(gregorianYearNum);
  const gregorianDate = `${gregorianDayAr} ${gregorianMonthLabel} ${gregorianYearAr}`;
  const gregorianFormatted = `${gregorianDayName}، ${gregorianDate} م`;

  // 2. Hijri date calculation
  let hijriDay = '';
  let hijriMonth = '';
  let hijriYear = '';
  let hijriFormatted = '';

  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).formatToParts(hijriDate);

      let pDay = '';
      let pMonth = '';
      let pYear = '';

      for (const part of parts) {
        if (part.type === 'day') pDay = part.value;
        if (part.type === 'month') pMonth = part.value;
        if (part.type === 'year') pYear = part.value;
      }

      if (pDay && pMonth && pYear) {
        hijriDay = toArabicNumber(pDay);
        hijriMonth = pMonth;
        hijriYear = toArabicNumber(pYear.replace(/[^0-9٠-٩]/g, ''));
        hijriFormatted = `${hijriDay} ${hijriMonth} ${hijriYear} هـ`;
      }
    }
  } catch {}

  // Fallback if Intl did not resolve
  if (!hijriFormatted) {
    const fallback = fallbackKuwaiti(hijriDate);
    hijriDay = toArabicNumber(fallback.day);
    hijriMonth = HIJRI_MONTHS[fallback.month - 1] || 'جمادى الأولى';
    hijriYear = toArabicNumber(fallback.year);
    hijriFormatted = `${hijriDay} ${hijriMonth} ${hijriYear} هـ`;
  }

  return {
    hijriFormatted,
    hijriDay,
    hijriMonth,
    hijriYear,
    gregorianFormatted,
    gregorianDayName,
    gregorianDate
  };
}
