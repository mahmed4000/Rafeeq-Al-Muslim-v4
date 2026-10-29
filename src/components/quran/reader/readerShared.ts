// Data and types shared by the Quran reader screen and its dialogs.

export const QURAN_DATA: any[] = require('../../../../assets/quran_complete_114.json');

export type ReadingMode = 'page' | 'surah' | 'tafsir';
export type JumpType = 'page' | 'surah' | 'juz';
export type PlaybackRange = 'page' | 'surah' | 'juz' | 'quran';

export const SCROLL_SPEED_OPTIONS = [
  { label: 'بطيء ١×', speed: 12 },
  { label: 'متزن ٢×', speed: 22 },
  { label: 'متوسط ٣×', speed: 36 },
  { label: 'سريع ٤×', speed: 55 },
  { label: 'فائق ٥×', speed: 80 }
];

export interface PlaybackSettings {
  range: PlaybackRange;
  rangeRepeats: number;
  ayahRepeats: number;
  pauseSeconds: number;
  speed: number;
  stopAtRangeEnd: boolean;
}
