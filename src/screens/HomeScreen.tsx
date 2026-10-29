import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { SkyArch, skyPhase } from '../components/home/SkyArch';
import { usePalette, Palette } from '../theme/palette';
import { getFullDateInfo } from '../services/hijriDate';
import { toArabicNumber, PrayerTimeValues } from '../services/prayerCalculation';
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

const MORE: { screen: string; title: string; titleEn: string; icon: keyof typeof Feather.glyphMap }[] = [
  { screen: 'tasbih', title: 'المسبحة', titleEn: 'Tasbih', icon: 'circle' },
  { screen: 'qibla', title: 'القبلة', titleEn: 'Qibla', icon: 'compass' },
  { screen: 'allah_names', title: 'أسماء الله الحسنى', titleEn: 'Names of Allah', icon: 'star' },
  { screen: 'hadith_40', title: 'الأربعون النووية', titleEn: "Nawawi's Forty", icon: 'award' },
  { screen: 'ruqyah', title: 'الرقية الشرعية', titleEn: 'Ruqyah', icon: 'shield' },
  { screen: 'zakat_calculator', title: 'حاسبة الزكاة', titleEn: 'Zakat Calculator', icon: 'percent' }
];

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

export const HomeScreen: React.FC = () => {
  const { navigate, t, isRTL, lang, currentCity, prayerTimes, readingBookmark, refreshLocation, triggerHaptic, setSelectedSurah, hijriAdjust } = useApp();
  const p = usePalette();
  const timeZone = currentCity.timeZone;
  const next = useNextPrayer(prayerTimes, timeZone);
  // Everything time-based on Home follows the selected city's clock.
  const now = cityNow(timeZone);
  const otherZone = differsFromDevice(timeZone);
  const dateInfo = getFullDateInfo(now, hijriAdjust);

  const [khatma, setKhatma] = useState<Khatma | null>(null);
  const [prayed, setPrayed] = useState<PrayerKey[]>([]);
  const [prayedDay, setPrayedDay] = useState(localDateKey());
  const [listening, setListening] = useState<LessonResumeRecord | null>(null);

  // Reload when Home regains focus (after reading or listening, or on a new day).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const day = localDateKey(cityNow(timeZone));
      KhatmaService.getActive().then((k) => { if (alive) setKhatma(k); });
      AudioService.getLatestUnfinished().then((r) => { if (alive) setListening(r); });
      PrayerLogService.getDay(day).then((list) => {
        if (!alive) return;
        setPrayed(list);
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
      <Card p={p} tone="soft" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}>
          <Feather name={icon} size={22} color={p.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <TextUI size={12.5} weight="bold" color={p.accentInk}>{t('الآن', 'Now')}</TextUI>
          <TextUI size={17} weight="bold" color={p.ink}>{title}</TextUI>
          <TextUI size={13} color={p.muted} numberOfLines={2}>{subtitle}</TextUI>
        </View>
        <PrimaryButton p={p} label={t('ابدأ', 'Start')} onPress={() => { triggerHaptic('light'); action(); }} />
      </Card>
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 16, paddingBottom: 104, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: name, city, settings, dates */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextUI font="amiri" size={26} weight="bold" color={p.primaryInk}>{t('رفيق المسلم', 'Rafeeq Al-Muslim')}</TextUI>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(`المدينة: ${currentCity.nameAr}. اضغط لتحديث الموقع`, `City: ${cityName}. Tap to update location`)}
              onPress={() => { triggerHaptic('light'); refreshLocation(); }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name="map-pin" size={15} color={p.primary} />
              <TextUI size={14} weight="medium" color={p.ink} numberOfLines={1}>{cityName}</TextUI>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('الإعدادات', 'Settings')}
              onPress={() => navigate('settings')}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name="sliders" size={18} color={p.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <TextUI size={14} color={p.muted}>{`${dateInfo.gregorianDayName} ${dateInfo.hijriFormatted} · ${dateInfo.gregorianDate}`}</TextUI>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: p.accent, opacity: 0.45 }} />
          <View style={{ width: 26, height: 13, borderWidth: 1.5, borderBottomWidth: 0, borderColor: p.accent, borderTopLeftRadius: 13, borderTopRightRadius: 13 }} />
          <View style={{ flex: 1, height: 1, backgroundColor: p.accent, opacity: 0.45 }} />
        </View>
      </View>

      {/* Hero: next prayer with the sky for the current time of day */}
      <TouchableOpacity
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={t(`الصلاة القادمة ${next.nameAr} بعد ${countdown}، الأذان ${next.time}`, `Next prayer ${nextName} in ${countdown}, adhan at ${next.time}`)}
        onPress={() => navigate('prayer_times')}
        style={{ borderRadius: 24, padding: 18, flexDirection: 'row', gap: 16, backgroundColor: p.hero, shadowColor: '#5D3A22', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}
      >
        <SkyArch phase={skyPhase(prayerTimes, now)} />
        <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
          <TextUI size={14} color={p.onHeroMuted}>{next.isTomorrow ? t('الصلاة القادمة (غدًا)', 'Next prayer (tomorrow)') : t('الصلاة القادمة', 'Next prayer')}</TextUI>
          {otherZone ? <TextUI size={12.5} color={p.onHeroMuted}>{t(`بتوقيت ${currentCity.nameAr}`, `${cityName} time`)}</TextUI> : null}
          <TextUI size={22} weight="bold" color={p.onHero}>{t(`${next.nameAr} بعد`, `${nextName} in`)}</TextUI>
          <TextUI size={36} weight="bold" color={p.onHero} style={{ lineHeight: 44, letterSpacing: 1 }}>{countdown}</TextUI>
          <TextUI size={14} color={p.onHeroMuted}>{t(`الأذان ${next.time}`, `Adhan ${next.time}`)}</TextUI>
          <View style={{ marginTop: 8, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(250,241,230,0.18)' }}>
            <View style={{ width: `${next.progress}%`, height: '100%', backgroundColor: p.accent }} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Today's times strip */}
      <View accessibilityLabel={t('مواقيت اليوم', "Today's prayer times")} style={{ flexDirection: 'row', gap: 2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        {STRIP.map((s) => {
          const isNext = s.key === next.id;
          const time = prayerTimes[s.key].timeStr.split(' ')[0];
          const label = t(s.label, s.labelEn);
          return (
            <View
              key={s.key}
              accessibilityLabel={`${label} ${prayerTimes[s.key].timeStr}${isNext ? t('، القادمة', ', next') : ''}`}
              style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 12, backgroundColor: isNext ? p.soft : 'transparent' }}
            >
              <TextUI size={13} weight={isNext ? 'bold' : 'medium'} color={isNext ? p.primary : p.muted} numberOfLines={1}>{label}</TextUI>
              <TextUI size={15} weight="bold" color={s.key === 'sunrise' ? p.muted : p.ink} numberOfLines={1}>{time}</TextUI>
            </View>
          );
        })}
      </View>

      {/* Optional private prayer tracker */}
      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <TextUI size={15} weight="bold" color={p.ink}>{t('صلوات اليوم', "Today's prayers")}</TextUI>
          <TextUI size={12.5} color={p.muted}>{t('اختياري · يبقى على جهازك فقط', 'Optional · stays on your device only')}</TextUI>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
                style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: !entered && !done ? 0.45 : 1 }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? p.success : 'transparent', borderWidth: 1.5, borderColor: done ? p.success : p.border }}>
                  {done ? <Feather name="check" size={15} color="#FFFDF9" /> : null}
                </View>
                <TextUI size={11.5} color={done ? p.successInk : p.muted}>{prayerName(key)}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {renderNowCard()}

      {/* Continue */}
      <View style={{ gap: 10 }}>
        <TextUI size={17} weight="bold" color={p.ink}>{t('تابع', 'Continue')}</TextUI>
        {renderContinue()}
        {renderListening()}
      </View>

      {/* More tools */}
      <View style={{ gap: 10 }}>
        <TextUI size={17} weight="bold" color={p.ink}>{t('المزيد', 'More')}</TextUI>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MORE.map((item) => (
            <TouchableOpacity
              key={item.screen}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() => { triggerHaptic('light'); navigate(item.screen); }}
              style={{ width: '31%', flexGrow: 1, minHeight: 84, borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name={item.icon} size={20} color={p.primary} />
              <TextUI size={12.5} weight="medium" color={p.ink} align="center" numberOfLines={2}>{t(item.title, item.titleEn)}</TextUI>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ayah of the day */}
      <Card p={p} style={{ gap: 8, alignItems: 'center', paddingVertical: 18 }}>
        <TextUI size={12.5} weight="bold" color={p.accentInk} style={{ alignSelf: 'flex-start' }}>{t('آية اليوم', 'Ayah of the day')}</TextUI>
        <TextUI font="amiri" size={22} color={p.quranInk} align="center" style={{ lineHeight: 42 }}>
          إِنَّ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ سَيَجْعَلُ لَهُمُ ٱلرَّحْمَـٰنُ وُدًّۭا
        </TextUI>
        <TextUI size={13} color={p.muted}>{t('مريم: ٩٦', 'Maryam: 96')}</TextUI>
      </Card>
    </ScrollView>
  );
};
