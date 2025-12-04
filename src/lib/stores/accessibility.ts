// Accessibility settings store with localStorage persistence
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type TextScale = 'normal' | 'medium' | 'large';

export interface AccessibilityState {
  textScale: TextScale;
  reduceMotion: boolean;
}

const SCALE_VALUES: Record<TextScale, number> = {
  normal: 1,
  medium: 1.15,
  large: 1.3,
};

const STORAGE_KEY = 'ttc-accessibility';

function getInitialState(): AccessibilityState {
  if (!browser) {
    return { textScale: 'normal', reduceMotion: false };
  }

  // Try to load from localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid JSON, use defaults
    }
  }

  // Default: respect system preferences
  return {
    textScale: 'normal',
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function applyAccessibilitySettings(state: AccessibilityState) {
  if (!browser) return;

  const html = document.documentElement;

  // Apply text scale
  html.style.setProperty('--text-scale', String(SCALE_VALUES[state.textScale]));
  html.classList.remove('text-scale-normal', 'text-scale-medium', 'text-scale-large');
  html.classList.add(`text-scale-${state.textScale}`);

  // Apply reduce motion
  html.classList.toggle('reduce-motion', state.reduceMotion);
}

function createAccessibilityStore() {
  const initial = getInitialState();
  const { subscribe, set, update } = writable<AccessibilityState>(initial);

  // Apply initial settings on load
  if (browser) {
    applyAccessibilitySettings(initial);
  }

  return {
    subscribe,

    /**
     * Set text scaling level
     */
    setTextScale: (scale: TextScale) => {
      update((state) => {
        const newState = { ...state, textScale: scale };
        if (browser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          applyAccessibilitySettings(newState);
        }
        return newState;
      });
    },

    /**
     * Toggle reduced motion preference
     */
    setReduceMotion: (reduce: boolean) => {
      update((state) => {
        const newState = { ...state, reduceMotion: reduce };
        if (browser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          applyAccessibilitySettings(newState);
        }
        return newState;
      });
    },

    /**
     * Reset to system defaults
     */
    reset: () => {
      if (!browser) return;

      const defaults: AccessibilityState = {
        textScale: 'normal',
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      };

      localStorage.removeItem(STORAGE_KEY);
      set(defaults);
      applyAccessibilitySettings(defaults);
    },
  };
}

export const accessibility = createAccessibilityStore();

// Helper to get scale value for a given TextScale
export function getScaleValue(scale: TextScale): number {
  return SCALE_VALUES[scale];
}
