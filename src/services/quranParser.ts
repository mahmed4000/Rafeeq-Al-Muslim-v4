import { toArabicNumber, toStandardNumber } from './prayerCalculation';

export interface QuranVerse {
  surahId: number;
  ayahNumber: number;
  arabicNumber: string;
  text: string;
  badge: string;
  pageNum: number;
  juzNum: number;
}

export interface ParsedSurah {
  id: number;
  nameAr: string;
  nameEn: string;
  versesCount: number;
  type: string;
  juz: number;
  mushafPageStart: number;
  verses: QuranVerse[];
  tafsirSummary: string;
}

export const QURAN_RECITERS = [
  { id: 'Alafasy_128kbps', nameAr: 'مشاري بن راشد العفاسي', nameEn: 'Mishary Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', nameAr: 'عبد الباسط عبد الصمد (مرتل)', nameEn: 'Abdul Basit (Murattal)' },
  { id: 'Abdul_Basit_Mujawwad_128kbps', nameAr: 'عبد الباسط عبد الصمد (مجود)', nameEn: 'Abdul Basit (Mujawwad)' },
  { id: 'Minshawy_Murattal_128kbps', nameAr: 'محمد صديق المنشاوي (مرتل)', nameEn: 'Al-Minshawi (Murattal)' },
  { id: 'Minshawy_Mujawwad_192kbps', nameAr: 'محمد صديق المنشاوي (مجود)', nameEn: 'Al-Minshawi (Mujawwad)' },
  { id: 'Husary_128kbps', nameAr: 'محمود خليل الحصري', nameEn: 'Mahmoud Khalil Al-Husary' },
  { id: 'Husary_128kbps_Mujawwad', nameAr: 'محمود خليل الحصري (مجود)', nameEn: 'Mahmoud Al-Husary (Mujawwad)' },
  { id: 'Saood_ash-Shuraym_128kbps', nameAr: 'سعود الشريم', nameEn: 'Saud Al-Shuraim' },
  { id: 'Maher_AlMuaiqly_64kbps', nameAr: 'ماهر المعيقلي', nameEn: 'Maher Al-Muaiqly' }
];

const PARSED_CACHE = new Map<number, ParsedSurah>();

export function getAyahAudioUrl(surahId: number, ayahNumber: number, reciterId = 'Alafasy_128kbps'): string {
  const sPad = surahId.toString().padStart(3, '0');
  const aPad = ayahNumber.toString().padStart(3, '0');
  return `https://everyayah.com/data/${reciterId}/${sPad}${aPad}.mp3`;
}

export function parseSurahVerses(surahData: any): ParsedSurah {
  if (!surahData) {
    return {
      id: 1,
      nameAr: 'الفاتحة',
      nameEn: 'Al-Fatihah',
      versesCount: 7,
      type: 'مكية',
      juz: 1,
      mushafPageStart: 1,
      verses: [],
      tafsirSummary: ''
    };
  }

  if (PARSED_CACHE.has(surahData.id)) {
    return PARSED_CACHE.get(surahData.id)!;
  }

  const rawPages: string[] = surahData.pages || [surahData.text || ''];
  const allVerses: QuranVerse[] = [];

  let currentAyahCounter = 1;

  rawPages.forEach((pageText, pIdx) => {
    const pageMeta = surahData.pageMetadata && surahData.pageMetadata[pIdx];
    const pageNum = pageMeta?.pageNum || ((surahData.mushafPageStart || 1) + pIdx);
    const juzNum = pageMeta?.juz || surahData.juz || 1;

    // Split page by ayah badge tokens like ﴿١﴾, ﴿٢﴾
    const tokens = pageText.split(/(﴿[٠-٩0-9]+﴾)/g);

    for (let i = 0; i < tokens.length; i += 2) {
      const vText = (tokens[i] || '').trim();
      const vBadge = (tokens[i + 1] || '').trim();

      if (vText || vBadge) {
        const numMatch = vBadge.match(/[٠-٩0-9]+/);
        const rawNum = numMatch ? numMatch[0] : '';
        const stdNum = parseInt(toStandardNumber(rawNum), 10) || currentAyahCounter;

        allVerses.push({
          surahId: surahData.id,
          ayahNumber: stdNum,
          arabicNumber: rawNum || toArabicNumber(stdNum),
          text: vText,
          badge: vBadge || `﴿${toArabicNumber(stdNum)}﴾`,
          pageNum,
          juzNum
        });

        currentAyahCounter = stdNum + 1;
      }
    }
  });

  const result: ParsedSurah = {
    id: surahData.id,
    nameAr: surahData.nameAr,
    nameEn: surahData.nameEn,
    versesCount: surahData.verses,
    type: surahData.type,
    juz: surahData.juz || 1,
    mushafPageStart: surahData.mushafPageStart || 1,
    verses: allVerses,
    tafsirSummary: surahData.tafsir || ''
  };

  PARSED_CACHE.set(surahData.id, result);
  return result;
}
