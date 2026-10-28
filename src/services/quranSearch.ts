import { QURAN_PAGE_INDEX, QURAN_JUZ_INDEX, QURAN_HIZB_INDEX, QuranHizbIndexItem, QuranJuzIndexItem } from '../data/quranIndex';
import { parseSurahVerses } from './quranParser';
import { toArabicNumber, toStandardNumber } from './prayerCalculation';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');

export interface VerseSearchResult {
  surahId: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNum: number;
  text: string;
  matchedWord: string;
}

export interface QuranUnifiedSearch {
  isPageMatch: boolean;
  pageNumber?: number;
  matchedSurahs: any[];
  matchedJuz: QuranJuzIndexItem[];
  matchedHizb: QuranHizbIndexItem[];
  matchedVerses: VerseSearchResult[];
}

/**
 * Remove tashkeel / harakat, unify hamzas, taa marbuta, and alif maqsura
 */
export const normalizeArabic = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Harakat & Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .trim();
};

interface IndexedVerse {
  surahId: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNum: number;
  text: string;
  normalized: string;
}

let indexedVersesCache: IndexedVerse[] | null = null;

const getIndexedVerses = (): IndexedVerse[] => {
  if (indexedVersesCache) return indexedVersesCache;

  const verses: IndexedVerse[] = [];
  QURAN_DATA.forEach((surah) => {
    const parsed = parseSurahVerses(surah);
    parsed.verses.forEach((v) => {
      verses.push({
        surahId: surah.id,
        surahNameAr: surah.nameAr,
        ayahNumber: v.ayahNumber,
        pageNum: v.pageNum || surah.mushafPageStart || 1,
        text: v.text,
        normalized: normalizeArabic(v.text)
      });
    });
  });

  indexedVersesCache = verses;
  return verses;
};

/**
 * Universal smart search across pages, surahs, juzs, hizbs, and verse texts
 */
export function searchQuranUniversal(rawQuery: string): QuranUnifiedSearch {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return {
      isPageMatch: false,
      matchedSurahs: [],
      matchedJuz: [],
      matchedHizb: [],
      matchedVerses: []
    };
  }

  const normalized = normalizeArabic(trimmed);
  const stdNumber = toStandardNumber(trimmed).replace(/[^0-9]/g, '');
  const numValue = stdNumber ? parseInt(stdNumber, 10) : NaN;

  // 1. Check Page direct match (1 to 604)
  const isPageMatch = !isNaN(numValue) && numValue >= 1 && numValue <= 604;
  const pageNumber = isPageMatch ? numValue : undefined;

  // 2. Filter Surahs
  const matchedSurahs = QURAN_DATA.filter((s) => {
    if (s.id.toString() === stdNumber) return true;
    const normName = normalizeArabic(`${s.nameAr} ${s.nameEn}`);
    return normName.includes(normalized);
  });

  // 3. Filter Juz
  const matchedJuz = QURAN_JUZ_INDEX.filter((j) => {
    if (j.juz === numValue) return true;
    const nameMatch = normalized.includes('جزء') && normalized.includes(toArabicNumber(j.juz));
    const surahMatch = normalizeArabic(j.startSurahNameAr).includes(normalized);
    return nameMatch || surahMatch;
  });

  // 4. Filter Hizb
  const matchedHizb = QURAN_HIZB_INDEX.filter((h) => {
    if (h.hizb === numValue) return true;
    const nameMatch = normalized.includes('حزب') && normalized.includes(toArabicNumber(h.hizb));
    const snippetMatch = normalizeArabic(h.beginningSnippet).includes(normalized);
    const surahMatch = normalizeArabic(h.startSurahNameAr).includes(normalized);
    return nameMatch || snippetMatch || surahMatch;
  });

  // 5. Search in Verses Text (if query has at least 2 Arabic letters)
  let matchedVerses: VerseSearchResult[] = [];
  if (normalized.length >= 2 && isNaN(numValue)) {
    const allVerses = getIndexedVerses();
    const queryParts = normalized.split(/\s+/).filter(Boolean);

    const results: VerseSearchResult[] = [];
    for (const v of allVerses) {
      const allMatch = queryParts.every((part) => v.normalized.includes(part));
      if (allMatch) {
        results.push({
          surahId: v.surahId,
          surahNameAr: v.surahNameAr,
          ayahNumber: v.ayahNumber,
          pageNum: v.pageNum,
          text: v.text,
          matchedWord: trimmed
        });
        if (results.length >= 35) break; // Limit for instant UI responsiveness
      }
    }
    matchedVerses = results;
  }

  return {
    isPageMatch,
    pageNumber,
    matchedSurahs,
    matchedJuz,
    matchedHizb,
    matchedVerses
  };
}

/**
 * Splits text into words with match indicators for highlighting without altering tashkeel
 */
export function splitTextForHighlight(fullText: string, searchWord: string): { text: string; isMatch: boolean }[] {
  if (!searchWord || !fullText) return [{ text: fullText, isMatch: false }];
  const normSearch = normalizeArabic(searchWord);
  if (!normSearch) return [{ text: fullText, isMatch: false }];

  const words = fullText.split(' ');
  return words.map((w, idx) => {
    const normW = normalizeArabic(w);
    const isMatch = normW.includes(normSearch);
    return {
      text: idx === 0 ? w : ` ${w}`,
      isMatch
    };
  });
}

