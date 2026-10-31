import React, { useCallback, useMemo, useState } from 'react';
import { View, Animated, TouchableOpacity, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PrayingFigure } from '../components/home/PrayingFigure';
import { skyPhase } from '../components/home/SkyArch';
import { SceneBackdrop, SCENE_HEIGHT } from '../components/home/SceneHeader';
import { MushafCover } from '../components/home/MushafCover';
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
import { PRAYER_KEYS, PRAYER_NAMES_AR, PrayerKey, PRE_ADHAN_DEFAULT_MINUTES, NotificationService } from '../services/notificationService';
import { surahById, surahForPage } from '../services/quranPages';
import { forHafsFont, parseSurahVerses } from '../services/quranParser';
import { DAILY_AYAT } from '../data/dailyAyat';
import { cityNow, differsFromDevice } from '../services/cityTime';
import { AudioService, LessonResumeRecord } from '../services/audioService';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { getUiLanguage, tr } from '../i18n/language';

// Minutes after a prayer's adhan during which the "now" card suggests post-prayer adhkar.
const AFTER_PRAYER_WINDOW = 30;

// Header: counts down to the next time; for 20 minutes after a prayer's adhan (or sunrise) it counts up.
const SINCE_WINDOW = 20 * 60;
const HEADER_PRAYERS: (keyof PrayerTimeValues)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const headerTimeName = (key: keyof PrayerTimeValues) => (key === 'sunrise' ? tr('الشروق', 'Sunrise') : prayerName(key));

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

// Four shortcuts on Home (the tabs cover the rest); the last opens every service.
const SERVICES: Service[] = [
  { screen: 'qibla', title: 'القبلة', titleEn: 'Qibla', icon: 'compass' },
  { screen: 'tasbih', title: 'المسبحة', titleEn: 'Tasbih', icon: 'circle' },
  { screen: 'tahfeez', title: 'الحفظ', titleEn: 'Memorize', icon: 'repeat' },
  { screen: 'all_services', title: 'كل الخدمات', titleEn: 'All services', icon: 'grid' }
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

const ProgressBar: React.FC<{ p: Palette; percent: number; height?: number }> = ({ p, percent, height = 6 }) => (
  <View style={{ flex: 1, height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: p.track }}>
    <View style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', backgroundColor: p.accent }} />
  </View>
);

/** Where the reader is (today's khatma portion or the last page read), with Read and Listen. */
const ContinueCard: React.FC<{
  p: Palette; t: (ar: string, en: string) => string; onTap: () => void;
  caption: string; title: string; percent?: number; note?: string;
  onRead: () => void; onListen: () => void; onMore: () => void; moreLabel: string;
}> = ({ p, t, onTap, caption, title, percent, note, onRead, onListen, onMore, moreLabel }) => (
  <Card p={p} style={{ gap: 12, borderRadius: 22, padding: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 58, height: 62, borderTopLeftRadius: 29, borderTopRightRadius: 29, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft, borderWidth: 1.5, borderColor: p.accent }}>
        <Feather name="book-open" size={24} color={p.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <TextUI size={12.5} color={p.muted} numberOfLines={1}>{caption}</TextUI>
        <TextUI size={17} weight="bold" color={p.ink} numberOfLines={1}>{title}</TextUI>
        {percent !== undefined ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ProgressBar p={p} percent={percent} />
            {note ? <TextUI size={12.5} color={p.muted}>{note}</TextUI> : null}
          </View>
        ) : null}
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" onPress={() => { onTap(); onRead(); }} style={{ flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary }}>
        <Feather name="book-open" size={16} color={p.onPrimary} />
        <TextUI size={15} weight="bold" color={p.onPrimary}>{t('اقرأ', 'Read')}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" onPress={() => { onTap(); onListen(); }} style={{ flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: p.primary }}>
        <Feather name="headphones" size={16} color={p.primary} />
        <TextUI size={15} weight="bold" color={p.primary}>{t('استمع', 'Listen')}</TextUI>
      </TouchableOpacity>
    </View>
    <TouchableOpacity accessibilityRole="button" onPress={onMore} style={{ alignSelf: 'center', minHeight: 32, justifyContent: 'center' }}>
      <TextUI size={13.5} weight="bold" color={p.primary}>{moreLabel}</TextUI>
    </TouchableOpacity>
  </Card>
);

type Tone = { bg: string; fg: string; ring: string };

// One calm parchment tone for service and time-of-day icons.
const TONES: Record<'light' | 'dark', Tone> = {
  light: { bg: '#F2E3CF', fg: '#8C5E3C', ring: '#FBF3E8' },
  dark: { bg: '#3A2C22', fg: '#D6A877', ring: '#4A3A2E' }
};

const APP_LOGO = require('../../assets/logo-transparent.png');

// Light text over the scene header, whatever the sky.
const SCENE_INK = '#FFFFFF';
const SCENE_SHADOW = { textShadowColor: 'rgba(20,12,8,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 };
const SCENE_BUTTON = { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(30,20,14,0.5)', borderWidth: 1, borderColor: 'rgba(255,246,234,0.4)' };
// Dark glass behind the countdown, so it reads over the bright day and afternoon skies too.
const SCENE_PANEL = 'rgba(30,20,14,0.5)';
// The compact top bar on scroll: the scene's deep brown.
const COMPACT_BAR = '#3A2A1F';
// Horseshoe arch around the countdown (outer line and a fine inner line).
const ARCH_W = 210;
const ARCH_H = 160;
const ARCH_PATH = 'M6 160 V86 A99 84 0 0 1 204 86 V160';
const ARCH_INNER = 'M16 160 V88 A89 74 0 0 1 194 88 V160';

// Arch-topped tile: a round icon over its name.
const ServiceTile: React.FC<{ p: Palette; icon: keyof typeof Feather.glyphMap; label: string; tone: Tone; onPress: () => void }> = ({ p, icon, label, tone, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={{ flex: 1, minWidth: 0, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 6, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
  >
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
      <Feather name={icon} size={19} color={tone.fg} />
    </View>
    <TextUI size={12.5} weight="bold" color={p.ink} align="center" numberOfLines={1}>{label}</TextUI>
  </TouchableOpacity>
);

export const HomeScreen: React.FC = () => {
  const { navigate, t, isRTL, lang, currentCity, prayerTimes, readingBookmark, refreshLocation, triggerHaptic, setSelectedSurah, hijriAdjust, calculationMethod, asrMethod, prayerOffsets } = useApp();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  // Collapsing header: the sky drifts at half speed (and stretches on a pull-down), the
  // countdown fades, and a compact bar with the countdown takes over at the top.
  const [scrollY] = useState(() => new Animated.Value(0));
  const barHeight = insets.top + 50;
  const barFrom = SCENE_HEIGHT - barHeight - 80;
  const [barShown, setBarShown] = useState(false);
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
  const [alertStatus, setAlertStatus] = useState<Awaited<ReturnType<typeof NotificationService.getAlertStatus>>>(null);

  // Reload when Home regains focus (after reading, listening or a session, or on a new day).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const cityToday = cityNow(timeZone);
      const day = localDateKey(cityToday);
      setDayOffset(0);
      KhatmaService.getActive().then((k) => { if (alive) setKhatma(k); });
      AudioService.getLatestUnfinished().then((r) => { if (alive) setListening(r); });
      NotificationService.getAlertStatus().then((s) => { if (alive) setAlertStatus(s); });
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
      // The state setters are stable; listed so the React Compiler keeps this memoization.
    }, [timeZone, setWirdItems, setWirdMarked])
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
  // How many of today's six times have come (for the timeline).
  const passedCount = STRIP.filter((s) => nowMin >= toMin(prayerTimes[s.key])).length;
  const nowCard = pickNowCard(prayerTimes, now);
  const progress = khatma && !khatma.completedAt ? getKhatmaProgress(khatma) : null;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const hms = (secs: number) => [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60]
    .map((v) => toArabicNumber(String(v).padStart(2, '0'))).join(':');
  const secondsFromNow = HEADER_PRAYERS.map((key) => ({ key, diff: (prayerTimes[key].hours * 60 + prayerTimes[key].minutes) * 60 - nowSec }));
  const sincePrayer = secondsFromNow.map(({ key, diff }) => ({ key, elapsed: -diff })).find(({ elapsed }) => elapsed >= 0 && elapsed < SINCE_WINDOW);
  // The next time today (sunrise included), or tomorrow's Fajr after Isha.
  const upcoming = secondsFromNow.find(({ diff }) => diff > 0)
    || { key: 'fajr' as const, diff: next.diffSeconds };
  const headerMode: 'since' | 'countdown' = sincePrayer ? 'since' : 'countdown';
  const headerKey = headerMode === 'since' ? sincePrayer!.key : upcoming.key;
  const headerName = headerTimeName(headerKey);
  const tomorrow = headerMode === 'countdown' && !secondsFromNow.some(({ diff }) => diff > 0);
  const headerLabel = headerMode === 'since'
    ? (headerKey === 'sunrise' ? t(`${headerName} منذ`, `${headerName} was`) : t(`أذان ${headerName} منذ`, `${headerName} adhan was`))
    // In the last 5 minutes (when the pre-adhan alert fires): "Maghrib shortly", still counting down.
    : upcoming.diff <= PRE_ADHAN_DEFAULT_MINUTES * 60 ? t(`${headerName} بعد قليل`, `${headerName} shortly`)
    : tomorrow ? t(`${headerName} (غدًا) بعد`, `${headerName} (tomorrow) in`) : t(`${headerName} بعد`, `${headerName} in`);
  const headerValue = hms(headerMode === 'since' ? sincePrayer!.elapsed : upcoming.diff);
  // Bottom line: the time being counted to or from (sunrise has no adhan).
  const headerTime = prayerTimes[headerKey].timeStr;
  const headerTimeLabel = headerKey === 'sunrise' ? t('الشروق', 'Sunrise') : t('الأذان', 'Adhan');
  const cityName = lang === 'en' ? currentCity.nameEn : currentCity.nameAr;
  // Alert status line under the countdown (none on web, where alerts don't exist).
  const alertLine = (() => {
    if (!alertStatus) return null;
    if (!alertStatus.permission) return { ok: false, text: t('الأذان متوقف · اسمح بالتنبيهات', 'Adhan off · allow alerts') };
    if (!alertStatus.scheduledUntil) return { ok: false, text: t('لا تنبيهات أذان مجدولة', 'No adhan alerts scheduled') };
    const until = alertStatus.scheduledUntil;
    const untilDate = getFullDateInfo(until, 0).gregorianDate.replace(/\s*\S+$/, '');
    return { ok: true, text: t(`الأذان مفعّل حتى ${weekdayName(until.getDay())} ${untilDate}`, `Adhan on until ${weekdayName(until.getDay())} ${untilDate}`) };
  })();
  // Ayah of the day: the next approved verse each calendar day (city date), text from the mushaf.
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const [dailySurahId, dailyAyahNum] = DAILY_AYAT[dayNumber % DAILY_AYAT.length];
  const dailySurah = surahById(dailySurahId);
  const dailyVerse = parseSurahVerses(dailySurah).verses.find((v) => v.ayahNumber === dailyAyahNum);
  const dailyText = forHafsFont((dailyVerse?.text || '').replace(/^۞\s*/, ''));
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
        {/* Quran suggestions show an open mushaf; adhkar keep the sky window */}
        {nowCard.kind === 'adhkar' ? <PrayingFigure /> : <MushafCover />}
      </View>
    );
  };

  const listenAt = (surahId: number, page?: number, ayah?: number) => {
    const surah = surahById(surahId);
    setSelectedSurah(surah);
    navigate('quran_reader', { readingMode: 'page', startPage: page || surah.mushafPageStart || 1, startSurahId: surah.id, startAyah: ayah, autoPlay: true });
  };

  const renderContinue = () => {
    if (progress && !progress.isComplete) {
      const surah = surahForPage(progress.nextPage);
      const end = Math.min(604, progress.nextPage + Math.max(0, progress.todayTarget - progress.readToday) - 1);
      const done = Math.min(progress.readToday, progress.todayTarget);
      return (
        <ContinueCard
          p={p}
          t={t}
          onTap={() => triggerHaptic('light')}
          caption={t(`وِرد اليوم من ${khatma!.name}`, `Today's portion of ${khatma!.name}`)}
          title={end > progress.nextPage
            ? t(`${surah.nameAr} · ص ${toArabicNumber(progress.nextPage)} إلى ${toArabicNumber(end)}`, `${surah.nameEn} · p. ${progress.nextPage}–${end}`)
            : t(`${surah.nameAr} · ص ${toArabicNumber(progress.nextPage)}`, `${surah.nameEn} · p. ${progress.nextPage}`)}
          percent={progress.todayTarget > 0 ? (done / progress.todayTarget) * 100 : progress.percent}
          note={t(`${toArabicNumber(done)} من ${toArabicNumber(progress.todayTarget)}`, `${done} of ${progress.todayTarget}`)}
          onRead={() => openReaderAtPage(progress.nextPage)}
          onListen={() => listenAt(surah.id, progress.nextPage)}
          onMore={() => navigate('khatma')}
          moreLabel={t(`الختمة ${toArabicNumber(progress.percent)}٪ · التفاصيل`, `Khatma ${progress.percent}% · details`)}
        />
      );
    }
    if (readingBookmark) {
      return (
        <ContinueCard
          p={p}
          t={t}
          onTap={() => triggerHaptic('light')}
          caption={t('تابع من حيث توقفت', 'Pick up where you left off')}
          title={t(`${readingBookmark.surahName} · الآية ${toArabicNumber(readingBookmark.ayah)}`, `${bookmarkSurah} · Ayah ${readingBookmark.ayah}`)}
          onRead={() => openReaderAt(readingBookmark.surahId, readingBookmark.page, readingBookmark.ayah)}
          onListen={() => listenAt(readingBookmark.surahId, readingBookmark.page, readingBookmark.ayah)}
          onMore={() => navigate('khatma')}
          moreLabel={t('ابدأ ختمة', 'Start a khatma')}
        />
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
    // Only an unfinished lesson shows here; exploring the lessons lives in the library tab.
    if (!listening || !course || !lesson) return null;
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
    <View style={{ flex: 1, backgroundColor: p.bg }}>
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ paddingBottom: 104 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
        // The bar takes taps only once it shows; a state flip at the threshold, not every frame.
        listener: (event: any) => {
          const shown = event.nativeEvent.contentOffset.y > barFrom + 25;
          if (shown !== barShown) setBarShown(shown);
        }
      })}
    >
      {/* Scene header: sky for the time of day over an Andalusian skyline, with the countdown */}
      <View style={{ height: SCENE_HEIGHT }}>
        <Animated.View
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: SCENE_HEIGHT,
            transform: [
              { translateY: scrollY.interpolate({ inputRange: [-SCENE_HEIGHT, 0, SCENE_HEIGHT], outputRange: [-SCENE_HEIGHT / 2, 0, SCENE_HEIGHT * 0.5] }) },
              { scale: scrollY.interpolate({ inputRange: [-SCENE_HEIGHT, 0], outputRange: [2, 1], extrapolateRight: 'clamp' }) }
            ]
          }}
        >
          <SceneBackdrop phase={skyPhase(prayerTimes, now)} />
        </Animated.View>
        <Animated.View style={{
          opacity: scrollY.interpolate({ inputRange: [0, barFrom], outputRange: [1, 0], extrapolate: 'clamp' }),
          transform: [{ translateY: scrollY.interpolate({ inputRange: [0, SCENE_HEIGHT], outputRange: [0, SCENE_HEIGHT * 0.25], extrapolate: 'clamp' }) }],
          paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 18 : 14, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* App logo: the icon's arch, crescent and mosque on a transparent background */}
              <Image source={APP_LOGO} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 42, height: 42 }} />
              <TextUI size={22} weight="bold" color={SCENE_INK} style={SCENE_SHADOW}>{t('رفيق المسلم', 'Muslim Companion')}</TextUI>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t(`المدينة: ${currentCity.nameAr}. اضغط لتحديث الموقع`, `City: ${cityName}. Tap to update location`)}
                onPress={() => { triggerHaptic('light'); refreshLocation(); }}
                style={{ minHeight: 44, maxWidth: 140, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 22, backgroundColor: 'rgba(30,20,14,0.5)', borderWidth: 1, borderColor: 'rgba(255,246,234,0.4)' }}
              >
                <Feather name="map-pin" size={14} color={SCENE_INK} />
                <TextUI size={13.5} weight="bold" color={SCENE_INK} numberOfLines={1} style={{ flexShrink: 1 }}>{cityName}</TextUI>
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
          {/* The countdown inside a horseshoe arch, like a mihrab over the skyline */}
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${headerLabel} ${headerValue}، ${headerTimeLabel} ${headerTime}`}
            onPress={() => navigate('prayer_times')}
            style={{ alignSelf: 'center', width: ARCH_W, height: ARCH_H, alignItems: 'center', justifyContent: 'center', paddingTop: 22 }}
          >
            <Svg width={ARCH_W} height={ARCH_H} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
              <Path d={ARCH_PATH} fill={SCENE_PANEL} stroke="#E8C79A" strokeWidth={1.6} />
              <Path d={ARCH_INNER} fill="none" stroke="#E8C79A" strokeWidth={0.8} opacity={0.55} />
            </Svg>
            <TextUI size={16} weight="bold" color={SCENE_INK} align="center" style={SCENE_SHADOW}>{headerLabel}</TextUI>
            <TextUI size={40} weight="bold" color={SCENE_INK} align="center" style={[SCENE_SHADOW, { lineHeight: 48, letterSpacing: 1 }]}>{headerValue}</TextUI>
            <TextUI size={14} weight="medium" color={SCENE_INK} align="center" numberOfLines={2} style={[SCENE_SHADOW, { paddingHorizontal: 18 }]}>
              {otherZone
                ? t(`${headerTimeLabel} ${headerTime} بتوقيت ${currentCity.nameAr}`, `${headerTimeLabel} ${headerTime} (${cityName} time)`)
                : `${headerTimeLabel} ${headerTime}`}
            </TextUI>
          </TouchableOpacity>
          {/* Whether the adhan will sound: visible on Home, details in the alert status screen */}
          {alertLine ? (
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={alertLine.text}
              onPress={() => { triggerHaptic('light'); navigate('adhan_status'); }}
              style={{ alignSelf: 'center', minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 17, backgroundColor: 'rgba(30,20,14,0.62)', borderWidth: 1, borderColor: alertLine.ok ? 'rgba(232,199,154,0.5)' : 'rgba(240,160,110,0.7)', marginTop: -6 }}
            >
              <Feather name={alertLine.ok ? 'check' : 'alert-circle'} size={14} color={alertLine.ok ? '#9FD4A8' : '#F6B47A'} />
              <TextUI size={13} weight="bold" color={SCENE_INK} numberOfLines={1}>{alertLine.text}</TextUI>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
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
        {/* The day as a line: times already passed are filled, the next one is ringed */}
        <View accessibilityLabel={t('مواقيت اليوم', "Today's prayer times")} style={{ paddingTop: 6 }}>
          <View style={{ position: 'absolute', top: 15, left: '8.3%', right: '8.3%', height: 3, borderRadius: 2, backgroundColor: p.track }} />
          {isToday && passedCount > 1 ? (
            // Starts at Fajr: native RTL mirrors `left` itself; on web RTL it must be `right`.
            <View style={{ position: 'absolute', top: 15, [Platform.OS === 'web' && isRTL ? 'right' : 'left']: '8.3%', width: `${(passedCount - 1) * (83.4 / 5)}%`, height: 3, borderRadius: 2, backgroundColor: p.accent }} />
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            {STRIP.map((s, i) => {
              const isNext = isToday && !next.isTomorrow && s.key === next.id;
              const passed = isToday && i < passedCount;
              const time = shownTimes[s.key].timeStr.split(' ')[0];
              const label = t(s.label, s.labelEn);
              return (
                <View
                  key={s.key}
                  accessibilityLabel={`${label} ${shownTimes[s.key].timeStr}${isNext ? t('، القادمة', ', next') : ''}`}
                  style={{ flex: 1, alignItems: 'center', gap: 5 }}
                >
                  <View style={{ height: 22, justifyContent: 'center' }}>
                    <View style={isNext
                      ? { width: 18, height: 18, borderRadius: 9, backgroundColor: p.surface, borderWidth: 4, borderColor: p.accent }
                      : { width: 11, height: 11, borderRadius: 6, backgroundColor: passed ? p.accent : p.surface, borderWidth: passed ? 0 : 2, borderColor: p.track }} />
                  </View>
                  <TextUI size={13} weight={isNext ? 'bold' : 'medium'} color={isNext ? p.primary : p.muted} numberOfLines={1}>{label}</TextUI>
                  <TextUI size={15} weight="bold" color={isNext ? p.primary : s.key === 'sunrise' ? p.muted : p.ink} numberOfLines={1}>{time}</TextUI>
                </View>
              );
            })}
          </View>
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

      {renderNowCard()}

      {/* Continue: today's Quran portion, read or listen */}
      {renderContinue()}
      {renderListening()}

      {/* Your week: the private prayer log for the last seven days, and today's marks */}
      <View style={{ borderRadius: 22, padding: 14, gap: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t('يومك وأسبوعك', 'Your day and week')}</TextUI>
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

      {/* Shortcuts: arch tiles */}
      <View accessibilityLabel={t('اختصارات', 'Shortcuts')} style={{ flexDirection: 'row', gap: 8 }}>
        {SERVICES.map((item) => (
          <ServiceTile key={item.screen} p={p} icon={item.icon} label={t(item.title, item.titleEn)} tone={tone} onPress={() => { triggerHaptic('light'); navigate(item.screen); }} />
        ))}
      </View>

      {/* Ayah of the day, in a framed cartouche like a mushaf heading */}
      {dailyVerse ? (
        <View style={{ borderRadius: 22, padding: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <View style={{ borderRadius: 17, borderWidth: 1.5, borderColor: p.accent, paddingVertical: 16, paddingHorizontal: 14, gap: 8, alignItems: 'center' }}>
            <TextUI size={12.5} weight="bold" color={p.accentInk}>{t('آية اليوم', 'Ayah of the day')}</TextUI>
            <TextUI font="hafs" size={22} color={p.quranInk} align="center" style={{ lineHeight: 44 }}>{dailyText}</TextUI>
            <TextUI size={13} color={p.muted}>{t(`${dailySurah.nameAr}: ${toArabicNumber(dailyAyahNum)}`, `${dailySurah.nameEn}: ${dailyAyahNum}`)}</TextUI>
          </View>
        </View>
      ) : null}
      </View>
    </Animated.ScrollView>

    {/* Compact bar shown once the scene has scrolled away: logo, countdown and the two buttons */}
    <Animated.View
      pointerEvents={barShown ? 'auto' : 'none'}
      style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: barHeight, paddingTop: insets.top,
        paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: COMPACT_BAR, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
        opacity: scrollY.interpolate({ inputRange: [barFrom, barFrom + 50], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [barFrom, barFrom + 50], outputRange: [-12, 0], extrapolate: 'clamp' }) }]
      }}
    >
      <Image source={APP_LOGO} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 30, height: 30 }} />
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${headerLabel} ${headerValue}`}
        onPress={() => navigate('prayer_times')}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
      >
        <TextUI size={14} weight="medium" color={SCENE_INK} numberOfLines={1}>{headerLabel}</TextUI>
        <TextUI size={20} weight="bold" color={SCENE_INK} style={{ letterSpacing: 0.5 }}>{headerValue}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('كل الخدمات', 'All services')} onPress={() => navigate('all_services')} style={[SCENE_BUTTON, { width: 38, height: 38 }]}>
        <Feather name="grid" size={16} color={SCENE_INK} />
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('الإعدادات', 'Settings')} onPress={() => navigate('settings')} style={[SCENE_BUTTON, { width: 38, height: 38 }]}>
        <Feather name="sliders" size={16} color={SCENE_INK} />
      </TouchableOpacity>
    </Animated.View>
    </View>
  );
};
