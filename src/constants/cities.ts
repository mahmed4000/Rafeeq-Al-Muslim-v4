import { COUNTRY_NAMES, WORLD_CITY_ROWS } from '../data/worldCities';

export const KAABA_LAT = 21.422487;
export const KAABA_LNG = 39.826206;

export interface City {
  id: string;
  nameAr: string;
  nameEn: string;
  country: string;
  countryAr: string;
  countryEn: string;
  lat: number;
  lng: number;
  /** ISO 3166 alpha-2, used to suggest a calculation method. */
  countryCode?: string;
  /** IANA time zone; prayer times are shown in the city's own clock. Missing = device clock. */
  timeZone?: string;
  qiblaAngle?: number;
}

type CalcMethod = 'umm_al_qura' | 'egypt' | 'mwl' | 'isna';

/** Calculation method commonly used in a country; Muslim World League otherwise. */
export function suggestMethodForCountry(code?: string): CalcMethod {
  switch ((code || '').toUpperCase()) {
    case 'SA': return 'umm_al_qura';
    case 'EG': return 'egypt';
    case 'US':
    case 'CA': return 'isna';
    default: return 'mwl';
  }
}

export const METHOD_NAMES_AR: Record<CalcMethod, string> = {
  umm_al_qura: 'أم القرى (السعودية)',
  egypt: 'الهيئة المصرية العامة للمساحة',
  mwl: 'رابطة العالم الإسلامي',
  isna: 'الجمعية الإسلامية لأمريكا الشمالية'
};

// Decimal-degree coordinates (positive = North / East). Prayer times and Qibla
// are always computed from these at runtime, never stored per city.
// The first eight keep their original ids so saved choices still resolve;
// they are also the short list shown before the user searches.
export const CORE_CITIES: City[] = [
  { id: 'makkah', nameAr: 'مكة المكرمة', nameEn: 'Makkah', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', countryCode: 'SA', timeZone: 'Asia/Riyadh', lat: 21.4225, lng: 39.8262 },
  { id: 'madinah', nameAr: 'المدينة المنورة', nameEn: 'Madinah', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', countryCode: 'SA', timeZone: 'Asia/Riyadh', lat: 24.4672, lng: 39.6024 },
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo', country: 'مصر', countryAr: 'مصر', countryEn: 'Egypt', countryCode: 'EG', timeZone: 'Africa/Cairo', lat: 30.0444, lng: 31.2357 },
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', countryCode: 'SA', timeZone: 'Asia/Riyadh', lat: 24.7136, lng: 46.6753 },
  { id: 'dubai', nameAr: 'دبي', nameEn: 'Dubai', country: 'الإمارات', countryAr: 'الإمارات', countryEn: 'UAE', countryCode: 'AE', timeZone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708 },
  { id: 'amman', nameAr: 'عمان', nameEn: 'Amman', country: 'الأردن', countryAr: 'الأردن', countryEn: 'Jordan', countryCode: 'JO', timeZone: 'Asia/Amman', lat: 31.9454, lng: 35.9284 },
  { id: 'istanbul', nameAr: 'إسطنبول', nameEn: 'Istanbul', country: 'تركيا', countryAr: 'تركيا', countryEn: 'Turkey', countryCode: 'TR', timeZone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'london', nameAr: 'لندن', nameEn: 'London', country: 'المملكة المتحدة', countryAr: 'المملكة المتحدة', countryEn: 'United Kingdom', countryCode: 'GB', timeZone: 'Europe/London', lat: 51.5074, lng: -0.1278 }
];

export const CITIES: City[] = [
  ...CORE_CITIES,
  ...WORLD_CITY_ROWS.map(([id, nameAr, nameEn, code, lat, lng, timeZone]): City => {
    const [countryAr, countryEn] = COUNTRY_NAMES[code];
    return { id, nameAr, nameEn, country: countryAr, countryAr, countryEn, countryCode: code, timeZone, lat, lng };
  })
];

/** Folds Arabic spelling variants and Latin accents so "اسطنبول" finds "إسطنبول" and "zurich" finds "Zürich". */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟـ]/g, '') // Latin accents, Arabic tashkeel, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

const SEARCH_KEYS = new Map(CITIES.map((c) => [c.id, normalizeSearch(`${c.nameAr} ${c.nameEn} ${c.countryAr} ${c.countryEn}`)]));

/**
 * Cities matching the query (all words must match), with cities from
 * `preferCountry` first. An empty query returns the short core list.
 */
export function searchCities(query: string, preferCountry?: string): City[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length) return CORE_CITIES;
  const found = CITIES.filter((c) => {
    const key = SEARCH_KEYS.get(c.id) || '';
    return words.every((w) => key.includes(w));
  });
  return found.sort((a, b) => Number(b.countryCode === preferCountry) - Number(a.countryCode === preferCountry));
}

/**
 * Parse a coordinate that may be a number, a numeric string, or the legacy
 * label format stored by older versions (e.g. "30.04° N", "0.12° W").
 */
export function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  let num = parseFloat(match[0]);
  if (/[SW]\s*$/i.test(value.trim())) num = -Math.abs(num);
  return Number.isFinite(num) ? num : null;
}

/**
 * Bring a city object (from storage, GPS or the list) to the current shape.
 * Built-in cities are refreshed from CITIES so old saved copies get corrected
 * coordinates; returns null when the coordinates cannot be recovered.
 */
export function normalizeCity(raw: any): City | null {
  if (!raw || typeof raw !== 'object') return null;
  const builtIn = CITIES.find((c) => c.id === raw.id);
  if (builtIn) return builtIn;
  const lat = parseCoordinate(raw.lat);
  const lng = parseCoordinate(raw.lng);
  if (lat === null || lng === null) return null;
  const countryAr = raw.countryAr || raw.country || '';
  return {
    id: String(raw.id || 'custom'),
    nameAr: raw.nameAr || raw.nameEn || '',
    nameEn: raw.nameEn || raw.nameAr || '',
    country: countryAr,
    countryAr,
    countryEn: raw.countryEn || countryAr,
    countryCode: typeof raw.countryCode === 'string' ? raw.countryCode : undefined,
    timeZone: typeof raw.timeZone === 'string' ? raw.timeZone : undefined,
    lat,
    lng
  };
}
