import { StorageService } from './storage';

// The user's own daily checklist on Home. Built-in items can tick themselves from
// the app's records (adhkar sessions, khatma, prayer log); the user can also tick
// any item by hand, remove items, or add their own. Stays on the device.
const WIRD_KEY = 'rafeeq_daily_wird_v1';

export type WirdAuto = 'morning' | 'evening' | 'quran' | 'prayers';

export interface WirdItem {
  id: string;
  /** Built-in items have a kind and take their label from it; custom items have a label. */
  auto?: WirdAuto;
  label?: string;
}

interface WirdState {
  items: WirdItem[];
  /** Items ticked by hand, for one day only. */
  marked: { day: string; ids: string[] };
}

export const WIRD_DEFAULTS: WirdItem[] = [
  { id: 'morning', auto: 'morning' },
  { id: 'evening', auto: 'evening' },
  { id: 'quran', auto: 'quran' },
  { id: 'prayers', auto: 'prayers' }
];

export const MAX_WIRD_ITEMS = 12;
export const MAX_WIRD_LABEL = 40;

const fresh = (): WirdState => ({ items: WIRD_DEFAULTS, marked: { day: '', ids: [] } });

async function load(): Promise<WirdState> {
  const s = await StorageService.getObject<WirdState | null>(WIRD_KEY, null);
  if (!s || !Array.isArray(s.items)) return fresh();
  return { items: s.items, marked: s.marked && Array.isArray(s.marked.ids) ? s.marked : { day: '', ids: [] } };
}

export const DailyWirdService = {
  /** Items plus the ids ticked by hand on `day` (older days' ticks are dropped). */
  async get(day: string): Promise<{ items: WirdItem[]; marked: string[] }> {
    const s = await load();
    return { items: s.items, marked: s.marked.day === day ? s.marked.ids : [] };
  },

  async toggleMark(id: string, day: string): Promise<string[]> {
    const s = await load();
    const ids = s.marked.day === day ? s.marked.ids : [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    await StorageService.setObject(WIRD_KEY, { ...s, marked: { day, ids: next } });
    return next;
  },

  async add(item: WirdItem): Promise<WirdItem[]> {
    const s = await load();
    if (s.items.length >= MAX_WIRD_ITEMS || s.items.some((i) => i.id === item.id)) return s.items;
    const items = [...s.items, item];
    await StorageService.setObject(WIRD_KEY, { ...s, items });
    return items;
  },

  async remove(id: string): Promise<WirdItem[]> {
    const s = await load();
    const items = s.items.filter((i) => i.id !== id);
    await StorageService.setObject(WIRD_KEY, { ...s, items, marked: { ...s.marked, ids: s.marked.ids.filter((x) => x !== id) } });
    return items;
  }
};
