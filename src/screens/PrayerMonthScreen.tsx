import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { usePalette } from '../theme/palette';
import { calculateAccuratePrayerTimes, formatPrayerTime, toArabicNumber } from '../services/prayerCalculation';
import { getHijriParts, HIJRI_MONTHS, GREGORIAN_MONTHS } from '../services/hijriDate';
import { cityNow, fromCityClock, zoneOffsetMinutes } from '../services/cityTime';

type Mode = 'hijri' | 'gregorian';
const COLUMNS: { key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; label: string }[] = [
  { key: 'fajr', label: 'الفجر' },
  { key: 'sunrise', label: 'الشروق' },
  { key: 'dhuhr', label: 'الظهر' },
  { key: 'asr', label: 'العصر' },
  { key: 'maghrib', label: 'المغرب' },
  { key: 'isha', label: 'العشاء' }
];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** UTC offset (minutes) in effect in the city on a date; used to flag DST changes. */
const offsetOn = (date: Date, timeZone?: string) =>
  zoneOffsetMinutes(timeZone, fromCityClock(date, timeZone)) ?? -date.getTimezoneOffset();

/** All dates of the Hijri month that is `offset` months away from today's. */
function hijriMonthDates(offset: number, now: Date): Date[] {
  const today = addDays(now, 0);
  // Jump roughly `offset` lunar months, then walk back to day 1 of that month.
  let probe = addDays(today, Math.round(offset * 29.53));
  for (let i = 0; i < 31 && getHijriParts(probe).day !== 1; i++) probe = addDays(probe, -1);
  const { month } = getHijriParts(probe);
  const dates: Date[] = [];
  for (let d = probe; getHijriParts(d).month === month && dates.length < 31; d = addDays(d, 1)) dates.push(d);
  return dates;
}

function gregorianMonthDates(offset: number, now: Date): Date[] {
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  const dates: Date[] = [];
  for (let d = first; d.getMonth() === first.getMonth(); d = addDays(d, 1)) dates.push(d);
  return dates;
}

export const PrayerMonthScreen: React.FC = () => {
  const { goBack, currentCity, calculationMethod, asrMethod, prayerOffsets, t } = useApp();
  const p = usePalette();
  const [mode, setMode] = useState<Mode>('hijri');
  const [offset, setOffset] = useState(0);

  const { rows, label, subLabel } = useMemo(() => {
    const tz = currentCity.timeZone;
    const today = cityNow(tz);
    const dates = mode === 'hijri' ? hijriMonthDates(offset, today) : gregorianMonthDates(offset, today);
    const built = dates.map((date, i) => {
      const times = calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, date, calculationMethod, asrMethod, tz, prayerOffsets);
      const hijri = getHijriParts(date);
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
    const h = getHijriParts(first);
    const title = mode === 'hijri'
      ? `${HIJRI_MONTHS[h.month - 1]} ${toArabicNumber(h.year)} هـ`
      : `${GREGORIAN_MONTHS[first.getMonth()]} ${toArabicNumber(first.getFullYear())}`;
    const span = mode === 'hijri'
      ? `${GREGORIAN_MONTHS[first.getMonth()]}${first.getMonth() !== last.getMonth() ? ` – ${GREGORIAN_MONTHS[last.getMonth()]}` : ''} ${toArabicNumber(last.getFullYear())}`
      : `${HIJRI_MONTHS[getHijriParts(first).month - 1]} – ${HIJRI_MONTHS[getHijriParts(last).month - 1]}`;
    return { rows: built, label: title, subLabel: `${span} · ${currentCity.nameAr}` };
  }, [mode, offset, currentCity, calculationMethod, asrMethod, prayerOffsets]);

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
          {navButton('chevron-right', () => setOffset((o) => o - 1), 'الشهر السابق')}
          <TouchableOpacity onPress={() => setOffset(0)} accessibilityRole="button" accessibilityLabel="العودة إلى الشهر الحالي" style={{ alignItems: 'center', flex: 1 }}>
            <TextUI size={16} weight="bold" color={p.ink} align="center">{label}</TextUI>
            <TextUI size={12.5} color={p.muted} align="center">{subLabel}</TextUI>
          </TouchableOpacity>
          {navButton('chevron-left', () => setOffset((o) => o + 1), 'الشهر التالي')}
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
                <TextUI size={14} weight={active ? 'bold' : 'regular'} color={active ? p.primaryInk : p.muted}>{m === 'hijri' ? 'الشهر الهجري' : 'الشهر الميلادي'}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: p.hero }}>
            <TextUI size={12.5} weight="bold" color={p.onHero} align="center" style={{ width: 50 }}>اليوم</TextUI>
            {COLUMNS.map((c) => (
              <TextUI key={c.key} size={12.5} weight="bold" color={p.onHero} align="center" style={{ flex: 1 }}>{c.label}</TextUI>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.key}>
              {r.dstChanged ? (
                <View style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: p.soft }}>
                  <TextUI size={12} color={p.primaryInk} align="center">تغيّر التوقيت (الصيفي/الشتوي) من هذا اليوم</TextUI>
                </View>
              ) : null}
              <View
                accessibilityLabel={r.isToday ? 'اليوم' : undefined}
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
          {`محسوبة لموقع ${currentCity.nameAr}${currentCity.timeZone ? ' وبتوقيتها المحلي' : ' بتوقيت جهازك'}. التاريخ الهجري وفق تقويم أم القرى وقد يختلف يومًا عن رؤية الهلال في بلدك.`}
        </TextUI>
      </ScrollView>
    </View>
  );
};
