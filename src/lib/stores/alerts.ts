import { writable, derived } from 'svelte/store';
import type { Alert, Thread, ThreadWithAlerts, Maintenance, PlannedMaintenance } from '$lib/types/database';
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

// Maintenance state
export const maintenanceItems = writable<PlannedMaintenance[]>([]);

// Helper to extract categories from JSONB or array
function extractCategories(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as string[];
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // Not valid JSON
    }
  }
  return [];
}

// Helper to extract routes from JSONB affected_routes
function extractRoutes(data: unknown): string[] {
  if (Array.isArray(data)) return data as string[];
  return [];
}

// Derived: threads with their alerts grouped
export const threadsWithAlerts = derived(
  [threads, alerts],
  ([$threads, $alerts]) => {
    return $threads
      .map((thread): ThreadWithAlerts => {
        const threadAlerts = $alerts
          .filter(a => a.thread_id === thread.thread_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        return {
          ...thread,
          alerts: threadAlerts,
          latestAlert: threadAlerts[0]
        };
      })
      // Filter out threads with no alerts, missing critical data, invalid timestamps, or planned alerts
      .filter(thread => {
        if (!thread.latestAlert || !thread.latestAlert.header_text) return false;
        // Check for valid timestamp
        const date = new Date(thread.latestAlert.created_at);
        if (isNaN(date.getTime())) return false;
        // Exclude planned service disruptions (handled by maintenance widget)
        const categories = extractCategories(thread.categories) || 
                           extractCategories(thread.latestAlert?.categories) || [];
        if (categories.includes('PLANNED_SERVICE_DISRUPTION')) return false;
        if (categories.includes('PLANNED')) return false;
        // Also check effect field for planned alerts
        const effect = thread.latestAlert?.effect?.toUpperCase() || '';
        if (effect.includes('PLANNED')) return false;
        // Check header text for planned maintenance keywords
        const headerText = thread.latestAlert?.header_text?.toLowerCase() || '';
        if (headerText.includes('due to planned') || headerText.includes('planned track work')) return false;
        return true;
      })
      .sort((a, b) => 
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
      // Only use the latest alert's categories for filtering
      const categories = extractCategories(thread.latestAlert?.categories) || [];
      return categories.some(cat => $activeFilters.has(cat));
    });
  }
);

// Fetch alerts from Supabase
export async function fetchAlerts(): Promise<void> {
  isLoading.set(true);
  error.set(null);
  
  try {
    // Fetch active threads (not resolved, from last 24 hours)
    const { data: threadsData, error: threadsError } = await supabase
      .from('incident_threads')
      .select('*')
      .eq('is_resolved', false)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (threadsError) throw threadsError;
    
    // Fetch latest alerts for those threads
    const { data: alertsData, error: alertsError } = await supabase
      .from('alert_cache')
      .select('*')
      .eq('is_latest', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
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
      .eq('is_latest', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (alertsError) throw alertsError;
    
    // Compare with current alerts using get() pattern
    let currentAlerts: Alert[] = [];
    const unsubscribe = alerts.subscribe(value => { currentAlerts = value; });
    unsubscribe();
    
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
  let pending: Alert[] | null = null;
  const unsubscribe = pendingAlerts.subscribe(value => { pending = value; });
  unsubscribe();
  
  if (pending) {
    alerts.set(pending);
    lastUpdated.set(new Date());
  }
  
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

// Fetch planned maintenance from Supabase
export async function fetchMaintenance(): Promise<PlannedMaintenance[]> {
  try {
    const { data, error: fetchError } = await supabase
      .from('planned_maintenance')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(20);
    
    if (fetchError) throw fetchError;
    
    // Map database format to UI format
    const items: PlannedMaintenance[] = (data || []).map((m: Maintenance) => ({
      id: m.id,
      maintenance_id: m.maintenance_id,
      routes: [m.subway_line],
      affected_stations: m.affected_stations || '',
      description: m.description,
      reason: m.reason,
      start_date: m.start_date,
      end_date: m.end_date,
      start_time: m.start_time,
      end_time: m.end_time,
      url: m.details_url
    }));
    
    maintenanceItems.set(items);
    return items;
    
  } catch (e) {
    console.error('Error fetching maintenance:', e);
    return [];
  }
}

// Toggle filter (mutually exclusive - only one filter at a time)
export function toggleFilter(category: string): void {
  activeFilters.update(filters => {
    // If clicking the already active filter, reset to ALL
    if (filters.has(category)) {
      return new Set(['ALL']);
    }
    
    // Otherwise, select only this filter
    return new Set([category]);
  });
}
