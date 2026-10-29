import { StorageService } from './storage';
import { tr } from '../i18n/language';

export const MUSHAF_PAGES = 604;
const KHATMA_KEY = 'rafeeq_khatma_v1';

export interface Khatma {
  id: string;
  name: string;
  startPage: number;
  totalDays: number;
  startDate: string; // YYYY-MM-DD (local)
  lastPage: number; // furthest page read in order; startPage - 1 before reading
  todayDate: string; // day the "today" snapshot below belongs to
  todayStartPage: number; // lastPage at the start of that day
  completedAt?: string;
}

export interface KhatmaProgress {
  pagesDone: number;
  totalPages: number;
  percent: number;
  dayNumber: number; // 1-based day of the plan
  remainingDays: number;
  todayTarget: number; // pages to read today (spread evenly over the days left)
  readToday: number;
  nextPage: number;
  isComplete: boolean;
}

const localDate = (d = new Date()) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const daysBetween = (fromIso: string, toIso: string) => {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

/** Roll the "today" snapshot forward when the date changed. */
function withToday(k: Khatma): Khatma {
  const today = localDate();
  if (k.todayDate === today) return k;
  return { ...k, todayDate: today, todayStartPage: k.lastPage };
}

export function getKhatmaProgress(k: Khatma): KhatmaProgress {
  const current = withToday(k);
  const totalPages = MUSHAF_PAGES - current.startPage + 1;
  const pagesDone = Math.max(0, Math.min(totalPages, current.lastPage - current.startPage + 1));
  const elapsed = Math.max(0, daysBetween(current.startDate, current.todayDate));
  const remainingDays = Math.max(1, current.totalDays - elapsed);
  const pagesLeftAtDayStart = Math.max(0, totalPages - Math.max(0, current.todayStartPage - current.startPage + 1));
  return {
    pagesDone,
    totalPages,
    percent: Math.round((pagesDone / totalPages) * 100),
    dayNumber: Math.min(current.totalDays, elapsed + 1),
    remainingDays,
    // Missed days are spread over the remaining ones instead of piling up.
    todayTarget: Math.ceil(pagesLeftAtDayStart / remainingDays),
    readToday: Math.max(0, current.lastPage - current.todayStartPage),
    nextPage: Math.min(MUSHAF_PAGES, current.lastPage + 1),
    isComplete: pagesDone >= totalPages
  };
}

export const KhatmaService = {
  async getActive(): Promise<Khatma | null> {
    const saved = await StorageService.getObject<Khatma | null>(KHATMA_KEY, null);
    return saved ? withToday(saved) : null;
  },

  async create(name: string, startPage: number, totalDays: number): Promise<Khatma> {
    const today = localDate();
    const page = Math.max(1, Math.min(MUSHAF_PAGES, Math.round(startPage)));
    const khatma: Khatma = {
      id: `k-${Date.now()}`,
      name: name.trim() || tr('ختمتي', 'My Khatma'),
      startPage: page,
      totalDays: Math.max(1, Math.round(totalDays)),
      startDate: today,
      lastPage: page - 1,
      todayDate: today,
      todayStartPage: page - 1
    };
    await StorageService.setObject(KHATMA_KEY, khatma);
    return khatma;
  },

  async remove(): Promise<void> {
    await StorageService.removeItem(KHATMA_KEY);
  },

  /**
   * Called by the reader when a mushaf page is shown. Only counts reading in
   * order (the next page or two), so jumping to look something up elsewhere
   * does not mark pages as read.
   */
  async recordPage(page: number): Promise<Khatma | null> {
    const saved = await this.getActive();
    if (!saved || saved.completedAt) return saved;
    if (page <= saved.lastPage || page - saved.lastPage > 2) return saved;
    const updated: Khatma = { ...saved, lastPage: page };
    if (page >= MUSHAF_PAGES) updated.completedAt = new Date().toISOString();
    await StorageService.setObject(KHATMA_KEY, updated);
    return updated;
  }
};
