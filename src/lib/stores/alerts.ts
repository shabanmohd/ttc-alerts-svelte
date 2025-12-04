import { writable, derived } from 'svelte/store';
import type { Alert, Thread, ThreadWithAlerts, AlertCategory } from '$lib/types/database';
import { supabase } from '$lib/supabase';

// Core alert state
export const alerts = writable<Alert[]>([]);
export const threads = writable<Thread[]>([]);
export const isLoading = writable(true);
export const error = writable<string | null>(null);
export const lastUpdated = writable<Date | null>(null);

// Filter state
export const activeFilters = writable<Set<string>>(new Set(['ALL']));
export const currentTab = writable<'all' | 'my'>('all');

// Pending updates (background polling pattern)
export const pendingAlerts = writable<Alert[] | null>(null);
export const hasUpdates = writable(false);
export const updateCount = writable(0);

// Derived: threads with their alerts grouped
export const threadsWithAlerts = derived(
  [threads, alerts],
  ([$threads, $alerts]) => {
    return $threads.map((thread): ThreadWithAlerts => {
      const threadAlerts = $alerts
        .filter(a => a.thread_id === thread.thread_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return {
        ...thread,
        alerts: threadAlerts,
        latestAlert: threadAlerts[0]
      };
    }).sort((a, b) => 
      new Date(b.latestAlert?.created_at || 0).getTime() - 
      new Date(a.latestAlert?.created_at || 0).getTime()
    );
  }
);

// Derived: filtered threads based on active filters
export const filteredThreads = derived(
  [threadsWithAlerts, activeFilters],
  ([$threadsWithAlerts, $activeFilters]) => {
    if ($activeFilters.has('ALL') || $activeFilters.size === 0) {
      return $threadsWithAlerts;
    }
    
    return $threadsWithAlerts.filter(thread => {
      const categories = thread.categories || thread.latestAlert?.categories || [];
      return categories.some(cat => $activeFilters.has(cat));
    });
  }
);

// Fetch alerts from Supabase
export async function fetchAlerts(): Promise<void> {
  isLoading.set(true);
  error.set(null);
  
  try {
    // Fetch threads
    const { data: threadsData, error: threadsError } = await supabase
      .from('incident_threads')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (threadsError) throw threadsError;
    
    // Fetch alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from('alert_cache')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (alertsError) throw alertsError;
    
    threads.set(threadsData || []);
    alerts.set(alertsData || []);
    lastUpdated.set(new Date());
    
  } catch (e) {
    error.set(e instanceof Error ? e.message : 'Failed to fetch alerts');
    console.error('Error fetching alerts:', e);
  } finally {
    isLoading.set(false);
  }
}

// Background poll for updates (doesn't update UI immediately)
export async function pollForUpdates(): Promise<void> {
  try {
    const { data: alertsData, error: alertsError } = await supabase
      .from('alert_cache')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (alertsError) throw alertsError;
    
    // Compare with current alerts
    const currentAlerts = await new Promise<Alert[]>(resolve => {
      alerts.subscribe(value => resolve(value))();
    });
    
    const newAlertIds = new Set((alertsData || []).map(a => a.alert_id));
    const currentAlertIds = new Set(currentAlerts.map(a => a.alert_id));
    
    // Count truly new alerts (not just removed ones)
    let newCount = 0;
    for (const id of newAlertIds) {
      if (!currentAlertIds.has(id)) {
        newCount++;
      }
    }
    
    if (newCount > 0) {
      pendingAlerts.set(alertsData || []);
      hasUpdates.set(true);
      updateCount.set(newCount);
    }
    
  } catch (e) {
    console.error('Error polling for updates:', e);
  }
}

// Apply pending updates to UI
export function applyPendingUpdates(): void {
  const pending = pendingAlerts;
  pending.subscribe(value => {
    if (value) {
      alerts.set(value);
      lastUpdated.set(new Date());
    }
  })();
  
  pendingAlerts.set(null);
  hasUpdates.set(false);
  updateCount.set(0);
}

// Set up Supabase Realtime subscription
export function subscribeToAlerts(): () => void {
  const channel = supabase
    .channel('alerts-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alert_cache' },
      (payload) => {
        console.log('Realtime update:', payload);
        // Mark that updates are available
        hasUpdates.set(true);
        updateCount.update(n => n + 1);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incident_threads' },
      () => {
        hasUpdates.set(true);
      }
    )
    .subscribe();
  
  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// Toggle filter
export function toggleFilter(category: string): void {
  activeFilters.update(filters => {
    const newFilters = new Set(filters);
    
    if (category === 'ALL') {
      return new Set(['ALL']);
    }
    
    newFilters.delete('ALL');
    
    if (newFilters.has(category)) {
      newFilters.delete(category);
    } else {
      newFilters.add(category);
    }
    
    // If no filters selected, default to ALL
    if (newFilters.size === 0) {
      return new Set(['ALL']);
    }
    
    return newFilters;
  });
}
