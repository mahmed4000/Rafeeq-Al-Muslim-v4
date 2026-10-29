import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { SkyArch, skyPhase } from '../components/home/SkyArch';
import { SceneBackdrop, SCENE_HEIGHT } from '../components/home/SceneHeader';
import { usePalette, Palette, PALETTE } from '../theme/palette';
import { getFullDateInfo, weekdayName, hijriDayShift } from '../services/hijriDate';
import { toArabicNumber, PrayerTimeValues, calculateAccuratePrayerTimes, computeNightTimes } from '../services/prayerCalculation';
import { DailyWirdCard, WirdRow } from '../components/home/DailyWirdCard';
import { DailyWirdService, WirdAuto, WirdItem } from '../services/dailyWird';
import { StorageService } from '../services/storage';
import { AZKAR_CATEGORIES } from '../data/azkarData';
import { useNextPrayer } from '../hooks/useNextPrayer';
import { Khatma, KhatmaService, getKhatmaProgress } from '../services/khatmaService';
import { PrayerLogService, localDateKey } from '../services/prayerLog';
import { PRAYER_KEYS, PRAYER_NAMES_AR, PrayerKey } from '../services/notificationService';
import { surahById, surahForPage } from '../services/quranPages';
import { cityNow, differsFromDevice } from '../services/cityTime';
import { AudioService, LessonResumeRecord } from '../services/audioService';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { getUiLanguage, tr } from '../i18n/language';

// Minutes after a prayer's adhan during which the "now" card suggests post-prayer adhkar.
const AFTER_PRAYER_WINDOW = 30;

const STRIP: { key: keyof PrayerTimeValues; label: string; labelEn: string }[] = [
  { key: 'fajr', label: 'الفجر', labelEn: 'Fajr' },
  { key: 'sunrise', label: 'الشروق', labelEn: 'Sunrise' },
  { key: 'dhuhr', label: 'الظهر', labelEn: 'Dhuhr' },
  { key: 'asr', label: 'العصر', labelEn: 'Asr' },
  { key: 'maghrib', label: 'المغرب', labelEn: 'Maghrib' },
  { key: 'isha', label: 'العشاء', labelEn: 'Isha' }
];

const PRAYER_NAMES_EN: Record<PrayerKey, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const prayerName = (k: PrayerKey) => tr(PRAYER_NAMES_AR[k], PRAYER_NAMES_EN[k]);

type Service = { screen: string; title: string; titleEn: string; icon: keyof typeof Feather.glyphMap };

// Seven shortcuts on Home; the eighth tile opens the All services screen.
const SERVICES: Service[] = [
  { screen: 'quran_index', title: 'المصحف', titleEn: 'Quran', icon: 'book-open' },
  { screen: 'azkar_categories', title: 'الأذكار', titleEn: 'Adhkar', icon: 'heart' },
  { screen: 'tasbih', title: 'المسبحة', titleEn: 'Tasbih', icon: 'circle' },
  { screen: 'qibla', title: 'القبلة', titleEn: 'Qibla', icon: 'compass' },
  { screen: 'khatma', title: 'الختمة', titleEn: 'Khatma', icon: 'award' },
  { screen: 'haramain_lessons', title: 'الحرمين', titleEn: 'Haramain', icon: 'headphones' },
  { screen: 'tahfeez', title: 'الحفظ', titleEn: 'Memorize', icon: 'repeat' }
];

const AZKAR_PROGRESS_KEY = 'rafeeq_azkar_progress_v1';
type AzkarProgress = Record<string, { day: string; index: number; doneDay?: string }>;
const WEEK_DAYS = 7;

/** The week (Saturday to Friday) that contains `day`. */
const weekDates = (day: Date) => {
  const sinceSaturday = (day.getDay() + 1) % 7; // Sat 0 … Fri 6
  return Array.from({ length: WEEK_DAYS }, (_, i) => new Date(day.getFullYear(), day.getMonth(), day.getDate() - sinceSaturday + i, 12));
};

const toMin = (t: { hours: number; minutes: number }) => t.hours * 60 + t.minutes;

/** "صفحة واحدة", "صفحتان", "٣ صفحات", "١١ صفحة" (Arabic number agreement). */
const pagesText = (n: number) => {
  if (getUiLanguage() === 'en') return n === 1 ? '1 page' : `${toArabicNumber(n)} pages`;
  if (n === 1) return 'صفحة واحدة';
  if (n === 2) return 'صفحتان';
  const mod = n % 100;
  return `${toArabicNumber(n)} ${mod >= 3 && mod <= 10 ? 'صفحات' : 'صفحة'}`;
};

/** Seconds as "١٢:٠٥" or "١:٠٢:٠٥" in Arabic digits. */
const clockAr = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return toArabicNumber(h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
};

const HARAMAIN_COURSES: any[] = [...PROPHET_MOSQUE_COURSES, ...MAKKAH_MOSQUE_COURSES];

type NowCard =
  | { kind: 'adhkar'; categoryId: string; title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }
  | { kind: 'kahf' }
  | { kind: 'quran' };

/** What the "now" card suggests, based only on the day's prayer times. */
function pickNowCard(times: PrayerTimeValues, now: Date): NowCard {
  const m = now.getHours() * 60 + now.getMinutes();
  const category = (id: string) => AZKAR_CATEGORIES.find((c) => c.id === id)!;

  const title = (c: { titleAr: string; titleEn: string }) => tr(c.titleAr, c.titleEn);

  const justPrayed = PRAYER_KEYS.find((k) => m >= toMin(times[k]) && m < toMin(times[k]) + AFTER_PRAYER_WINDOW);
  if (justPrayed) {
    const c = category('after_prayer');
    return { kind: 'adhkar', categoryId: c.id, title: title(c), subtitle: tr(`بعد صلاة ${PRAYER_NAMES_AR[justPrayed]}`, `After ${PRAYER_NAMES_EN[justPrayed]} prayer`), icon: 'check-circle' };
  }
  // Windows follow the subtitles already shown on the adhkar categories.
  if (m >= toMin(times.fajr) && m < toMin(times.sunrise)) {
    const c = category('morning');
    return { kind: 'adhkar', categoryId: c.id, title: title(c), subtitle: tr(c.subtitleAr, c.subtitleEn), icon: 'sun' };
  }
  if (m >= toMin(times.asr) && m < toMin(times.maghrib)) {
    const c = category('evening');
    return { kind: 'adhkar', categoryId: c.id, title: title(c), subtitle: tr(c.subtitleAr, c.subtitleEn), icon: 'moon' };
  }
  if (m >= toMin(times.isha) || m < toMin(times.fajr)) {
    const c = category('sleep');
    return { kind: 'adhkar', categoryId: c.id, title: title(c), subtitle: tr(c.subtitleAr, c.subtitleEn), icon: 'moon' };
  }
  if (now.getDay() === 5 && m < toMin(times.maghrib)) return { kind: 'kahf' };
  return { kind: 'quran' };
}

const Card: React.FC<{ p: Palette; children: React.ReactNode; tone?: 'surface' | 'soft'; style?: object }> = ({ p, children, tone = 'surface', style }) => (
  <View style={[{ borderRadius: 16, padding: 16, backgroundColor: tone === 'soft' ? p.soft : p.surface, borderWidth: 1, borderColor: p.border }, style]}>
    {children}
  </View>
);

const PrimaryButton: React.FC<{ p: Palette; label: string; onPress: () => void }> = ({ p, label, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    accessibilityRole="button"
    onPress={onPress}
    style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary }}
  >
    <TextUI size={15} weight="bold" color={p.onPrimary}>{label}</TextUI>
  </TouchableOpacity>
);

const ProgressBar: React.FC<{ p: Palette; percent: number; height?: number }> = ({ p, percent, height = 6 }) => (
  <View style={{ flex: 1, height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: p.track }}>
    <View style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', backgroundColor: p.accent }} />
  </View>
);

type Tone = { bg: string; fg: string; ring: string };

// One calm parchment tone for service and time-of-day icons.
const TONES: Record<'light' | 'dark', Tone> = {
  light: { bg: '#F2E3CF', fg: '#8C5E3C', ring: '#FBF3E8' },
  dark: { bg: '#3A2C22', fg: '#D6A877', ring: '#4A3A2E' }
};

const STRIP_ICONS: Record<keyof PrayerTimeValues, keyof typeof Feather.glyphMap> = {
  fajr: 'sunrise', sunrise: 'sunrise', dhuhr: 'sun', asr: 'sun', maghrib: 'sunset', isha: 'moon'
};

const APP_LOGO = require('../../assets/logo-transparent.png');

// Light text over the scene header, whatever the sky.
const SCENE_INK = '#FFF6EA';
const SCENE_SHADOW = { textShadowColor: 'rgba(30,20,14,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };
const SCENE_BUTTON = { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(30,20,14,0.32)', borderWidth: 1, borderColor: 'rgba(255,246,234,0.35)' };

// Four per row; a round icon with an inner ring.
const ServiceTile: React.FC<{ p: Palette; icon: keyof typeof Feather.glyphMap; label: string; tone: Tone; onPress: () => void }> = ({ p, icon, label, tone, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    accessibilityRole="button"
    onPress={onPress}
    style={{ width: '25%', minHeight: 84, alignItems: 'center', gap: 6 }}
  >
    <View style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg, borderWidth: 3, borderColor: tone.ring }}>
      <Feather name={icon} size={22} color={tone.fg} />
    </View>
    <TextUI size={12.5} weight="medium" color={p.ink} align="center" numberOfLines={1}>{label}</TextUI>
  </TouchableOpacity>
);

export const HomeScreen: React.FC = () => {
  const { navigate, t, isRTL, lang, currentCity, prayerTimes, readingBookmark, refreshLocation, triggerHaptic, setSelectedSurah, hijriAdjust, calculationMethod, asrMethod, prayerOffsets } = useApp();
  const p = usePalette();
  const tone = p.bg === PALETTE.dark.bg ? TONES.dark : TONES.light;
  const timeZone = currentCity.timeZone;
  const next = useNextPrayer(prayerTimes, timeZone);
  // Everything time-based on Home follows the selected city's clock.
  const now = cityNow(timeZone);
  const otherZone = differsFromDevice(timeZone);

  const [khatma, setKhatma] = useState<Khatma | null>(null);
  const [prayed, setPrayed] = useState<PrayerKey[]>([]);
  const [prayedDay, setPrayedDay] = useState(localDateKey());
  const [week, setWeek] = useState<Record<string, PrayerKey[]>>({});
  const [listening, setListening] = useState<LessonResumeRecord | null>(null);
  const [azkarProgress, setAzkarProgress] = useState<AzkarProgress>({});
  const [wirdItems, setWirdItems] = useState<WirdItem[]>([]);
  const [wirdMarked, setWirdMarked] = useState<{ day: string; ids: string[] }>({ day: '', ids: [] });
  // Days from the city's today in the times card; back to today when Home is opened again.
  const [dayOffset, setDayOffset] = useState(0);

  // Reload when Home regains focus (after reading, listening or a session, or on a new day).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const cityToday = cityNow(timeZone);
      const day = localDateKey(cityToday);
      setDayOffset(0);
      KhatmaService.getActive().then((k) => { if (alive) setKhatma(k); });
      AudioService.getLatestUnfinished().then((r) => { if (alive) setListening(r); });
      StorageService.getObject<AzkarProgress>(AZKAR_PROGRESS_KEY, {}).then((a) => { if (alive) setAzkarProgress(a || {}); });
      DailyWirdService.get(day).then((w) => {
        if (!alive) return;
        setWirdItems(w.items);
        setWirdMarked({ day, ids: w.marked });
      });
      PrayerLogService.getDays(weekDates(cityToday).map((d) => localDateKey(d))).then((days) => {
        if (!alive) return;
        setWeek(days);
        setPrayed(days[day] || []);
        setPrayedDay(day);
      });
      return () => { alive = false; };
    }, [timeZone])
  );

  // The tracker resets itself at midnight without waiting for a refocus.
  const today = localDateKey(now);
  const prayedToday = prayedDay === today ? prayed : [];

  const togglePrayed = async (key: PrayerKey) => {
    triggerHaptic('light');
    const list = await PrayerLogService.toggle(key, today);
    setPrayed(list);
    setPrayedDay(today);
    setWeek((w) => ({ ...w, [today]: list }));
  };

  // Times card: today by default, or a nearby day picked with the arrows.
  const isToday = dayOffset === 0;
  const shownDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 12);
  const shownKey = shownDay.toDateString();
  const shownTimes = useMemo(
    () => (isToday ? prayerTimes : calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, shownDay, calculationMethod, asrMethod, timeZone, prayerOffsets)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, prayerTimes, currentCity.lat, currentCity.lng, shownKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  const night = useMemo(
    () => computeNightTimes(currentCity.lat, currentCity.lng, shownDay, calculationMethod, asrMethod, timeZone, prayerOffsets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCity.lat, currentCity.lng, shownKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  // Today's Hijri date moves to the next day at maghrib.
  const dateInfo = getFullDateInfo(shownDay, hijriAdjust + (isToday ? hijriDayShift(prayerTimes.maghrib, now) : 0));
  const dayLabel = dayOffset === 0 ? t('اليوم', 'Today') : dayOffset === 1 ? t('غدًا', 'Tomorrow') : dayOffset === -1 ? t('أمس', 'Yesterday') : '';
  const dayTitle = dayLabel ? `${dayLabel} · ${dateInfo.gregorianDayName}` : dateInfo.gregorianDayName;
  const shiftDay = (delta: number) => {
    triggerHaptic('light');
    setDayOffset((d) => d + delta);
  };

  const openReaderAt = (surahId: number, page?: number, ayah?: number) => {
    const surah = surahById(surahId);
    setSelectedSurah(surah);
    navigate('quran_reader', { readingMode: 'page', startPage: page || surah.mushafPageStart || 1, startSurahId: surah.id, startAyah: ayah });
  };
  const openReaderAtPage = (page: number) => openReaderAt(surahForPage(page).id, page);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowCard = pickNowCard(prayerTimes, now);
  const progress = khatma && !khatma.completedAt ? getKhatmaProgress(khatma) : null;
  const countdown = next.countdownText.replace(/^-/, '');
  const cityName = lang === 'en' ? currentCity.nameEn : currentCity.nameAr;
  const nextName = t(next.nameAr, next.nameEn);
  const forwardIcon = isRTL ? 'chevron-left' : 'chevron-right';
  const bookmarkSurah = readingBookmark
    ? (lang === 'en' ? surahById(readingBookmark.surahId).nameEn || readingBookmark.surahName : readingBookmark.surahName)
    : '';

  // Daily wird: built-in items tick themselves from the app's records.
  const deviceDay = new Date().toDateString(); // adhkar sessions are kept by the device's day
  const wirdMarkedToday = wirdMarked.day === today ? wirdMarked.ids : [];
  const autoLabel = (kind: WirdAuto) => {
    if (kind === 'morning' || kind === 'evening') {
      const c = AZKAR_CATEGORIES.find((x) => x.id === kind)!;
      return t(c.titleAr, c.titleEn);
    }
    return kind === 'quran' ? t('وِرد القرآن', 'Daily Quran reading') : t('الصلوات الخمس', 'The five prayers');
  };
  const autoStatus = (kind: WirdAuto): { done: boolean; note: string } => {
    if (kind === 'morning' || kind === 'evening') {
      const s = azkarProgress[kind];
      if (s?.doneDay === deviceDay) return { done: true, note: t('أتممتها', 'Finished') };
      if (s?.day === deviceDay && s.index > 0) return { done: false, note: t(`توقفت عند ${toArabicNumber(s.index + 1)}`, `Stopped at ${toArabicNumber(s.index + 1)}`) };
      return { done: false, note: '' };
    }
    if (kind === 'quran') {
      if (!progress || progress.isComplete || progress.todayTarget <= 0) return { done: false, note: '' };
      return {
        done: progress.readToday >= progress.todayTarget,
        note: t(`${toArabicNumber(Math.min(progress.readToday, progress.todayTarget))} من ${pagesText(progress.todayTarget)}`, `${toArabicNumber(Math.min(progress.readToday, progress.todayTarget))} of ${pagesText(progress.todayTarget)}`)
      };
    }
    return { done: prayedToday.length >= PRAYER_KEYS.length, note: t(`${toArabicNumber(prayedToday.length)} من ٥`, `${toArabicNumber(prayedToday.length)} of 5`) };
  };
  const wirdRows: WirdRow[] = wirdItems.map((item) => {
    const auto = item.auto ? autoStatus(item.auto) : null;
    const marked = wirdMarkedToday.includes(item.id);
    return {
      item,
      label: item.auto ? autoLabel(item.auto) : item.label || '',
      done: !!auto?.done || marked,
      autoDone: !!auto?.done,
      note: auto?.note || ''
    };
  });
  const toggleWird = async (id: string) => {
    triggerHaptic('light');
    const ids = await DailyWirdService.toggleMark(id, today);
    setWirdMarked({ day: today, ids });
  };
  const openWird = (kind: WirdAuto) => {
    triggerHaptic('light');
    if (kind === 'morning' || kind === 'evening') navigate('azkar_session', { categoryId: kind });
    else if (kind === 'prayers') navigate('prayer_times');
    else if (progress && !progress.isComplete) openReaderAtPage(progress.nextPage);
    else if (readingBookmark) openReaderAt(readingBookmark.surahId, readingBookmark.page, readingBookmark.ayah);
    else navigate('quran_index');
  };

  // Weekly strip, Saturday to Friday: prayers marked on each day; days still ahead stay empty.
  const weekStrip = weekDates(now).map((d) => {
    const key = localDateKey(d);
    const count = (key === today ? prayedToday : week[key] || []).length;
    const name = weekdayName(d.getDay());
    return { key, count, name, isToday: key === today, isFuture: key > today };
  });

  const renderNowCard = () => {
    let icon: keyof typeof Feather.glyphMap = 'book-open';
    let title = t('وِرد القرآن', 'Daily Quran reading');
    let subtitle = t('افتح المصحف واقرأ ما تيسّر', 'Open the Mushaf and read what you can');
    let action = () => navigate('quran_index');
    if (nowCard.kind === 'adhkar') {
      icon = nowCard.icon;
      title = nowCard.title;
      subtitle = nowCard.subtitle;
      action = () => navigate('azkar_session', { categoryId: nowCard.categoryId });
    } else if (nowCard.kind === 'kahf') {
      icon = 'star';
      title = t('سورة الكهف', 'Surah Al-Kahf');
      subtitle = t('قراءة سورة الكهف يوم الجمعة', 'Reading Surah Al-Kahf on Friday');
      action = () => openReaderAt(18);
    } else if (progress && !progress.isComplete) {
      const left = Math.max(0, progress.todayTarget - progress.readToday);
      subtitle = left > 0
        ? t(`بقي من وِرد اليوم ${pagesText(left)}`, `${pagesText(left)} left of today's reading`)
        : t('أتممت وِرد اليوم، بارك الله فيك', "You finished today's reading, may Allah bless you");
      action = () => openReaderAtPage(progress.nextPage);
    } else if (readingBookmark) {
      subtitle = t(`تابع من سورة ${readingBookmark.surahName}`, `Continue from Surah ${bookmarkSurah}`);
      action = () => openReaderAt(readingBookmark.surahId, readingBookmark.page, readingBookmark.ayah);
    }
    return (
      <View style={{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: p.hero, shadowColor: '#5D3A22', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name={icon} size={14} color="#E8C79A" />
            <TextUI size={12.5} weight="bold" color="#E8C79A">{t('الآن', 'Now')}</TextUI>
          </View>
          <TextUI size={19} weight="bold" color={p.onHero}>{title}</TextUI>
          <TextUI size={13} color={p.onHeroMuted} numberOfLines={2}>{subtitle}</TextUI>
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${t('ابدأ', 'Start')}: ${title}`}
            onPress={() => { triggerHaptic('light'); action(); }}
            style={{ alignSelf: 'flex-start', marginTop: 6, minHeight: 44, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', backgroundColor: p.accent }}
          >
            <TextUI size={15} weight="bold" color="#2D1E16">{t('ابدأ', 'Start')}</TextUI>
          </TouchableOpacity>
        </View>
        <SkyArch phase={skyPhase(prayerTimes, now)} />
      </View>
    );
  };

  const renderContinue = () => {
    if (progress && !progress.isComplete) {
      const surah = surahForPage(progress.nextPage);
      return (
        <Card p={p} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <TextUI size={16} weight="bold" color={p.ink}>{khatma!.name}</TextUI>
            <TextUI size={13} color={p.muted}>{t(`وِرد اليوم: ${pagesText(progress.todayTarget)}`, `Today: ${pagesText(progress.todayTarget)}`)}</TextUI>
          </View>
          <TextUI size={14} color={p.muted}>{t(`سورة ${surah.nameAr} · صفحة ${toArabicNumber(progress.nextPage)}`, `Surah ${surah.nameEn} · Page ${toArabicNumber(progress.nextPage)}`)}</TextUI>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ProgressBar p={p} percent={progress.percent} />
            <TextUI size={13} weight="bold" color={p.muted}>{t(`${toArabicNumber(progress.percent)}٪`, `${toArabicNumber(progress.percent)}%`)}</TextUI>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PrimaryButton p={p} label={t('أكمل وِردك', 'Continue reading')} onPress={() => openReaderAtPage(progress.nextPage)} />
            <TouchableOpacity accessibilityRole="button" onPress={() => navigate('khatma')} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
              <TextUI size={14} weight="bold" color={p.primary}>{t('تفاصيل الختمة', 'Khatma details')}</TextUI>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }
    if (readingBookmark) {
      return (
        <Card p={p} style={{ gap: 10 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t('آخر قراءة', 'Last read')}</TextUI>
          <TextUI size={14} color={p.muted}>
            {t(
              `سورة ${readingBookmark.surahName} · الآية ${toArabicNumber(readingBookmark.ayah)}${readingBookmark.page ? ` · صفحة ${toArabicNumber(readingBookmark.page)}` : ''}`,
              `Surah ${bookmarkSurah} · Ayah ${toArabicNumber(readingBookmark.ayah)}${readingBookmark.page ? ` · Page ${toArabicNumber(readingBookmark.page)}` : ''}`
            )}
          </TextUI>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PrimaryButton p={p} label={t('تابع القراءة', 'Continue reading')} onPress={() => openReaderAt(readingBookmark.surahId, readingBookmark.page, readingBookmark.ayah)} />
            <TouchableOpacity accessibilityRole="button" onPress={() => navigate('khatma')} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
              <TextUI size={14} weight="bold" color={p.primary}>{t('ابدأ ختمة', 'Start a khatma')}</TextUI>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }
    return (
      <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" onPress={() => navigate('khatma')}>
        <Card p={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Feather name="book-open" size={20} color={p.primary} />
          <View style={{ flex: 1 }}>
            <TextUI size={15} weight="bold" color={p.ink}>{t('ابدأ ختمة', 'Start a khatma')}</TextUI>
            <TextUI size={13} color={p.muted}>{t('حدّد المدة ويوزّع التطبيق الصفحات على الأيام', 'Pick a duration and the app spreads the pages over the days')}</TextUI>
          </View>
          <Feather name={forwardIcon} size={18} color={p.muted} />
        </Card>
      </TouchableOpacity>
    );
  };

  const renderListening = () => {
    const course = listening && HARAMAIN_COURSES.find((c) => c.id === listening.courseId);
    const lesson = course?.lessons?.find((l: any) => l.id === listening!.lessonId);
    if (!listening || !course || !lesson) {
      return (
        <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" onPress={() => navigate('haramain_lessons')}>
          <Card p={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="headphones" size={20} color={p.primary} />
            <View style={{ flex: 1 }}>
              <TextUI size={15} weight="bold" color={p.ink}>{t('دروس الحرمين', 'Haramain lessons')}</TextUI>
              <TextUI size={13} color={p.muted}>{t('كراسي العلماء في المسجد الحرام والمسجد النبوي', "Scholars' lessons at the Grand Mosque and the Prophet's Mosque")}</TextUI>
            </View>
            <Feather name={forwardIcon} size={18} color={p.muted} />
          </Card>
        </TouchableOpacity>
      );
    }
    const percent = listening.totalSecs > 0 ? Math.round((listening.currentSecs / listening.totalSecs) * 100) : 0;
    const position = listening.totalSecs > 0
      ? t(`توقفت عند ${clockAr(listening.currentSecs)} من ${clockAr(listening.totalSecs)}`, `Stopped at ${clockAr(listening.currentSecs)} of ${clockAr(listening.totalSecs)}`)
      : t(`توقفت عند ${clockAr(listening.currentSecs)}`, `Stopped at ${clockAr(listening.currentSecs)}`);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t(`متابعة الاستماع: ${lesson.titleAr}، ${course.scholarAr}، ${position}`, `Continue listening: ${lesson.titleAr}, ${course.scholarAr}, ${position}`)}
        onPress={() => { triggerHaptic('light'); navigate('haramain_lesson', { courseId: course.id, lessonId: lesson.id, autoplay: true }); }}
      >
        <Card p={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}>
            <Feather name="play" size={18} color={p.primary} style={{ marginLeft: 2 }} />
          </View>
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <TextUI size={13} color={p.muted}>{t('متابعة الاستماع · دروس الحرمين', 'Continue listening · Haramain lessons')}</TextUI>
            <TextUI size={15} weight="bold" color={p.ink} numberOfLines={1}>{t(`${lesson.titleAr} — الدرس ${toArabicNumber(lesson.number)}`, `${lesson.titleAr} — Lesson ${toArabicNumber(lesson.number)}`)}</TextUI>
            <TextUI size={12.5} color={p.muted} numberOfLines={1}>{`${course.scholarAr} · ${position}`}</TextUI>
            {percent > 0 ? <View style={{ flexDirection: 'row' }}><ProgressBar p={p} percent={percent} height={4} /></View> : null}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ paddingBottom: 104 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Scene header: sky for the time of day over an Andalusian skyline, with the countdown */}
      <View style={{ height: SCENE_HEIGHT }}>
        <SceneBackdrop phase={skyPhase(prayerTimes, now)} />
        <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 18 : 14, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* App logo: the icon's arch, crescent and mosque on a transparent background */}
              <Image source={APP_LOGO} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 42, height: 42 }} />
              <TextUI size={22} weight="bold" color={SCENE_INK} style={SCENE_SHADOW}>{t('رفيق المسلم', 'Muslim Companion')}</TextUI>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('كل الخدمات', 'All services')}
                onPress={() => navigate('all_services')}
                style={SCENE_BUTTON}
              >
                <Feather name="grid" size={18} color={SCENE_INK} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('الإعدادات', 'Settings')}
                onPress={() => navigate('settings')}
                style={SCENE_BUTTON}
              >
                <Feather name="sliders" size={18} color={SCENE_INK} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t(`الصلاة القادمة ${next.nameAr} بعد ${countdown}، الأذان ${next.time}`, `Next prayer ${nextName} in ${countdown}, adhan at ${next.time}`)}
            onPress={() => navigate('prayer_times')}
            style={{ alignSelf: 'center', alignItems: 'center', gap: 2 }}
          >
            <TextUI size={15} color={SCENE_INK} align="center" style={SCENE_SHADOW}>
              {next.isTomorrow ? t(`${next.nameAr} (غدًا) بعد`, `${nextName} (tomorrow) in`) : t(`${next.nameAr} بعد`, `${nextName} in`)}
            </TextUI>
            <TextUI size={44} weight="bold" color={SCENE_INK} align="center" style={[SCENE_SHADOW, { lineHeight: 52, letterSpacing: 1 }]}>{countdown}</TextUI>
            <TextUI size={14} color={SCENE_INK} align="center" style={SCENE_SHADOW}>
              {otherZone ? t(`الأذان ${next.time} بتوقيت ${currentCity.nameAr}`, `Adhan ${next.time} (${cityName} time)`) : t(`الأذان ${next.time}`, `Adhan ${next.time}`)}
            </TextUI>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t(`المدينة: ${currentCity.nameAr}. اضغط لتحديث الموقع`, `City: ${cityName}. Tap to update location`)}
            onPress={() => { triggerHaptic('light'); refreshLocation(); }}
            style={{ alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(30,20,14,0.38)' }}
          >
            <Feather name="map-pin" size={14} color={SCENE_INK} />
            <TextUI size={14} weight="medium" color={SCENE_INK} numberOfLines={1}>{cityName}</TextUI>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sheet over the scene */}
      <View style={{ marginTop: -26, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: p.bg, paddingHorizontal: 16, paddingTop: 18, gap: 16 }}>

      {/* Times card: date with day arrows, the six times, and the night times */}
      <View style={{ borderRadius: 20, padding: 10, gap: 8, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('اليوم السابق', 'Previous day')} onPress={() => shiftDay(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} color={p.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isToday ? `${dayTitle}، ${dateInfo.hijriFormatted}` : t(`${dayTitle}، ${dateInfo.hijriFormatted}. اضغط للعودة إلى اليوم`, `${dayTitle}, ${dateInfo.hijriFormatted}. Tap to return to today`)}
            disabled={isToday}
            onPress={() => shiftDay(-dayOffset)}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <TextUI size={15} weight="bold" color={p.ink} numberOfLines={1}>{dayTitle}</TextUI>
            <TextUI size={13} color={p.muted} numberOfLines={1}>{`${dateInfo.hijriFormatted} · ${dateInfo.gregorianDate}`}</TextUI>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('اليوم التالي', 'Next day')} onPress={() => shiftDay(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={p.primary} />
          </TouchableOpacity>
        </View>
        <View accessibilityLabel={t('مواقيت اليوم', "Today's prayer times")} style={{ flexDirection: 'row', gap: 2 }}>
          {STRIP.map((s) => {
            const isNext = isToday && !next.isTomorrow && s.key === next.id;
            const time = shownTimes[s.key].timeStr.split(' ')[0];
            const label = t(s.label, s.labelEn);
            return (
              <View
                key={s.key}
                accessibilityLabel={`${label} ${shownTimes[s.key].timeStr}${isNext ? t('، القادمة', ', next') : ''}`}
                style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 14, backgroundColor: isNext ? p.soft : 'transparent' }}
              >
                <TextUI size={13} weight={isNext ? 'bold' : 'medium'} color={isNext ? p.primary : p.muted} numberOfLines={1}>{label}</TextUI>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isNext ? p.hero : tone.bg }}>
                  <Feather name={STRIP_ICONS[s.key]} size={17} color={isNext ? '#F4D9A8' : tone.fg} />
                </View>
                <TextUI size={15} weight="bold" color={s.key === 'sunrise' ? p.muted : p.ink} numberOfLines={1}>{time}</TextUI>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { key: 'mid', label: t('منتصف الليل', 'Midnight'), value: night.midnight },
            { key: 'third', label: t('الثلث الأخير', 'Last third'), value: night.lastThird }
          ].map((n) => (
            <View key={n.key} style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: p.soft }}>
              <TextUI size={13} color={p.muted} numberOfLines={1}>{n.label}</TextUI>
              <TextUI size={14} weight="bold" color={p.ink} numberOfLines={1}>{n.value}</TextUI>
            </View>
          ))}
        </View>
      </View>

      {/* Services: round shortcuts; "More" opens the rest in place */}
      <View style={{ gap: 10 }}>
        <TextUI size={17} weight="bold" color={p.ink}>{t('الخدمات', 'Services')}</TextUI>
        <View accessibilityLabel={t('الخدمات', 'Services')} style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          {SERVICES.map((item) => (
            <ServiceTile key={item.screen} p={p} icon={item.icon} label={t(item.title, item.titleEn)} tone={tone} onPress={() => { triggerHaptic('light'); navigate(item.screen); }} />
          ))}
          <ServiceTile p={p} icon="grid" label={t('كل الخدمات', 'All services')} tone={tone} onPress={() => { triggerHaptic('light'); navigate('all_services'); }} />
        </View>
      </View>

      {renderNowCard()}

      {/* Your week: the private prayer log for the last seven days, and today's marks */}
      <View style={{ borderRadius: 22, padding: 14, gap: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t('أسبوعك', 'Your week')}</TextUI>
          <TextUI size={12.5} color={p.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{t('اختياري · يبقى على جهازك فقط', 'Optional · stays on your device only')}</TextUI>
        </View>
        <View>
          <View style={{ position: 'absolute', left: '7%', right: '7%', top: 16, height: 2, backgroundColor: p.border }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {weekStrip.map((d) => {
              const full = d.count >= PRAYER_KEYS.length;
              return (
                <View
                  key={d.key}
                  accessible
                  accessibilityLabel={d.isFuture
                    ? t(`${d.name}: لم يأتِ بعد`, `${d.name}: not yet`)
                    : t(`${d.name}: ${toArabicNumber(d.count)} من ٥`, `${d.name}: ${toArabicNumber(d.count)} of 5`)}
                  style={{ flex: 1, alignItems: 'center', gap: 6, opacity: d.isFuture ? 0.45 : 1 }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: full ? p.accent : d.count ? p.soft : p.surface, borderWidth: 1.5, borderColor: d.isToday ? p.primary : full ? p.accent : p.border }}>
                    {full
                      ? <Feather name="star" size={15} color="#2D1E16" />
                      : <TextUI size={13} weight="bold" color={p.ink}>{d.count ? toArabicNumber(d.count) : ''}</TextUI>}
                  </View>
                  <TextUI size={11} weight={d.isToday ? 'bold' : 'regular'} color={d.isToday ? p.primary : p.muted} numberOfLines={1}>{lang === 'en' ? d.name.slice(0, 3) : d.name}</TextUI>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, paddingHorizontal: 4, backgroundColor: p.soft }}>
          <TextUI size={12.5} color={p.muted} style={{ paddingHorizontal: 8 }}>{t('اليوم', 'Today')}</TextUI>
          {PRAYER_KEYS.map((key) => {
            const done = prayedToday.includes(key);
            const entered = nowMin >= toMin(prayerTimes[key]);
            return (
              <TouchableOpacity
                key={key}
                disabled={!entered && !done}
                onPress={() => togglePrayed(key)}
                role="checkbox"
                aria-checked={done}
                aria-disabled={!entered && !done}
                accessibilityLabel={t(`صلاة ${PRAYER_NAMES_AR[key]}`, `${PRAYER_NAMES_EN[key]} prayer`)}
                style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: !entered && !done ? 0.45 : 1 }}
              >
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? p.success : p.surface, borderWidth: 1.5, borderColor: done ? p.success : p.border }}>
                  {done ? <Feather name="check" size={13} color="#FFFDF9" /> : null}
                </View>
                <TextUI size={11} color={done ? p.successInk : p.muted} numberOfLines={1}>{prayerName(key)}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <DailyWirdCard
        p={p}
        t={t}
        rows={wirdRows}
        autoLabel={autoLabel}
        onToggle={toggleWird}
        onOpen={openWird}
        onAdd={async (item) => { triggerHaptic('light'); setWirdItems(await DailyWirdService.add(item)); }}
        onRemove={async (id) => {
          triggerHaptic('light');
          setWirdItems(await DailyWirdService.remove(id));
          setWirdMarked((m) => ({ ...m, ids: m.ids.filter((x) => x !== id) }));
        }}
      />

      {/* Continue */}
      <View style={{ gap: 10 }}>
        <TextUI size={17} weight="bold" color={p.ink}>{t('تابع', 'Continue')}</TextUI>
        {renderContinue()}
        {renderListening()}
      </View>

      {/* Ayah of the day, in a framed cartouche like a mushaf heading */}
      <View style={{ borderRadius: 22, padding: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        <View style={{ borderRadius: 17, borderWidth: 1.5, borderColor: p.accent, paddingVertical: 16, paddingHorizontal: 14, gap: 8, alignItems: 'center' }}>
          <TextUI size={12.5} weight="bold" color={p.accentInk}>{t('آية اليوم', 'Ayah of the day')}</TextUI>
          <TextUI font="amiri" size={22} color={p.quranInk} align="center" style={{ lineHeight: 42 }}>
            إِنَّ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ سَيَجْعَلُ لَهُمُ ٱلرَّحْمَـٰنُ وُدًّۭا
          </TextUI>
          <TextUI size={13} color={p.muted}>{t('مريم: ٩٦', 'Maryam: 96')}</TextUI>
        </View>
      </View>
      </View>
    </ScrollView>
  );
};
