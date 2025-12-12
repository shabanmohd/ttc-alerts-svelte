/**
 * Translation utilities for runtime translation
 * 
 * For TTC alerts and other dynamic content that needs French translation
 */

/**
 * Translate text using browser's built-in translation (if available)
 * Falls back to original text if translation unavailable
 */
export async function translateText(
  text: string, 
  targetLang: 'fr' | 'en'
): Promise<string> {
  // If target is English and text is already English, return as-is
  if (targetLang === 'en') return text;
  
  // Try to use browser's translation API if available (Chrome only)
  if ('translation' in self && 'createTranslator' in (self as any).translation) {
    try {
      const translator = await (self as any).translation.createTranslator({
        sourceLanguage: 'en',
        targetLanguage: targetLang
      });
      return await translator.translate(text);
    } catch (e) {
      console.warn('Browser translation not available:', e);
    }
  }
  
  // Fallback: return original text with a note
  return text;
}

/**
 * Cache for translated strings to avoid repeated API calls
 */
const translationCache = new Map<string, string>();

/**
 * Get cached translation or translate
 */
export async function getCachedTranslation(
  text: string,
  targetLang: 'fr' | 'en'
): Promise<string> {
  const cacheKey = `${targetLang}:${text}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  
  const translated = await translateText(text, targetLang);
  translationCache.set(cacheKey, translated);
  
  return translated;
}
