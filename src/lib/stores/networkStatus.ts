import { writable, derived } from 'svelte/store';
import { isConnected, connectionError } from './alerts';

/**
 * Network Status Store
 * Tracks browser online/offline status and combines with realtime connection status
 */

// Browser online/offline status
export const isOnline = writable(typeof navigator !== 'undefined' ? navigator.onLine : true);

// Combined network status for the app
export const networkStatus = derived(
  [isOnline, isConnected, connectionError],
  ([$isOnline, $isConnected, $connectionError]) => {
    if (!$isOnline) {
      return {
        status: 'offline' as const,
        message: 'You\'re offline',
        description: 'Showing cached data'
      };
    }
    
    if ($connectionError) {
      return {
        status: 'degraded' as const,
        message: 'Connection issues',
        description: $connectionError
      };
    }
    
    if (!$isConnected) {
      return {
        status: 'connecting' as const,
        message: 'Connecting...',
        description: 'Establishing realtime connection'
      };
    }
    
    return {
      status: 'online' as const,
      message: 'Connected',
      description: 'Live updates active'
    };
  }
);

// Initialize browser event listeners
export function initNetworkListeners() {
  if (typeof window === 'undefined') return;
  
  const handleOnline = () => isOnline.set(true);
  const handleOffline = () => isOnline.set(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
