import { useEffect, useState } from 'react';
import { getNextPrayerCountdown, NextPrayerInfo, PrayerTimeValues } from '../services/prayerCalculation';
import { cityNow } from '../services/cityTime';

/**
 * Live countdown to the next prayer, measured on the city's clock. Ticks once
 * per second inside the calling component only, so the rest of the app is not
 * re-rendered every second.
 */
export function useNextPrayer(prayerTimes: PrayerTimeValues, timeZone?: string): NextPrayerInfo {
  const [info, setInfo] = useState<NextPrayerInfo>(() => getNextPrayerCountdown(prayerTimes, cityNow(timeZone)));

  // When prayerTimes changes (new city or day) the next tick picks it up within a second.
  useEffect(() => {
    const timer = setInterval(() => {
      setInfo(getNextPrayerCountdown(prayerTimes, cityNow(timeZone)));
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes, timeZone]);

  return info;
}
