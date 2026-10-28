/**
 * City clock helpers.
 *
 * Screens and the prayer engine work with "wall-clock dates": Date objects whose
 * local fields (getHours, getDate, ...) show the time in the selected city rather
 * than on the device. Without a time zone (or without Intl support) everything
 * falls back to the device clock, which is the old behaviour.
 */

const formatters: Record<string, Intl.DateTimeFormat | null> = {};

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  if (!(timeZone in formatters)) {
    try {
      formatters[timeZone] = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      });
    } catch {
      formatters[timeZone] = null; // unknown zone or no Intl time zone support
    }
  }
  return formatters[timeZone];
}

/** The device's IANA time zone, e.g. "Africa/Cairo". */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Minutes east of UTC for a time zone at an instant; null when unknown. */
export function zoneOffsetMinutes(timeZone: string | undefined, instant: Date): number | null {
  if (!timeZone) return null;
  const fmt = formatterFor(timeZone);
  if (!fmt) return null;
  const parts: Record<string, number> = {};
  fmt.formatToParts(instant).forEach((p) => {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  });
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

const deviceOffset = (d: Date) => -d.getTimezoneOffset();

/** Wall-clock date in the city for an absolute instant. */
export function toCityClock(instant: Date, timeZone?: string): Date {
  const city = zoneOffsetMinutes(timeZone, instant);
  if (city === null) return instant;
  return new Date(instant.getTime() + (city - deviceOffset(instant)) * 60000);
}

/** The current time in the city, as a wall-clock date. */
export function cityNow(timeZone?: string): Date {
  return toCityClock(new Date(), timeZone);
}

/** The absolute instant for a wall-clock date in the city (inverse of toCityClock). */
export function fromCityClock(wall: Date, timeZone?: string): Date {
  if (zoneOffsetMinutes(timeZone, wall) === null) return wall;
  let guess = wall.getTime();
  // Two passes settle the offset, including around DST changes.
  for (let i = 0; i < 2; i++) {
    const city = zoneOffsetMinutes(timeZone, new Date(guess))!;
    guess = wall.getTime() - (city - deviceOffset(wall)) * 60000;
  }
  return new Date(guess);
}

/** True when the city's clock currently differs from the device's. */
export function differsFromDevice(timeZone?: string): boolean {
  const now = new Date();
  const city = zoneOffsetMinutes(timeZone, now);
  return city !== null && city !== deviceOffset(now);
}
