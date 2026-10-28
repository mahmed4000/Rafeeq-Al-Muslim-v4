import { toArabicNumber } from './prayerCalculation';

export interface FormattedDateInfo {
  hijriFormatted: string;
  hijriDay: string;
  hijriMonth: string;
  hijriYear: string;
  gregorianFormatted: string;
  gregorianDayName: string;
  gregorianDate: string;
}

const HIJRI_MONTHS = [
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

const GREGORIAN_MONTHS = [
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

function fallbackKuwaiti(date: Date, adjustmentDays = 0): { day: number; month: number; year: number } {
  let today = new Date(date);
  if (adjustmentDays !== 0) {
    today = new Date(today.getTime() + adjustmentDays * 86400000);
  }
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

export function getFullDateInfo(date = new Date(), adjustmentDays = 0): FormattedDateInfo {
  const d = new Date(date);
  if (adjustmentDays !== 0) {
    d.setDate(d.getDate() + adjustmentDays);
  }

  // 1. Gregorian date components
  const dayIndex = d.getDay();
  const gregorianDayName = WEEKDAYS[dayIndex] || 'اليوم';
  const gregorianDayNum = d.getDate();
  const gregorianMonthName = GREGORIAN_MONTHS[d.getMonth()] || '';
  const gregorianYearNum = d.getFullYear();

  const gregorianDayAr = toArabicNumber(gregorianDayNum);
  const gregorianYearAr = toArabicNumber(gregorianYearNum);
  const gregorianDate = `${gregorianDayAr} ${gregorianMonthName} ${gregorianYearAr}`;
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
      }).formatToParts(d);

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
    const fallback = fallbackKuwaiti(date, adjustmentDays);
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
