import { useEffect, useState } from 'react';
import { getNextPrayerCountdown, NextPrayerInfo, PrayerTimeValues } from '../services/prayerCalculation';

/**
 * Live countdown to the next prayer. Ticks once per second inside the calling
 * component only, so the rest of the app is not re-rendered every second.
 */
export function useNextPrayer(prayerTimes: PrayerTimeValues): NextPrayerInfo {
  const [info, setInfo] = useState<NextPrayerInfo>(() => getNextPrayerCountdown(prayerTimes, new Date()));

  // When prayerTimes changes (new city or day) the next tick picks it up within a second.
  useEffect(() => {
    const timer = setInterval(() => {
      setInfo(getNextPrayerCountdown(prayerTimes, new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  return info;
}
