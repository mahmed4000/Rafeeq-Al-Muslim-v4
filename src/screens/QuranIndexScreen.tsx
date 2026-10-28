import React, { useMemo, useState } from 'react';
import { FlatList, Modal, TextInput, TouchableOpacity, View, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { TOKENS, makeShadow } from '../constants/tokens';
import { QURAN_JUZ_INDEX, QURAN_HIZB_INDEX, QuranHizbIndexItem, QuranJuzIndexItem } from '../data/quranIndex';
import { QURAN_RECITERS } from '../services/quranParser';
import { toArabicNumber, toStandardNumber } from '../services/prayerCalculation';
import { searchQuranUniversal, splitTextForHighlight, VerseSearchResult } from '../services/quranSearch';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');
const RECITER_STORAGE_KEY = 'quran.selected-reciter';
type IndexTab = 'surah' | 'juz' | 'hizb';
type JumpType = 'page' | 'surah' | 'juz';

export const QuranIndexScreen: React.FC = () => {
  const { goBack, navigate, theme, themeMode, t, setSelectedSurah, readingBookmark, triggerHaptic } = useApp();
  const [activeTab, setActiveTab] = useState<IndexTab>('surah');
  const [search, setSearch] = useState('');
  const [selectedReciter, setSelectedReciter] = useState(QURAN_RECITERS[0].id);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [jumpType, setJumpType] = useState<JumpType>('page');
  const [jumpValue, setJumpValue] = useState('');
  const c = theme;

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
      startAyah: startAyah || 1,
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

  const executeJump = () => {
    const value = Number(toStandardNumber(jumpValue));
    if (!Number.isFinite(value) || value < 1) return;
    if (jumpType === 'page') openPage(Math.min(604, value));
    if (jumpType === 'surah') {
      const surah = QURAN_DATA.find((item) => item.id === Math.min(114, value));
      if (surah) openReader(surah, 'page');
    }
    if (jumpType === 'juz') {
      const juz = QURAN_JUZ_INDEX.find((item) => item.juz === Math.min(30, value));
      const surah = QURAN_DATA.find((item) => item.id === juz?.startSurahId) || QURAN_DATA[0];
      if (juz) openReader(surah, 'page', juz.startPage);
    }
    setJumpModalVisible(false);
    setJumpValue('');
  };

  const chooseReciter = (reciterId: string) => {
    setSelectedReciter(reciterId);
    AsyncStorage.setItem(RECITER_STORAGE_KEY, reciterId).catch(() => {});
  };

  // 1. Render Surah Card (Calm, spacious, high readability)
  const renderSurah = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => openReader(item, 'page')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginVertical: 4,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
      }}
    >
      {/* Right side: Surah Number Emblem + Names */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#34261E',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: themeMode === 'light' ? '#E8DDD0' : '#453328'
          }}
        >
          <TextUI variant="captionBold" color={TOKENS.colors.primary}>
            {toArabicNumber(item.id)}
          </TextUI>
        </View>

        <View style={{ flex: 1 }}>
          <TextUI variant="h4" color={c.textPrimary}>
            سورة {item.nameAr}
          </TextUI>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1.5,
                borderRadius: 6,
                backgroundColor: c.bgSecondary
              }}
            >
              <TextUI variant="badge" color={c.textSecondary}>
                {item.type}
              </TextUI>
            </View>
            <TextUI variant="caption" color={c.textSecondary}>
              • {toArabicNumber(item.verses)} آية • صفحة {toArabicNumber(item.mushafPageStart || 1)}
            </TextUI>
          </View>
        </View>
      </View>

      {/* Left side: Quick Play button + Chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          onPress={() => openReader(item, 'page', item.mushafPageStart || 1, 1, true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.border
          }}
        >
          <Feather name="play" size={15} color={TOKENS.colors.primary} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        <Feather name="chevron-left" size={18} color={c.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  // 2. Render Juz Card (الأجزاء)
  const renderJuz = ({ item }: { item: QuranJuzIndexItem }) => {
    const includedHizbStart = (item.juz - 1) * 2 + 1;
    const includedHizbEnd = includedHizbStart + 1;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          const surah = QURAN_DATA.find((entry) => entry.id === item.startSurahId) || QURAN_DATA[0];
          openReader(surah, 'page', item.startPage);
        }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginHorizontal: 12,
          marginVertical: 4,
          borderRadius: 16,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#34261E'
              }}
            >
              <TextUI variant="captionBold" color={TOKENS.colors.primary}>
                الجزء {toArabicNumber(item.juz)}
              </TextUI>
            </View>
            <TextUI variant="caption" color={c.textSecondary}>
              يشمل الحزب {toArabicNumber(includedHizbStart)} و {toArabicNumber(includedHizbEnd)}
            </TextUI>
          </View>

          <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 5 }}>
            يبدأ من: <TextUI variant="bodyMedium" weight="bold" color={c.textPrimary}>سورة {item.startSurahNameAr}</TextUI> • آية {toArabicNumber(item.startAyah)}
          </TextUI>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: c.bgSecondary,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <TextUI variant="captionBold" color={TOKENS.colors.primary}>
              ص {toArabicNumber(item.startPage)}
            </TextUI>
          </View>
          <Feather name="chevron-left" size={18} color={c.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  // 3. Render Hizb Card (الأحزاب - 60 حزباً)
  const renderHizb = ({ item }: { item: QuranHizbIndexItem }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        const surah = QURAN_DATA.find((entry) => entry.id === item.startSurahId) || QURAN_DATA[0];
        openReader(surah, 'page', item.startPage, item.startAyah);
      }}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginVertical: 4,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
      }}
    >
      <View style={{ flex: 1, marginEnd: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2.5,
              borderRadius: 8,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#35281F',
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <TextUI variant="captionBold" color={TOKENS.colors.primary}>
              الحزب {toArabicNumber(item.hizb)}
            </TextUI>
          </View>
          <TextUI variant="caption" color={c.textSecondary}>
            الجزء {toArabicNumber(item.juz)} • سورة {item.startSurahNameAr} آية {toArabicNumber(item.startAyah)}
          </TextUI>
        </View>

        <TextUI variant="quranVerse" size={16} color={c.textPrimary} numberOfLines={1}>
          «{item.beginningSnippet}»
        </TextUI>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: c.bgSecondary,
            borderWidth: 1,
            borderColor: c.border
          }}
        >
          <TextUI variant="captionBold" color={TOKENS.colors.primary}>
            ص {toArabicNumber(item.startPage)}
          </TextUI>
        </View>
        <Feather name="chevron-left" size={18} color={c.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  // 4. Render Verse Search Match with Highlighting
  const renderVerseSearchResult = ({ item }: { item: VerseSearchResult }) => {
    const parts = splitTextForHighlight(item.text, search);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          const surah = QURAN_DATA.find((entry) => entry.id === item.surahId) || QURAN_DATA[0];
          openReader(surah, 'page', item.pageNum, item.ayahNumber);
        }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginHorizontal: 12,
          marginVertical: 5,
          borderRadius: 16,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextUI variant="h4" color={TOKENS.colors.primary}>
              سورة {item.surahNameAr}
            </TextUI>
            <TextUI variant="caption" color={c.textSecondary}>
              • الآية {toArabicNumber(item.ayahNumber)}
            </TextUI>
          </View>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              backgroundColor: c.bgSecondary
            }}
          >
            <TextUI variant="captionBold" color={c.textSecondary}>
              صفحة {toArabicNumber(item.pageNum)}
            </TextUI>
          </View>
        </View>

        <TextUI variant="quranVerse" size={17} color={c.textPrimary} style={{ lineHeight: 30 }}>
          {parts.map((p, pIdx) => (
            <TextUI
              key={`part-${pIdx}`}
              variant="quranVerse"
              size={17}
              weight={p.isMatch ? 'bold' : 'regular'}
              color={p.isMatch ? TOKENS.colors.secondary : c.textPrimary}
              style={{
                backgroundColor: p.isMatch ? (themeMode === 'light' ? '#FFF4E5' : '#453020') : 'transparent'
              }}
            >
              {p.text}
            </TextUI>
          ))}
        </TextUI>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* 1. Top Navigation Bar (iPhone Safe Area Aware) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'ios' ? 56 : (Platform.OS === 'web' ? 42 : 14),
          paddingBottom: 12,
          backgroundColor: TOKENS.colors.primaryDark
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.18)'
          }}
        >
          <Feather name="arrow-right" size={15} color="#FFFFFF" />
          <TextUI variant="captionBold" color="#FFFFFF">رجوع</TextUI>
        </TouchableOpacity>

        <TextUI variant="h3" color="#FFFFFF">
          {t('فهرس المصحف الشريف', 'Holy Quran Index')}
        </TextUI>

        {/* Reciter Selector in Header */}
        <TouchableOpacity
          onPress={() => setReciterModalVisible(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.14)'
          }}
        >
          <Feather name="mic" size={13} color="#FFFFFF" />
          <TextUI variant="caption" color="#FFFFFF" numberOfLines={1} style={{ maxWidth: 85 }}>
            {selectedReciterData.nameAr.split(' ')[0]}
          </TextUI>
        </TouchableOpacity>
      </View>

      {/* 2. Universal Search Bar & Quick Tools */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: 22,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: c.border,
            gap: 8,
            ...makeShadow('0 2px 6px rgba(0,0,0,0.04)', '#000', 0.04, 3)
          }}
        >
          <Feather name="search" size={17} color={TOKENS.colors.primary} />
          <TextInput
            placeholder="ابحث باسم السورة، كلمة بالآية، رقم صفحة (١-٦٠٤)، أو حزب..."
            placeholderTextColor={c.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: c.textPrimary,
              textAlign: 'right',
              fontSize: 13,
              paddingVertical: 2
            }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Direct Page Jump Card when search query matches 1-604 */}
        {searchResults?.isPageMatch && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openPage(searchResults.pageNumber!)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              padding: 12,
              borderRadius: 14,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#3B2B1F',
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="book-open" size={17} color={TOKENS.colors.primary} />
              <View>
                <TextUI variant="bodyBold" color={TOKENS.colors.primaryDark}>
                  انتقال مباشر إلى الصفحة {toArabicNumber(searchResults.pageNumber!)}
                </TextUI>
                <TextUI variant="caption" color={c.textSecondary}>
                  اضغط لفتح صفحة المصحف مباشرة
                </TextUI>
              </View>
            </View>
            <Feather name="arrow-left" size={17} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        )}

        {/* 3. Resume Reading Banner (when search is empty) */}
        {!search && readingBookmark && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const surah = QURAN_DATA.find((item) => item.id === readingBookmark.surahId) || QURAN_DATA[0];
              setSelectedSurah(surah);
              navigate('quran_reader', {
                readingMode: 'page',
                startPage: readingBookmark.page,
                startSurahId: readingBookmark.surahId,
                startAyah: readingBookmark.ayah,
                reciterId: selectedReciter
              });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#33241C',
              borderWidth: 1,
              borderColor: themeMode === 'light' ? '#E5D6C4' : '#453328'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="bookmark" size={16} color={TOKENS.colors.primary} />
              <View>
                <TextUI variant="caption" color={c.textSecondary}>
                  متابعة القراءة من آخر موضع:
                </TextUI>
                <TextUI variant="bodyBold" color={TOKENS.colors.primaryDark}>
                  سورة {readingBookmark.surahName} • آية {toArabicNumber(readingBookmark.ayah)} • ص {toArabicNumber(readingBookmark.page)}
                </TextUI>
              </View>
            </View>
            <Feather name="arrow-left" size={16} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        )}

        {/* 4. Triple Tabs Selector (السور • الأجزاء • الأحزاب) */}
        {!search && (
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              marginTop: 8,
              padding: 4,
              borderRadius: 14,
              backgroundColor: c.bgSecondary,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            {([
              { id: 'surah' as const, label: 'السور', count: '١١٤' },
              { id: 'juz' as const, label: 'الأجزاء', count: '٣٠' },
              { id: 'hizb' as const, label: 'الأحزاب', count: '٦٠' }
            ]).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    triggerHaptic('light');
                    setActiveTab(tab.id);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 7,
                    borderRadius: 11,
                    backgroundColor: active ? c.surface : 'transparent',
                    borderWidth: active ? 1 : 0,
                    borderColor: c.border
                  }}
                >
                  <TextUI
                    variant="bodyMedium"
                    weight={active ? 'bold' : 'regular'}
                    color={active ? TOKENS.colors.primary : c.textSecondary}
                  >
                    {tab.label}
                  </TextUI>
                  <View
                    style={{
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 8,
                      backgroundColor: active ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : 'rgba(0,0,0,0.04)'
                    }}
                  >
                    <TextUI
                      variant="badge"
                      color={active ? TOKENS.colors.primary : c.textSecondary}
                    >
                      {tab.count}
                    </TextUI>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 5. Content Stream (Search Results OR Active Tab List) */}
      {search.trim() ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Matched Surahs */}
          {searchResults && searchResults.matchedSurahs.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <TextUI variant="captionBold" color={c.textSecondary} style={{ marginHorizontal: 16, marginBottom: 6 }}>
                السور المطابقة ({toArabicNumber(searchResults.matchedSurahs.length)})
              </TextUI>
              {searchResults.matchedSurahs.map((surah) => (
                <View key={`s-match-${surah.id}`}>
                  {renderSurah({ item: surah })}
                </View>
              ))}
            </View>
          )}

          {/* Matched Ahzab */}
          {searchResults && searchResults.matchedHizb.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <TextUI variant="captionBold" color={c.textSecondary} style={{ marginHorizontal: 16, marginBottom: 6 }}>
                الأحزاب المطابقة ({toArabicNumber(searchResults.matchedHizb.length)})
              </TextUI>
              {searchResults.matchedHizb.map((hizb) => (
                <View key={`h-match-${hizb.hizb}`}>
                  {renderHizb({ item: hizb })}
                </View>
              ))}
            </View>
          )}

          {/* Matched Verses with Highlighting */}
          {searchResults && searchResults.matchedVerses.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <TextUI variant="captionBold" color={c.textSecondary} style={{ marginHorizontal: 16, marginBottom: 6 }}>
                الآيات الكريمة المطابقة ({toArabicNumber(searchResults.matchedVerses.length)})
              </TextUI>
              {searchResults.matchedVerses.map((verse, vIdx) => (
                <View key={`v-match-${verse.surahId}-${verse.ayahNumber}-${vIdx}`}>
                  {renderVerseSearchResult({ item: verse })}
                </View>
              ))}
            </View>
          )}

          {/* Empty Search State with helpful suggestions */}
          {searchResults &&
            searchResults.matchedSurahs.length === 0 &&
            searchResults.matchedHizb.length === 0 &&
            searchResults.matchedVerses.length === 0 &&
            !searchResults.isPageMatch && (
              <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 50 }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: c.bgSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14
                  }}
                >
                  <Feather name="search" size={26} color={c.textSecondary} />
                </View>
                <TextUI size={16} weight="bold" color={c.textPrimary}>
                  لا توجد نتائج بحث
                </TextUI>
                <TextUI
                  size={12.5}
                  color={c.textSecondary}
                  style={{ textAlign: 'center', marginTop: 8, lineHeight: 22 }}
                >
                  جرّب البحث باسم السورة، رقم الصفحة (١ – ٦٠٤)، رقم الجزء، أو بكلمة من متن الآية الكريمة بدون تشكيل.
                </TextUI>
              </View>
            )}
        </ScrollView>
      ) : (
        /* Tab 1: Surahs / Tab 2: Juzs / Tab 3: Ahzab */
        <FlatList
          key={activeTab}
          data={
            activeTab === 'surah'
              ? QURAN_DATA
              : activeTab === 'juz'
              ? QURAN_JUZ_INDEX
              : QURAN_HIZB_INDEX
          }
          keyExtractor={(item: any) =>
            activeTab === 'surah'
              ? `surah-${item.id}`
              : activeTab === 'juz'
              ? `juz-${item.juz}`
              : `hizb-${item.hizb}`
          }
          renderItem={
            activeTab === 'surah'
              ? (renderSurah as any)
              : activeTab === 'juz'
              ? (renderJuz as any)
              : (renderHizb as any)
          }
          contentContainerStyle={{ paddingBottom: 34 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={18}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* 6. Reciter Selection Modal */}
      <Modal visible={reciterModalVisible} transparent animationType="slide" onRequestClose={() => setReciterModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 22, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <TextUI size={19} weight="bold" color={c.textPrimary}>القرّاء المعتمدون</TextUI>
                <TextUI size={11} color={c.textSecondary} style={{ marginTop: 3 }}>اختر القارئ المفضل للتلاوة الصوتية</TextUI>
              </View>
              <TouchableOpacity onPress={() => setReciterModalVisible(false)}>
                <Feather name="x" size={21} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={QURAN_RECITERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = item.id === selectedReciter;
                return (
                  <TouchableOpacity
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
                      borderColor: c.border,
                      backgroundColor: active ? c.bgSecondary : 'transparent'
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: active ? 2 : 0,
                        borderColor: TOKENS.colors.primary
                      }}
                    >
                      <Feather name="mic" size={20} color={TOKENS.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextUI size={15.5} weight="bold" color={c.textPrimary}>
                        {item.nameAr}
                      </TextUI>
                      <TextUI size={11} color={c.textSecondary} style={{ marginTop: 2 }}>
                        {item.nameEn} • رواية حفص عن عاصم
                      </TextUI>
                    </View>
                    {active ? (
                      <Feather name="check-circle" size={21} color={TOKENS.colors.success} />
                    ) : (
                      <Feather name="chevron-left" size={18} color={c.textSecondary} />
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
