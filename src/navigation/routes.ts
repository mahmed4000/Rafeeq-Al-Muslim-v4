import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';

// Legacy screen keys (used by navigate()) mapped to Expo Router paths in src/app.
export const SCREEN_PATHS: Record<string, string> = {
  home: '/',
  quran_index: '/quran',
  azkar_categories: '/azkar',
  haramain_lessons: '/haramain',
  settings: '/settings',
  prayer_times: '/prayer-times',
  imsakiah: '/imsakiah',
  qibla: '/qibla',
  quran_reader: '/quran-reader',
  azkar_session: '/azkar-session',
  haramain_book: '/haramain-book',
  haramain_lesson: '/haramain-lesson',
  hadith_40: '/hadith-40',
  allah_names: '/allah-names',
  ruqyah: '/ruqyah',
  zakat_calculator: '/zakat',
  downloads: '/downloads',
  tasbih: '/tasbih',
  khatma: '/khatma',
  tahfeez: '/tahfeez'
};

// Bottom-tab routes: navigating to these switches tabs instead of stacking a new screen.
export const TAB_SCREENS = new Set(['home', 'quran_index', 'azkar_categories', 'haramain_lessons', 'settings']);

export function screenKeyForPath(pathname: string): string {
  const match = Object.keys(SCREEN_PATHS).find((key) => SCREEN_PATHS[key] === pathname);
  return match || 'home';
}

/** URL params must be strings; keep primitives only and drop empty values. */
export function serializeParams(params: Record<string, unknown> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object') {
      console.warn(`navigate(): param "${key}" is an object and was dropped; pass an id instead.`);
      return;
    }
    out[key] = String(value);
  });
  return out;
}

/**
 * Route params with the types screens expect: numeric strings become numbers
 * and "true"/"false" become booleans (URL params always arrive as strings).
 */
export function useScreenParams(): Record<string, any> {
  const raw = useLocalSearchParams();
  return useMemo(() => {
    const parsed: Record<string, any> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      if (v === 'true') parsed[key] = true;
      else if (v === 'false') parsed[key] = false;
      else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) parsed[key] = Number(v);
      else parsed[key] = v;
    });
    return parsed;
  }, [raw]);
}
