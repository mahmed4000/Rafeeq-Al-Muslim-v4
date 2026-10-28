const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');

/** The surah that a mushaf page belongs to (first match when a page starts several). */
export const surahForPage = (page: number): any =>
  QURAN_DATA.find((item) => item.pageMetadata?.some((meta: any) => Number(meta.pageNum) === page)) || QURAN_DATA[0];

export const surahById = (id: number): any => QURAN_DATA.find((item) => item.id === id) || QURAN_DATA[0];
