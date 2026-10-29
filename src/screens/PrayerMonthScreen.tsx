import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { usePalette } from '../theme/palette';
import { calculateAccuratePrayerTimes, formatPrayerTime, toArabicNumber } from '../services/prayerCalculation';
import { getHijriParts, hijriMonthName, gregorianMonthName } from '../services/hijriDate';
import { cityNow, fromCityClock, zoneOffsetMinutes } from '../services/cityTime';

type Mode = 'hijri' | 'gregorian';
const COLUMNS: { key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; label: string; labelEn: string }[] = [
  { key: 'fajr', label: 'الفجر', labelEn: 'Fajr' },
  { key: 'sunrise', label: 'الشروق', labelEn: 'Sunrise' },
  { key: 'dhuhr', label: 'الظهر', labelEn: 'Dhuhr' },
  { key: 'asr', label: 'العصر', labelEn: 'Asr' },
  { key: 'maghrib', label: 'المغرب', labelEn: 'Maghrib' },
  { key: 'isha', label: 'العشاء', labelEn: 'Isha' }
];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** UTC offset (minutes) in effect in the city on a date; used to flag DST changes. */
const offsetOn = (date: Date, timeZone?: string) =>
  zoneOffsetMinutes(timeZone, fromCityClock(date, timeZone)) ?? -date.getTimezoneOffset();

/** All dates of the Hijri month that is `offset` months away from today's. */
function hijriMonthDates(offset: number, now: Date, hijriAdjust: number): Date[] {
  const today = addDays(now, 0);
  const hijri = (d: Date) => getHijriParts(d, hijriAdjust);
  // Jump roughly `offset` lunar months, then walk back to day 1 of that month.
  let probe = addDays(today, Math.round(offset * 29.53));
  for (let i = 0; i < 31 && hijri(probe).day !== 1; i++) probe = addDays(probe, -1);
  const { month } = hijri(probe);
  const dates: Date[] = [];
  for (let d = probe; hijri(d).month === month && dates.length < 31; d = addDays(d, 1)) dates.push(d);
  return dates;
}

function gregorianMonthDates(offset: number, now: Date): Date[] {
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  const dates: Date[] = [];
  for (let d = first; d.getMonth() === first.getMonth(); d = addDays(d, 1)) dates.push(d);
  return dates;
}

export const PrayerMonthScreen: React.FC = () => {
  const { goBack, currentCity, calculationMethod, asrMethod, prayerOffsets, hijriAdjust, t, isRTL, lang } = useApp();
  const p = usePalette();
  const [mode, setMode] = useState<Mode>('hijri');
  const [offset, setOffset] = useState(0);

  const { rows, label, subLabel } = useMemo(() => {
    const tz = currentCity.timeZone;
    const today = cityNow(tz);
    const hijriOf = (d: Date) => getHijriParts(d, hijriAdjust);
    const dates = mode === 'hijri' ? hijriMonthDates(offset, today, hijriAdjust) : gregorianMonthDates(offset, today);
    const built = dates.map((date, i) => {
      const times = calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, date, calculationMethod, asrMethod, tz, prayerOffsets);
      const hijri = hijriOf(date);
      const dstChanged = i > 0 && offsetOn(dates[i - 1], tz) !== offsetOn(date, tz);
      return {
        key: date.toDateString(),
        isToday: sameDay(date, today),
        dstChanged,
        primary: toArabicNumber(mode === 'hijri' ? hijri.day : date.getDate()),
        secondary: mode === 'hijri'
          ? `${toArabicNumber(date.getDate())}/${toArabicNumber(date.getMonth() + 1)}`
          : `${toArabicNumber(hijri.day)}/${toArabicNumber(hijri.month)}`,
        times: COLUMNS.map((c) => formatPrayerTime(times[c.key].hours, times[c.key].minutes).split(' ')[0])
      };
    });
    const first = dates[0];
    const last = dates[dates.length - 1];
    const h = hijriOf(first);
    const title = mode === 'hijri'
      ? `${hijriMonthName(h.month)} ${toArabicNumber(h.year)} ${lang === 'en' ? 'AH' : 'هـ'}`
      : `${gregorianMonthName(first.getMonth())} ${toArabicNumber(first.getFullYear())}`;
    const span = mode === 'hijri'
      ? `${gregorianMonthName(first.getMonth())}${first.getMonth() !== last.getMonth() ? ` – ${gregorianMonthName(last.getMonth())}` : ''} ${toArabicNumber(last.getFullYear())}`
      : `${hijriMonthName(hijriOf(first).month)} – ${hijriMonthName(hijriOf(last).month)}`;
    return { rows: built, label: title, subLabel: `${span} · ${lang === 'en' ? currentCity.nameEn : currentCity.nameAr}` };
  }, [mode, offset, currentCity, calculationMethod, asrMethod, prayerOffsets, hijriAdjust, lang]);

  const navButton = (icon: 'chevron-right' | 'chevron-left', onPress: () => void, a11y: string) => (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={20} color={p.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader title={t('مواقيت الشهر', 'Monthly Times')} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 4, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          {navButton(isRTL ? 'chevron-right' : 'chevron-left', () => setOffset((o) => o - 1), t('الشهر السابق', 'Previous month'))}
          <TouchableOpacity onPress={() => setOffset(0)} accessibilityRole="button" accessibilityLabel={t('العودة إلى الشهر الحالي', 'Back to the current month')} style={{ alignItems: 'center', flex: 1 }}>
            <TextUI size={16} weight="bold" color={p.ink} align="center">{label}</TextUI>
            <TextUI size={12.5} color={p.muted} align="center">{subLabel}</TextUI>
          </TouchableOpacity>
          {navButton(isRTL ? 'chevron-left' : 'chevron-right', () => setOffset((o) => o + 1), t('الشهر التالي', 'Next month'))}
        </View>

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderRadius: 999, padding: 4, backgroundColor: p.bgAlt }}>
          {(['hijri', 'gregorian'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setOffset(0); }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{ flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? p.surface : 'transparent' }}
              >
                <TextUI size={14} weight={active ? 'bold' : 'regular'} color={active ? p.primaryInk : p.muted}>{m === 'hijri' ? t('الشهر الهجري', 'Hijri month') : t('الشهر الميلادي', 'Gregorian month')}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: p.hero }}>
            <TextUI size={12.5} weight="bold" color={p.onHero} align="center" style={{ width: 50 }}>{t('اليوم', 'Day')}</TextUI>
            {COLUMNS.map((c) => (
              <TextUI key={c.key} size={12.5} weight="bold" color={p.onHero} align="center" style={{ flex: 1 }}>{t(c.label, c.labelEn)}</TextUI>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.key}>
              {r.dstChanged ? (
                <View style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: p.soft }}>
                  <TextUI size={12} color={p.primaryInk} align="center">{t('تغيّر التوقيت (الصيفي/الشتوي) من هذا اليوم', 'Clocks change (summer/winter time) from this day')}</TextUI>
                </View>
              ) : null}
              <View
                accessibilityLabel={r.isToday ? t('اليوم', 'Today') : undefined}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 6, paddingHorizontal: 4, borderTopWidth: 1, borderColor: p.divider, backgroundColor: r.isToday ? p.soft : 'transparent' }}
              >
                <View style={{ width: 50, alignItems: 'center' }}>
                  <TextUI size={15} weight="bold" color={r.isToday ? p.primary : p.ink} align="center">{r.primary}</TextUI>
                  <TextUI size={11.5} color={p.muted} align="center">{r.secondary}</TextUI>
                </View>
                {r.times.map((time, i) => (
                  <TextUI key={COLUMNS[i].key} size={13} weight={r.isToday ? 'bold' : 'regular'} color={COLUMNS[i].key === 'sunrise' ? p.muted : p.ink} align="center" style={{ flex: 1 }}>
                    {time}
                  </TextUI>
                ))}
              </View>
            </View>
          ))}
        </View>
        <TextUI size={12.5} color={p.muted} style={{ lineHeight: 20 }}>
          {t(
            `محسوبة لموقع ${currentCity.nameAr}${currentCity.timeZone ? ' وبتوقيتها المحلي' : ' بتوقيت جهازك'}. التاريخ الهجري وفق تقويم أم القرى وقد يختلف يومًا عن رؤية الهلال في بلدك.`,
            `Calculated for ${currentCity.nameEn}${currentCity.timeZone ? ' in its local time' : ' in your device time'}. The Hijri date follows the Umm al-Qura calendar and may differ by a day from the moon sighting in your country.`
          )}
        </TextUI>
      </ScrollView>
    </View>
  );
};
