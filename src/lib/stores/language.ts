import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { locale } from 'svelte-i18n';

/**
 * Language store integrated with svelte-i18n
 * 
 * This approach:
 * 1. Uses svelte-i18n for proper translations
 * 2. Sets the <html lang="xx"> attribute for accessibility/SEO
 * 3. Syncs with localStorage for persistence
 * 4. Falls back to English if translation missing
 */

export type SupportedLanguage = 'en' | 'fr';

const STORAGE_KEY = 'ttc-language';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'fr'];

/**
 * Get saved language or detect from browser
 */
function getInitialLanguage(): SupportedLanguage {
  if (!browser) return 'en';
  
  // Check localStorage first
  const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }
  
  // Fall back to browser language
  const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }
  
  return 'en';
}

// Create writable store for language - initialize with saved/browser preference
const currentLanguage = writable<SupportedLanguage>(browser ? getInitialLanguage() : 'en');

/**
 * Apply language to document and svelte-i18n
 */
function applyLanguage(lang: SupportedLanguage) {
  if (!browser) return;
  
  // Set HTML lang attribute for accessibility/SEO
  document.documentElement.lang = lang;
  
  // Update svelte-i18n locale
  locale.set(lang);
  
  // Save preference
  localStorage.setItem(STORAGE_KEY, lang);
  
  // Update local state
  currentLanguage.set(lang);
}

/**
 * Initialize language on app start
 */
export function initLanguage() {
  if (!browser) return;
  
  const lang = getInitialLanguage();
  applyLanguage(lang);
}

/**
 * Set language and persist
 */
export function setLanguage(lang: SupportedLanguage) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return;
  }
  applyLanguage(lang);
}

/**
 * Get current language (reactive)
 */
export function getLanguage(): SupportedLanguage {
  let lang: SupportedLanguage = 'en';
  currentLanguage.subscribe(value => lang = value)();
  return lang;
}

/**
 * Get list of supported languages for UI
 */
export function getSupportedLanguages() {
  return [
    { code: 'en' as const, name: 'English', nativeName: 'English' },
    { code: 'fr' as const, name: 'French', nativeName: 'Français' }
  ];
}

// Export reactive state for Svelte components
export { currentLanguage as language };
