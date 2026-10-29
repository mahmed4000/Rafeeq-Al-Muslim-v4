// The interface language, readable outside React (number and date formatting, notification text).
// AppContext keeps it in sync with the user's choice.

export type UiLanguage = 'ar' | 'en';

let current: UiLanguage = 'ar';

export function getUiLanguage(): UiLanguage {
  return current;
}

export function setUiLanguage(lang: UiLanguage): void {
  current = lang;
}

/** Pick the string for the current language (for code outside components). */
export function tr(ar: string, en: string): string {
  return current === 'en' ? en : ar;
}
