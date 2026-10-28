import { StorageService } from './storage';

export interface TafsirEdition {
  id: number;
  key: string;
  name: string;
  author: string;
  badge: string;
  description: string;
}

export const AVAILABLE_TAFSIR_EDITIONS: TafsirEdition[] = [
  {
    id: 16,
    key: 'muyassar',
    name: 'التفسير الميسر',
    author: 'مجمع الملك فهد لطباعة المصحف الشريف',
    badge: 'موجز ومعتمد',
    description: 'تفسير واضح وموجز أعدته نخبة من كبار العلماء بإشراف مجمع الملك فهد.'
  },
  {
    id: 91,
    key: 'saadi',
    name: 'تفسير السعدي',
    author: 'الشيخ عبد الرحمن بن ناصر السعدي',
    badge: 'سهل وتدبري',
    description: 'تيسير الكريم الرحمن في تفسير كلام المنان، ميسر وسلس يركز على مقاصد الآيات.'
  },
  {
    id: 14,
    key: 'ibn_kathir',
    name: 'تفسير ابن كثير',
    author: 'الحافظ عماد الدين ابن كثير',
    badge: 'التفسير بالمأثور',
    description: 'تفسير القرآن العظيم، عمدة التفاسير المأثورة عن السلف مع إيراد الأحاديث والآثار.'
  },
  {
    id: 94,
    key: 'baghawi',
    name: 'تفسير البغوي',
    author: 'الإمام الحسين بن مسعود البغوي',
    badge: 'معالم التنزيل',
    description: 'كتاب جليل يجمع بين الرواية والدراية، متوسط الحجم وسهل العبارة.'
  },
  {
    id: 90,
    key: 'qurtubi',
    name: 'تفسير القرطبي',
    author: 'الإمام أبو عبد الله القرطبي',
    badge: 'أحكام القرآن',
    description: 'الجامع لأحكام القرآن، موسوعة في استنباط الأحكام الشرعية والفقهية من الآيات.'
  },
  {
    id: 15,
    key: 'tabari',
    name: 'تفسير الطبري',
    author: 'الإمام محمد بن جرير الطبري',
    badge: 'إمام المفسرين',
    description: 'جامع البيان عن تأويل آي القرآن، أعظم التفاسير المسندة وأصل علم التفسير.'
  },
  {
    id: 93,
    key: 'wasit',
    name: 'التفسير الوسيط',
    author: 'د. محمد سيد طنطاوي',
    badge: 'معاصر وشامل',
    description: 'تفسير معاصر يجمع بين الدقة اللغوية والبيان العقدي والتربوي بأسلوب رصين.'
  }
];

export const DEFAULT_TAFSIR_ID = 16;
const SELECTED_TAFSIR_KEY = 'quran.selected-tafsir-id.v2';

// In-memory memory cache
const memoryTafsirCache = new Map<string, string>();

/**
 * Clean and normalize HTML text from Tafsir APIs
 */
export function cleanTafsirHtml(raw: string): string {
  if (!raw) return '';
  let text = raw
    // Convert paragraph, break and header tags to newlines
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return '';
      }
    });

  // Clean lines and duplicate spaces
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line, idx, arr) => {
      // Remove excessive empty lines
      if (!line && arr[idx - 1] === '') return false;
      return true;
    })
    .map((line) => (line && !line.startsWith('\u200F') ? `\u200F${line}` : line));

  return lines.join('\n').trim();
}

/**
 * Fetch tafsir text for a specific ayah and edition
 */
export async function fetchAyahTafsir(
  editionId: number,
  surahId: number,
  ayahNumber: number
): Promise<string> {
  const cacheKey = `tafsir_${editionId}_${surahId}_${ayahNumber}`;

  // 1. Check in-memory cache
  if (memoryTafsirCache.has(cacheKey)) {
    const cached = memoryTafsirCache.get(cacheKey);
    if (cached) return cached;
  }

  // 2. Check persistent storage cache
  try {
    const stored = await StorageService.getItem(cacheKey);
    if (stored) {
      memoryTafsirCache.set(cacheKey, stored);
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  // 3. Primary fetch from Quran.com API v4
  let fetchedText = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const url = `https://api.quran.com/api/v4/tafsirs/${editionId}/by_ayah/${surahId}:${ayahNumber}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AlMosala-App/2.0'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.tafsir?.text;
      if (rawText && typeof rawText === 'string') {
        fetchedText = cleanTafsirHtml(rawText);
      }
    }
  } catch (err) {
    // Fallback if primary fails
  }

  // 4. Secondary fallback: AlQuran Cloud (for Muyassar)
  if (!fetchedText && editionId === 16) {
    try {
      const fbRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surahId}:${ayahNumber}/ar.muyassar`);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const rawText = fbData?.data?.text;
        if (rawText) {
          fetchedText = cleanTafsirHtml(rawText);
        }
      }
    } catch {
      // Ignore
    }
  }

  // 5. Tertiary fallback: QuranEnc (for Saadi)
  if (!fetchedText && editionId === 91) {
    try {
      const fbRes = await fetch(`https://quranenc.com/api/v1/tafsir/aya/arabic_saadi/${surahId}/${ayahNumber}`);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const results = fbData?.result;
        if (Array.isArray(results)) {
          // Look for type 'تفسير آية' or last item
          const tafsirItem = results.find((item: any) => item.type === 'تفسير آية') || results[results.length - 1];
          if (tafsirItem?.text) {
            fetchedText = cleanTafsirHtml(tafsirItem.text);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!fetchedText) {
    throw new Error('تعذر تحميل نص التفسير حالياً، يرجى التحقق من اتصال الإنترنت أو اختيار تفسير آخر.');
  }

  // Save in caches
  memoryTafsirCache.set(cacheKey, fetchedText);
  StorageService.setItem(cacheKey, fetchedText).catch(() => {});

  return fetchedText;
}

/**
 * Get preferred tafsir ID
 */
export async function getSavedTafsirId(): Promise<number> {
  try {
    const saved = await StorageService.getItem(SELECTED_TAFSIR_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (AVAILABLE_TAFSIR_EDITIONS.some((item) => item.id === parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_TAFSIR_ID;
}

/**
 * Save preferred tafsir ID
 */
export async function saveSelectedTafsirId(id: number): Promise<void> {
  try {
    await StorageService.setItem(SELECTED_TAFSIR_KEY, String(id));
  } catch {
    // Ignore
  }
}
