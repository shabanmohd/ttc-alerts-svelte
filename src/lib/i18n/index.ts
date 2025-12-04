import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale } from 'svelte-i18n';

// Register translation files
register('en', () => import('./en.json'));
register('fr', () => import('./fr.json'));

// Default locale
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'fr'];

// Guard against multiple initialization
let initialized = false;

/**
 * Get the saved locale from localStorage or browser preference
 */
function getInitialLocale(): string {
  if (browser) {
    // Check localStorage first
    const saved = localStorage.getItem('ttc-locale');
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return saved;
    }

    // Fall back to browser preference
    const browserLocale = getLocaleFromNavigator();
    if (browserLocale) {
      // Extract language code (e.g., 'en-US' -> 'en')
      const lang = browserLocale.split('-')[0];
      if (SUPPORTED_LOCALES.includes(lang)) {
        return lang;
      }
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Initialize i18n - safe to call multiple times, will only init once
 */
export function setupI18n() {
  if (initialized) return;
  initialized = true;
  
  init({
    fallbackLocale: DEFAULT_LOCALE,
    initialLocale: getInitialLocale()
  });
}

/**
 * Set the locale and save to localStorage
 */
export function setLocale(newLocale: string) {
  if (SUPPORTED_LOCALES.includes(newLocale)) {
    locale.set(newLocale);
    if (browser) {
      localStorage.setItem('ttc-locale', newLocale);
    }
  }
}

/**
 * Get list of supported locales
 */
export function getSupportedLocales() {
  return [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' }
  ];
}

// Re-export svelte-i18n functions for convenience
export { _, locale, isLoading } from 'svelte-i18n';
