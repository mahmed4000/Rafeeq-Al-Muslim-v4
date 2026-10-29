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

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');
const RECITER_STORAGE_KEY = 'quran.selected-reciter';
type IndexTab = 'surah' | 'juz' | 'hizb' | 'bookmarks';

const TABS: { id: IndexTab; label: string }[] = [
  { id: 'surah', label: 'السور' },
  { id: 'juz', label: 'الأجزاء' },
  { id: 'hizb', label: 'الأحزاب' },
  { id: 'bookmarks', label: 'العلامات' }
];

/** "٢٩ أكتوبر" from an ISO date, or '' if it cannot be read. */
function shortDateAr(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${toArabicNumber(d.getDate())} ${gregorianMonthName(d.getMonth())}`;
}

/** "٧ آيات" / "٢٨٦ آية" (Arabic plural agreement for counts). */
function versesAr(n: number): string {
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
  const { navigate, t, setSelectedSurah, readingBookmark, bookmarks, removeBookmark, triggerHaptic } = useApp();
  const [activeTab, setActiveTab] = useState<IndexTab>('surah');
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
        accessibilityLabel={`سورة ${item.nameAr}، ${item.type}، ${versesAr(item.verses)}، صفحة ${toArabicNumber(item.mushafPageStart || 1)}`}
        onPress={() => openReader(item, 'page')}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingStart: 8 }}
      >
        <NumberDiamond n={item.id} p={p} />
        <View style={{ flex: 1 }}>
          <TextUI size={20} weight="bold" color={p.ink} style={{ fontFamily: 'Amiri_700Bold', lineHeight: 30 }}>{item.nameAr}</TextUI>
          <TextUI size={12.5} color={p.muted}>{`${item.type} · ${versesAr(item.verses)}`}</TextUI>
        </View>
        <TextUI size={13} color={p.muted}>{`ص ${toArabicNumber(item.mushafPageStart || 1)}`}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`تشغيل سورة ${item.nameAr}`}
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
          <TextUI size={16} weight="bold" color={p.ink}>{`الجزء ${toArabicNumber(item.juz)}`}</TextUI>
          <TextUI size={12.5} color={p.muted}>
            {`من ${item.startSurahNameAr} · آية ${toArabicNumber(item.startAyah)} · الحزبان ${toArabicNumber(hizbStart)} و${toArabicNumber(hizbStart + 1)}`}
          </TextUI>
        </View>
        <TextUI size={13} color={p.muted} style={{ paddingEnd: 6 }}>{`ص ${toArabicNumber(item.startPage)}`}</TextUI>
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
          {`الحزب ${toArabicNumber(item.hizb)} · الجزء ${toArabicNumber(item.juz)} · ${item.startSurahNameAr} ${toArabicNumber(item.startAyah)}`}
        </TextUI>
        <TextUI variant="quranVerse" size={17} color={p.ink} numberOfLines={1}>
          «{item.beginningSnippet}»
        </TextUI>
      </View>
      <TextUI size={13} color={p.muted} style={{ paddingEnd: 6 }}>{`ص ${toArabicNumber(item.startPage)}`}</TextUI>
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
        accessibilityLabel={`علامة: ${item.surahName}، الآية ${toArabicNumber(item.ayah)}، صفحة ${toArabicNumber(item.page)}`}
        onPress={() => openReader(surahById(item.surahId), 'page', item.page, item.ayah)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingStart: 8 }}
      >
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="bookmark" size={20} color={p.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{`${item.surahName} · الآية ${toArabicNumber(item.ayah)}`}</TextUI>
          <TextUI size={12.5} color={p.muted}>{[`الجزء ${toArabicNumber(item.juz)}`, shortDateAr(item.date)].filter(Boolean).join(' · ')}</TextUI>
        </View>
        <TextUI size={13} color={p.muted}>{`ص ${toArabicNumber(item.page)}`}</TextUI>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`حذف علامة ${item.surahName} الآية ${toArabicNumber(item.ayah)}`}
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
          <TextUI size={14} weight="bold" color={p.primaryInk}>{`${item.surahNameAr} · الآية ${toArabicNumber(item.ayahNumber)}`}</TextUI>
          <TextUI size={13} color={p.muted}>{`ص ${toArabicNumber(item.pageNum)}`}</TextUI>
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

  const resumeCard = readingBookmark ? (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`متابعة القراءة: ${readingBookmark.surahName}، الآية ${toArabicNumber(readingBookmark.ayah)}، صفحة ${toArabicNumber(readingBookmark.page)}`}
      onPress={() => {
        const surah = surahById(readingBookmark.surahId);
        setSelectedSurah(surah);
        navigate('quran_reader', {
          readingMode: 'page',
          startPage: readingBookmark.page,
          startSurahId: readingBookmark.surahId,
          startAyah: readingBookmark.ayah,
          reciterId: selectedReciter
        });
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: p.hero }}
    >
      <View style={{ width: 48, height: 56, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1.5, borderColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="bookmark" size={20} color={p.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <TextUI size={13} color={p.onHeroMuted}>متابعة القراءة</TextUI>
        <TextUI size={18} weight="bold" color={p.onHero}>{`${readingBookmark.surahName} · الآية ${toArabicNumber(readingBookmark.ayah)}`}</TextUI>
        <TextUI size={13} color={p.onHeroMuted}>{`صفحة ${toArabicNumber(readingBookmark.page)} · الجزء ${toArabicNumber(readingBookmark.juz)}`}</TextUI>
      </View>
      <Feather name="chevron-left" size={20} color={p.accent} />
    </TouchableOpacity>
  ) : null;

  const listHeader = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {resumeCard}

      {/* Khatma & memorization shortcuts */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { key: 'khatma', label: t('ختمتي', 'My Khatma'), icon: 'award' as const },
          { key: 'tahfeez', label: t('جلسة حفظ', 'Memorize'), icon: 'repeat' as const }
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => navigate(item.key)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name={item.icon} size={16} color={p.primary} />
            <TextUI size={15} weight="bold" color={p.ink}>{item.label}</TextUI>
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
              <TextUI size={14} weight={active ? 'bold' : 'medium'} color={active ? p.primaryInk : p.muted}>{tab.label}</TextUI>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <TextUI size={26} weight="bold" color={p.ink}>{t('القرآن الكريم', 'The Holy Quran')}</TextUI>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`القارئ: ${selectedReciterData.nameAr}`}
            onPress={() => setReciterModalVisible(true)}
            style={{ minHeight: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name="mic" size={15} color={p.primary} />
            <TextUI size={14} weight="medium" color={p.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{selectedReciterData.nameAr}</TextUI>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="search" size={18} color={p.muted} />
          <TextInput
            accessibilityLabel="بحث في القرآن"
            placeholder="سورة، جزء، صفحة، أو كلمة بلا تشكيل"
            placeholderTextColor={p.muted}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: p.ink, textAlign: 'right', fontSize: 15, paddingVertical: 10 }}
          />
          {search ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => setSearch('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
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
              <TextUI size={15} weight="bold" color={p.primaryInk} style={{ flex: 1 }}>{`الانتقال إلى الصفحة ${toArabicNumber(searchResults.pageNumber!)}`}</TextUI>
              <Feather name="chevron-left" size={18} color={p.primary} />
            </TouchableOpacity>
          )}

          {searchResults && searchResults.matchedSurahs.length > 0 && (
            <View>
              {sectionTitle(`السور (${toArabicNumber(searchResults.matchedSurahs.length)})`)}
              {searchResults.matchedSurahs.map((surah, i, all) => renderSurah(surah, i, all.length))}
            </View>
          )}

          {searchResults && searchResults.matchedHizb.length > 0 && (
            <View>
              {sectionTitle(`الأحزاب (${toArabicNumber(searchResults.matchedHizb.length)})`)}
              {searchResults.matchedHizb.map((hizb, i, all) => renderHizb(hizb, i, all.length))}
            </View>
          )}

          {searchResults && searchResults.matchedVerses.length > 0 && (
            <View>
              {sectionTitle(`الآيات (${toArabicNumber(searchResults.matchedVerses.length)})`)}
              {searchResults.matchedVerses.map((verse, i, all) => renderVerseSearchResult(verse, i, all.length))}
            </View>
          )}

          {noResults && (
            <View style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 40, gap: 8 }}>
              <Feather name="search" size={26} color={p.muted} />
              <TextUI size={16} weight="bold" color={p.ink}>لا توجد نتائج</TextUI>
              <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                جرّب اسم السورة، أو رقم الصفحة (١ – ٦٠٤)، أو رقم الجزء، أو كلمة من الآية بلا تشكيل.
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
              <TextUI size={15} weight="bold" color={p.ink}>لا توجد علامات بعد</TextUI>
              <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                أضف علامة من زر العلامة أعلى المصحف، أو بلمس آية ثم «إضافة علامة».
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
                <TextUI size={19} weight="bold" color={p.ink}>القرّاء المعتمدون</TextUI>
                <TextUI size={12} color={p.muted} style={{ marginTop: 3 }}>اختر القارئ المفضل للتلاوة الصوتية</TextUI>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setReciterModalVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
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
                        {item.nameAr}
                      </TextUI>
                      <TextUI size={12} color={p.muted} style={{ marginTop: 2 }}>
                        {item.nameEn} • رواية حفص عن عاصم
                      </TextUI>
                    </View>
                    {active ? (
                      <Feather name="check-circle" size={21} color={p.success} />
                    ) : (
                      <Feather name="chevron-left" size={18} color={p.muted} />
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
