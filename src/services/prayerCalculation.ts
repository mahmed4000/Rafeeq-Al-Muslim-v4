// Prayer Times Calculation Engine (Accurate offline engine + Adhan support)

export const toArabicNumber = (num: number | string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

export const toStandardNumber = (str: string): string => {
  const arabicDigits: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return str.replace(/[٠-٩]/g, (d) => arabicDigits[d] || d);
};

export const formatPrayerTime = (hours: number, minutes: number, lang: 'ar' | 'en' = 'ar'): string => {
  const safeH = (typeof hours === 'number' && Number.isFinite(hours)) ? Math.floor(hours) : 5;
  const safeM = (typeof minutes === 'number' && Number.isFinite(minutes)) ? Math.floor(minutes) : 0;
  const period = safeH >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
  let h12 = safeH % 12;
  if (h12 === 0) h12 = 12;
  const hStr = h12.toString().padStart(2, '0');
  const mStr = safeM.toString().padStart(2, '0');
  if (lang === 'ar') {
    return `${toArabicNumber(hStr)}:${toArabicNumber(mStr)} ${period}`;
  }
  return `${hStr}:${mStr} ${period}`;
};

export interface PrayerTimeValues {
  fajr: { hours: number; minutes: number; timeStr: string };
  sunrise: { hours: number; minutes: number; timeStr: string };
  dhuhr: { hours: number; minutes: number; timeStr: string };
  asr: { hours: number; minutes: number; timeStr: string };
  maghrib: { hours: number; minutes: number; timeStr: string };
  isha: { hours: number; minutes: number; timeStr: string };
}

export function calculateAccuratePrayerTimes(
  lat: number,
  lng: number,
  date = new Date(),
  method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna' = 'umm_al_qura',
  asrMethod: 'standard' | 'hanafi' = 'standard'
): PrayerTimeValues {
  const safeLat = (typeof lat === 'number' && Number.isFinite(lat) && lat !== 0) ? lat : 21.422487;
  const safeLng = (typeof lng === 'number' && Number.isFinite(lng) && lng !== 0) ? lng : 39.826206;
  const safeDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();

  // Try adhan library if available
  try {
    const adhan = require('adhan');
    if (adhan && adhan.Coordinates && adhan.CalculationMethod) {
      const coordinates = new adhan.Coordinates(safeLat, safeLng);
      let params = adhan.CalculationMethod.UmmAlQura();
      if (method === 'egypt') params = adhan.CalculationMethod.Egyptian();
      else if (method === 'mwl') params = adhan.CalculationMethod.MuslimWorldLeague();
      else if (method === 'isna') params = adhan.CalculationMethod.NorthAmerica();

      if (asrMethod === 'hanafi') {
        params.madhab = adhan.Madhab.Hanafi;
      }

      const pTimes = new adhan.PrayerTimes(coordinates, safeDate, params);
      if (pTimes) {
        const toObj = (d: any, fbH = 12, fbM = 0) => {
          if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
            return { hours: fbH, minutes: fbM, timeStr: formatPrayerTime(fbH, fbM) };
          }
          return {
            hours: d.getHours(),
            minutes: d.getMinutes(),
            timeStr: formatPrayerTime(d.getHours(), d.getMinutes())
          };
        };
        return {
          fajr: toObj(pTimes.fajr, 5, 0),
          sunrise: toObj(pTimes.sunrise, 6, 20),
          dhuhr: toObj(pTimes.dhuhr, 12, 15),
          asr: toObj(pTimes.asr, 15, 30),
          maghrib: toObj(pTimes.maghrib, 18, 5),
          isha: toObj(pTimes.isha, 19, 35)
        };
      }
    }
  } catch (e) {
    // Adhan not loaded, use astronomical engine below
  }

  // Astronomical Formula
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const EqT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const delta = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const deltaRad = (delta * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const tzOffsetHours = -date.getTimezoneOffset() / 60;
  const noon = 12 + tzOffsetHours - lng / 15 - EqT / 60;

  const hourAngle = (angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(deltaRad)) / (Math.cos(latRad) * Math.cos(deltaRad));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return 180;
    return (Math.acos(cosHA) * 180) / Math.PI;
  };

  // Angles depending on method
  let fajrAngle = -18.5;
  let ishaAngle = -17;
  let ishaFixedMinutes = 0;

  if (method === 'umm_al_qura') {
    fajrAngle = -18.5;
    ishaFixedMinutes = 90; // Fixed 90 min after Maghrib in Saudi Arabia
  } else if (method === 'egypt') {
    fajrAngle = -19.5;
    ishaAngle = -17.5;
  } else if (method === 'isna') {
    fajrAngle = -15;
    ishaAngle = -15;
  } else {
    fajrAngle = -18;
    ishaAngle = -17;
  }

  const haSunset = hourAngle(-0.833) / 15;
  const haFajr = hourAngle(fajrAngle) / 15;
  
  const shadowFactor = asrMethod === 'hanafi' ? 2 : 1;
  const asrAlt = Math.atan(1 / (shadowFactor + Math.tan(Math.abs(latRad - deltaRad)))) * (180 / Math.PI);
  const haAsr = hourAngle(asrAlt) / 15;

  const toTimeObj = (decHours: number) => {
    let h = Math.floor(decHours);
    let m = Math.round((decHours - h) * 60);
    if (m >= 60) { h += 1; m -= 60; }
    h = (h + 24) % 24;
    return { hours: h, minutes: m, timeStr: formatPrayerTime(h, m) };
  };

  const maghribObj = toTimeObj(noon + haSunset);
  let ishaObj: { hours: number; minutes: number; timeStr: string };

  if (ishaFixedMinutes > 0) {
    let ishaMin = maghribObj.minutes + ishaFixedMinutes;
    let ishaH = (maghribObj.hours + Math.floor(ishaMin / 60)) % 24;
    ishaMin = ishaMin % 60;
    ishaObj = { hours: ishaH, minutes: ishaMin, timeStr: formatPrayerTime(ishaH, ishaMin) };
  } else {
    const haIsha = hourAngle(ishaAngle) / 15;
    ishaObj = toTimeObj(noon + haIsha);
  }

  return {
    fajr: toTimeObj(noon - haFajr),
    sunrise: toTimeObj(noon - haSunset),
    dhuhr: toTimeObj(noon + (2 / 60)), // +2 min after solar noon
    asr: toTimeObj(noon + haAsr),
    maghrib: maghribObj,
    isha: ishaObj
  };
}

export interface NextPrayerInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  time: string;
  isTomorrow: boolean;
  diffSeconds: number;
  countdownText: string;
  progress: number;
}

export function getNextPrayerCountdown(
  prayerTimes: PrayerTimeValues,
  now = new Date()
): NextPrayerInfo {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = currentMinutes * 60 + now.getSeconds();

  const prayers = [
    { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', hours: prayerTimes.fajr.hours, minutes: prayerTimes.fajr.minutes, timeStr: prayerTimes.fajr.timeStr },
    { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', hours: prayerTimes.dhuhr.hours, minutes: prayerTimes.dhuhr.minutes, timeStr: prayerTimes.dhuhr.timeStr },
    { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', hours: prayerTimes.asr.hours, minutes: prayerTimes.asr.minutes, timeStr: prayerTimes.asr.timeStr },
    { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', hours: prayerTimes.maghrib.hours, minutes: prayerTimes.maghrib.minutes, timeStr: prayerTimes.maghrib.timeStr },
    { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', hours: prayerTimes.isha.hours, minutes: prayerTimes.isha.minutes, timeStr: prayerTimes.isha.timeStr }
  ];

  for (let i = 0; i < prayers.length; i++) {
    const p = prayers[i];
    const pSeconds = (p.hours * 60 + p.minutes) * 60;
    if (pSeconds > currentSeconds) {
      const diffSecs = Math.max(0, pSeconds - currentSeconds);
      const h = Math.floor(diffSecs / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      const s = diffSecs % 60;
      const countdown = `-${toArabicNumber(h.toString().padStart(2, '0'))}:${toArabicNumber(m.toString().padStart(2, '0'))}:${toArabicNumber(s.toString().padStart(2, '0'))}`;
      
      const prevSeconds = i === 0 ? ((prayers[prayers.length - 1].hours * 60 + prayers[prayers.length - 1].minutes) * 60) - 86400 : ((prayers[i - 1].hours * 60 + prayers[i - 1].minutes) * 60);
      const totalInterval = Math.max(1, pSeconds - prevSeconds);
      const elapsed = Math.max(0, currentSeconds - prevSeconds);
      const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalInterval) * 100)));

      return {
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        time: p.timeStr,
        isTomorrow: false,
        diffSeconds: diffSecs,
        countdownText: countdown,
        progress
      };
    }
  }

  // Next prayer is Fajr tomorrow
  const fajrSecsTomorrow = (prayerTimes.fajr.hours * 60 + prayerTimes.fajr.minutes) * 60 + 86400;
  const diffSecs = Math.max(0, fajrSecsTomorrow - currentSeconds);
  const h = Math.floor(diffSecs / 3600);
  const m = Math.floor((diffSecs % 3600) / 60);
  const s = diffSecs % 60;
  const countdown = `-${toArabicNumber(h.toString().padStart(2, '0'))}:${toArabicNumber(m.toString().padStart(2, '0'))}:${toArabicNumber(s.toString().padStart(2, '0'))}`;

  return {
    id: 'fajr',
    nameAr: 'الفجر',
    nameEn: 'Fajr',
    time: prayerTimes.fajr.timeStr,
    isTomorrow: true,
    diffSeconds: diffSecs,
    countdownText: countdown,
    progress: 50
  };
}
