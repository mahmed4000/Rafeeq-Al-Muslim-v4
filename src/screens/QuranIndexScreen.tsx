import React, { useMemo, useState } from 'react';
import { FlatList, Modal, TextInput, TouchableOpacity, View, Platform, ScrollView, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp, BookmarkItem } from '../context/AppContext';
import { gregorianMonthName } from '../services/hijriDate';
import { TextUI } from '../components/common/TextUI';
import { Palette, usePalette } from '../theme/palette';
import { QURAN_JUZ_INDEX, QURAN_HIZB_INDEX, QuranHizbIndexItem, QuranJuzIndexItem } from '../data/quranIndex';
import { QURAN_RECITERS } from '../services/quranParser';
import { toArabicNumber } from '../services/prayerCalculation';
import { searchQuranUniversal, splitTextForHighlight, VerseSearchResult } from '../services/quranSearch';
import { getUiLanguage } from '../i18n/language';
import { useFocusEffect } from 'expo-router';
import { useScreenParams } from '../navigation/routes';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Khatma, KhatmaService, getKhatmaProgress } from '../services/khatmaService';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');
const RECITER_STORAGE_KEY = 'quran.selected-reciter';
type IndexTab = 'surah' | 'juz' | 'hizb' | 'bookmarks';

const TABS: { id: IndexTab; label: string; labelEn: string }[] = [
  { id: 'surah', label: 'السور', labelEn: 'Surahs' },
  { id: 'juz', label: 'الأجزاء', labelEn: 'Juz' },
  { id: 'hizb', label: 'الأحزاب', labelEn: 'Hizb' },
  { id: 'bookmarks', label: 'العلامات', labelEn: 'Bookmarks' }
];

/** "٢٩ أكتوبر" from an ISO date, or '' if it cannot be read. */
function shortDateAr(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${toArabicNumber(d.getDate())} ${gregorianMonthName(d.getMonth())}`;
}

/** "٧ آيات" / "٢٨٦ آية" (Arabic plural agreement for counts). */
function versesAr(n: number): string {
  if (getUiLanguage() === 'en') return `${toArabicNumber(n)} ${n === 1 ? 'verse' : 'verses'}`;
  if (n === 2) return 'آيتان';
  const tail = n % 100;
  return `${toArabicNumber(n)} ${tail >= 3 && tail <= 10 ? 'آيات' : 'آية'}`;
}

/** One row of a grouped card: rounded outer corners on the first and last rows only. */
function rowFrame(p: Palette, index: number, count: number): ViewStyle {
  const first = index === 0;
  const last = index === count - 1;
  return {
    backgroundColor: p.surface,
    borderColor: p.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: last ? 1 : 0,
    borderTopLeftRadius: first ? 20 : 0,
    borderTopRightRadius: first ? 20 : 0,
    borderBottomLeftRadius: last ? 20 : 0,
    borderBottomRightRadius: last ? 20 : 0
  };
}

/** Number inside a gold diamond, as in the design. */
const NumberDiamond: React.FC<{ n: number; p: Palette }> = ({ n, p }) => (
  <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: p.accent, transform: [{ rotate: '45deg' }] }} />
    <TextUI size={13} weight="bold" color={p.accentInk}>{toArabicNumber(n)}</TextUI>
  </View>
);

export const QuranIndexScreen: React.FC = () => {
  const { navigate, t, isRTL, lang, setSelectedSurah, readingBookmark, bookmarks, removeBookmark, triggerHaptic } = useApp();
  const en = lang === 'en';
  const fwdChevron = isRTL ? 'chevron-left' : 'chevron-right';
  /** Surah name for labels: English transliteration in English, otherwise the given Arabic name. */
  const surahLabel = (id: number, nameAr: string) => {
    if (!en) return nameAr;
    return QURAN_DATA.find((entry) => entry.id === id)?.nameEn || nameAr;
  };
  const surahType = (type: string) => (en ? (type === 'مدنية' ? 'Medinan' : type === 'مكية' ? 'Meccan' : type) : type);
  const [activeTab, setActiveTab] = useState<IndexTab>('surah');
  // Opened from the reader's "⋯" menu with tab=bookmarks (`at` changes on every request).
  const screenParams = useScreenParams();
  const tabRequest = screenParams?.tab === 'bookmarks' ? `${screenParams.at ?? ''}` : '';
  const [handledTabRequest, setHandledTabRequest] = useState('');
  if (tabRequest && tabRequest !== handledTabRequest) {
    setHandledTabRequest(tabRequest);
    setActiveTab('bookmarks');
  }
  const [search, setSearch] = useState('');
  const [selectedReciter, setSelectedReciter] = useState(QURAN_RECITERS[0].id);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const p = usePalette();

  React.useEffect(() => {
    AsyncStorage.getItem(RECITER_STORAGE_KEY).then((saved) => {
      if (saved && QURAN_RECITERS.some((reciter) => reciter.id === saved)) setSelectedReciter(saved);
    }).catch(() => {});
  }, []);

  const selectedReciterData = QURAN_RECITERS.find((item) => item.id === selectedReciter) || QURAN_RECITERS[0];

  // The running khatma, refreshed whenever the tab comes back (the reader advances it).
  const [khatma, setKhatma] = useState<Khatma | null>(null);
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      KhatmaService.getActive().then((k) => { if (alive) setKhatma(k); });
      return () => { alive = false; };
    }, [])
  );
  const khatmaProgress = khatma && !khatma.completedAt ? getKhatmaProgress(khatma) : null;

  // Universal search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchQuranUniversal(search);
  }, [search]);

  const openReader = (surah: any, mode: 'page' | 'surah' = 'page', page = surah.mushafPageStart || 1, startAyah?: number, autoPlay = false) => {
    triggerHaptic('light');
    setSelectedSurah(surah);
    navigate('quran_reader', {
      readingMode: mode,
      startPage: page,
      startSurahId: surah.id,
      // Only pass an ayah when one was chosen; the reader highlights it as the target.
      startAyah,
      reciterId: selectedReciter,
      autoPlay
    });
  };

  const openPage = (page: number) => {
    triggerHaptic('light');
    const safePage = Math.max(1, Math.min(604, page));
    const pageSectionSurah = QURAN_DATA.find((item) => item.pageMetadata?.some((meta: any) => Number(meta.pageNum) === safePage)) || QURAN_DATA[0];
    setSelectedSurah(pageSectionSurah);
    navigate('quran_reader', {
      readingMode: 'page',
      startPage: safePage,
      startSurahId: pageSectionSurah.id,
      reciterId: selectedReciter
    });
  };

  const chooseReciter = (reciterId: string) => {
    setSelectedReciter(reciterId);
    AsyncStorage.setItem(RECITER_STORAGE_KEY, reciterId).catch(() => {});
  };

  const surahById = (id: number) => QURAN_DATA.find((entry) => entry.id === id) || QURAN_DATA[0];

  // 1. Surah row
  // The play button is a sibling of the row's main button (buttons must not nest).
  const renderSurah = (item: any, index: number, count: number) => (
    <View
      key={`surah-${item.id}`}
      style={[rowFrame(p, index, count), { flexDirection: 'row', alignItems: 'center', paddingEnd: 6, minHeight: 60 }]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={en
          ? `Surah ${item.nameEn}, ${surahType(item.type)}, ${versesAr(item.verses)}, page ${toArabicNumber(item.mushafPageStart || 1)}`
          : `سورة ${item.nameAr}، ${item.type}، ${versesAr(item.verses)}، صفحة ${toArabicNumber(item.mushafPageStart || 1)}`}
        onPress={() => openReader(item, 'page')}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingStart: 8 }}
      >
        <NumberDiamond n={item.id} p={p} />
        <View style={{ flex: 1 }}>
          {en ? (
            <TextUI size={17} weight="bold" color={p.ink}>{item.nameEn}</TextUI>
          ) : (
            <TextUI size={20} weight="bold" color={p.ink} style={{ fontFamily: 'Amiri_700Bold', lineHeight: 30 }}>{item.nameAr}</TextUI>
          )}
          <TextUI size={12.5} color={p.muted}>{`${surahType(item.type)} · ${versesAr(item.verses)}`}</TextUI>
        </View>
        <TextUI size={13} color={p.muted}>{`${t('ص', 'p.')} ${toArabicNumber(item.mushafPageStart || 1)}`}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t(`تشغيل سورة ${item.nameAr}`, `Play Surah ${item.nameEn}`)}
        onPress={() => openReader(item, 'page', item.mushafPageStart || 1, 1, true)}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="play-circle" size={20} color={p.primary} />
      </TouchableOpacity>
    </View>
  );

  // 2. Juz row
  const renderJuz = (item: QuranJuzIndexItem, index: number, count: number) => {
    const hizbStart = (item.juz - 1) * 2 + 1;
    return (
      <TouchableOpacity
        key={`juz-${item.juz}`}
        activeOpacity={0.7}
        accessibilityRole="button"
        onPress={() => openReader(surahById(item.startSurahId), 'page', item.startPage)}
        style={[rowFrame(p, index, count), { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, minHeight: 60 }]}
      >
        <NumberDiamond n={item.juz} p={p} />
        <View style={{ flex: 1 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t(`الجزء ${toArabicNumber(item.juz)}`, `Juz ${toArabicNumber(item.juz)}`)}</TextUI>
          <TextUI size={12.5} color={p.muted}>
            {en
              ? `From ${surahLabel(item.startSurahId, item.startSurahNameAr)} · verse ${toArabicNumber(item.startAyah)} · Hizb ${toArabicNumber(hizbStart)} & ${toArabicNumber(hizbStart + 1)}`
              : `من ${item.startSurahNameAr} · آية ${toArabicNumber(item.startAyah)} · الحزبان ${toArabicNumber(hizbStart)} و${toArabicNumber(hizbStart + 1)}`}
          </TextUI>
        </View>
        <TextUI size={13} color={p.muted} style={{ paddingEnd: 6 }}>{`${t('ص', 'p.')} ${toArabicNumber(item.startPage)}`}</TextUI>
      </TouchableOpacity>
    );
  };

  // 3. Hizb row
  const renderHizb = (item: QuranHizbIndexItem, index: number, count: number) => (
    <TouchableOpacity
      key={`hizb-${item.hizb}`}
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={() => openReader(surahById(item.startSurahId), 'page', item.startPage, item.startAyah)}
      style={[rowFrame(p, index, count), { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, minHeight: 60 }]}
    >
      <NumberDiamond n={item.hizb} p={p} />
      <View style={{ flex: 1 }}>
        <TextUI size={12.5} color={p.muted}>
          {en
            ? `Hizb ${toArabicNumber(item.hizb)} · Juz ${toArabicNumber(item.juz)} · ${surahLabel(item.startSurahId, item.startSurahNameAr)} ${toArabicNumber(item.startAyah)}`
            : `الحزب ${toArabicNumber(item.hizb)} · الجزء ${toArabicNumber(item.juz)} · ${item.startSurahNameAr} ${toArabicNumber(item.startAyah)}`}
        </TextUI>
        <TextUI variant="quranVerse" size={17} color={p.ink} numberOfLines={1}>
          «{item.beginningSnippet}»
        </TextUI>
      </View>
      <TextUI size={13} color={p.muted} style={{ paddingEnd: 6 }}>{`${t('ص', 'p.')} ${toArabicNumber(item.startPage)}`}</TextUI>
    </TouchableOpacity>
  );

  // 4. Bookmark row (remove button is a sibling so buttons do not nest)
  const renderBookmark = (item: BookmarkItem, index: number, count: number) => (
    <View
      key={`bm-${item.surahId}-${item.ayah}`}
      style={[rowFrame(p, index, count), { flexDirection: 'row', alignItems: 'center', paddingEnd: 6, minHeight: 60 }]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={en
          ? `Bookmark: ${surahLabel(item.surahId, item.surahName)}, verse ${toArabicNumber(item.ayah)}, page ${toArabicNumber(item.page)}`
          : `علامة: ${item.surahName}، الآية ${toArabicNumber(item.ayah)}، صفحة ${toArabicNumber(item.page)}`}
        onPress={() => openReader(surahById(item.surahId), 'page', item.page, item.ayah)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingStart: 8 }}
      >
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="bookmark" size={20} color={p.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{en ? `${surahLabel(item.surahId, item.surahName)} · Verse ${toArabicNumber(item.ayah)}` : `${item.surahName} · الآية ${toArabicNumber(item.ayah)}`}</TextUI>
          <TextUI size={12.5} color={p.muted}>{[t(`الجزء ${toArabicNumber(item.juz)}`, `Juz ${toArabicNumber(item.juz)}`), shortDateAr(item.date)].filter(Boolean).join(' · ')}</TextUI>
        </View>
        <TextUI size={13} color={p.muted}>{`${t('ص', 'p.')} ${toArabicNumber(item.page)}`}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={en
          ? `Remove bookmark ${surahLabel(item.surahId, item.surahName)} verse ${toArabicNumber(item.ayah)}`
          : `حذف علامة ${item.surahName} الآية ${toArabicNumber(item.ayah)}`}
        onPress={() => { triggerHaptic('light'); removeBookmark(item.surahId, item.ayah); }}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="trash-2" size={18} color={p.muted} />
      </TouchableOpacity>
    </View>
  );

  // 5. Verse search match with highlighting
  const renderVerseSearchResult = (item: VerseSearchResult, index: number, count: number) => {
    const parts = splitTextForHighlight(item.text, search);
    return (
      <TouchableOpacity
        key={`v-match-${item.surahId}-${item.ayahNumber}-${index}`}
        activeOpacity={0.7}
        accessibilityRole="button"
        onPress={() => openReader(surahById(item.surahId), 'page', item.pageNum, item.ayahNumber)}
        style={[rowFrame(p, index, count), { paddingVertical: 12, paddingHorizontal: 14, gap: 4 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextUI size={14} weight="bold" color={p.primaryInk}>{en ? `${surahLabel(item.surahId, item.surahNameAr)} · Verse ${toArabicNumber(item.ayahNumber)}` : `${item.surahNameAr} · الآية ${toArabicNumber(item.ayahNumber)}`}</TextUI>
          <TextUI size={13} color={p.muted}>{`${t('ص', 'p.')} ${toArabicNumber(item.pageNum)}`}</TextUI>
        </View>
        <TextUI variant="quranVerse" size={17} color={p.ink} style={{ lineHeight: 30 }}>
          {parts.map((part, pIdx) => (
            <TextUI
              key={`part-${pIdx}`}
              variant="quranVerse"
              size={17}
              weight={part.isMatch ? 'bold' : 'regular'}
              color={part.isMatch ? p.accentInk : p.ink}
              style={{ backgroundColor: part.isMatch ? p.soft : 'transparent' }}
            >
              {part.text}
            </TextUI>
          ))}
        </TextUI>
      </TouchableOpacity>
    );
  };

  const sectionTitle = (text: string) => (
    <TextUI size={13} weight="bold" color={p.accentInk} style={{ paddingHorizontal: 4, marginBottom: 8 }}>{text}</TextUI>
  );

  // Where to pick up: the saved place, or Al-Fatiha on first use. "Read" opens the mushaf
  // there; "Listen" opens it with the recitation already playing.
  const resume = readingBookmark
    ? { surahId: readingBookmark.surahId, surahName: readingBookmark.surahName, ayah: readingBookmark.ayah, page: readingBookmark.page, juz: readingBookmark.juz }
    : { surahId: 1, surahName: surahById(1).nameAr, ayah: 1, page: 1, juz: 1 };
  const openResume = (autoPlay: boolean) => {
    triggerHaptic('light');
    setSelectedSurah(surahById(resume.surahId));
    navigate('quran_reader', {
      readingMode: 'page',
      startPage: resume.page,
      startSurahId: resume.surahId,
      startAyah: readingBookmark ? resume.ayah : undefined,
      reciterId: selectedReciter,
      autoPlay
    });
  };
  // Illustrated panel: dusk sky, an arch, the crescent, and the open mushaf on its stand.
  const resumeCard = (
    <View style={{ borderRadius: 24, overflow: 'hidden' }}>
      <LinearGradient colors={['#2E2A4A', '#5B3E63', '#9A5A4A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
    <View style={{ gap: 12, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1, gap: 3, paddingBottom: 6 }}>
          <TextUI size={13} weight="bold" color="#E8C79A">{readingBookmark ? t('تابع من حيث توقفت', 'Pick up where you left off') : t('ابدأ القراءة', 'Start reading')}</TextUI>
          <TextUI size={20} weight="bold" color="#FFFDF9">{en ? `${surahLabel(resume.surahId, resume.surahName)} · Verse ${toArabicNumber(resume.ayah)}` : `${resume.surahName} · الآية ${toArabicNumber(resume.ayah)}`}</TextUI>
          <TextUI size={13} color="#E8D3B4">{t(`صفحة ${toArabicNumber(resume.page)} · الجزء ${toArabicNumber(resume.juz)}`, `Page ${toArabicNumber(resume.page)} · Juz ${toArabicNumber(resume.juz)}`)}</TextUI>
        </View>
        <Svg width={112} height={118} viewBox="0 0 128 136">
          <Circle cx={110} cy={14} r={1.3} fill="#FFF3DC" />
          <Circle cx={8} cy={30} r={1.1} fill="#FFF3DC" />
          <Path d="M8 136 V64 A56 56 0 0 1 120 64 V136" fill="rgba(20,14,30,0.35)" stroke="#E8C79A" strokeWidth={1.6} />
          <Path d="M17 136 V66 A47 47 0 0 1 111 66 V136" fill="none" stroke="#E8C79A" strokeWidth={0.8} opacity={0.5} />
          <Path d="M82 46 a14 14 0 1 1 -10 -25 a11 11 0 1 0 10 25z" fill="#F4D9A8" />
          <Path d="M28 116 L64 98 L100 116" fill="none" stroke="#C69255" strokeWidth={5} strokeLinecap="round" />
          <Path d="M32 118 L50 134 M96 118 L78 134" stroke="#C69255" strokeWidth={4} strokeLinecap="round" />
          <Path d="M30 107 Q47 94 64 101 Q81 94 98 107 L98 113 Q81 102 64 109 Q47 102 30 113Z" fill="#FBF3E4" />
          <Path d="M64 101 V109" stroke="#C69255" strokeWidth={1} />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t(`اقرأ: ${resume.surahName}، صفحة ${toArabicNumber(resume.page)}`, `Read: ${surahLabel(resume.surahId, resume.surahName)}, page ${resume.page}`)}
          onPress={() => openResume(false)}
          style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: p.accent }}
        >
          <Feather name="book-open" size={17} color={p.hero} />
          <TextUI size={15} weight="bold" color={p.hero}>{t('اقرأ', 'Read')}</TextUI>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t(`استمع: ${resume.surahName} بصوت ${selectedReciterData.nameAr}`, `Listen: ${surahLabel(resume.surahId, resume.surahName)}, ${selectedReciterData.nameEn}`)}
          onPress={() => openResume(true)}
          style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: p.accent }}
        >
          <Feather name="headphones" size={17} color={p.onHero} />
          <TextUI size={15} weight="bold" color={p.onHero}>{t('استمع', 'Listen')}</TextUI>
        </TouchableOpacity>
      </View>
      {/* The reciter used by "Listen" and by the play buttons in the list */}
      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t(`القارئ: ${selectedReciterData.nameAr}. اضغط للتغيير`, `Reciter: ${selectedReciterData.nameEn}. Tap to change`)}
        onPress={() => setReciterModalVisible(true)}
        style={{ alignSelf: 'center', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 }}
      >
        <Feather name="mic" size={13} color={p.onHeroMuted} />
        <TextUI size={13} color={p.onHeroMuted} numberOfLines={1}>{t(`بصوت ${selectedReciterData.nameAr}`, `Recited by ${selectedReciterData.nameEn}`)}</TextUI>
        <Feather name="chevron-down" size={13} color={p.onHeroMuted} />
      </TouchableOpacity>
    </View>
    </View>
  );

  // Khatma: a ring for the whole plan and today's portion, when one is running.
  const khatmaCard = khatmaProgress && !khatmaProgress.isComplete ? (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      onPress={() => { triggerHaptic('light'); navigate('khatma'); }}
      style={{ borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
    >
      <ProgressRing size={72} stroke={7} progress={khatmaProgress.percent / 100} color={p.accent} track={p.track}>
        <TextUI size={15} weight="bold" color={p.ink}>{t(`${toArabicNumber(khatmaProgress.percent)}٪`, `${khatmaProgress.percent}%`)}</TextUI>
      </ProgressRing>
      <View style={{ flex: 1, gap: 3 }}>
        <TextUI size={16} weight="bold" color={p.ink} numberOfLines={1}>{khatma!.name}</TextUI>
        <TextUI size={13.5} color={p.muted}>
          {khatmaProgress.readToday >= khatmaProgress.todayTarget
            ? t('أتممت وِرد اليوم، بارك الله فيك', "Today's portion is done, may Allah bless you")
            : t(`وِرد اليوم: بقي ${toArabicNumber(khatmaProgress.todayTarget - khatmaProgress.readToday)} من ${toArabicNumber(khatmaProgress.todayTarget)} صفحات`, `Today: ${khatmaProgress.todayTarget - khatmaProgress.readToday} of ${khatmaProgress.todayTarget} pages left`)}
        </TextUI>
        <TextUI size={14} weight="bold" color={p.primary}>{t(`تابع من صفحة ${toArabicNumber(khatmaProgress.nextPage)}`, `Continue from page ${khatmaProgress.nextPage}`)}</TextUI>
        {khatmaProgress.readToday < khatmaProgress.todayTarget ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              triggerHaptic('light');
              const page = khatmaProgress.nextPage;
              const until = Math.min(604, page + khatmaProgress.todayTarget - khatmaProgress.readToday - 1);
              const surah = QURAN_DATA.find((s) => s.pageMetadata?.some((m: any) => Number(m.pageNum) === page)) || QURAN_DATA[0];
              setSelectedSurah(surah);
              navigate('quran_reader', { readingMode: 'page', startPage: page, startSurahId: surah.id, reciterId: selectedReciter, autoPlay: true, untilPage: Math.max(page, until) });
            }}
            style={{ alignSelf: 'flex-start', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Feather name="headphones" size={14} color={p.primary} />
            <TextUI size={13.5} weight="bold" color={p.primary}>{t('استمع حتى نهاية الورد', "Listen to the end of today's portion")}</TextUI>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  ) : null;

  const listHeader = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {resumeCard}

      {khatmaCard}

      {/* Khatma & memorization as arch tiles */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { key: 'khatma', label: t('ختمتي', 'My Khatma'), note: khatmaProgress && !khatmaProgress.isComplete ? t('تفاصيل الخطة', 'Plan details') : t('ابدأ ختمة', 'Start a khatma'), icon: 'award' as const },
          { key: 'tahfeez', label: t('الحفظ', 'Memorize'), note: t('جلسة تكرار', 'Repetition session'), icon: 'repeat' as const }
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}، ${item.note}`}
            onPress={() => { triggerHaptic('light'); navigate(item.key); }}
            style={{ flex: 1, minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name={item.icon} size={21} color={p.primary} />
            <TextUI size={15} weight="bold" color={p.ink}>{item.label}</TextUI>
            <TextUI size={12.5} color={p.muted}>{item.note}</TextUI>
          </TouchableOpacity>
        ))}
      </View>

      {/* Browse by surah / juz / hizb */}
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: p.bgAlt }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: active ? p.surface : 'transparent' }}
            >
              <TextUI size={14} weight={active ? 'bold' : 'medium'} color={active ? p.primaryInk : p.muted}>{t(tab.label, tab.labelEn)}</TextUI>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const listData: any[] = activeTab === 'surah' ? QURAN_DATA : activeTab === 'juz' ? QURAN_JUZ_INDEX : activeTab === 'hizb' ? QURAN_HIZB_INDEX : bookmarks;
  const noResults = searchResults
    && searchResults.matchedSurahs.length === 0
    && searchResults.matchedHizb.length === 0
    && searchResults.matchedVerses.length === 0
    && !searchResults.isPageMatch;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {/* Title, reciter and search stay fixed so the search field keeps focus while results change */}
      <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 16, paddingBottom: 12, gap: 14 }}>
        <TextUI font="amiri" size={30} weight="bold" color={p.primaryInk}>{t('المصحف', 'The Quran')}</TextUI>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="search" size={18} color={p.muted} />
          <TextInput
            accessibilityLabel={t('بحث في القرآن', 'Search the Quran')}
            placeholder={t('سورة، جزء، صفحة، أو كلمة بلا تشكيل', 'Surah, juz, page, or an Arabic word')}
            placeholderTextColor={p.muted}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: p.ink, textAlign: isRTL ? 'right' : 'left', fontSize: 15, paddingVertical: 10 }}
          />
          {search ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('مسح البحث', 'Clear search')} onPress={() => setSearch('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={16} color={p.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {search.trim() ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 104, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Direct page jump when the query is a page number (1-604) */}
          {searchResults?.isPageMatch && (
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => openPage(searchResults.pageNumber!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: p.soft, borderWidth: 1, borderColor: p.accent }}
            >
              <Feather name="book-open" size={17} color={p.primary} />
              <TextUI size={15} weight="bold" color={p.primaryInk} style={{ flex: 1 }}>{t(`الانتقال إلى الصفحة ${toArabicNumber(searchResults.pageNumber!)}`, `Go to page ${toArabicNumber(searchResults.pageNumber!)}`)}</TextUI>
              <Feather name={fwdChevron} size={18} color={p.primary} />
            </TouchableOpacity>
          )}

          {searchResults && searchResults.matchedSurahs.length > 0 && (
            <View>
              {sectionTitle(`${t('السور', 'Surahs')} (${toArabicNumber(searchResults.matchedSurahs.length)})`)}
              {searchResults.matchedSurahs.map((surah, i, all) => renderSurah(surah, i, all.length))}
            </View>
          )}

          {searchResults && searchResults.matchedHizb.length > 0 && (
            <View>
              {sectionTitle(`${t('الأحزاب', 'Hizb')} (${toArabicNumber(searchResults.matchedHizb.length)})`)}
              {searchResults.matchedHizb.map((hizb, i, all) => renderHizb(hizb, i, all.length))}
            </View>
          )}

          {searchResults && searchResults.matchedVerses.length > 0 && (
            <View>
              {sectionTitle(`${t('الآيات', 'Verses')} (${toArabicNumber(searchResults.matchedVerses.length)})`)}
              {searchResults.matchedVerses.map((verse, i, all) => renderVerseSearchResult(verse, i, all.length))}
            </View>
          )}

          {noResults && (
            <View style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 40, gap: 8 }}>
              <Feather name="search" size={26} color={p.muted} />
              <TextUI size={16} weight="bold" color={p.ink}>{t('لا توجد نتائج', 'No results')}</TextUI>
              <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                {t(
                  'جرّب اسم السورة، أو رقم الصفحة (١ – ٦٠٤)، أو رقم الجزء، أو كلمة من الآية بلا تشكيل.',
                  'Try a surah name, a page number (1 – 604), a juz number, or an Arabic word from the verse without diacritics.'
                )}
              </TextUI>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          key={activeTab}
          data={listData}
          keyExtractor={(item: any) => (activeTab === 'surah' ? `surah-${item.id}` : activeTab === 'juz' ? `juz-${item.juz}` : activeTab === 'hizb' ? `hizb-${item.hizb}` : `bm-${item.surahId}-${item.ayah}`)}
          renderItem={({ item, index }) =>
            activeTab === 'surah'
              ? renderSurah(item, index, listData.length)
              : activeTab === 'juz'
              ? renderJuz(item, index, listData.length)
              : activeTab === 'hizb'
              ? renderHizb(item, index, listData.length)
              : renderBookmark(item, index, listData.length)
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 32, gap: 8 }}>
              <Feather name="bookmark" size={24} color={p.muted} />
              <TextUI size={15} weight="bold" color={p.ink}>{t('لا توجد علامات بعد', 'No bookmarks yet')}</TextUI>
              <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                {t(
                  'أضف علامة من زر العلامة أعلى المصحف، أو بلمس آية ثم «إضافة علامة».',
                  'Add one with the bookmark button above the mushaf, or tap a verse and choose “Add bookmark”.'
                )}
              </TextUI>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 104 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={18}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Reciter Selection Modal */}
      <Modal visible={reciterModalVisible} transparent animationType="slide" onRequestClose={() => setReciterModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 22, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <TextUI size={19} weight="bold" color={p.ink}>{t('القرّاء المعتمدون', 'Approved reciters')}</TextUI>
                <TextUI size={12} color={p.muted} style={{ marginTop: 3 }}>{t('اختر القارئ المفضل للتلاوة الصوتية', 'Choose your preferred reciter for audio recitation')}</TextUI>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setReciterModalVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={21} color={p.ink} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={QURAN_RECITERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = item.id === selectedReciter;
                return (
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => {
                      triggerHaptic('light');
                      chooseReciter(item.id);
                      setReciterModalVisible(false);
                    }}
                    style={{
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: 13,
                      paddingVertical: 13,
                      paddingHorizontal: 4,
                      borderBottomWidth: 1,
                      borderColor: p.border,
                      backgroundColor: active ? p.bgAlt : 'transparent'
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: p.soft,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: active ? 2 : 0,
                        borderColor: p.primary
                      }}
                    >
                      <Feather name="mic" size={20} color={p.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextUI size={15.5} weight="bold" color={p.ink}>
                        {en ? item.nameEn : item.nameAr}
                      </TextUI>
                      <TextUI size={12} color={p.muted} style={{ marginTop: 2 }}>
                        {en ? `${item.nameAr} • Hafs from Asim` : `${item.nameEn} • رواية حفص عن عاصم`}
                      </TextUI>
                    </View>
                    {active ? (
                      <Feather name="check-circle" size={21} color={p.success} />
                    ) : (
                      <Feather name={fwdChevron} size={18} color={p.muted} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
