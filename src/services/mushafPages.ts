import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { Directory, File, Paths } from 'expo-file-system';

// Madinah mushaf page layout (King Fahd Complex QCF glyph fonts, as published by quran.com).
// Each page has its own font whose glyphs are whole words; quran.com's API gives every word's
// glyph code (code_v2) and its line (1-15) on the printed page. The v4 "colrv1" fonts carry the
// tajweed colours inside the glyphs, and the plain parts take the text colour.

export type MushafWord = { code: string; verseKey: string; isEnd: boolean };
export type MushafLine = { line: number; words: MushafWord[] };
export type MushafPageLayout = { page: number; lines: MushafLine[] };

const API = 'https://api.quran.com/api/v4/verses/by_page';
const FONT_BASE = 'https://quran.com/fonts/quran/hafs/v4/colrv1/ttf';
const LAYOUT_KEY = (page: number) => `quran.qcf4.layout.${page}`;
const FONT_DIR = 'qcf4-colrv1';

export const mushafFontFamily = (page: number) => `QCF4_P${page}`;

// COLRv1 colour fonts render on iOS 17+, Android 13+ (API 33) and current browsers.
export function supportsMushafPages(): boolean {
  if (Platform.OS === 'android') return Number(Platform.Version) >= 33;
  if (Platform.OS === 'ios') return parseInt(String(Platform.Version), 10) >= 17;
  return true;
}

const parseLayout = (page: number, verses: any[]): MushafPageLayout => {
  const byLine = new Map<number, MushafWord[]>();
  for (const verse of verses) {
    for (const word of verse?.words || []) {
      if (!word?.code_v2 || !word?.line_number) continue;
      const list = byLine.get(word.line_number) || [];
      list.push({ code: word.code_v2, verseKey: verse.verse_key, isEnd: word.char_type_name === 'end' });
      byLine.set(word.line_number, list);
    }
  }
  const lines = [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([line, words]) => ({ line, words }));
  return { page, lines };
};

export async function getMushafPageLayout(page: number): Promise<MushafPageLayout> {
  const cached = await AsyncStorage.getItem(LAYOUT_KEY(page));
  if (cached) return JSON.parse(cached);
  const verses: any[] = [];
  let next: number | null = 1;
  while (next) {
    const url: string = `${API}/${page}?words=true&word_fields=code_v2,line_number&per_page=50&page=${next}`;
    const response: Response = await fetch(url);
    if (!response.ok) throw new Error(`mushaf layout ${page}: ${response.status}`);
    const payload: any = await response.json();
    verses.push(...(payload?.verses || []));
    next = payload?.pagination?.next_page || null;
  }
  const layout = parseLayout(page, verses);
  if (!layout.lines.length) throw new Error(`mushaf layout ${page}: empty`);
  AsyncStorage.setItem(LAYOUT_KEY(page), JSON.stringify(layout)).catch(() => {});
  return layout;
}

// Loads the page font, downloading it once into the app's documents on iOS/Android.
export async function loadMushafPageFont(page: number): Promise<string> {
  const family = mushafFontFamily(page);
  if (Font.isLoaded(family)) return family;
  const url = `${FONT_BASE}/p${page}.ttf`;
  if (Platform.OS === 'web') {
    await Font.loadAsync({ [family]: url });
    return family;
  }
  const dir = new Directory(Paths.document, FONT_DIR);
  dir.create({ idempotent: true, intermediates: true });
  let file = new File(dir, `p${page}.ttf`);
  if (!file.exists || !file.size) {
    if (file.exists) file.delete();
    file = await File.downloadFileAsync(url, dir);
  }
  await Font.loadAsync({ [family]: file.uri });
  return family;
}

// Layout and font for one page; both are cached after the first successful load.
export async function prepareMushafPage(page: number): Promise<{ layout: MushafPageLayout; family: string }> {
  const [layout, family] = await Promise.all([getMushafPageLayout(page), loadMushafPageFont(page)]);
  return { layout, family };
}
