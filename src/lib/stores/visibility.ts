// Visibility-aware store for pausing polling when tab is hidden
import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Reactive store that tracks document visibility state.
 * Used to pause API polling when the app is in the background,
 * reducing unnecessary network requests and saving bandwidth.
 */
export const isVisible = readable(true, (set) => {
  if (!browser) return;

  const handleVisibilityChange = () => {
    set(document.visibilityState === 'visible');
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Set initial value
  set(document.visibilityState === 'visible');

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
});
