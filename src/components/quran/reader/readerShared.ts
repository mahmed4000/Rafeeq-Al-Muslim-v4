// Data and types shared by the Quran reader screen and its dialogs.

export const QURAN_DATA: any[] = require('../../../../assets/quran_complete_114.json');

export type ReadingMode = 'page' | 'surah' | 'tafsir';
export type JumpType = 'page' | 'surah' | 'juz';
export type PlaybackRange = 'page' | 'surah' | 'juz' | 'quran';

// `label` is Arabic, `labelEn` English; pick one at render time with t(label, labelEn).
export const SCROLL_SPEED_OPTIONS = [
  { label: 'بطيء ١×', labelEn: 'Slow 1×', speed: 12 },
  { label: 'متزن ٢×', labelEn: 'Steady 2×', speed: 22 },
  { label: 'متوسط ٣×', labelEn: 'Medium 3×', speed: 36 },
  { label: 'سريع ٤×', labelEn: 'Fast 4×', speed: 55 },
  { label: 'فائق ٥×', labelEn: 'Very fast 5×', speed: 80 }
];

export interface PlaybackSettings {
  range: PlaybackRange;
  rangeRepeats: number;
  ayahRepeats: number;
  pauseSeconds: number;
  speed: number;
  stopAtRangeEnd: boolean;
}
