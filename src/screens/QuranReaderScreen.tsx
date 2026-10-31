import React, { useState, useRef, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Animated,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { toArabicNumber, toArabicIndicDigits, toStandardNumber } from '../services/prayerCalculation';
import { normalizeArabic } from '../services/quranSearch';
import { QURAN_PAGE_INDEX, QURAN_JUZ_INDEX } from '../data/quranIndex';
import {
  parseSurahVerses,
  QuranVerse,
  QURAN_RECITERS,
  getAyahAudioUrl,
  forHafsFont
} from '../services/quranParser';
import {
  AVAILABLE_TAFSIR_EDITIONS,
  fetchAyahTafsir,
  getSavedTafsirId,
  saveSelectedTafsirId,
  DEFAULT_TAFSIR_ID
} from '../services/tafsirService';
import { makeShadow } from '../constants/tokens';
import { useScreenParams } from '../navigation/routes';
import { KhatmaService } from '../services/khatmaService';
import { usePalette, PALETTE } from '../theme/palette';
import { MushafPageLayout, prepareMushafPage, supportsMushafPages } from '../services/mushafPages';
import { QURAN_DATA, JumpType, PlaybackSettings, ReadingMode, SCROLL_SPEED_OPTIONS } from '../components/quran/reader/readerShared';
import { ReaderPlayer, ReaderToolbar, READER_TOOLBAR_HEIGHT } from '../components/quran/reader/ReaderPlayer';
import { useLessonPlayer } from '../context/LessonPlayerContext';
import { JumpSheet } from '../components/quran/reader/JumpSheet';
import { PlaybackSettingsSheet } from '../components/quran/reader/PlaybackSettingsSheet';
import { AyahActionSheet, AyahNoteSheet } from '../components/quran/reader/AyahSheets';
import { AyahTafsirSheet } from '../components/quran/reader/AyahTafsirSheet';
import { ReadingMenuSheet, ReciterSheet, FontSizeSheet, TafsirPickerSheet } from '../components/quran/reader/ReaderOptionSheets';

let allQuranVersesCache: QuranVerse[] | null = null;
const getAllQuranVerses = () => {
  if (!allQuranVersesCache) allQuranVersesCache = QURAN_DATA.flatMap((item) => parseSurahVerses(item).verses);
  return allQuranVersesCache;
};
const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = { range: 'surah', rangeRepeats: 1, ayahRepeats: 1, pauseSeconds: 0, speed: 1, stopAtRangeEnd: true };
const PLAYBACK_SETTINGS_KEY = 'quran.playback-settings.v1';
const AYAH_NOTES_KEY = 'quran.ayah-notes.v1';
const TAFSIR_FONT_SIZE_KEY = 'quran.tafsir-font-size.v1';

/**
 * A mushaf page that re-renders only when its page number or `version` changes; the render
 * function itself is ignored in the comparison (it is a fresh closure on every parent render).
 */
// Mushaf text font: King Fahd Complex Hafs (loaded in src/app/_layout.tsx).
const MUSHAF_FONT = 'KFGQPC_Hafs';
// After a manual scroll during recitation, wait this long before returning to the recited ayah.
const FOLLOW_PAUSE_MS = 4000;
// Above this Quran font size (the app default is 24) pages use the flowing text instead.
const MADINAH_MAX_FONT_SIZE = 24;
const BASMALA =forHafsFont('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
const SURAH_BANNER_LIGHT =require('../../assets/surah-banner-light.png');
const SURAH_BANNER_DARK = require('../../assets/surah-banner-dark.png');

// While the reader is scrolling (`frozen`) pages keep what they show: swapping in the tajweed
// text or the Madinah layout changes a page's height, which made the screen jump mid-scroll.
const MushafPage: React.FC<{ pageNumber: number; version: string; frozen: boolean; render: (pageNumber: number) => React.ReactNode }> = ({ pageNumber, render }) => <>{render(pageNumber)}</>;
const MushafPageBlock = React.memo(MushafPage, (prev, next) => prev.pageNumber === next.pageNumber && (prev.version === next.version || next.frozen));

export const QuranReaderScreen: React.FC = () => {
  const {
    goBack,
    t,
    isRTL,
    lang,
    selectedSurah,
    setSelectedSurah,
    quranFontSize,
    setQuranFontSize,
    readingBookmark,
    setReadingBookmark,
    bookmarks,
    addBookmark,
    removeBookmark,
    triggerHaptic
  } = useApp();
  const screenParams = useScreenParams();
  const lessonPlayer = useLessonPlayer();

  const p = usePalette();
  const en = lang === 'en';
  const tafsirCardBgColor = p.soft;
  const tafsirBorderColor = p.border;
  // Opened from a link (or after a reload) the context may not hold the surah yet.
  const currentSurah = selectedSurah ||
    QURAN_DATA.find((item) => item.id === screenParams?.startSurahId) || QURAN_DATA[0];
  const parsedSurah = parseSurahVerses(currentSurah);
  const initialPage = screenParams?.startPage ||
    (readingBookmark && readingBookmark.surahId === currentSurah.id ? readingBookmark.page : currentSurah.mushafPageStart || 1);

  const [readingMode, setReadingMode] = useState<ReadingMode>(
    screenParams?.readingMode === 'tafsir' ? 'tafsir' : (screenParams?.readingMode === 'surah' ? 'surah' : 'page')
  );
  const [readingMenuVisible, setReadingMenuVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);
  const [tafsirPickerVisible, setTafsirPickerVisible] = useState(false);
  const [streamTafsirs, setStreamTafsirs] = useState<Record<string, string>>({});
  const [streamTafsirLoading, setStreamTafsirLoading] = useState<Record<string, boolean>>({});
  const [activePage, setActivePage] = useState<number>(initialPage);
  // Count in-order page reading toward the active khatma (if any).
  useEffect(() => {
    KhatmaService.recordPage(activePage).catch(() => {});
  }, [activePage]);
  const [renderedPages, setRenderedPages] = useState<number[]>(() => {
    const first = Math.max(1, initialPage - 2);
    return Array.from({ length: Math.min(8, 605 - first) }, (_, index) => first + index);
  });
  const [activeAyah, setActiveAyah] = useState<QuranVerse | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [ayahNoteModalVisible, setAyahNoteModalVisible] = useState(false);
  const [ayahNoteText, setAyahNoteText] = useState('');
  const [ayahNotes, setAyahNotes] = useState<Record<string, string>>({});
  const [tafsirModalVisible, setTafsirModalVisible] = useState(false);
  const tafsirEditions = AVAILABLE_TAFSIR_EDITIONS;
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(DEFAULT_TAFSIR_ID);
  const selectedTafsirEdition = AVAILABLE_TAFSIR_EDITIONS.find((e) => e.id === selectedTafsirId);
  const selectedTafsirLabel = selectedTafsirEdition ? t(selectedTafsirEdition.name, selectedTafsirEdition.nameEn) : t('التفسير الميسر', 'Al-Tafsir al-Muyassar');
  const [tafsirFontSize, setTafsirFontSize] = useState<number>(16);
  const [activeTafsirText, setActiveTafsirText] = useState('');
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState('');
  const tafsirRequestRef = useRef(0);
  const [selectedReciter, setSelectedReciter] = useState(screenParams?.reciterId || QURAN_RECITERS[0].id);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [playbackSettingsVisible, setPlaybackSettingsVisible] = useState(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(DEFAULT_PLAYBACK_SETTINGS);
  // Reciting today's khatma portion (pages fromPage..untilPage); `portionDone` shows the end note.
  const [portion, setPortion] = useState<{ fromPage: number; untilPage: number } | null>(null);
  const [portionDone, setPortionDone] = useState(false);
  const [playbackSettingsLoaded, setPlaybackSettingsLoaded] = useState(false);
  const [playingAyahNum, setPlayingAyahNum] = useState<number | null>(null);
  const [playingSurahId, setPlayingSurahId] = useState<number | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [searchWord, setSearchWord] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeedIndex, setScrollSpeedIndex] = useState(1);
  // Full screen (bars hidden). The bars show on opening, hide after a few seconds or once the
  // reader scrolls, and a tap on the page toggles them.
  const [isImmersive, setIsImmersive] = useState(false);
  const [chromeAnim] = useState(() => new Animated.Value(1));
  const [headerHeight, setHeaderHeight] = useState(Platform.OS === 'ios' ? 100 : Platform.OS === 'web' ? 68 : 62);
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [jumpType, setJumpType] = useState<JumpType>('page');
  const [jumpValue, setJumpValue] = useState('');
  const [tajweedTexts, setTajweedTexts] = useState<Record<string, string>>({});
  const [tajweedPages, setTajweedPages] = useState<Record<number, true>>({});
  const tajweedRequestedRef = useRef<Set<string>>(new Set());
  const [mushafPages, setMushafPages] = useState<Record<number, { layout: MushafPageLayout; family: string }>>({});
  const mushafRequestedRef = useRef<Set<number>>(new Set());
  const [mushafWidth, setMushafWidth] = useState(0);

  const [measuredAyahDurations, setMeasuredAyahDurations] = useState<Record<string, number>>({});
  const audioPlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  const playbackSequenceRef = useRef<{ verses: QuranVerse[]; startIndex: number; cursor: number; repeatsLeft: number; ayahRepeatsLeft: number; settings: PlaybackSettings; untilPage?: number } | null>(null);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayHandledRef = useRef(false);
  const lastAutoPlaySurahRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const maxScrollRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const scrollingRef = useRef(false);
  const lastTapRef = useRef(0);
  const insets = useSafeAreaInsets();
  // Pinch: a scaled preview while the fingers move, then a new font size.
  const [pinching, setPinching] = useState(false);
  const [pinchOrigin, setPinchOrigin] = useState({ x: 0, y: 0 });
  const [pinchScale] = useState(() => new Animated.Value(1));
  const pinchFontRef = useRef(quranFontSize);
  const lastScrollYRef = useRef(0);
  // True from the start of a drag until the scroll comes to rest; holds page swaps (see MushafPageBlock).
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollRestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageOffsetsRef = useRef<Record<number, number>>({});
  // Madinah pages: y of each verse line within its page ("page:line"), for following recitation.
  const lineOffsetsRef = useRef<Record<string, number>>({});
  const lastUserScrollRef = useRef(0);
  const pendingScrollPageRef = useRef(initialPage);
  const paginationEndRef = useRef(renderedPages[renderedPages.length - 1] || initialPage);
  const pageAppendPendingRef = useRef(false);
  const quranTextAlign: 'center' = 'center';

  const formatAudioTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return t('٠٠:٠٠', '00:00');
    const total = Math.floor(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mStr = mins.toString().padStart(2, '0');
    const sStr = secs.toString().padStart(2, '0');
    if (hrs > 0) {
      const hStr = hrs.toString();
      return `${toArabicNumber(hStr)}:${toArabicNumber(mStr)}:${toArabicNumber(sStr)}`;
    }
    return `${toArabicNumber(mStr)}:${toArabicNumber(sStr)}`;
  };

  const getEstimatedAyahDuration = (verse: QuranVerse): number => {
    const key = `${verse.surahId}:${verse.ayahNumber}`;
    if (measuredAyahDurations[key] && measuredAyahDurations[key] > 0) {
      return measuredAyahDurations[key];
    }
    const words = verse.text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(3, words * 1.65);
  };

  const totalSurahVerses = parsedSurah.verses.length || currentSurah.verses || 1;
  const currentAyahNum = (playingSurahId === currentSurah.id && playingAyahNum != null)
    ? playingAyahNum
    : (activeAyah && activeAyah.surahId === currentSurah.id ? activeAyah.ayahNumber : 1);

  const surahTotalSeconds = useMemo(() => {
    return parsedSurah.verses.reduce((acc, v) => acc + getEstimatedAyahDuration(v), 0) || (totalSurahVerses * 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSurah.verses, totalSurahVerses, measuredAyahDurations]);

  const surahElapsedSeconds = useMemo(() => {
    if (playingSurahId !== currentSurah.id && (!activeAyah || activeAyah.surahId !== currentSurah.id)) {
      return 0;
    }
    let priorSec = 0;
    for (const v of parsedSurah.verses) {
      if (v.ayahNumber < currentAyahNum) {
        priorSec += getEstimatedAyahDuration(v);
      } else {
        break;
      }
    }
    const currentAyahObj = parsedSurah.verses.find((v) => v.ayahNumber === currentAyahNum) || parsedSurah.verses[0];
    const currentAyahEstimated = getEstimatedAyahDuration(currentAyahObj);
    const currentAyahProgress = audioDuration > 0
      ? Math.min(audioPosition, audioDuration)
      : Math.min(audioPosition, currentAyahEstimated);

    return Math.min(surahTotalSeconds, priorSec + currentAyahProgress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSurah.id, playingSurahId, currentAyahNum, audioPosition, audioDuration, surahTotalSeconds, parsedSurah.verses, activeAyah, measuredAyahDurations]);

  const surahRemainingSeconds = Math.max(0, surahTotalSeconds - surahElapsedSeconds);

  const surahProgressRatio = surahTotalSeconds > 0
    ? Math.min(1, Math.max(0, surahElapsedSeconds / surahTotalSeconds))
    : 0;

  const handleSurahProgressPress = (locationX: number, totalWidth: number) => {
    if (totalWidth <= 0 || !parsedSurah.verses.length) return;
    const ratio = Math.max(0, Math.min(1, locationX / totalWidth));
    const targetSec = ratio * surahTotalSeconds;

    let accumulated = 0;
    let targetVerse = parsedSurah.verses[0];
    let verseOffset = 0;

    for (let i = 0; i < parsedSurah.verses.length; i++) {
      const verse = parsedSurah.verses[i];
      const dur = getEstimatedAyahDuration(verse);
      if (accumulated + dur >= targetSec || i === parsedSurah.verses.length - 1) {
        targetVerse = verse;
        verseOffset = Math.max(0, Math.min(dur, targetSec - accumulated));
        break;
      }
      accumulated += dur;
    }

    if (playingSurahId === currentSurah.id && playingAyahNum === targetVerse.ayahNumber) {
      seekWithinAyah(verseOffset);
    } else {
      if (targetVerse.pageNum && targetVerse.pageNum !== activePage) {
        goToPage(targetVerse.pageNum);
      }
      playAyahAudio(targetVerse);
    }
  };

  // Two-finger pinch (react-native-gesture-handler; a plain touch handler never saw the second
  // finger on iPhone, where the scroll view takes it as a pan). While pinching the reader is
  // scaled as a preview; on release the font size changes and the text wraps to the screen, so
  // nothing needs sideways scrolling. Above the Madinah size the pages show as flowing text.
  // The gesture callbacks read refs when the pinch fires, not during render; the rule can't tell.
  /* eslint-disable react-hooks/refs */
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .simultaneousWithExternalGesture(scrollViewRef as unknown as React.RefObject<React.ComponentType<object>>)
    .onStart((event) => {
      pinchFontRef.current = quranFontSize;
      setPinchOrigin({ x: event.focalX, y: event.focalY });
      setPinching(true);
    })
    .onUpdate((event) => {
      pinchScale.setValue(Math.max(17 / pinchFontRef.current, Math.min(48 / pinchFontRef.current, event.scale)));
    })
    .onEnd((event) => {
      setQuranFontSize(Math.max(17, Math.min(48, Math.round(pinchFontRef.current * event.scale))));
    })
    .onFinalize(() => {
      pinchScale.setValue(1);
      setPinching(false);
    });
  /* eslint-enable react-hooks/refs */

  // A tap on the page shows or hides the bars; a quick second tap while enlarged returns to the
  // Madinah page size (and undoes the first tap's toggle).
  const handleReaderTap = () => {
    const now = Date.now();
    const doubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;
    if (doubleTap && quranFontSize > MADINAH_MAX_FONT_SIZE) setQuranFontSize(MADINAH_MAX_FONT_SIZE);
    setIsImmersive((v) => !v);
  };

  useEffect(() => {
    AsyncStorage.getItem(PLAYBACK_SETTINGS_KEY).then((raw) => {
      if (raw) {
        const saved = JSON.parse(raw);
        setPlaybackSettings({ ...DEFAULT_PLAYBACK_SETTINGS, ...saved });
      }
    }).catch(() => {}).finally(() => setPlaybackSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (screenParams?.reciterId) return;
    AsyncStorage.getItem('quran.selected-reciter').then((saved) => {
      if (saved && QURAN_RECITERS.some((reciter) => reciter.id === saved)) setSelectedReciter(saved);
    }).catch(() => {});
  }, [screenParams?.reciterId]);

  useEffect(() => {
    AsyncStorage.getItem(AYAH_NOTES_KEY).then((raw) => {
      if (raw) setAyahNotes(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getSavedTafsirId().then((savedId) => {
      setSelectedTafsirId(savedId);
    }).catch(() => {});
    AsyncStorage.getItem(TAFSIR_FONT_SIZE_KEY).then((saved) => {
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= 12 && size <= 26) setTafsirFontSize(size);
      }
    }).catch(() => {});
  }, []);

  // Tajweed text is loaded for every rendered page, not only the active one, so a page gets its
  // tajweed text while it is still below the screen. Swapping the plain text for tajweed on the
  // page being read made the words visibly shift on iPhone.
  useEffect(() => {
    // In page mode also the next 5 pages, which are appended once the reader nears the end.
    const lastRendered = renderedPages[renderedPages.length - 1] || activePage;
    const upcoming = Array.from({ length: 5 }, (_, index) => lastRendered + 1 + index).filter((page) => page <= QURAN_PAGE_INDEX.length);
    const scopes = readingMode === 'surah'
      ? [`chapter:${currentSurah.id}`]
      : (readingMode === 'page' ? [...renderedPages, ...upcoming] : [activePage]).map((page) => `page:${page}`);
    const loadTajweedScope = async (scope: string) => {
      const storageKey = `quran.tajweed.${scope}`;
      const [kind, id] = scope.split(':');
      const pageNumber = kind === 'page' ? Number(id) : 0;
      const apply = (data: Record<string, string>) => {
        setTajweedTexts((previous) => ({ ...previous, ...data }));
        if (pageNumber) setTajweedPages((previous) => ({ ...previous, [pageNumber]: true }));
      };
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          apply(JSON.parse(cached));
          return;
        }
        const filter = kind === 'chapter' ? `chapter_number=${id}` : `page_number=${id}`;
        const response = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?${filter}`);
        if (!response.ok) throw new Error(`tajweed ${response.status}`);
        const payload = await response.json();
        const pageMap: Record<string, string> = {};
        for (const verse of payload?.verses || []) {
          if (verse?.verse_key && verse?.text_uthmani_tajweed) pageMap[verse.verse_key.replace(':', '-')] = verse.text_uthmani_tajweed;
        }
        if (Object.keys(pageMap).length) {
          apply(pageMap);
          AsyncStorage.setItem(storageKey, JSON.stringify(pageMap)).catch(() => {});
        }
      } catch {
        // Keep the bundled Uthmani text when offline; allow a retry on a later render.
        tajweedRequestedRef.current.delete(scope);
      }
    };
    for (const scope of scopes) {
      if (tajweedRequestedRef.current.has(scope)) continue;
      tajweedRequestedRef.current.add(scope);
      loadTajweedScope(scope);
    }
  }, [activePage, currentSurah.id, readingMode, renderedPages]);

  useEffect(() => () => { if (scrollRestTimerRef.current) clearTimeout(scrollRestTimerRef.current); }, []);

  useEffect(() => {
    Animated.timing(chromeAnim, { toValue: isImmersive ? 0 : 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
    // Bars hide by themselves after 4 seconds, unless the reader is typing a search.
    if (isImmersive || isSearching) return;
    const timer = setTimeout(() => setIsImmersive(true), 4000);
    return () => clearTimeout(timer);
  }, [isImmersive, isSearching, chromeAnim]);

  // Madinah page fonts and line data for the rendered pages and the next 5, like tajweed above,
  // so a page switches to its printed layout before it reaches the screen.
  useEffect(() => {
    if (readingMode !== 'page' || !supportsMushafPages()) return;
    const lastRendered = renderedPages[renderedPages.length - 1] || activePage;
    const upcoming = Array.from({ length: 5 }, (_, index) => lastRendered + 1 + index).filter((page) => page <= QURAN_PAGE_INDEX.length);
    for (const page of [...renderedPages, ...upcoming]) {
      if (mushafRequestedRef.current.has(page)) continue;
      mushafRequestedRef.current.add(page);
      prepareMushafPage(page)
        .then((data) => setMushafPages((previous) => ({ ...previous, [page]: data })))
        .catch(() => { mushafRequestedRef.current.delete(page); });
    }
  }, [activePage, readingMode, renderedPages]);

  const updatePlaybackSettings = (patch: Partial<PlaybackSettings>) => {
    setPlaybackSettings((previous) => {
      const next = { ...previous, ...patch };
      return next;
    });
  };

  useEffect(() => {
    if (!playbackSettingsLoaded) return;
    AsyncStorage.setItem(PLAYBACK_SETTINGS_KEY, JSON.stringify(playbackSettings)).catch(() => {});
    if (playbackSequenceRef.current) playbackSequenceRef.current.settings = playbackSettings;
  }, [playbackSettings, playbackSettingsLoaded]);

  const pageItem = QURAN_PAGE_INDEX.find((item) => item.page === activePage) || QURAN_PAGE_INDEX[0];
  const getPageSections = (pageNumber: number) => (QURAN_PAGE_INDEX.find((item) => item.page === pageNumber) || QURAN_PAGE_INDEX[0]).sections.map((section) => {
    const surah = QURAN_DATA.find((item) => item.id === section.surahId) || QURAN_DATA[0];
    return {
      section,
      surah,
      verses: parseSurahVerses(surah).verses.filter((verse) => verse.pageNum === pageNumber)
    };
  });
  const pageSections = getPageSections(activePage);
  const pageVerses = pageSections.flatMap((section) => section.verses);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      try {
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.remove();
        }
        if (webAudioRef.current) {
          webAudioRef.current.pause();
        }
      } catch (e) {}
    };
  }, []);

  const stopAudio = () => {
    try {
      playbackSequenceRef.current = null;
      setPortion(null);
      if (sequenceTimerRef.current) {
        clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      setPlayingAyahNum(null);
      setPlayingSurahId(null);
      setIsAudioLoading(false);
      setIsAudioPlaying(false);
      setAudioPosition(0);
      setAudioDuration(0);
    } catch (e) {}
  };

  const finishSequenceVerse = (finishedVerse: QuranVerse) => {
    const sequence = playbackSequenceRef.current;
    if (!sequence) return;
    if (sequence.ayahRepeatsLeft > 0) {
      sequence.ayahRepeatsLeft -= 1;
      startSequenceVerse(finishedVerse);
      return;
    }
    if (sequence.cursor < sequence.verses.length - 1) {
      sequence.cursor += 1;
      sequence.ayahRepeatsLeft = sequence.settings.ayahRepeats - 1;
    } else if (sequence.repeatsLeft > 0) {
      sequence.repeatsLeft -= 1;
      sequence.cursor = sequence.startIndex;
      sequence.ayahRepeatsLeft = sequence.settings.ayahRepeats - 1;
    } else if (!sequence.settings.stopAtRangeEnd) {
      const allVerses = getAllQuranVerses();
      const next = allVerses.findIndex((item) => item.surahId === finishedVerse.surahId && item.ayahNumber === finishedVerse.ayahNumber);
      if (next >= 0 && next < allVerses.length - 1) {
        sequence.verses = allVerses;
        sequence.cursor = next + 1;
        sequence.startIndex = sequence.cursor;
        sequence.ayahRepeatsLeft = sequence.settings.ayahRepeats - 1;
      } else {
        playbackSequenceRef.current = null;
        setPlayingAyahNum(null);
        setPlayingSurahId(null);
        setIsAudioPlaying(false);
        return;
      }
    } else {
      // A khatma portion that reached its last page says so.
      if (sequence.untilPage) {
        setPortion(null);
        setPortionDone(true);
      }
      playbackSequenceRef.current = null;
      setPlayingAyahNum(null);
      setPlayingSurahId(null);
      setIsAudioPlaying(false);
      return;
    }
    const nextVerse = sequence.verses[sequence.cursor];
    if (!nextVerse) return;
    if (nextVerse.surahId !== currentSurah.id) {
      const nextSurahObj = QURAN_DATA.find((s) => s.id === nextVerse.surahId);
      if (nextSurahObj) setSelectedSurah(nextSurahObj);
    }
    if (sequence.settings.pauseSeconds > 0) {
      setPlayingAyahNum(null);
      sequenceTimerRef.current = setTimeout(() => startSequenceVerse(nextVerse), sequence.settings.pauseSeconds * 1000);
    } else startSequenceVerse(nextVerse);
  };

  const startSequenceVerse = async (verse: QuranVerse) => {
    const sequence = playbackSequenceRef.current;
    if (!sequence) return;
    // Only one recording at a time: pause a Haramain lesson playing in the background.
    lessonPlayer.pause();
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      setPlayingAyahNum(verse.ayahNumber);
      setPlayingSurahId(verse.surahId);
      setIsAudioLoading(true);
      setAudioPosition(0);
      setAudioDuration(0);
      const url = getAyahAudioUrl(verse.surahId, verse.ayahNumber, selectedReciter);
      const player = createAudioPlayer(url, { updateInterval: 250 });
      audioPlayerRef.current = player;
      player.setPlaybackRate(sequence.settings.speed);
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (audioPlayerRef.current !== player) return;
        setIsAudioLoading(!!status?.isBuffering);
        setIsAudioPlaying(!!status?.playing);
        const pos = Number(status?.currentTime || 0);
        const dur = Number(status?.duration || 0);
        setAudioPosition(pos);
        setAudioDuration(dur);
        if (dur > 0) {
          setMeasuredAyahDurations((prev) => (prev[`${verse.surahId}:${verse.ayahNumber}`] === dur ? prev : { ...prev, [`${verse.surahId}:${verse.ayahNumber}`]: dur }));
        }
        if (status?.didJustFinish) {
          player.remove();
          audioPlayerRef.current = null;
          setIsAudioPlaying(false);
          finishSequenceVerse(verse);
        }
      });
      player.play();
    } catch {
      setIsAudioLoading(false);
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const sound = new Audio(getAyahAudioUrl(verse.surahId, verse.ayahNumber, selectedReciter));
        sound.playbackRate = sequence.settings.speed;
        webAudioRef.current = sound;
        sound.oncanplay = () => setIsAudioLoading(false);
        sound.ontimeupdate = () => {
          const pos = sound.currentTime || 0;
          const dur = sound.duration || 0;
          setAudioPosition(pos);
          setAudioDuration(dur);
          if (dur > 0) {
            setMeasuredAyahDurations((prev) => (prev[`${verse.surahId}:${verse.ayahNumber}`] === dur ? prev : { ...prev, [`${verse.surahId}:${verse.ayahNumber}`]: dur }));
          }
          setIsAudioPlaying(!sound.paused);
        };
        sound.onended = () => {
          if (webAudioRef.current !== sound) return;
          webAudioRef.current = null;
          finishSequenceVerse(verse);
        };
        sound.play().catch(() => { playbackSequenceRef.current = null; setPlayingAyahNum(null); setPlayingSurahId(null); setIsAudioPlaying(false); });
      } else {
        playbackSequenceRef.current = null;
        setPlayingAyahNum(null);
        setPlayingSurahId(null);
        setIsAudioPlaying(false);
      }
    }
  };

  // `untilPage`: recite today's khatma portion, from this ayah through the end of that page,
  // across surahs, then stop (the playback range and repeats don't apply).
  const playAyahAudio = async (verse: QuranVerse, untilPage?: number) => {
    triggerHaptic('light');
    stopAudio();
    if (verse.surahId !== currentSurah.id) {
      const verseSurah = QURAN_DATA.find((item) => item.id === verse.surahId);
      if (verseSurah) setSelectedSurah(verseSurah);
    }
    const allVerses = getAllQuranVerses();
    let scopedVerses = allVerses;
    if (untilPage) scopedVerses = allVerses.filter((item) => (item.pageNum || 0) >= (verse.pageNum || 0) && (item.pageNum || 0) <= untilPage);
    else if (playbackSettings.range === 'surah') scopedVerses = allVerses.filter((item) => item.surahId === verse.surahId);
    else if (playbackSettings.range === 'page') scopedVerses = allVerses.filter((item) => item.pageNum === verse.pageNum);
    else if (playbackSettings.range === 'juz') scopedVerses = allVerses.filter((item) => item.juzNum === verse.juzNum);
    const startIndex = scopedVerses.findIndex((item) => item.surahId === verse.surahId && item.ayahNumber === verse.ayahNumber);
    if (startIndex < 0) return;
    const settings = untilPage ? { ...playbackSettings, rangeRepeats: 1, stopAtRangeEnd: true } : playbackSettings;
    playbackSequenceRef.current = {
      verses: scopedVerses,
      startIndex,
      cursor: startIndex,
      repeatsLeft: settings.rangeRepeats - 1,
      ayahRepeatsLeft: settings.ayahRepeats - 1,
      settings,
      untilPage
    };
    setPortionDone(false);
    setPortion(untilPage && verse.pageNum ? { fromPage: verse.pageNum, untilPage } : null);
    startSequenceVerse(verse);
  };

  // Strictly synchronize audio with currently active Surah
  useEffect(() => {
    if (playingSurahId !== null && playingSurahId !== currentSurah.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      stopAudio();
    }
    setActiveAyah((prev) => (prev && prev.surahId !== currentSurah.id ? null : prev));
  }, [currentSurah.id, playingSurahId]);

  // Opened with autoPlay: start at the given ayah, else at the first ayah of the given page,
  // else at the surah's start (it used to always start at the surah's first ayah).
  useEffect(() => {
    if (!screenParams?.autoPlay) return;
    if (lastAutoPlaySurahRef.current === currentSurah.id) return;
    lastAutoPlaySurahRef.current = currentSurah.id;
    const verses = parseSurahVerses(currentSurah).verses;
    const wantedAyah = Number(screenParams?.startAyah) || 0;
    const wantedPage = Number(screenParams?.startPage) || 0;
    const startVerse = (wantedAyah && verses.find((v) => v.ayahNumber === wantedAyah))
      || (wantedPage && getAllQuranVerses().find((v) => v.pageNum === wantedPage))
      || verses[0];
    if (startVerse) {
      autoPlayHandledRef.current = true;
      playAyahAudio(startVerse, Number(screenParams?.untilPage) || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenParams?.autoPlay, currentSurah.id]);

  const handleOpenAyahAction = (verse: QuranVerse) => {
    triggerHaptic('light');
    openAyahTafsir(verse);
  };

  const loadAyahTafsir = async (editionId: number, verse: QuranVerse | null = activeAyah) => {
    if (!verse) return;
    const requestId = ++tafsirRequestRef.current;
    setTafsirLoading(true);
    setTafsirError('');
    setActiveTafsirText('');

    try {
      const text = await fetchAyahTafsir(editionId, verse.surahId, verse.ayahNumber);
      if (requestId === tafsirRequestRef.current) {
        setActiveTafsirText(text);
      }
    } catch (error) {
      if (requestId === tafsirRequestRef.current) {
        setTafsirError(error instanceof Error ? error.message : t('تعذر تحميل التفسير. تحقق من اتصال الإنترنت.', 'Could not load the tafsir. Check your internet connection.'));
      }
    } finally {
      if (requestId === tafsirRequestRef.current) {
        setTafsirLoading(false);
      }
    }
  };

  const openAyahTafsir = async (verse: QuranVerse | null = activeAyah) => {
    if (!verse) return;
    setActiveAyah(verse);
    setActionModalVisible(false);
    setTafsirModalVisible(true);
    setTafsirError('');
    await loadAyahTafsir(selectedTafsirId, verse);
  };

  const handleSelectTafsir = (editionId: number) => {
    triggerHaptic('light');
    setSelectedTafsirId(editionId);
    saveSelectedTafsirId(editionId);
    if (activeAyah) {
      loadAyahTafsir(editionId, activeAyah);
    }
  };

  const handleChangeTafsirFontSize = (delta: number) => {
    setTafsirFontSize((prev) => {
      const next = Math.max(13, Math.min(26, prev + delta));
      AsyncStorage.setItem(TAFSIR_FONT_SIZE_KEY, String(next)).catch(() => {});
      return next;
    });
  };

  const handleNavigateAyahTafsir = (direction: 'next' | 'prev') => {
    if (!activeAyah) return;
    const surahVerses = parsedSurah.verses;
    const currentIndex = surahVerses.findIndex((v) => v.ayahNumber === activeAyah.ayahNumber);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < surahVerses.length) {
      triggerHaptic('light');
      const targetVerse = surahVerses[targetIndex];
      setActiveAyah(targetVerse);
      loadAyahTafsir(selectedTafsirId, targetVerse);
    }
  };

  const ayahNoteKey = (verse: QuranVerse | null) => verse ? `${verse.surahId}:${verse.ayahNumber}` : '';
  const saveAyahNote = async () => {
    if (!activeAyah) return;
    const next = { ...ayahNotes };
    const key = ayahNoteKey(activeAyah);
    if (ayahNoteText.trim()) next[key] = ayahNoteText.trim();
    else delete next[key];
    setAyahNotes(next);
    await AsyncStorage.setItem(AYAH_NOTES_KEY, JSON.stringify(next)).catch(() => {});
    setAyahNoteModalVisible(false);
  };

  const isBookmarked = (verse: QuranVerse) => bookmarks.some((b) => b.surahId === verse.surahId && b.ayah === verse.ayahNumber);

  const positionOf = (verse: QuranVerse) => {
    const verseSurah = QURAN_DATA.find((item) => item.id === verse.surahId) || currentSurah;
    return {
      surahId: verse.surahId,
      surahName: verseSurah.nameAr,
      ayah: verse.ayahNumber,
      page: verse.pageNum || activePage,
      juz: verse.juzNum || currentSurah.juz || 1,
      date: new Date().toISOString()
    };
  };

  /** Add the ayah to the bookmarks list, or remove it if it is already there. */
  const toggleBookmark = (verse: QuranVerse) => {
    triggerHaptic('success');
    if (isBookmarked(verse)) removeBookmark(verse.surahId, verse.ayahNumber);
    else addBookmark(positionOf(verse));
    setActionModalVisible(false);
  };

  const handleShareAyah = (verse: QuranVerse, withTafsir = false) => {
    triggerHaptic('light');
    const verseSurah = QURAN_DATA.find((item) => item.id === verse.surahId) || currentSurah;
    const currentEdition = AVAILABLE_TAFSIR_EDITIONS.find((item) => item.id === selectedTafsirId);
    let message = t(
      `﴿ ${verse.text} ﴾ [سورة ${verseSurah.nameAr}: الآية ${verse.ayahNumber}]`,
      `﴿ ${verse.text} ﴾ [Surah ${verseSurah.nameEn}: verse ${verse.ayahNumber}]`
    );
    if (withTafsir && activeTafsirText.trim()) {
      const editionName = currentEdition ? t(currentEdition.name, currentEdition.nameEn) : t('التفسير', 'Tafsir');
      message += `\n\n📖 ${editionName}:\n${activeTafsirText.trim()}`;
    }
    message += t(`\n\n— تطبيق رفيق المسلم`, `\n\n— Muslim Companion app`);
    Share.share({ message });
    setActionModalVisible(false);
  };

  const handleNextSurah = () => {
    stopAudio();
    triggerHaptic('light');
    const nextId = (currentSurah.id % 114) + 1;
    const next = QURAN_DATA.find((s) => s.id === nextId);
    if (next) {
      setSelectedSurah(next);
      goToPage(next.mushafPageStart || 1);
    }
  };

  const handlePrevSurah = () => {
    stopAudio();
    triggerHaptic('light');
    const prevId = currentSurah.id === 1 ? 114 : currentSurah.id - 1;
    const prev = QURAN_DATA.find((s) => s.id === prevId);
    if (prev) {
      setSelectedSurah(prev);
      goToPage(prev.mushafPageStart || 1);
    }
  };

  const sourceVerses = readingMode === 'surah' ? parsedSurah.verses : pageVerses;
  // In-page search ignores tashkeel and accepts Arabic or Latin digits for an ayah number.
  const searchQuery = normalizeArabic(searchWord);
  const matchesSearch = (v: QuranVerse) =>
    !searchQuery || normalizeArabic(v.text).includes(searchQuery) || v.ayahNumber.toString() === toStandardNumber(searchQuery);
  const displayedVerses = sourceVerses.filter(matchesSearch);

  const shareAyahTafsir = async (verse: QuranVerse, customTafsirText?: string) => {
    triggerHaptic('light');
    const verseSurah = QURAN_DATA.find((item: any) => item.id === verse.surahId) || currentSurah;
    const currentEdition = AVAILABLE_TAFSIR_EDITIONS.find((item) => item.id === selectedTafsirId);
    const tafsirName = currentEdition ? t(currentEdition.name, currentEdition.nameEn) : t('التفسير الميسر', 'Al-Tafsir al-Muyassar');

    let tafsirText = customTafsirText;
    if (!tafsirText) {
      const key = `${verse.surahId}:${verse.ayahNumber}:${selectedTafsirId}`;
      tafsirText = streamTafsirs[key] || activeTafsirText;
    }

    const message = t(
      `﴿ ${verse.text} ﴾\n[سورة ${verseSurah.nameAr}: الآية ${toArabicNumber(verse.ayahNumber)}]\n\n📖 ${tafsirName}:\n${tafsirText ? tafsirText.trim() : 'تفسير الآية الكريمة'}\n\n— تطبيق رفيق المسلم`,
      `﴿ ${verse.text} ﴾\n[Surah ${verseSurah.nameEn}: verse ${toArabicNumber(verse.ayahNumber)}]\n\n📖 ${tafsirName}:\n${tafsirText ? tafsirText.trim() : 'Verse tafsir'}\n\n— Muslim Companion app`
    );
    try {
      await Share.share({ message });
    } catch {}
  };

  useEffect(() => {
    if (readingMode !== 'tafsir') return;
    const versesToFetch = sourceVerses;
    if (!versesToFetch || versesToFetch.length === 0) return;

    let cancelled = false;
    const fetchStreamTafsirs = async () => {
      for (const verse of versesToFetch) {
        const key = `${verse.surahId}:${verse.ayahNumber}:${selectedTafsirId}`;
        if (streamTafsirs[key]) continue;

        setStreamTafsirLoading((prev) => ({ ...prev, [key]: true }));
        try {
          const text = await fetchAyahTafsir(selectedTafsirId, verse.surahId, verse.ayahNumber);
          if (!cancelled && text) {
            setStreamTafsirs((prev) => ({ ...prev, [key]: text }));
          }
        } catch {
          // Handled silently, retry button available
        } finally {
          if (!cancelled) {
            setStreamTafsirLoading((prev) => ({ ...prev, [key]: false }));
          }
        }
      }
    };

    fetchStreamTafsirs();
    return () => {
      cancelled = true;
    };
  }, [readingMode, activePage, currentSurah.id, selectedTafsirId, sourceVerses]);

  const movePage = (direction: -1 | 1) => {
    const nextPage = Math.max(1, Math.min(QURAN_PAGE_INDEX.length, activePage + direction));
    const targetPage = QURAN_PAGE_INDEX.find((item) => item.page === nextPage);
    const firstSection = targetPage?.sections[0];
    if (!targetPage || !firstSection) return;
    triggerHaptic('light');
    setActivePage(nextPage);
    const pageOffset = pageOffsetsRef.current[nextPage];
    if (pageOffset != null) scrollViewRef.current?.scrollTo({ y: pageOffset, animated: true });
    else {
      pendingScrollPageRef.current = nextPage;
      const first = Math.max(1, nextPage - 2);
      const pages = Array.from({ length: Math.min(8, 605 - first) }, (_, index) => first + index);
      setRenderedPages(pages);
      paginationEndRef.current = pages[pages.length - 1] || nextPage;
    }
    if (firstSection.surahId !== currentSurah.id) {
      const nextSurah = QURAN_DATA.find((item) => item.id === firstSection.surahId);
      if (nextSurah) setSelectedSurah(nextSurah);
    }
  };

  const goToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(QURAN_PAGE_INDEX.length, targetPage));
    setActivePage(safePage);
    if (!renderedPages.includes(safePage)) {
      pendingScrollPageRef.current = safePage;
      const first = Math.max(1, safePage - 2);
      const pages = Array.from({ length: Math.min(8, 605 - first) }, (_, index) => first + index);
      setRenderedPages(pages);
      paginationEndRef.current = pages[pages.length - 1] || safePage;
    } else {
      const offset = pageOffsetsRef.current[safePage];
      if (offset != null) scrollViewRef.current?.scrollTo({ y: offset, animated: true });
      else pendingScrollPageRef.current = safePage;
    }
  };

  // Recitation follow-along (page mode): keep the ayah being recited in view; after the reader
  // scrolls by hand it waits 4 seconds, then brings the recited ayah back. The target is where the
  // recited ayah's first line should sit: a third of the way down the screen.
  // Recomputed when the ayah changes and every second (pages and lines lay out as they load).
  const followTargetRef = useRef<number | null>(null);
  const followRecitation = () => {
    followTargetRef.current = null;
    if (readingMode !== 'page' || playingAyahNum == null || playingSurahId == null) return;
    const verse = parseSurahVerses(QURAN_DATA.find((s: any) => s.id === playingSurahId)).verses.find((v) => v.ayahNumber === playingAyahNum);
    if (!verse?.pageNum) return;
    const pageTop = pageOffsetsRef.current[verse.pageNum];
    if (!renderedPages.includes(verse.pageNum) || pageTop == null) {
      if (!scrollingRef.current && Date.now() - lastUserScrollRef.current >= FOLLOW_PAUSE_MS) goToPage(verse.pageNum);
      return;
    }
    // On a Madinah page aim at the ayah's first line; with the flowing text, at the page top.
    const madinah = mushafPages[verse.pageNum];
    const line = madinah?.layout.lines.find((l) => l.words.some((w) => w.verseKey === `${verse.surahId}:${verse.ayahNumber}`));
    const lineY = line ? lineOffsetsRef.current[`${verse.pageNum}:${line.line}`] : undefined;
    followTargetRef.current = Math.max(0, pageTop + (lineY ?? 0) - (viewportHeightRef.current || 600) * 0.3);
  };
  const followRecitationRef = useRef(followRecitation);
  useEffect(() => { followRecitationRef.current = followRecitation; });
  useEffect(() => {
    if (playingAyahNum == null) return;
    followRecitationRef.current();
    const timer = setInterval(() => followRecitationRef.current(), 1000);
    return () => clearInterval(timer);
  }, [playingAyahNum, playingSurahId]);
  // While the recitation plays, the page glides toward the recited ayah, so the text moves at the
  // reciter's pace instead of jumping. A scroll by hand pauses it for FOLLOW_PAUSE_MS.
  useEffect(() => {
    if (!isAudioPlaying) return;
    const timer = setInterval(() => {
      const target = followTargetRef.current;
      if (target == null || scrollingRef.current || Date.now() - lastUserScrollRef.current < FOLLOW_PAUSE_MS) return;
      const current = scrollOffsetRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 1) return;
      if (Math.abs(diff) > (viewportHeightRef.current || 600) * 1.5) {
        scrollViewRef.current?.scrollTo({ y: target, animated: true });
        return;
      }
      const next = current + Math.sign(diff) * Math.max(0.6, Math.abs(diff) * 0.06);
      scrollOffsetRef.current = next;
      scrollViewRef.current?.scrollTo({ y: next, animated: false });
    }, 33);
    return () => clearInterval(timer);
  }, [isAudioPlaying]);

  const openJump = (type: JumpType) => {
    setJumpType(type);
    setJumpValue('');
    setJumpModalVisible(true);
  };

  const executeJump = () => {
    const standardValue = jumpValue.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    const value = Number(standardValue);
    if (!Number.isFinite(value) || value < 1) return;
    let targetSurah: any = null;
    let targetPage = activePage;
    if (jumpType === 'page') targetPage = Math.min(604, value);
    if (jumpType === 'surah') {
      targetSurah = QURAN_DATA.find((item) => item.id === Math.min(114, value));
      if (targetSurah) targetPage = targetSurah.mushafPageStart || 1;
    }
    if (jumpType === 'juz') {
      const juz = QURAN_JUZ_INDEX.find((item) => item.juz === Math.min(30, value));
      if (juz) {
        targetPage = juz.startPage;
        targetSurah = QURAN_DATA.find((item) => item.id === juz.startSurahId);
      }
    }
    if (targetSurah) setSelectedSurah(targetSurah);
    goToPage(targetPage);
    setReadingMode('page');
    setJumpModalVisible(false);
  };

  const currentReciterObj = QURAN_RECITERS.find((r) => r.id === selectedReciter) || QURAN_RECITERS[0];

  const speedOptions = [1, 1.25, 1.5, 2];

  const cyclePlaybackSpeed = () => {
    triggerHaptic('light');
    const currentSpeed = playbackSettings.speed || 1;
    const currentIndex = speedOptions.indexOf(currentSpeed);
    const nextSpeed = currentIndex >= 0 && currentIndex < speedOptions.length - 1 ? speedOptions[currentIndex + 1] : speedOptions[0];

    updatePlaybackSettings({ speed: nextSpeed });
    if (audioPlayerRef.current?.setPlaybackRate) {
      try {
        audioPlayerRef.current.setPlaybackRate(nextSpeed);
      } catch (e) {}
    }
    if (webAudioRef.current) {
      try {
        webAudioRef.current.playbackRate = nextSpeed;
      } catch (e) {}
    }
  };

  const skipAyah = (direction: 1 | -1) => {
    triggerHaptic('light');
    const surahVerses = parsedSurah.verses;
    const currentAyahNumber = (playingSurahId === currentSurah.id && playingAyahNum != null)
      ? playingAyahNum
      : (activeAyah && activeAyah.surahId === currentSurah.id ? activeAyah.ayahNumber : surahVerses[0]?.ayahNumber || 1);

    const currentIndex = surahVerses.findIndex((v) => v.ayahNumber === currentAyahNumber);
    if (currentIndex < 0) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex >= 0 && targetIndex < surahVerses.length) {
      const targetVerse = surahVerses[targetIndex];
      if (targetVerse.pageNum && targetVerse.pageNum !== activePage) {
        goToPage(targetVerse.pageNum);
      }
      playAyahAudio(targetVerse);
    }
  };

  const toggleAudioPlayback = () => {
    triggerHaptic('light');
    if (isAudioPlaying) {
      audioPlayerRef.current?.pause();
      webAudioRef.current?.pause();
      setIsAudioPlaying(false);
      return;
    }
    // Only resume existing audio if it matches the current surah
    if (playingSurahId === currentSurah.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play();
        setIsAudioPlaying(true);
        return;
      }
      if (webAudioRef.current) {
        webAudioRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
        return;
      }
    } else {
      stopAudio();
    }

    // Determine target verse strictly from CURRENT SURAH
    const surahVerses = parsedSurah.verses;
    let targetVerse: QuranVerse | undefined;
    if (activeAyah && activeAyah.surahId === currentSurah.id) {
      targetVerse = activeAyah;
    }
    if (!targetVerse) {
      targetVerse = displayedVerses.find((v) => v.surahId === currentSurah.id);
    }
    if (!targetVerse) {
      targetVerse = surahVerses[0];
    }
    if (targetVerse) {
      playAyahAudio(targetVerse);
    }
  };

  const seekWithinAyah = (seconds: number) => {
    const next = Math.max(0, Math.min(audioDuration || Number.MAX_SAFE_INTEGER, seconds));
    if (audioPlayerRef.current?.seekTo) audioPlayerRef.current.seekTo(next);
    if (webAudioRef.current) webAudioRef.current.currentTime = next;
    setAudioPosition(next);
  };

  // Header bookmark: removes this page's bookmarks if it has any, else marks its first ayah.
  const pageBookmarkedVerses = pageVerses.filter(isBookmarked);
  const pageBookmarked = pageBookmarkedVerses.length > 0;
  const bookmarkCurrentReading = () => {
    if (pageBookmarked) {
      triggerHaptic('success');
      pageBookmarkedVerses.forEach((verse) => removeBookmark(verse.surahId, verse.ayahNumber));
      return;
    }
    const verse = (activeAyah && activeAyah.pageNum === activePage ? activeAyah : null) || pageVerses[0] || displayedVerses[0];
    if (verse) toggleBookmark(verse);
  };

  // Save the reading position automatically once a page has been on screen for a second:
  // the ayah being acted on, else the ayah the reader was opened at, else the page's first.
  useEffect(() => {
    const opened = pageVerses.find((v) => v.surahId === Number(screenParams?.startSurahId) && v.ayahNumber === Number(screenParams?.startAyah));
    const verse = (activeAyah && activeAyah.pageNum === activePage ? activeAyah : null) || opened || pageVerses[0];
    if (!verse) return;
    const timer = setTimeout(() => setReadingBookmark(positionOf(verse)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, activeAyah?.surahId, activeAyah?.ayahNumber]);

  useEffect(() => {
    if (!autoScroll) return;
    const currentSpeed = SCROLL_SPEED_OPTIONS[scrollSpeedIndex]?.speed || 22;
    const timer = setInterval(() => {
      const next = Math.min(maxScrollRef.current, scrollOffsetRef.current + currentSpeed / 20);
      scrollOffsetRef.current = next;
      scrollViewRef.current?.scrollTo({ y: next, animated: false });
      if (next >= maxScrollRef.current && maxScrollRef.current > 0) setAutoScroll(false);
    }, 50);
    return () => clearInterval(timer);
  }, [autoScroll, scrollSpeedIndex]);

  const tajweedColor = (rule: string) => {
    if (rule.includes('ham_wasl') || rule.includes('laam_shamsiyah') || rule.includes('silent')) return '#888888';
    if (rule.includes('qalqalah')) return '#3987A6';
    if (rule.includes('ikhfa') || rule.includes('ghunnah') || rule.includes('idgham')) return '#438B63';
    if (rule.includes('iqlab')) return '#D47732';
    if (rule.includes('madda')) return '#C84D3D';
    return p.ink;
  };

  const renderTajweedText = (markup: string, keyPrefix: string) => {
    // quran.com's tajweed text writes the dagger alef as U+0672 and stretches some words with
    // repeated tatweels; the Hafs font draws those as a stray mark and over-long joins, so use
    // the standard dagger alef (U+0670, as in our bundled text) and a single tatweel.
    const clean = forHafsFont(markup
      .replace(/<span\s+class=end>.*?<\/span>/g, '')
      .replace(/ٲ/g, 'ٰ')
      .replace(/ـ{2,}/g, 'ـ'));
    const tokens: Array<{ text: string; rule: string | null }> = [];
    const tagRegex = /<\/?([a-zA-Z0-9_]+)(?:\s+class=([^>]+))?\/?>/g;
    let lastIndex = 0;
    const tagStack: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(clean)) !== null) {
      if (match.index > lastIndex) {
        const text = clean.substring(lastIndex, match.index);
        const currentRule = tagStack.length > 0 ? tagStack[tagStack.length - 1] : null;
        if (text) tokens.push({ text, rule: currentRule });
      }
      const isClosing = match[0].startsWith('</');
      const isSelfClosing = match[0].endsWith('/>');
      const tagName = match[1];
      const rule = match[2];

      if (!isClosing && !isSelfClosing) {
        tagStack.push(rule || tagName);
      } else if (isClosing) {
        tagStack.pop();
      }
      lastIndex = tagRegex.lastIndex;
    }
    if (lastIndex < clean.length) {
      const text = clean.substring(lastIndex);
      if (text) tokens.push({ text, rule: null });
    }
    // Browsers shape each coloured span on its own, so a span that starts with harakat shows
    // them on a dotted circle. On web only, keep such leading marks with the previous letter
    // (they lose the colour); iOS and Android shape across colour changes.
    if (Platform.OS === 'web') {
      for (let i = 1; i < tokens.length; i += 1) {
        const leading = tokens[i].text.match(/^[ً-ٰٟۖ-ۭ]+/)?.[0];
        if (leading && !/\s$/.test(tokens[i - 1].text)) {
          tokens[i - 1].text += leading;
          tokens[i].text = tokens[i].text.slice(leading.length);
        }
      }
    }

    return tokens.filter((token) => token.text).map((token, index) => (
      <Text
        key={`${keyPrefix}-tj-${index}`}
        style={{
          fontFamily: MUSHAF_FONT,
          color: token.rule ? tajweedColor(token.rule) : p.ink,
        }}
      >
        {token.text}
      </Text>
    ));
  };

  const renderAyahMarker = (arabicNumber: string, isPlaying: boolean = false, verse?: QuranVerse, customFontSize?: number) => {
    // The Hafs font draws U+06DD followed by Arabic-Indic digits as one numbered ayah medallion.
    const digits = arabicNumber.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    return (
      <Text
        key={verse ? `ayah-marker-${verse.surahId}-${verse.ayahNumber}` : undefined}
        style={{
          fontFamily: MUSHAF_FONT,
          fontSize: customFontSize || quranFontSize,
          color: isPlaying ? p.primaryInk : p.primary,
        }}
      >
        {` ۝${digits} `}
      </Text>
    );
  };

  const renderVerse = (verse: QuranVerse) => {
    const isPlaying = playingAyahNum === verse.ayahNumber && playingSurahId === verse.surahId;
    const isMarked = isBookmarked(verse) ||
      (Number(screenParams?.startSurahId) === verse.surahId && Number(screenParams?.startAyah) === verse.ayahNumber);
    return (
      <React.Fragment key={`v-${verse.surahId}-${verse.ayahNumber}`}>
        <Text
          onPress={(event) => { event?.stopPropagation?.(); handleReaderTap(); }}
          onLongPress={(event) => { event?.stopPropagation?.(); triggerHaptic('medium'); handleOpenAyahAction(verse); }}
          style={{
            fontFamily: MUSHAF_FONT,
            fontSize: quranFontSize,
            color: p.ink,
            backgroundColor: isPlaying
              ? 'rgba(198, 146, 85, 0.35)'
              : isMarked
              ? 'rgba(212, 163, 115, 0.25)'
              : undefined
          }}
        >
          {isMarked ? ' 🔖 ' : ''}
          {tajweedTexts[`${verse.surahId}-${verse.ayahNumber}`]
            ? renderTajweedText(tajweedTexts[`${verse.surahId}-${verse.ayahNumber}`], `v-${verse.surahId}-${verse.ayahNumber}`)
            : forHafsFont(verse.text)}
          {renderAyahMarker(verse.arabicNumber, isPlaying, verse)}
        </Text>
      </React.Fragment>
    );
  };

  // One mushaf page (its surah sections, verses and page-end ornament). Wrapped in MushafPageBlock
  // so scrolling (which updates the active page) and audio progress do not re-render the text:
  // on iOS that re-layout briefly showed the Uthmani text stretched before it settled.
  const isDarkTheme = p.bg === PALETTE.dark.bg;

  const renderPageEnd = (pageNumber: number) => (
    <View accessibilityLabel={t(`نهاية الصفحة ${toArabicNumber(pageNumber)}`, `End of page ${toArabicNumber(pageNumber)}`)} style={{ marginTop: 12, marginBottom: 7, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
      <TextUI quran size={24} color={p.muted} style={{ paddingHorizontal: 7 }}>❧</TextUI>
      <View style={{ minWidth: 78, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, borderWidth: 1, borderColor: p.border, borderRadius: 22, backgroundColor: p.bgAlt }}><TextUI quran size={22} weight="bold" color={p.ink}>{toArabicIndicDigits(pageNumber)}</TextUI></View>
      <TextUI quran size={24} color={p.muted} style={{ paddingHorizontal: 7, transform: [{ scaleX: -1 }] }}>❧</TextUI>
      <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
    </View>
  );

  const renderMushafPage = (pageNumber: number) => {
    // Printed-page layout once its glyph font and line data are ready; while searching, offline
    // before the first download, on older systems, and in dark mode (the colour fonts draw
    // the letters black whatever the text colour) the flowing Hafs text below is used.
    // Printed lines only fit the screen width at the default size, so a larger font size (from
    // the settings or a pinch) switches to the flowing text, which wraps; pinching back returns.
    const madinah = mushafPages[pageNumber];
    if (madinah && !searchQuery && !isDarkTheme && quranFontSize <= MADINAH_MAX_FONT_SIZE) return renderMadinahPage(pageNumber, madinah.layout, madinah.family);
    const sections = getPageSections(pageNumber);
    return (
      <View
        onLayout={(event) => {
          pageOffsetsRef.current[pageNumber] = event.nativeEvent.layout.y;
          if (pendingScrollPageRef.current === pageNumber) {
            scrollViewRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
            pendingScrollPageRef.current = 0;
          }
        }}
        style={{ paddingVertical: 5 }}
      >
        {sections.map(({ section, surah, verses }, sectionIndex) => {
          const sectionVerses = verses.filter(matchesSearch);
          if (sectionVerses.length === 0) return null;
          return (
            <View key={`page-${pageNumber}-surah-${surah.id}`}>
              {section.startAyah === 1 ? (
                renderSurahNameFrame(surah.nameAr, sectionIndex === 0 ? 10 : 4)
              ) : sections.length > 1 ? <TextUI size={12} weight="bold" color={p.primary} style={{ textAlign: 'center', marginBottom: 6 }}>{t('سورة', 'Surah')} {en ? surah.nameEn : surah.nameAr}</TextUI> : null}
              {section.startAyah === 1 && surah.id !== 9 && surah.id !== 1 ? <TextUI font="hafs" size={Math.round(quranFontSize * 0.85)} color={p.primaryInk} style={{ textAlign: 'center', marginBottom: 8 }}>{BASMALA}</TextUI> : null}
              <TextUI font="hafs" align="center" size={quranFontSize} color={p.ink} style={{ lineHeight: Math.round(quranFontSize * 2.1), textAlign: quranTextAlign }}>{sectionVerses.map(renderVerse)}</TextUI>
            </View>
          );
        })}
        {renderPageEnd(pageNumber)}
      </View>
    );
  };
  // Everything the page text depends on; a page re-renders only when this changes.
  const pageVersion = [
    quranFontSize, p.ink, p.surface, lang, playingSurahId, playingAyahNum, searchQuery,
    bookmarks.map((b) => `${b.surahId}:${b.ayah}`).join(','),
    screenParams?.startSurahId, screenParams?.startAyah, mushafWidth, isDarkTheme
  ].join('|');

  // Surah banner: our own drawn frame (assets/surah-banner-*.png) with the name in the Hafs font.
  // Explicit size: with only aspectRatio, iOS sized the banner to its text and left it short on the right.
  const bannerWidth = Math.max(240, (mushafWidth || 360) - 4);
  const renderSurahNameFrame = (surahName: string, topOffset: number) => (
    <View style={{ alignSelf: 'center', width: bannerWidth, height: Math.round(bannerWidth * 150 / 1080), marginTop: topOffset, marginBottom: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={isDarkTheme ? SURAH_BANNER_DARK : SURAH_BANNER_LIGHT}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <Text numberOfLines={1} style={{ fontFamily: MUSHAF_FONT, fontSize: 19, color: p.ink, textAlign: 'center', writingDirection: 'rtl' }}>
        سُورَةُ {surahName}
      </Text>
    </View>
  );

  // One page laid out like the printed Madinah mushaf: 15 lines, each a row of word glyphs from
  // the page's own font. Lines without words hold the surah banner or the basmala.
  const renderMadinahPage = (pageNumber: number, layout: MushafPageLayout, family: string) => {
    const sections = getPageSections(pageNumber);
    const verseByKey = new Map<string, QuranVerse>();
    sections.forEach(({ verses }) => verses.forEach((verse) => verseByKey.set(`${verse.surahId}:${verse.ayahNumber}`, verse)));
    const wordsByLine = new Map(layout.lines.map((line) => [line.line, line.words]));
    const extras = new Map<number, { kind: 'banner' | 'basmala'; surah: any }>();
    const placeOpening = (surah: any, firstLine: number) => {
      // Lines before the first verse line; a banner line that falls before line 1 is on the previous page.
      const hasBasmala = surah.id !== 1 && surah.id !== 9;
      const bannerLine = firstLine - (hasBasmala ? 2 : 1);
      if (hasBasmala && !wordsByLine.has(firstLine - 1)) extras.set(firstLine - 1, { kind: 'basmala', surah });
      if (bannerLine >= 1 && !wordsByLine.has(bannerLine)) extras.set(bannerLine, { kind: 'banner', surah });
    };
    sections.forEach(({ section, surah }) => {
      if (section.startAyah !== 1) return;
      const first = layout.lines.find((line) => line.words.some((word) => word.verseKey === `${surah.id}:1`));
      if (first) placeOpening(surah, first.line);
    });
    // A surah whose opening starts in this page's empty last lines: the banner comes right after
    // the last verse line, then the basmala if a line is left (otherwise it opens the next page,
    // e.g. An-Nisa: banner on page 76 line 15, basmala on page 77 line 1).
    const lastLine = layout.lines[layout.lines.length - 1]?.line || 15;
    if (pageNumber > 2 && lastLine < 15) {
      const lastKey = layout.lines[layout.lines.length - 1].words.slice(-1)[0]?.verseKey || '';
      const nextSurah = QURAN_DATA.find((s: any) => s.id === Number(lastKey.split(':')[0]) + 1);
      if (nextSurah) {
        extras.set(lastLine + 1, { kind: 'banner', surah: nextSurah });
        if (lastLine + 2 <= 15 && nextSurah.id !== 9) extras.set(lastLine + 2, { kind: 'basmala', surah: nextSurah });
      }
    }
    const lineNumbers = pageNumber <= 2
      ? [...new Set([...extras.keys(), ...wordsByLine.keys()])].filter((n) => n >= 1).sort((a, b) => a - b)
      : Array.from({ length: 15 }, (_, index) => index + 1);
    // The widest printed lines measure about 17.4 font-sizes in Chrome and a little more on iOS,
    // where the last word of a full line was cut off at /18; /19.5 leaves room on both.
    const fontSize = Math.max(14, Math.floor((mushafWidth || 360) / 19.5));
    const lineHeight = Math.round(fontSize * 1.85);

    return (
      <View
        onLayout={(event) => {
          pageOffsetsRef.current[pageNumber] = event.nativeEvent.layout.y;
          if (pendingScrollPageRef.current === pageNumber) {
            scrollViewRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
            pendingScrollPageRef.current = 0;
          }
        }}
        style={{ paddingVertical: 5 }}
      >
        {lineNumbers.map((lineNumber) => {
          const extra = extras.get(lineNumber);
          if (extra?.kind === 'banner') return <View key={`l-${lineNumber}`}>{renderSurahNameFrame(extra.surah.nameAr, 2)}</View>;
          if (extra?.kind === 'basmala') {
            return (
              <Text key={`l-${lineNumber}`} style={{ fontFamily: MUSHAF_FONT, fontSize: Math.round(fontSize * 0.95), lineHeight, color: p.ink, textAlign: 'center', writingDirection: 'rtl' }}>
                {BASMALA}
              </Text>
            );
          }
          const words = wordsByLine.get(lineNumber) || [];
          return (
            <View
              key={`l-${lineNumber}`}
              onLayout={(event) => { lineOffsetsRef.current[`${pageNumber}:${lineNumber}`] = event.nativeEvent.layout.y; }}
              style={{ direction: 'rtl', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', height: lineHeight, justifyContent: pageNumber <= 2 ? 'center' : 'space-between' }}
            >
              {words.map((word, index) => {
                const verse = verseByKey.get(word.verseKey);
                const isPlaying = !!verse && playingAyahNum === verse.ayahNumber && playingSurahId === verse.surahId;
                const isMarked = !!verse && (isBookmarked(verse) ||
                  (Number(screenParams?.startSurahId) === verse.surahId && Number(screenParams?.startAyah) === verse.ayahNumber));
                return (
                  <Text
                    key={`w-${lineNumber}-${index}`}
                    onPress={handleReaderTap}
                    onLongPress={verse ? () => { triggerHaptic('medium'); handleOpenAyahAction(verse); } : undefined}
                    style={{
                      fontFamily: family,
                      fontSize,
                      lineHeight,
                      color: p.ink,
                      paddingHorizontal: pageNumber <= 2 ? 2 : 0,
                      backgroundColor: isPlaying ? 'rgba(198, 146, 85, 0.35)' : isMarked ? 'rgba(212, 163, 115, 0.25)' : undefined,
                    }}
                  >
                    {word.code}
                  </Text>
                );
              })}
            </View>
          );
        })}
        {renderPageEnd(pageNumber)}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar hidden={isImmersive} animated />

      {/* Full screen keeps a small back button, so the way out is always visible */}
      <Animated.View
        pointerEvents={isImmersive ? 'box-none' : 'none'}
        style={{ position: 'absolute', top: Math.max(insets.top, 10) + 4, start: 10, zIndex: 21, elevation: 7, opacity: chromeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('رجوع', 'Back')}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, opacity: 0.92 }}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={p.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Top bars float over the page and fade out in full screen, so the text never moves */}
      <Animated.View
        pointerEvents={isImmersive ? 'none' : 'box-none'}
        onLayout={(event) => {
          const height = Math.round(event.nativeEvent.layout.height);
          if (height > 0 && height !== headerHeight) setHeaderHeight(height);
        }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, elevation: 6,
          opacity: chromeAnim,
          transform: [{ translateY: chromeAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }]
        }}
      >
          <View style={{ paddingHorizontal: 4, paddingTop: Platform.OS === 'ios' ? 52 : (Platform.OS === 'web' ? 16 : 10), paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: p.surface, borderBottomWidth: 1, borderColor: p.border }}>
            <TouchableOpacity onPress={goBack} accessibilityRole="button" accessibilityLabel={t('رجوع', 'Back')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={p.primary} />
            </TouchableOpacity>
            {/* Title: where the reader is; tap to go to a surah, juz or page */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(`سورة ${currentSurah.nameAr}، صفحة ${activePage}. اضغط للانتقال`, `Surah ${currentSurah.nameEn}, page ${activePage}. Tap to go to`)}
              onPress={() => { triggerHaptic('light'); openJump('surah'); }}
              style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
            >
              <TextUI size={16} weight="bold" color={p.ink} numberOfLines={1}>{en ? currentSurah.nameEn : currentSurah.nameAr}</TextUI>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TextUI size={12.5} color={p.muted} numberOfLines={1}>
                  {en
                    ? `Page ${toArabicNumber(activePage)} · Juz ${toArabicNumber(pageItem.juzNumbers[0] || 1)}`
                    : `صفحة ${toArabicNumber(activePage)} · الجزء ${toArabicNumber(pageItem.juzNumbers[0] || 1)}`}
                </TextUI>
                <Feather name="chevron-down" size={14} color={p.muted} />
              </View>
            </TouchableOpacity>
            {isSearching ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('إغلاق البحث', 'Close search')}
                onPress={() => { triggerHaptic('light'); setSearchWord(''); setIsSearching(false); }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={20} color={p.primary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={pageBookmarked ? t('إزالة علامة هذه الصفحة', 'Remove this page’s bookmark') : t('إضافة علامة', 'Add bookmark')}
              onPress={bookmarkCurrentReading}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="bookmark" size={20} color={pageBookmarked ? p.accentInk : p.muted} />
            </TouchableOpacity>
          </View>

      {/* Tafsir view: which tafsir, and page steps */}
      {readingMode === 'tafsir' ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: p.bgAlt, borderBottomWidth: 1, borderColor: p.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => { triggerHaptic('light'); setTafsirPickerVisible(true); }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: p.soft,
              borderWidth: 1,
              borderColor: p.primary
            }}
          >
            <Feather name="book-open" size={13} color={p.primaryInk} />
            <TextUI size={12} weight="bold" color={p.primaryInk}>
              {selectedTafsirLabel}
            </TextUI>
            <Feather name="chevron-down" size={12} color={p.primaryInk} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <TouchableOpacity
                accessibilityLabel={t('الصفحة السابقة', 'Previous page')}
                onPress={() => movePage(-1)}
                disabled={activePage <= 1}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center', opacity: activePage <= 1 ? 0.35 : 1 }}
              >
                <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={18} color={p.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('الصفحة التالية', 'Next page')}
                onPress={() => movePage(1)}
                disabled={activePage >= QURAN_PAGE_INDEX.length}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center', opacity: activePage >= QURAN_PAGE_INDEX.length ? 0.35 : 1 }}
              >
                <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={p.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      <JumpSheet jumpModalVisible={jumpModalVisible} setJumpModalVisible={setJumpModalVisible} setJumpType={setJumpType} setJumpValue={setJumpValue} jumpType={jumpType} jumpValue={jumpValue} executeJump={executeJump} setSelectedSurah={setSelectedSurah} goToPage={goToPage} setReadingMode={setReadingMode} />

      {/* In-Surah Search Bar */}
      {isSearching && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: p.surface, borderBottomWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={16} color={p.muted} />
            <TextInput
              placeholder={readingMode === 'page' ? t('ابحث عن كلمة أو رقم الآية في الصفحة...', 'Search for a word or verse number on this page...') : t('ابحث عن كلمة أو رقم الآية في السورة...', 'Search for a word or verse number in this surah...')}
              placeholderTextColor={p.muted}
              value={searchWord}
              onChangeText={setSearchWord}
              style={{ flex: 1, color: p.ink, textAlign: isRTL ? 'right' : 'left', fontSize: 13 }}
            />
            {searchWord ? (
              <TouchableOpacity onPress={() => setSearchWord('')}>
                <Feather name="x" size={16} color={p.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
      </Animated.View>

      {/* The pinch preview scales this view */}
      <GestureDetector gesture={pinchGesture}>
      <Animated.View style={{ flex: 1, transformOrigin: `${pinchOrigin.x}px ${pinchOrigin.y}px`, transform: [{ scale: pinchScale }] }}>
        <GestureScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: readingMode === 'page' ? p.surface : undefined }}
        // Page mode: the pages are the direct children, so when a page above the screen changes
        // height (a swap after the scroll stops) iOS and Android keep the visible text in place.
        maintainVisibleContentPosition={readingMode === 'page' && Platform.OS !== 'web' ? { minIndexForVisible: 0 } : undefined}
        scrollEnabled={!pinching}
        contentContainerStyle={{ paddingHorizontal: readingMode === 'page' ? 11 : 3, paddingTop: headerHeight + (readingMode === 'page' ? 4 : 0), paddingBottom: 110, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          scrollingRef.current = true; lastUserScrollRef.current = Date.now();
          setUserScrolling(true);
        }}
        onScrollEndDrag={() => { lastUserScrollRef.current = Date.now(); }}
        onStartShouldSetResponderCapture={(event) => event.target === event.currentTarget}
        onResponderRelease={handleReaderTap}
        onScroll={(event) => {
          const offset = event.nativeEvent.contentOffset.y;
          scrollOffsetRef.current = offset;
          // By hand, scrolling down hides the bars and scrolling back up brings them back (as in
          // Safari). The anchor follows the scroll while it keeps the current state.
          const delta = offset - lastScrollYRef.current;
          if (!scrollingRef.current || isSearching) {
            lastScrollYRef.current = offset;
          } else if (isImmersive ? delta > 0 : delta < 0) {
            lastScrollYRef.current = offset;
          } else if (!isImmersive && delta > 24) {
            setIsImmersive(true);
            lastScrollYRef.current = offset;
          } else if (isImmersive && delta < -40) {
            setIsImmersive(false);
            lastScrollYRef.current = offset;
          }
          // The scroll has come to rest once no scroll events arrive for 300 ms. This does not rely on
          // the momentum events, which on iPhone could go missing and leave the reader "scrolling"
          // for good: the recitation then stopped following and pages stopped updating.
          if (scrollRestTimerRef.current) clearTimeout(scrollRestTimerRef.current);
          scrollRestTimerRef.current = setTimeout(() => {
            if (scrollingRef.current) lastUserScrollRef.current = Date.now();
            scrollingRef.current = false;
            setUserScrolling(false);
          }, 300);
          if (readingMode === 'page') {
            // The page being read: the one at a third of the way down the screen (a few lines of the
            // previous page at the very top made "Listen" start the previous surah).
            const readLine = offset + (viewportHeightRef.current || 600) * 0.3;
            const pageAtOffset = [...renderedPages].reverse().find((page) => (pageOffsetsRef.current[page] ?? Number.POSITIVE_INFINITY) <= readLine);
            if (pageAtOffset && pageAtOffset !== activePage) {
              setActivePage(pageAtOffset);
              const pageSection = getPageSections(pageAtOffset)[0];
              if (pageSection && pageSection.surah.id !== currentSurah.id) setSelectedSurah(pageSection.surah);
            }
            if (!pageAppendPendingRef.current && offset + viewportHeightRef.current * 1.8 >= contentHeightRef.current && paginationEndRef.current < QURAN_PAGE_INDEX.length) {
              pageAppendPendingRef.current = true;
              const nextEnd = Math.min(QURAN_PAGE_INDEX.length, paginationEndRef.current + 5);
              const nextPages = Array.from({ length: nextEnd - (renderedPages[0] - 1) }, (_, index) => renderedPages[0] + index);
              paginationEndRef.current = nextEnd;
              setRenderedPages(nextPages);
            }
          }
        }}
        onContentSizeChange={(_width, height) => { contentHeightRef.current = height; maxScrollRef.current = Math.max(0, height - viewportHeightRef.current); pageAppendPendingRef.current = false; }}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          maxScrollRef.current = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
          // Text width: the screen less 3 + 8 points of padding on each side.
          const width = Math.round(event.nativeEvent.layout.width - 22);
          if (width > 0 && width !== mushafWidth) setMushafWidth(width);
        }}
      >
        {/* Uthmani page text in natural line flow, matching a printed mushaf page. */}
        {readingMode === 'page' ? renderedPages.map((pageNumber) => (
          <MushafPageBlock key={`mushaf-page-${pageNumber}`} pageNumber={pageNumber} version={`${pageVersion}|${tajweedPages[pageNumber] ? 1 : 0}|${mushafPages[pageNumber] ? 1 : 0}`} frozen={userScrolling} render={renderMushafPage} />
        )) : (
        <View
          style={{
            backgroundColor: p.surface,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minHeight: '100%',
            flexGrow: 1
          }}
        >
          {readingMode === 'tafsir' ? (
            <View style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
              {displayedVerses.map((verse) => {
                const isPlaying = playingAyahNum === verse.ayahNumber && playingSurahId === verse.surahId;
                const isMarked = isBookmarked(verse);
                const key = `${verse.surahId}:${verse.ayahNumber}:${selectedTafsirId}`;
                const tafsirContent = streamTafsirs[key];
                const isLoadingTafsir = streamTafsirLoading[key];
                const verseSurah = QURAN_DATA.find((s: any) => s.id === verse.surahId) || currentSurah;

                return (
                  <View
                    key={`tafsir-stream-${verse.surahId}-${verse.ayahNumber}`}
                    style={{
                      backgroundColor: p.surface,
                      borderRadius: 16,
                      marginBottom: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isPlaying ? p.primary : p.border,
                      ...makeShadow('0 2px 8px rgba(0,0,0,0.04)', '#000', 0.04, 3)
                    }}
                  >
                    {/* Header of Ayah: Surah + Ayah number + quick actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: p.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.primary }} />
                        <TextUI size={12} weight="bold" color={p.primary}>
                          {en ? <>Surah {verseSurah.nameEn} • Verse {toArabicNumber(verse.ayahNumber)}</> : <>سورة {verseSurah.nameAr} • الآية {toArabicNumber(verse.ayahNumber)}</>}
                        </TextUI>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {/* Listen button */}
                        <TouchableOpacity
                          onPress={() => {
                            if (isPlaying) stopAudio();
                            else playAyahAudio(verse);
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: isPlaying ? p.primary : p.bgAlt,
                            borderWidth: 1,
                            borderColor: isPlaying ? p.primary : p.border
                          }}
                        >
                          <Feather name={isPlaying ? 'pause' : 'play'} size={12} color={isPlaying ? p.onPrimary : p.primary} />
                          <TextUI size={10.5} weight="bold" color={isPlaying ? p.onPrimary : p.ink}>
                            {isPlaying ? t('إيقاف', 'Stop') : t('استماع', 'Listen')}
                          </TextUI>
                        </TouchableOpacity>

                        {/* Bookmark button */}
                        <TouchableOpacity
                          onPress={() => toggleBookmark(verse)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={{
                            padding: 5,
                            borderRadius: 10,
                            backgroundColor: isMarked ? 'rgba(212, 163, 115, 0.25)' : p.bgAlt,
                            borderWidth: 1,
                            borderColor: isMarked ? p.primary : p.border
                          }}
                        >
                          <Feather name="bookmark" size={13} color={isMarked ? p.primaryInk : p.muted} />
                        </TouchableOpacity>

                        {/* Direct Share Ayah & Tafsir */}
                        <TouchableOpacity
                          onPress={() => shareAyahTafsir(verse, tafsirContent)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: p.bgAlt,
                            borderWidth: 1,
                            borderColor: p.border
                          }}
                        >
                          <Feather name="share-2" size={12} color={p.muted} />
                          <TextUI size={10.5} color={p.muted}>
                            {t('مشاركة', 'Share')}
                          </TextUI>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Ayah Text in Authentic Uthmani Calligraphy */}
                    <View style={{ marginVertical: 8, paddingHorizontal: 4 }}>
                      <TextUI
                        quran
                        align="center"
                        size={quranFontSize}
                        color={p.ink}
                        style={{ lineHeight: Math.round(quranFontSize * 2), textAlign: 'center' }}
                      >
                        {verse.text}
                        {' '}
                        {renderAyahMarker(verse.arabicNumber, isPlaying, verse)}
                      </TextUI>
                    </View>

                    {/* Inline Creamy Tafsir Card */}
                    <View
                      style={{
                        backgroundColor: tafsirCardBgColor,
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 10,
                        borderWidth: 1,
                        borderColor: tafsirBorderColor
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderColor: p.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Feather name="book" size={12} color={p.primaryInk} />
                          <TextUI size={11} weight="bold" color={p.primaryInk}>
                            {selectedTafsirLabel}
                          </TextUI>
                        </View>

                        <TouchableOpacity
                          onPress={() => shareAyahTafsir(verse, tafsirContent)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <TextUI size={10.5} weight="bold" color={p.primary}>
                            {t('مشاركة التفسير ↗', 'Share tafsir ↗')}
                          </TextUI>
                        </TouchableOpacity>
                      </View>

                      {isLoadingTafsir ? (
                        <View style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color={p.primary} />
                          <TextUI size={11} color={p.muted}>{t('جارِ جلب التفسير المعتمد...', 'Fetching the approved tafsir...')}</TextUI>
                        </View>
                      ) : tafsirContent ? (
                        <TextUI
                          size={tafsirFontSize}
                          color={p.ink}
                          style={{ lineHeight: Math.round(tafsirFontSize * 1.65), textAlign: 'right' }}
                        >
                          {tafsirContent}
                        </TextUI>
                      ) : (
                        <TouchableOpacity
                          onPress={async () => {
                            setStreamTafsirLoading((prev) => ({ ...prev, [key]: true }));
                            try {
                              const text = await fetchAyahTafsir(selectedTafsirId, verse.surahId, verse.ayahNumber);
                              if (text) setStreamTafsirs((prev) => ({ ...prev, [key]: text }));
                            } catch (e) {}
                            setStreamTafsirLoading((prev) => ({ ...prev, [key]: false }));
                          }}
                          style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <TextUI size={11} color={p.primary} weight="bold">
                            {t('اضغط لتحميل التفسير ↻', 'Tap to load the tafsir ↻')}
                          </TextUI>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <TextUI font="hafs" align="center" size={quranFontSize} color={p.ink} style={{ lineHeight: Math.round(quranFontSize * 2.1), textAlign: quranTextAlign }}>{displayedVerses.map(renderVerse)}</TextUI>
          )}
        </View>
        )}

        {/* Tafsir / Purpose Summary */}
        {readingMode === 'surah' && currentSurah.tafsir ? (
          <View
            style={{
              backgroundColor: p.soft,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: p.primary,
              marginBottom: 20
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Feather name="book" size={16} color={p.primaryInk} />
              <TextUI size={14} weight="bold" color={p.primaryInk}>
                {t('مقاصد وتفسير السورة الميسر', 'Surah Objectives & Tafsir')}
              </TextUI>
            </View>
            <TextUI size={13} color={p.ink} style={{ lineHeight: 22 }}>
              {currentSurah.tafsir}
            </TextUI>
          </View>
        ) : null}

        {/* Next / Prev Surah Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePrevSurah}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: p.surface,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: p.border
            }}
          >
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={16} color={p.ink} />
            <TextUI size={13} weight="bold" color={p.ink}>
              {t('السورة السابقة', 'Previous surah')}
            </TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNextSurah}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: p.primary,
              paddingVertical: 14,
              borderRadius: 14
            }}
          >
            <TextUI size={13} weight="bold" color={p.onPrimary}>
              {t('السورة التالية', 'Next surah')}
            </TextUI>
            <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={16} color={p.onPrimary} />
          </TouchableOpacity>
        </View>
        </GestureScrollView>
      </Animated.View>
      </GestureDetector>

      {/* Bottom toolbar: shows and hides with the top bar */}
      <Animated.View
        pointerEvents={isImmersive ? 'none' : 'auto'}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 6,
          opacity: chromeAnim,
          transform: [{ translateY: chromeAnim.interpolate({ inputRange: [0, 1], outputRange: [READER_TOOLBAR_HEIGHT, 0] }) }]
        }}
      >
        <ReaderToolbar
          isPlaying={isAudioPlaying}
          isLoading={isAudioLoading}
          autoScroll={autoScroll}
          onListen={() => { setAutoScroll(false); toggleAudioPlayback(); }}
          onAutoScroll={() => { const next = !autoScroll; setAutoScroll(next); if (next) setIsImmersive(true); }}
          onView={() => setReadingMenuVisible(true)}
          onSearch={() => setIsSearching(true)}
        />
      </Animated.View>

      {/* While reciting (or auto-scrolling) the compact player stays, in full screen too */}
      {(isAudioPlaying || isAudioLoading || playingAyahNum != null || autoScroll) ? (
        <ReaderPlayer
          bottom={isImmersive ? (Platform.OS === 'ios' ? 28 : 12) : READER_TOOLBAR_HEIGHT + 8}
          reciterName={en ? currentReciterObj.nameEn : currentReciterObj.nameAr}
          ayahNumber={currentAyahNum}
          totalAyahs={totalSurahVerses}
          ayahRepeats={playbackSettings.ayahRepeats}
          speed={playbackSettings.speed || 1}
          isPlaying={isAudioPlaying}
          isLoading={isAudioLoading}
          progressRatio={surahProgressRatio}
          elapsedLabel={formatAudioTime(surahElapsedSeconds)}
          remainingLabel={formatAudioTime(surahRemainingSeconds)}
          autoScroll={autoScroll}
          scrollSpeedIndex={scrollSpeedIndex}
          onScrollSpeed={setScrollSpeedIndex}
          onStopAutoScroll={() => setAutoScroll(false)}
          onSeek={handleSurahProgressPress}
          onTogglePlay={toggleAudioPlayback}
          onSkip={skipAyah}
          onCycleSpeed={cyclePlaybackSpeed}
          onOpenRepeat={() => setPlaybackSettingsVisible(true)}
          onOpenTafsir={() => openAyahTafsir(parsedSurah.verses.find((v) => v.ayahNumber === currentAyahNum) || activeAyah)}
          onOpenReciter={() => setReciterModalVisible(true)}
          onStop={() => { stopAudio(); setAutoScroll(false); }}
          portion={portion ? (() => {
            const playingPage = (playingAyahNum != null && parsedSurah.verses.find((v) => v.ayahNumber === playingAyahNum)?.pageNum) || portion.fromPage;
            return {
              label: t(`حتى نهاية ورد اليوم · ص ${toArabicNumber(portion.untilPage)}`, `To the end of today's portion · p. ${portion.untilPage}`),
              total: portion.untilPage - portion.fromPage + 1,
              done: Math.max(0, playingPage - portion.fromPage)
            };
          })() : undefined}
        />
      ) : null}

      {/* End of today's portion */}
      {portionDone ? (
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('أتممت ورد اليوم. إغلاق', "Today's portion is done. Close")}
          onPress={() => setPortionDone(false)}
          style={{ position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'ios' ? 34 : 18, minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.hero, zIndex: 30, elevation: 8 }}
        >
          <Feather name="check-circle" size={20} color="#E2B276" />
          <TextUI size={15} weight="bold" color={p.onHero} style={{ flex: 1 }}>{t('أتممت ورد اليوم، بارك الله فيك', "Today's portion is done, may Allah bless you")}</TextUI>
          <Feather name="x" size={18} color={p.onHeroMuted} />
        </TouchableOpacity>
      ) : null}

      <PlaybackSettingsSheet playbackSettingsVisible={playbackSettingsVisible} setPlaybackSettingsVisible={setPlaybackSettingsVisible} playbackSettings={playbackSettings} updatePlaybackSettings={updatePlaybackSettings} audioPlayerRef={audioPlayerRef} webAudioRef={webAudioRef} />

      {/* Ayah Action Sheet Modal */}
      <AyahActionSheet actionModalVisible={actionModalVisible} activeAyah={activeAyah} currentSurah={currentSurah} setActionModalVisible={setActionModalVisible} openAyahTafsir={openAyahTafsir} playAyahAudio={playAyahAudio} currentReciterObj={currentReciterObj} setReciterModalVisible={setReciterModalVisible} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} handleShareAyah={handleShareAyah} setAyahNoteText={setAyahNoteText} ayahNotes={ayahNotes} ayahNoteKey={ayahNoteKey} setAyahNoteModalVisible={setAyahNoteModalVisible} />

      <AyahTafsirSheet tafsirModalVisible={tafsirModalVisible} setTafsirModalVisible={setTafsirModalVisible} activeAyah={activeAyah} currentSurah={currentSurah} activePage={activePage} handleChangeTafsirFontSize={handleChangeTafsirFontSize} renderAyahMarker={renderAyahMarker} playingAyahNum={playingAyahNum} playingSurahId={playingSurahId} stopAudio={stopAudio} playAyahAudio={playAyahAudio} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} handleShareAyah={handleShareAyah} setAyahNoteText={setAyahNoteText} ayahNotes={ayahNotes} ayahNoteKey={ayahNoteKey} setAyahNoteModalVisible={setAyahNoteModalVisible} setActionModalVisible={setActionModalVisible} tafsirEditions={tafsirEditions} selectedTafsirId={selectedTafsirId} handleSelectTafsir={handleSelectTafsir} tafsirLoading={tafsirLoading} tafsirError={tafsirError} loadAyahTafsir={loadAyahTafsir} activeTafsirText={activeTafsirText} tafsirFontSize={tafsirFontSize} handleNavigateAyahTafsir={handleNavigateAyahTafsir} parsedSurah={parsedSurah} />

      <AyahNoteSheet ayahNoteModalVisible={ayahNoteModalVisible} setAyahNoteModalVisible={setAyahNoteModalVisible} activeAyah={activeAyah} ayahNoteText={ayahNoteText} setAyahNoteText={setAyahNoteText} saveAyahNote={saveAyahNote} />

      {/* Reading settings menu (header "Tt" button) */}
      <ReadingMenuSheet readingMenuVisible={readingMenuVisible} setReadingMenuVisible={setReadingMenuVisible} readingMode={readingMode} setReadingMode={setReadingMode} setFontSizeModalVisible={setFontSizeModalVisible} currentReciterObj={currentReciterObj} setReciterModalVisible={setReciterModalVisible} />

      {/* Reciter Selection Modal */}
      <ReciterSheet reciterModalVisible={reciterModalVisible} setReciterModalVisible={setReciterModalVisible} stopAudio={stopAudio} setSelectedReciter={setSelectedReciter} selectedReciter={selectedReciter} />

      {/* 2. Font Size Adjustment Modal */}
      <FontSizeSheet fontSizeModalVisible={fontSizeModalVisible} setFontSizeModalVisible={setFontSizeModalVisible} tafsirFontSize={tafsirFontSize} tafsirCardBgColor={tafsirCardBgColor} tafsirBorderColor={tafsirBorderColor} handleChangeTafsirFontSize={handleChangeTafsirFontSize} />

      {/* 3. Tafsir Edition Picker Sheet */}
      <TafsirPickerSheet tafsirPickerVisible={tafsirPickerVisible} setTafsirPickerVisible={setTafsirPickerVisible} selectedTafsirId={selectedTafsirId} setSelectedTafsirId={setSelectedTafsirId} />
    </View>
  );
};
