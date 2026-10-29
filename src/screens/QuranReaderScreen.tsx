import React, { useState, useRef, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
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
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { toArabicNumber, toStandardNumber } from '../services/prayerCalculation';
import { normalizeArabic } from '../services/quranSearch';
import { QURAN_PAGE_INDEX, QURAN_JUZ_INDEX } from '../data/quranIndex';
import {
  parseSurahVerses,
  QuranVerse,
  QURAN_RECITERS,
  getAyahAudioUrl
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
import { usePalette } from '../theme/palette';
import { QURAN_DATA, JumpType, PlaybackSettings, ReadingMode, SCROLL_SPEED_OPTIONS } from '../components/quran/reader/readerShared';
import { ReaderPlayer } from '../components/quran/reader/ReaderPlayer';
import { useLessonPlayer } from '../context/LessonPlayerContext';
import { JumpSheet } from '../components/quran/reader/JumpSheet';
import { PlaybackSettingsSheet } from '../components/quran/reader/PlaybackSettingsSheet';
import { AyahActionSheet, AyahNoteSheet } from '../components/quran/reader/AyahSheets';
import { AyahTafsirSheet } from '../components/quran/reader/AyahTafsirSheet';
import { ReadingMenuSheet, ReciterSheet, ReadingModeSheet, FontSizeSheet, TafsirPickerSheet } from '../components/quran/reader/ReaderOptionSheets';

let allQuranVersesCache: QuranVerse[] | null = null;
const getAllQuranVerses = () => {
  if (!allQuranVersesCache) allQuranVersesCache = QURAN_DATA.flatMap((item) => parseSurahVerses(item).verses);
  return allQuranVersesCache;
};
const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = { range: 'surah', rangeRepeats: 1, ayahRepeats: 1, pauseSeconds: 0, speed: 1, stopAtRangeEnd: true };
const PLAYBACK_SETTINGS_KEY = 'quran.playback-settings.v1';
const AYAH_NOTES_KEY = 'quran.ayah-notes.v1';
const TAFSIR_FONT_SIZE_KEY = 'quran.tafsir-font-size.v1';

export const QuranReaderScreen: React.FC = () => {
  const {
    goBack,
    themeMode,
    t,
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
  const [modeModalVisible, setModeModalVisible] = useState(false);
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
  const [tafsirFontSize, setTafsirFontSize] = useState<number>(16);
  const [activeTafsirText, setActiveTafsirText] = useState('');
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState('');
  const tafsirRequestRef = useRef(0);
  const [selectedReciter, setSelectedReciter] = useState(screenParams?.reciterId || QURAN_RECITERS[0].id);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [playbackSettingsVisible, setPlaybackSettingsVisible] = useState(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(DEFAULT_PLAYBACK_SETTINGS);
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
  const [readerControlsVisible, setReaderControlsVisible] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [jumpType, setJumpType] = useState<JumpType>('page');
  const [jumpValue, setJumpValue] = useState('');
  const [tajweedTexts, setTajweedTexts] = useState<Record<string, string>>({});

  const [measuredAyahDurations, setMeasuredAyahDurations] = useState<Record<string, number>>({});
  const audioPlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  const playbackSequenceRef = useRef<{ verses: QuranVerse[]; startIndex: number; cursor: number; repeatsLeft: number; ayahRepeatsLeft: number; settings: PlaybackSettings } | null>(null);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayHandledRef = useRef(false);
  const lastAutoPlaySurahRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const maxScrollRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartFontSizeRef = useRef(quranFontSize);
  const lastPinchFontSizeRef = useRef(quranFontSize);
  const pageOffsetsRef = useRef<Record<number, number>>({});
  const pendingScrollPageRef = useRef(initialPage);
  const paginationEndRef = useRef(renderedPages[renderedPages.length - 1] || initialPage);
  const pageAppendPendingRef = useRef(false);
  const quranTextAlign: 'center' = 'center';

  const formatAudioTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '٠٠:٠٠';
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

  const touchDistance = (touches: any[]) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const handleReaderTouchStart = (event: any) => {
    const distance = touchDistance(event.nativeEvent.touches);
    if (distance > 0) {
      pinchStartDistanceRef.current = distance;
      pinchStartFontSizeRef.current = quranFontSize;
      lastPinchFontSizeRef.current = quranFontSize;
    }
  };
  const handleReaderTouchMove = (event: any) => {
    const distance = touchDistance(event.nativeEvent.touches);
    if (!distance || !pinchStartDistanceRef.current) return;
    const nextSize = Math.max(17, Math.min(48, Math.round(pinchStartFontSizeRef.current * distance / pinchStartDistanceRef.current)));
    if (nextSize !== lastPinchFontSizeRef.current) {
      lastPinchFontSizeRef.current = nextSize;
      setQuranFontSize(nextSize);
    }
  };
  const handleReaderTouchEnd = (event: any) => {
    if ((event.nativeEvent.touches?.length || 0) < 2) pinchStartDistanceRef.current = 0;
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

  useEffect(() => {
    const scope = readingMode === 'surah' ? `chapter:${currentSurah.id}` : `page:${activePage}`;
    const storageKey = `quran.tajweed.${scope}`;
    let cancelled = false;
    const loadTajweedText = async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (!cancelled) setTajweedTexts((previous) => ({ ...previous, ...cachedData }));
          return;
        }
        const filter = readingMode === 'surah' ? `chapter_number=${currentSurah.id}` : `page_number=${activePage}`;
        const response = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?${filter}`);
        if (!response.ok) return;
        const payload = await response.json();
        const pageMap: Record<string, string> = {};
        for (const verse of payload?.verses || []) {
          if (verse?.verse_key && verse?.text_uthmani_tajweed) pageMap[verse.verse_key.replace(':', '-')] = verse.text_uthmani_tajweed;
        }
        if (Object.keys(pageMap).length) {
          if (!cancelled) setTajweedTexts((previous) => ({ ...previous, ...pageMap }));
          AsyncStorage.setItem(storageKey, JSON.stringify(pageMap)).catch(() => {});
        }
      } catch {
        // Keep the bundled Uthmani text available when the device is offline.
      }
    };
    loadTajweedText();
    return () => { cancelled = true; };
  }, [activePage, currentSurah.id, readingMode]);

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

  const playAyahAudio = async (verse: QuranVerse) => {
    triggerHaptic('light');
    stopAudio();
    if (verse.surahId !== currentSurah.id) {
      const verseSurah = QURAN_DATA.find((item) => item.id === verse.surahId);
      if (verseSurah) setSelectedSurah(verseSurah);
    }
    const allVerses = getAllQuranVerses();
    let scopedVerses = allVerses;
    if (playbackSettings.range === 'surah') scopedVerses = allVerses.filter((item) => item.surahId === verse.surahId);
    if (playbackSettings.range === 'page') scopedVerses = allVerses.filter((item) => item.pageNum === verse.pageNum);
    if (playbackSettings.range === 'juz') scopedVerses = allVerses.filter((item) => item.juzNum === verse.juzNum);
    const startIndex = scopedVerses.findIndex((item) => item.surahId === verse.surahId && item.ayahNumber === verse.ayahNumber);
    if (startIndex < 0) return;
    playbackSequenceRef.current = {
      verses: scopedVerses,
      startIndex,
      cursor: startIndex,
      repeatsLeft: playbackSettings.rangeRepeats - 1,
      ayahRepeatsLeft: playbackSettings.ayahRepeats - 1,
      settings: playbackSettings
    };
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

  useEffect(() => {
    if (!screenParams?.autoPlay) return;
    if (lastAutoPlaySurahRef.current === currentSurah.id) return;
    lastAutoPlaySurahRef.current = currentSurah.id;
    const firstVerse = parseSurahVerses(currentSurah).verses[0];
    if (firstVerse) {
      autoPlayHandledRef.current = true;
      playAyahAudio(firstVerse);
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
        setTafsirError(error instanceof Error ? error.message : 'تعذر تحميل التفسير. تحقق من اتصال الإنترنت.');
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
    let message = `﴿ ${verse.text} ﴾ [سورة ${verseSurah.nameAr}: الآية ${verse.ayahNumber}]`;
    if (withTafsir && activeTafsirText.trim()) {
      message += `\n\n📖 ${currentEdition?.name || 'التفسير'}:\n${activeTafsirText.trim()}`;
    }
    message += `\n\n— تطبيق رفيق المسلم (Almosala Pro)`;
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
    const tafsirName = currentEdition?.name || 'التفسير الميسر';

    let tafsirText = customTafsirText;
    if (!tafsirText) {
      const key = `${verse.surahId}:${verse.ayahNumber}:${selectedTafsirId}`;
      tafsirText = streamTafsirs[key] || activeTafsirText;
    }

    const message = `﴿ ${verse.text} ﴾\n[سورة ${verseSurah.nameAr}: الآية ${toArabicNumber(verse.ayahNumber)}]\n\n📖 ${tafsirName}:\n${tafsirText ? tafsirText.trim() : 'تفسير الآية الكريمة'}\n\n— تطبيق رفيق المسلم (Almosala Pro)`;
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
    setReaderControlsVisible(true);
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
    const clean = markup.replace(/<span\s+class=end>.*?<\/span>/g, '');
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

    return tokens.map((token, index) => (
      <Text
        key={`${keyPrefix}-tj-${index}`}
        style={{
          fontFamily: 'Amiri_400Regular',
          color: token.rule ? tajweedColor(token.rule) : p.ink,
        }}
      >
        {token.text}
      </Text>
    ));
  };

  const renderAyahMarker = (arabicNumber: string, isPlaying: boolean = false, verse?: QuranVerse, customFontSize?: number) => {
    const effectiveSize = customFontSize || quranFontSize;
    if (Platform.OS === 'ios') {
      return (
        <Text
          key={verse ? `ayah-marker-${verse.surahId}-${verse.ayahNumber}` : undefined}
          style={{
            fontFamily: 'Amiri_700Bold',
            fontSize: Math.round(effectiveSize * 0.95),
            color: isPlaying ? p.primaryInk : p.primary,
          }}
        >
          {` ﴿${arabicNumber}﴾ `}
        </Text>
      );
    }

    // On Web (localhost): preserved exactly as calibrated for browser rendering, scaled to effectiveSize
    const badgeSize = Math.max(20, Math.round(effectiveSize * 1.2));
    const rosetteSize = Math.round(badgeSize * 1.15);
    const numSize = arabicNumber.length > 2
      ? Math.max(7.5, Math.round(badgeSize * 0.34))
      : Math.max(9.5, Math.round(badgeSize * 0.44));

    return (
      <View
        key={verse ? `ayah-marker-${verse.surahId}-${verse.ayahNumber}` : undefined}
        style={{
          width: badgeSize,
          height: badgeSize,
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 3,
          position: 'relative',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            fontFamily: 'Amiri_400Regular',
            fontSize: rosetteSize,
            color: isPlaying ? p.primaryInk : p.primary,
            textAlign: 'center',
            includeFontPadding: false,
          }}
        >
          ۝
        </Text>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 3,
          }}
        >
          <Text
            style={{
              fontFamily: 'Amiri_700Bold',
              fontSize: numSize,
              color: isPlaying ? p.primaryInk : p.ink,
              textAlign: 'center',
              includeFontPadding: false,
            }}
          >
            {arabicNumber}
          </Text>
        </View>
      </View>
    );
  };

  const renderVerse = (verse: QuranVerse) => {
    const isPlaying = playingAyahNum === verse.ayahNumber && playingSurahId === verse.surahId;
    const isMarked = isBookmarked(verse) ||
      (Number(screenParams?.startSurahId) === verse.surahId && Number(screenParams?.startAyah) === verse.ayahNumber);
    return (
      <React.Fragment key={`v-${verse.surahId}-${verse.ayahNumber}`}>
        <Text
          onPress={(event) => { event?.stopPropagation?.(); handleOpenAyahAction(verse); }}
          style={{
            fontFamily: 'Amiri_400Regular',
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
            : verse.text}
          {Platform.OS === 'ios' ? renderAyahMarker(verse.arabicNumber, isPlaying, verse) : null}
        </Text>
        {Platform.OS !== 'ios' ? (
          <>
            {' '}
            {renderAyahMarker(verse.arabicNumber, isPlaying, verse)}
            {' '}
          </>
        ) : null}
      </React.Fragment>
    );
  };

  const renderSurahNameFrame = (surahName: string, topOffset: number) => {
    const ornament = (mirrored: boolean) => (
      <View pointerEvents="none" style={{ position: 'absolute', [mirrored ? 'right' : 'left']: -1 }}>
        <Image
          source={require('../../assets/surah-frame-ornament.png')}
          resizeMode="stretch"
          style={{ width: 48, height: 59, tintColor: p.muted, transform: [{ scaleX: mirrored ? -1 : 1 }] }}
        />
      </View>
    );

    return (
      <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 9, marginTop: topOffset, marginBottom: 9, minHeight: 58, paddingHorizontal: 43, borderWidth: 1.5, borderColor: p.muted, backgroundColor: p.surface }}>
        {ornament(false)}
        <TextUI quran align="center" size={29} weight="bold" color={p.ink} numberOfLines={1} style={{ flex: 1, textAlign: 'center', lineHeight: 48 }}>سُورَةُ {surahName}</TextUI>
        {ornament(true)}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {isImmersive && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic('light');
            setIsImmersive(false);
          }}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 52 : 20,
            alignSelf: 'center',
            zIndex: 99,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(38, 30, 24, 0.94)',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: p.border,
            ...makeShadow('0 2px 10px rgba(0,0,0,0.1)', '#000', 0.1, 4)
          }}
        >
          <Feather name="minimize-2" size={13} color={p.primary} />
          <TextUI size={12} weight="bold" color={p.ink}>
            سورة {currentSurah.nameAr} • ص {toArabicNumber(activePage)}
          </TextUI>
          <TextUI size={10.5} color={p.muted}>
            (انقر للخروج)
          </TextUI>
        </TouchableOpacity>
      )}

      {!isImmersive && (
        <>
          <View style={{ paddingHorizontal: 4, paddingTop: Platform.OS === 'ios' ? 52 : (Platform.OS === 'web' ? 16 : 10), paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: p.surface, borderBottomWidth: 1, borderColor: p.border }}>
            <TouchableOpacity onPress={goBack} accessibilityRole="button" accessibilityLabel="رجوع" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="arrow-right" size={22} color={p.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextUI size={16} weight="bold" color={p.ink} numberOfLines={1}>{currentSurah.nameAr}</TextUI>
              <TextUI size={12.5} color={p.muted} numberOfLines={1}>
                {`صفحة ${toArabicNumber(activePage)} · الجزء ${toArabicNumber(pageItem.juzNumbers[0] || 1)}${readingMode === 'tafsir' ? ' · التفسير' : readingMode === 'surah' ? ' · عرض السورة' : ''}`}
              </TextUI>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isSearching ? 'إغلاق البحث' : 'بحث'}
              onPress={() => { triggerHaptic('light'); setIsSearching((v) => { if (v) setSearchWord(''); return !v; }); }}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name={isSearching ? 'x' : 'search'} size={20} color={isSearching ? p.primary : p.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={pageBookmarked ? 'إزالة علامة هذه الصفحة' : 'إضافة علامة'}
              onPress={bookmarkCurrentReading}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="bookmark" size={20} color={pageBookmarked ? p.accentInk : p.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isAudioPlaying ? 'إيقاف التلاوة' : 'تشغيل التلاوة'}
              onPress={toggleAudioPlayback}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              {isAudioLoading ? (
                <ActivityIndicator size="small" color={p.primary} />
              ) : (
                <Feather name={isAudioPlaying ? 'pause-circle' : 'play-circle'} size={22} color={p.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="إعدادات القراءة"
              onPress={() => { triggerHaptic('light'); setReadingMenuVisible(true); }}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="type" size={20} color={p.muted} />
            </TouchableOpacity>
          </View>

      {/* Sub-header Bar */}
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
              {AVAILABLE_TAFSIR_EDITIONS.find((e) => e.id === selectedTafsirId)?.name || 'التفسير الميسر'}
            </TextUI>
            <Feather name="chevron-down" size={12} color={p.primaryInk} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => openJump('page')}
              style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
            >
              <TextUI variant="captionBold" color={p.ink}>
                سورة {currentSurah.nameAr} • ص {toArabicNumber(activePage)}
              </TextUI>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 2 }}>
              <TouchableOpacity
                accessibilityLabel="الصفحة السابقة"
                onPress={() => movePage(-1)}
                disabled={activePage <= 1}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center', opacity: activePage <= 1 ? 0.35 : 1 }}
              >
                <Feather name="chevron-right" size={18} color={p.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="الصفحة التالية"
                onPress={() => movePage(1)}
                disabled={activePage >= QURAN_PAGE_INDEX.length}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center', opacity: activePage >= QURAN_PAGE_INDEX.length ? 0.35 : 1 }}
              >
                <Feather name="chevron-left" size={18} color={p.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: p.bgAlt, borderBottomWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => openJump('surah')} style={{ flex: 1.15, alignItems: 'center', paddingHorizontal: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <TextUI variant="bodyMedium" weight="bold" color={p.ink} numberOfLines={1}>سورة {currentSurah.nameAr}</TextUI>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openJump('page')} style={{ minWidth: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 6 }}>
              <TextUI variant="h4" color={p.ink}>{toArabicNumber(activePage)}</TextUI>
            </TouchableOpacity>
            {readingMode === 'page' ? <View style={{ flexDirection: 'row', gap: 2 }}>
              <TouchableOpacity accessibilityLabel="الصفحة السابقة" onPress={() => movePage(-1)} disabled={activePage <= 1} style={{ width: 30, height: 34, alignItems: 'center', justifyContent: 'center', opacity: activePage <= 1 ? 0.35 : 1 }}><Feather name="chevron-right" size={20} color={p.ink} /></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="الصفحة التالية" onPress={() => movePage(1)} disabled={activePage >= QURAN_PAGE_INDEX.length} style={{ width: 30, height: 34, alignItems: 'center', justifyContent: 'center', opacity: activePage >= QURAN_PAGE_INDEX.length ? 0.35 : 1 }}><Feather name="chevron-left" size={20} color={p.ink} /></TouchableOpacity>
            </View> : null}
            <TouchableOpacity onPress={() => openJump('juz')} style={{ flex: 1.05, alignItems: 'center', paddingHorizontal: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <TextUI variant="bodyMedium" weight="bold" color={p.ink}>الجزء {toArabicNumber(pageItem.juzNumbers[0] || 1)}</TextUI>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </>
      )}

      <JumpSheet jumpModalVisible={jumpModalVisible} setJumpModalVisible={setJumpModalVisible} setJumpType={setJumpType} setJumpValue={setJumpValue} jumpType={jumpType} jumpValue={jumpValue} executeJump={executeJump} setSelectedSurah={setSelectedSurah} goToPage={goToPage} setReadingMode={setReadingMode} />

      {/* In-Surah Search Bar */}
      {isSearching && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: p.surface, borderBottomWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={16} color={p.muted} />
            <TextInput
              placeholder={readingMode === 'page' ? 'ابحث عن كلمة أو رقم الآية في الصفحة...' : 'ابحث عن كلمة أو رقم الآية في السورة...'}
              placeholderTextColor={p.muted}
              value={searchWord}
              onChangeText={setSearchWord}
              style={{ flex: 1, color: p.ink, textAlign: 'right', fontSize: 13 }}
            />
            {searchWord ? (
              <TouchableOpacity onPress={() => setSearchWord('')}>
                <Feather name="x" size={16} color={p.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

        <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 3, paddingTop: isImmersive ? (Platform.OS === 'ios' ? 44 : 20) : 0, paddingBottom: (isAudioPlaying || isAudioLoading || playingAyahNum != null || readerControlsVisible || autoScroll) ? 180 : 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onTouchStart={handleReaderTouchStart}
        onTouchMove={handleReaderTouchMove}
        onTouchEnd={handleReaderTouchEnd}
        onTouchCancel={handleReaderTouchEnd}
        onStartShouldSetResponderCapture={(event) => event.target === event.currentTarget}
        onResponderRelease={() => {
          if (isImmersive) {
            setIsImmersive(false);
          } else {
            setReaderControlsVisible((visible) => !visible);
          }
        }}
        onScroll={(event) => {
          const offset = event.nativeEvent.contentOffset.y;
          scrollOffsetRef.current = offset;
          if (readingMode === 'page') {
            const pageAtOffset = [...renderedPages].reverse().find((page) => (pageOffsetsRef.current[page] ?? Number.POSITIVE_INFINITY) <= offset + 48);
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
        onLayout={(event) => { viewportHeightRef.current = event.nativeEvent.layout.height; maxScrollRef.current = Math.max(0, contentHeightRef.current - viewportHeightRef.current); }}
      >
        {/* Uthmani page text in natural line flow, matching a printed mushaf page. */}
        <View
          onStartShouldSetResponderCapture={(event) => event.target === event.currentTarget}
          onResponderRelease={() => setReaderControlsVisible((visible) => !visible)}
          style={{
            backgroundColor: p.surface,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minHeight: '100%',
            flexGrow: 1
          }}
        >
          {readingMode === 'page' ? renderedPages.map((pageNumber) => {
            const sections = getPageSections(pageNumber);
            return <View
              key={`mushaf-page-${pageNumber}`}
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
                    ) : sections.length > 1 ? <TextUI size={12} weight="bold" color={p.primary} style={{ textAlign: 'center', marginBottom: 6 }}>سورة {surah.nameAr}</TextUI> : null}
                    {section.startAyah === 1 && surah.id !== 9 && surah.id !== 1 ? <TextUI quran size={Math.round(quranFontSize * 0.85)} weight="bold" color={p.primaryInk} style={{ textAlign: 'center', marginBottom: 8 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</TextUI> : null}
                    <TextUI quran align="center" size={quranFontSize} color={p.ink} onPress={() => setReaderControlsVisible(true)} style={{ lineHeight: Math.round(quranFontSize * 2.1), textAlign: quranTextAlign }}>{sectionVerses.map(renderVerse)}</TextUI>
                  </View>
                );
              })}
              <View accessibilityLabel={`نهاية الصفحة ${toArabicNumber(pageNumber)}`} style={{ marginTop: 12, marginBottom: 7, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
                <TextUI quran size={24} color={p.muted} style={{ paddingHorizontal: 7 }}>❧</TextUI>
                <View style={{ minWidth: 78, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, borderWidth: 1, borderColor: p.border, borderRadius: 22, backgroundColor: p.bgAlt }}><TextUI quran size={22} weight="bold" color={p.ink}>{toArabicNumber(pageNumber)}</TextUI></View>
                <TextUI quran size={24} color={p.muted} style={{ paddingHorizontal: 7, transform: [{ scaleX: -1 }] }}>❧</TextUI>
                <View style={{ flex: 1, height: 1, backgroundColor: p.border }} />
              </View>
            </View>;
          }) : readingMode === 'tafsir' ? (
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
                          سورة {verseSurah.nameAr} • الآية {toArabicNumber(verse.ayahNumber)}
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
                            {isPlaying ? 'إيقاف' : 'استماع'}
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
                            مشاركة
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
                            {AVAILABLE_TAFSIR_EDITIONS.find((e) => e.id === selectedTafsirId)?.name || 'التفسير الميسر'}
                          </TextUI>
                        </View>

                        <TouchableOpacity
                          onPress={() => shareAyahTafsir(verse, tafsirContent)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <TextUI size={10.5} weight="bold" color={p.primary}>
                            مشاركة التفسير ↗
                          </TextUI>
                        </TouchableOpacity>
                      </View>

                      {isLoadingTafsir ? (
                        <View style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color={p.primary} />
                          <TextUI size={11} color={p.muted}>جارِ جلب التفسير المعتمد...</TextUI>
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
                            اضغط لتحميل التفسير ↻
                          </TextUI>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <TextUI quran align="center" size={quranFontSize} color={p.ink} onPress={() => setReaderControlsVisible(true)} style={{ lineHeight: Math.round(quranFontSize * 2.1), textAlign: quranTextAlign }}>{displayedVerses.map(renderVerse)}</TextUI>
          )}
        </View>

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
            <Feather name="arrow-right" size={16} color={p.ink} />
            <TextUI size={13} weight="bold" color={p.ink}>
              السورة السابقة
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
              السورة التالية
            </TextUI>
            <Feather name="arrow-left" size={16} color={p.onPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {(isAudioPlaying || isAudioLoading || playingAyahNum != null || readerControlsVisible || autoScroll) ? (
        <ReaderPlayer
          reciterName={currentReciterObj.nameAr}
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
          onStop={() => { stopAudio(); setReaderControlsVisible(false); }}
        />
      ) : null}

      <PlaybackSettingsSheet playbackSettingsVisible={playbackSettingsVisible} setPlaybackSettingsVisible={setPlaybackSettingsVisible} playbackSettings={playbackSettings} updatePlaybackSettings={updatePlaybackSettings} audioPlayerRef={audioPlayerRef} webAudioRef={webAudioRef} />

      {/* Ayah Action Sheet Modal */}
      <AyahActionSheet actionModalVisible={actionModalVisible} activeAyah={activeAyah} currentSurah={currentSurah} setActionModalVisible={setActionModalVisible} openAyahTafsir={openAyahTafsir} playAyahAudio={playAyahAudio} currentReciterObj={currentReciterObj} setReciterModalVisible={setReciterModalVisible} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} handleShareAyah={handleShareAyah} setAyahNoteText={setAyahNoteText} ayahNotes={ayahNotes} ayahNoteKey={ayahNoteKey} setAyahNoteModalVisible={setAyahNoteModalVisible} />

      <AyahTafsirSheet tafsirModalVisible={tafsirModalVisible} setTafsirModalVisible={setTafsirModalVisible} activeAyah={activeAyah} currentSurah={currentSurah} activePage={activePage} handleChangeTafsirFontSize={handleChangeTafsirFontSize} renderAyahMarker={renderAyahMarker} playingAyahNum={playingAyahNum} playingSurahId={playingSurahId} stopAudio={stopAudio} playAyahAudio={playAyahAudio} toggleBookmark={toggleBookmark} isBookmarked={isBookmarked} handleShareAyah={handleShareAyah} setAyahNoteText={setAyahNoteText} ayahNotes={ayahNotes} ayahNoteKey={ayahNoteKey} setAyahNoteModalVisible={setAyahNoteModalVisible} setActionModalVisible={setActionModalVisible} tafsirEditions={tafsirEditions} selectedTafsirId={selectedTafsirId} handleSelectTafsir={handleSelectTafsir} tafsirLoading={tafsirLoading} tafsirError={tafsirError} loadAyahTafsir={loadAyahTafsir} activeTafsirText={activeTafsirText} tafsirFontSize={tafsirFontSize} handleNavigateAyahTafsir={handleNavigateAyahTafsir} parsedSurah={parsedSurah} />

      <AyahNoteSheet ayahNoteModalVisible={ayahNoteModalVisible} setAyahNoteModalVisible={setAyahNoteModalVisible} activeAyah={activeAyah} ayahNoteText={ayahNoteText} setAyahNoteText={setAyahNoteText} saveAyahNote={saveAyahNote} />

      {/* Reading settings menu (header "Tt" button) */}
      <ReadingMenuSheet readingMenuVisible={readingMenuVisible} setReadingMenuVisible={setReadingMenuVisible} readingMode={readingMode} setModeModalVisible={setModeModalVisible} setFontSizeModalVisible={setFontSizeModalVisible} currentReciterObj={currentReciterObj} setReciterModalVisible={setReciterModalVisible} setIsImmersive={setIsImmersive} autoScroll={autoScroll} setAutoScroll={setAutoScroll} />

      {/* Reciter Selection Modal */}
      <ReciterSheet reciterModalVisible={reciterModalVisible} setReciterModalVisible={setReciterModalVisible} stopAudio={stopAudio} setSelectedReciter={setSelectedReciter} selectedReciter={selectedReciter} />

      {/* 1. Mode Switcher Sheet */}
      <ReadingModeSheet modeModalVisible={modeModalVisible} setModeModalVisible={setModeModalVisible} setReadingMode={setReadingMode} readingMode={readingMode} />

      {/* 2. Font Size Adjustment Modal */}
      <FontSizeSheet fontSizeModalVisible={fontSizeModalVisible} setFontSizeModalVisible={setFontSizeModalVisible} tafsirFontSize={tafsirFontSize} tafsirCardBgColor={tafsirCardBgColor} tafsirBorderColor={tafsirBorderColor} handleChangeTafsirFontSize={handleChangeTafsirFontSize} />

      {/* 3. Tafsir Edition Picker Sheet */}
      <TafsirPickerSheet tafsirPickerVisible={tafsirPickerVisible} setTafsirPickerVisible={setTafsirPickerVisible} selectedTafsirId={selectedTafsirId} setSelectedTafsirId={setSelectedTafsirId} />
    </View>
  );
};
