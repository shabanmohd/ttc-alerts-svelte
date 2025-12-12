import { register, init, getLocaleFromNavigator, locale, _ } from 'svelte-i18n';
import { derived, get } from 'svelte/store';

// Re-export core svelte-i18n exports for convenient imports
export { _, locale, locales, isLoading } from 'svelte-i18n';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français'
};

// Register translations from the new translations folder
register('en', () => import('./translations/en.json'));
register('fr', () => import('./translations/fr.json'));

/**
 * Initialize i18n with saved or browser preference
 */
export function initI18n() {
  // Check localStorage for saved language
  const saved = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('ttc-language') 
    : null;

  init({
    fallbackLocale: 'en',
    initialLocale: saved || getLocaleFromNavigator() || 'en',
  });
}

/**
 * Set the current language and persist to localStorage
 */
export function setLanguage(lang: SupportedLanguage) {
  locale.set(lang);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ttc-language', lang);
  }
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  const current = get(locale);
  if (current && SUPPORTED_LANGUAGES.includes(current as SupportedLanguage)) {
    return current as SupportedLanguage;
  }
  return 'en';
}

/**
 * Derived store for the current language
 */
export const currentLanguage = derived(locale, ($locale) => {
  if ($locale && SUPPORTED_LANGUAGES.includes($locale as SupportedLanguage)) {
    return $locale as SupportedLanguage;
  }
  return 'en';
});

/**
 * Check if a translation key exists
 * Useful for development to catch missing translations
 */
export function hasTranslation(key: string): boolean {
  const translator = get(_);
  const translated = translator(key);
  // If the key is returned as-is, translation is missing
  return translated !== key;
}

/**
 * Development helper: Log missing translations
 * Only logs in development mode
 */
export function checkMissingTranslations(keys: string[]): string[] {
  if (import.meta.env.PROD) return [];
  
  const missing: string[] = [];
  for (const key of keys) {
    if (!hasTranslation(key)) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.warn('[i18n] Missing translations:', missing);
  }
  
  return missing;
}
