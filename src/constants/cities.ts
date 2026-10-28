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
  qiblaAngle?: number;
}

// Decimal-degree coordinates (positive = North / East). Prayer times and Qibla
// are always computed from these at runtime, never stored per city.
export const CITIES: City[] = [
  { id: 'makkah', nameAr: 'مكة المكرمة', nameEn: 'Makkah', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', lat: 21.4225, lng: 39.8262 },
  { id: 'madinah', nameAr: 'المدينة المنورة', nameEn: 'Madinah', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', lat: 24.4672, lng: 39.6024 },
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo', country: 'مصر', countryAr: 'مصر', countryEn: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', country: 'السعودية', countryAr: 'السعودية', countryEn: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { id: 'dubai', nameAr: 'دبي', nameEn: 'Dubai', country: 'الإمارات', countryAr: 'الإمارات', countryEn: 'UAE', lat: 25.2048, lng: 55.2708 },
  { id: 'amman', nameAr: 'عمان', nameEn: 'Amman', country: 'الأردن', countryAr: 'الأردن', countryEn: 'Jordan', lat: 31.9454, lng: 35.9284 },
  { id: 'istanbul', nameAr: 'إسطنبول', nameEn: 'Istanbul', country: 'تركيا', countryAr: 'تركيا', countryEn: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { id: 'london', nameAr: 'لندن', nameEn: 'London', country: 'المملكة المتحدة', countryAr: 'المملكة المتحدة', countryEn: 'United Kingdom', lat: 51.5074, lng: -0.1278 }
];

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
    lat,
    lng
  };
}
