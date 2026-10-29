// Data and types shared by the Quran reader screen and its dialogs.

export const QURAN_DATA: any[] = require('../../../../assets/quran_complete_114.json');

export type ReadingMode = 'page' | 'surah' | 'tafsir';
export type JumpType = 'page' | 'surah' | 'juz';
export type PlaybackRange = 'page' | 'surah' | 'juz' | 'quran';

export interface PlaybackSettings {
  range: PlaybackRange;
  rangeRepeats: number;
  ayahRepeats: number;
  pauseSeconds: number;
  speed: number;
  stopAtRangeEnd: boolean;
}
