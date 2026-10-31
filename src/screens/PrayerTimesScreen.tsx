import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PrayerSettingsSheets, PrayerSheet, prayerSettingValues } from '../components/prayer/PrayerSettingsSheets';
import { calculateAccuratePrayerTimes, computeNightTimes, countOffsets, toArabicNumber, PrayerTimeValues } from '../services/prayerCalculation';
import { getFullDateInfo, hijriDayShift } from '../services/hijriDate';
import { cityNow } from '../services/cityTime';
import { useNextPrayer } from '../hooks/useNextPrayer';
import { SettingsList } from '../ui/SettingsList';
import { usePalette } from '../theme/palette';
import { tr } from '../i18n/language';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { SunPathHeader } from '../components/prayer/SunPathHeader';
import { skyPhase } from '../components/home/SkyArch';

type RowKey = keyof PrayerTimeValues;

const ROWS: { key: RowKey; nameAr: string; nameEn: string }[] = [
  { key: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr' },
  { key: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise' },
  { key: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr' },
  { key: 'asr', nameAr: 'العصر', nameEn: 'Asr' },
  { key: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib' },
  { key: 'isha', nameAr: 'العشاء', nameEn: 'Isha' }
];

const ROW_ICONS: Record<RowKey, React.ComponentProps<typeof Feather>['name']> = {
  fajr: 'sunrise', sunrise: 'sunrise', dhuhr: 'sun', asr: 'sun', maghrib: 'sunset', isha: 'moon'
};

/** "بعد ٣١ دقيقة" / "بعد ٢ س ١٠ د" ("in 31 min" / "in 2 h 10 min" in English) */
function inAr(secs: number): string {
  const mins = Math.max(1, Math.ceil(secs / 60));
  if (mins < 60) return tr(`بعد ${toArabicNumber(mins)} دقيقة`, `in ${toArabicNumber(mins)} min`);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m
    ? tr(`بعد ${toArabicNumber(h)} س ${toArabicNumber(m)} د`, `in ${toArabicNumber(h)} h ${toArabicNumber(m)} min`)
    : tr(`بعد ${toArabicNumber(h)} س`, `in ${toArabicNumber(h)} h`);
}

export const PrayerTimesScreen: React.FC = () => {
  const {
    navigate,
    t,
    isRTL,
    lang,
    currentCity,
    prayerTimes,
    prayerBells,
    togglePrayerBell,
    calculationMethod,
    asrMethod,
    prayerOffsets,
    hijriAdjust,
    alertsConfig,
    triggerHaptic
  } = useApp();

  const [sheet, setSheet] = useState<PrayerSheet | null>(null);
  // Days from the city's today; back to today whenever the tab is opened again.
  const [dayOffset, setDayOffset] = useState(0);
  useFocusEffect(useCallback(() => setDayOffset(0), []));

  const p = usePalette();
  const timeZone = currentCity.timeZone;
  const next = useNextPrayer(prayerTimes, timeZone);
  const today = cityNow(timeZone);
  const isToday = dayOffset === 0;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, 12);
  const dayKey = day.toDateString();

  const times = useMemo(
    () => (isToday ? prayerTimes : calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone, prayerOffsets)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, prayerTimes, currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  const night = useMemo(
    () => computeNightTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone, prayerOffsets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  const adjustedCount = countOffsets(prayerOffsets);

  // Today's Hijri date moves to the next day at maghrib.
  const dateInfo = getFullDateInfo(day, hijriAdjust + (isToday ? hijriDayShift(prayerTimes.maghrib, today) : 0));
  const dayLabel = dayOffset === 0 ? t('اليوم', 'Today') : dayOffset === 1 ? t('غدًا', 'Tomorrow') : dayOffset === -1 ? t('أمس', 'Yesterday') : '';
  const dayTitle = dayLabel ? `${dayLabel} · ${dateInfo.gregorianDayName}` : dateInfo.gregorianDayName;

  // Status on today's list: the prayer whose time is running and the next one.
  const nowMins = today.getHours() * 60 + today.getMinutes();
  const minsOf = (k: RowKey) => times[k].hours * 60 + times[k].minutes;
  const nextKey = isToday && !next.isTomorrow ? (next.id as RowKey) : null;
  const currentKey: RowKey | null = (() => {
    if (!isToday || nowMins < minsOf('fajr')) return null;
    if (nowMins < minsOf('sunrise')) return 'fajr';
    if (nowMins < minsOf('dhuhr')) return null;
    if (nowMins < minsOf('asr')) return 'dhuhr';
    if (nowMins < minsOf('maghrib')) return 'asr';
    if (nowMins < minsOf('isha')) return 'maghrib';
    return 'isha';
  })();
  const noteFor = (k: RowKey): string => {
    if (k === 'sunrise') return t('ليس وقت صلاة', 'Not a prayer time');
    if (!isToday) return '';
    if (k === nextKey) {
      const alert = alertsConfig.enabled ? alertsConfig.prayers[k] : null;
      return alert?.before
        ? t(`${inAr(next.diffSeconds)} · تنبيه قبل ${toArabicNumber(alert.beforeMinutes)} د`, `${inAr(next.diffSeconds)} · alert ${toArabicNumber(alert.beforeMinutes)} min before`)
        : inAr(next.diffSeconds);
    }
    if (k === currentKey) return t('الوقت الحالي', 'Current time');
    if (nowMins >= minsOf(k)) return t('انتهى', 'Passed');
    return '';
  };

  const values = prayerSettingValues(calculationMethod, asrMethod, prayerOffsets, prayerBells);
  const openSheet = (s: PrayerSheet) => { triggerHaptic('light'); setSheet(s); };
  const settingsRows = [
    {
      key: 'city',
      label: t('المدينة', 'City'),
      value: lang === 'en' ? `${currentCity.nameEn} · ${currentCity.countryEn}` : `${currentCity.nameAr} · ${currentCity.countryAr}`,
      onPress: () => openSheet('city')
    },
    { key: 'calc', label: t('طريقة الحساب', 'Calculation method'), value: values.calc, onPress: () => openSheet('calc') },
    { key: 'asr', label: t('حساب العصر', 'Asr calculation'), value: values.asr, onPress: () => openSheet('asr') },
    { key: 'offsets', label: t('تعديل يدوي للأوقات', 'Manual time adjustments'), value: values.offsets, onPress: () => openSheet('offsets') },
    { key: 'alerts', label: t('الأذان والإقامة', 'Adhan & iqamah'), value: values.alerts, onPress: () => navigate('adhan_settings') },
    { key: 'month', label: t('مواقيت الشهر', 'Monthly timetable'), onPress: () => navigate('prayer_month') }
  ];

  const shiftDay = (delta: number) => {
    triggerHaptic('light');
    setDayOffset((d) => d + delta);
  };

  // Header: the sun's path through today, the prayers as points, the next one ringed.
  const fajrMin = prayerTimes.fajr.hours * 60 + prayerTimes.fajr.minutes;
  const ishaMin = prayerTimes.isha.hours * 60 + prayerTimes.isha.minutes;
  const span = Math.max(1, ishaMin - fajrMin);
  const todayMins = (k: RowKey) => prayerTimes[k].hours * 60 + prayerTimes[k].minutes;
  const arcPoints = ROWS.map((row) => ({
    at: (todayMins(row.key) - fajrMin) / span,
    passed: nowMins >= todayMins(row.key),
    next: !next.isTomorrow && row.key === next.id
  }));
  const sunAt = nowMins >= fajrMin && nowMins <= ishaMin ? (nowMins - fajrMin) / span : null;
  const hms = (secs: number) => [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60]
    .map((v) => toArabicNumber(String(v).padStart(2, '0'))).join(':');
  const nextName = t(next.nameAr, next.nameEn);
  const headerTop = Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 18 : 14;
  const sceneButton = { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(30,20,14,0.45)', borderWidth: 1, borderColor: 'rgba(255,246,234,0.35)' };
  const textShadow = { textShadowColor: 'rgba(20,12,8,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 104 }}
        showsVerticalScrollIndicator={false}
      >
        <SunPathHeader phase={skyPhase(prayerTimes, today)} points={arcPoints} sunAt={sunAt} rtl={isRTL}>
          <View style={{ paddingTop: headerTop, paddingHorizontal: 16, gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <TextUI font="amiri" size={28} weight="bold" color="#FFFFFF" style={textShadow}>{t('الصلاة', 'Prayer')}</TextUI>
                <TextUI size={13.5} color="#FFFFFF" numberOfLines={1} style={textShadow}>{lang === 'en' ? currentCity.nameEn : currentCity.nameAr}</TextUI>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('القبلة', 'Qibla')} onPress={() => navigate('qibla')} style={sceneButton}>
                  <Feather name="compass" size={18} color="#FFF6EA" />
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('مواقيت الشهر', 'Monthly timetable')} onPress={() => navigate('prayer_month')} style={sceneButton}>
                  <Feather name="calendar" size={18} color="#FFF6EA" />
                </TouchableOpacity>
              </View>
            </View>
            <View accessible accessibilityLabel={`${t(`${nextName} بعد`, `${nextName} in`)} ${hms(next.diffSeconds)}`} style={{ alignItems: 'center' }}>
              <TextUI size={15} weight="bold" color="#FFFFFF" style={textShadow}>{next.isTomorrow ? t(`${nextName} (غدًا) بعد`, `${nextName} (tomorrow) in`) : t(`${nextName} بعد`, `${nextName} in`)}</TextUI>
              <TextUI size={36} weight="bold" color="#FFFFFF" style={[textShadow, { lineHeight: 44, letterSpacing: 1 }]}>{hms(next.diffSeconds)}</TextUI>
            </View>
          </View>
        </SunPathHeader>

        <View style={{ marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: p.bg, paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
        {/* Day picker */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 4, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('اليوم السابق', 'Previous day')} onPress={() => shiftDay(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} color={p.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isToday ? t(`${dayTitle}، ${dateInfo.hijriFormatted}`, `${dayTitle}, ${dateInfo.hijriFormatted}`) : t(`${dayTitle}، ${dateInfo.hijriFormatted}. اضغط للعودة إلى اليوم`, `${dayTitle}, ${dateInfo.hijriFormatted}. Tap to return to today`)}
            disabled={isToday}
            onPress={() => shiftDay(-dayOffset)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}
          >
            <TextUI size={15} weight="bold" color={p.ink}>{dayTitle}</TextUI>
            <TextUI size={13} color={p.muted} numberOfLines={1}>{`${dateInfo.hijriFormatted} · ${dateInfo.gregorianDate}`}</TextUI>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('اليوم التالي', 'Next day')} onPress={() => shiftDay(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={p.primary} />
          </TouchableOpacity>
        </View>

        {/* The day's six times: arch-topped icons, the next prayer in the hero colour */}
        <View style={{ gap: 8 }}>
          {ROWS.map((row) => {
            const isNext = row.key === nextKey;
            const isCurrent = row.key === currentKey;
            const note = noteFor(row.key);
            const bellKey = row.key === 'sunrise' ? null : row.key;
            const bellOn = bellKey ? prayerBells[bellKey] : false;
            return (
              <View
                key={row.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 10, borderRadius: 18, backgroundColor: isNext ? p.hero : p.surface, borderWidth: 1, borderColor: isNext ? p.hero : isCurrent ? p.success : p.border }}
              >
                <View style={{ width: 40, height: 44, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isNext ? 'rgba(255,246,234,0.14)' : p.soft }}>
                  <Feather name={ROW_ICONS[row.key]} size={19} color={isNext ? '#F4D9A8' : p.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextUI size={16.5} weight="bold" color={isNext ? p.onHero : row.key === 'sunrise' ? p.muted : p.ink}>{t(row.nameAr, row.nameEn)}</TextUI>
                  {note ? <TextUI size={12.5} color={isNext ? p.onHeroMuted : isCurrent ? p.successInk : p.muted}>{note}</TextUI> : null}
                </View>
                <TextUI size={18} weight="bold" color={isNext ? '#FFFFFF' : p.ink}>{times[row.key].timeStr}</TextUI>
                {bellKey ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: bellOn }}
                    accessibilityLabel={t(`تنبيه ${row.nameAr}`, `${row.nameEn} alert`)}
                    onPress={() => togglePrayerBell(bellKey)}
                    style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Feather name={bellOn ? 'bell' : 'bell-off'} size={18} color={isNext ? '#F4D9A8' : bellOn ? p.primary : p.muted} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 44 }} />
                )}
              </View>
            );
          })}
        </View>
        {adjustedCount ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => openSheet('offsets')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 32, marginTop: -4 }}>
            <Feather name="sliders" size={13} color={p.muted} />
            <TextUI size={12.5} color={p.muted}>{t('بعض الأوقات معدّلة يدويًا', 'Some times are adjusted manually')}</TextUI>
          </TouchableOpacity>
        ) : null}

        {/* Match your mosque: opens the per-prayer minute adjustments */}
        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          onPress={() => openSheet('offsets')}
          style={{ borderRadius: 22, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#E2B276' }}
        >
          <View style={{ flex: 1, padding: 16, gap: 4 }}>
            <TextUI size={16.5} weight="bold" color="#2D1E16">{t('هل تطابق مسجدك؟', 'Does it match your mosque?')}</TextUI>
            <TextUI size={13.5} color="#4A3020" style={{ lineHeight: 22 }}>
              {adjustedCount
                ? t(`عدّلت ${toArabicNumber(adjustedCount)} من الأوقات ليطابق مسجدك.`, `You adjusted ${adjustedCount} times to match your mosque.`)
                : t('إن اختلف أذان مسجدك عدّل الدقائق مرة واحدة.', 'If your mosque differs, adjust the minutes once.')}
            </TextUI>
            <View style={{ alignSelf: 'flex-start', marginTop: 6, minHeight: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: '#2D1E16' }}>
              <TextUI size={14.5} weight="bold" color="#F4D9A8">{t('مطابقة مسجدي', 'Match my mosque')}</TextUI>
            </View>
          </View>
          <Svg width={104} height={128} viewBox="0 0 110 130">
            <Path d="M18 130 V68 A37 37 0 0 1 92 68 V130Z" fill="#7A4E2F" />
            <Path d="M28 130 V72 A27 27 0 0 1 82 72 V130Z" fill="#F4E3C5" />
            <Path d="M38 130 V96 A17 17 0 0 1 72 96 V130Z" fill="#5D3A22" />
            <Rect x={53} y={20} width={4} height={16} fill="#7A4E2F" />
            <Circle cx={55} cy={18} r={4} fill="#7A4E2F" />
          </Svg>
        </TouchableOpacity>

        {/* Whether the adhan will sound */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() => navigate('adhan_status')}
          style={{ minHeight: 64, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}>
            <Feather name="bell" size={19} color={p.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <TextUI size={15} weight="bold" color={p.ink}>{t('حالة الأذان', 'Adhan status')}</TextUI>
            <TextUI size={13} color={p.muted}>{t('تأكد أن الأذان يصلك في وقته', 'Make sure the adhan reaches you on time')}</TextUI>
          </View>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={p.muted} />
        </TouchableOpacity>

        {/* Night times (Maghrib → next Fajr) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('منتصف الليل', 'Midnight'), value: night.midnight },
            { label: t('الثلث الأخير', 'Last third'), value: night.lastThird }
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <TextUI size={13} color={p.muted}>{item.label}</TextUI>
              <TextUI size={18} weight="bold" color={p.ink}>{item.value}</TextUI>
            </View>
          ))}
        </View>

        {/* Calculation and alert settings */}
        <SettingsList rows={settingsRows} />
        </View>
      </ScrollView>

      <PrayerSettingsSheets open={sheet} onClose={() => setSheet(null)} />
    </View>
  );
};
