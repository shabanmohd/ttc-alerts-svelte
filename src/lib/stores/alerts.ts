import { writable, derived, get } from 'svelte/store';
import type { Alert, Thread, ThreadWithAlerts, Maintenance, PlannedMaintenance } from '$lib/types/database';
import { supabase } from '$lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Severity category type for filtering alerts
export type SeverityCategory = 'MAJOR' | 'MINOR' | 'ACCESSIBILITY';

// Severity category filter state (for alerts-v3 and similar pages)
export const selectedSeverityCategory = writable<SeverityCategory>('MAJOR');

// Core alert state
export const alerts = writable<Alert[]>([]);
export const threads = writable<Thread[]>([]);
export const isLoading = writable(true);
export const error = writable<string | null>(null);
export const lastUpdated = writable<Date | null>(null);

// Filter state
export const activeFilters = writable<Set<string>>(new Set(['ALL']));
export const currentTab = writable<'all' | 'my'>('all');

// Realtime connection state
export const isConnected = writable(false);
export const connectionError = writable<string | null>(null);

// Maintenance state
export const maintenanceItems = writable<PlannedMaintenance[]>([]);

// Track recently added thread IDs for "new" animation
export const recentlyAddedThreadIds = writable<Set<string>>(new Set());

// Track active Realtime channel
let realtimeChannel: RealtimeChannel | null = null;

/**
 * Determine severity category based on alert categories, effect, and text
 * MAJOR: Significant service disruptions (NO_SERVICE, DETOUR) - NOT slow zones
 * MINOR: RSZ/slow zones, minor delays
 * ACCESSIBILITY: Elevator/escalator issues
 */
export function getSeverityCategory(
  categories: string[],
  effect?: string,
  headerText?: string
): SeverityCategory {
  // Check for accessibility (elevator/escalator) first
  if (categories.includes('ACCESSIBILITY') || categories.includes('ELEVATOR') || categories.includes('ACCESSIBILITY_ISSUE')) {
    return 'ACCESSIBILITY';
  }
  
  // Check effect for accessibility issues
  if (effect?.toUpperCase() === 'ACCESSIBILITY_ISSUE') {
    return 'ACCESSIBILITY';
  }
  
  // Check for RSZ category directly (from TTC API alerts)
  if (categories.includes('RSZ')) {
    return 'MINOR';
  }
  
  // Check effect for RSZ (from TTC API alerts)
  if (effect?.toUpperCase() === 'RSZ') {
    return 'MINOR';
  }
  
  // Check for RSZ/slow zone patterns BEFORE checking effect
  // This is critical because RSZ alerts have effect="SIGNIFICANT_DELAYS" but should be MINOR
  const text = (headerText || '').toLowerCase();
  if (
    text.includes('slower than usual') ||
    text.includes('reduced speed') ||
    text.includes('move slower') ||
    text.includes('running slower') ||
    text.includes('slow zone') ||
    text.includes('rsz')
  ) {
    return 'MINOR';
  }
  
  // Check effect for major disruptions (excluding RSZ which was caught above)
  const majorEffects = ['NO_SERVICE', 'DETOUR', 'MODIFIED_SERVICE'];
  if (effect && majorEffects.includes(effect.toUpperCase())) {
    return 'MAJOR';
  }
  
  // SIGNIFICANT_DELAYS without RSZ text patterns is also MAJOR
  if (effect?.toUpperCase() === 'SIGNIFICANT_DELAYS') {
    return 'MAJOR';
  }
  
  // Check categories for major disruptions
  const majorCategories = ['SERVICE_DISRUPTION', 'DIVERSION', 'DETOUR', 'NO_SERVICE'];
  if (majorCategories.some(cat => categories.includes(cat))) {
    return 'MAJOR';
  }
  
  // Check categories for minor issues
  const minorCategories = ['DELAY', 'SERVICE_RESUMED', 'REGULAR_SERVICE'];
  if (minorCategories.some(cat => categories.includes(cat))) {
    return 'MINOR';
  }
  
  // Default to MAJOR for unknown
  return 'MAJOR';
}

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

// Calculate text similarity (Jaccard similarity)
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = [...words1].filter(x => words2.has(x)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

// Deduplicate alerts within a thread - keep newest of similar alerts
function deduplicateAlerts(alerts: Alert[]): Alert[] {
  if (alerts.length <= 1) return alerts;
  
  // Sort by date descending (newest first)
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const kept: Alert[] = [];
  
  for (const alert of sorted) {
    // Check if this alert is too similar to any already kept alert
    const isDuplicate = kept.some(keptAlert => {
      const similarity = textSimilarity(
        alert.header_text || '', 
        keptAlert.header_text || ''
      );
      // If >90% similar and within same thread, consider it duplicate
      return similarity > 0.9;
    });
    
    if (!isDuplicate) {
      kept.push(alert);
    }
  }
  
  return kept;
}

// Derived: threads with their alerts grouped
export const threadsWithAlerts = derived(
  [threads, alerts],
  ([$threads, $alerts]) => {
    return $threads
      // CRITICAL: Filter out resolved and hidden threads first
      // Resolved: incident has been closed/fixed
      // Hidden: thread no longer in TTC API without SERVICE_RESUMED confirmation
      .filter(thread => !thread.is_resolved && !thread.is_hidden)
      .map((thread): ThreadWithAlerts => {
        const threadAlerts = $alerts
          .filter(a => a.thread_id === thread.thread_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Deduplicate alerts with >90% similar text, keeping the newest
        const deduplicatedAlerts = deduplicateAlerts(threadAlerts);
        
        return {
          ...thread,
          alerts: deduplicatedAlerts,
          latestAlert: deduplicatedAlerts[0]
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

// Fetch alerts from Supabase (initial load only)
export async function fetchAlerts(): Promise<void> {
  isLoading.set(true);
  error.set(null);
  
  try {
    // Fetch alerts - select only needed columns to reduce egress
    const { data: alertsData, error: alertsError } = await supabase
      .from('alert_cache')
      .select('alert_id, thread_id, header_text, description_text, effect, categories, affected_routes, is_latest, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (alertsError) throw alertsError;
    
    // Get unique thread IDs from alerts
    const threadIds = [...new Set((alertsData || []).map(a => a.thread_id).filter(Boolean))];
    
    // Fetch threads - select only needed columns to reduce egress (include is_hidden)
    let threadsData: Thread[] = [];
    if (threadIds.length > 0) {
      const { data, error: threadsError } = await supabase
        .from('incident_threads')
        .select('thread_id, title, categories, affected_routes, is_resolved, is_hidden, created_at, updated_at')
        .in('thread_id', threadIds);
      
      if (threadsError) throw threadsError;
      threadsData = data || [];
    }
    
    threads.set(threadsData);
    alerts.set(alertsData || []);
    lastUpdated.set(new Date());
    
  } catch (e) {
    error.set(e instanceof Error ? e.message : 'Failed to fetch alerts');
    console.error('Error fetching alerts:', e);
  } finally {
    isLoading.set(false);
  }
}

// Handle incoming alert from Realtime (minimal data transfer - only the changed row)
function handleAlertInsert(newAlert: Alert): void {
  alerts.update(current => {
    // Add new alert at the beginning (most recent first)
    const updated = [newAlert, ...current];
    // Keep only last 100 alerts in memory
    return updated.slice(0, 100);
  });
  lastUpdated.set(new Date());
}

function handleAlertUpdate(updatedAlert: Alert): void {
  alerts.update(current => 
    current.map(a => a.alert_id === updatedAlert.alert_id ? updatedAlert : a)
  );
  lastUpdated.set(new Date());
}

function handleAlertDelete(deletedAlert: { alert_id: string }): void {
  alerts.update(current => 
    current.filter(a => a.alert_id !== deletedAlert.alert_id)
  );
}

// Handle incoming thread from Realtime
function handleThreadInsert(newThread: Thread): void {
  threads.update(current => [newThread, ...current]);
}

function handleThreadUpdate(updatedThread: Thread): void {
  threads.update(current => 
    current.map(t => t.thread_id === updatedThread.thread_id ? updatedThread : t)
  );
}

function handleThreadDelete(deletedThread: { thread_id: string }): void {
  threads.update(current => 
    current.filter(t => t.thread_id !== deletedThread.thread_id)
  );
}

// Set up Supabase Realtime subscription (push-based updates - no polling!)
export function subscribeToAlerts(): () => void {
  // Clean up existing channel if any
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
  
  realtimeChannel = supabase
    .channel('alerts-realtime')
    // Subscribe to alert_cache changes
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'alert_cache' 
      },
      (payload) => {
        console.log('🔔 New alert:', payload.new);
        handleAlertInsert(payload.new as Alert);
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'alert_cache' 
      },
      (payload) => {
        console.log('📝 Alert updated:', payload.new);
        handleAlertUpdate(payload.new as Alert);
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'alert_cache' 
      },
      (payload) => {
        console.log('🗑️ Alert deleted:', payload.old);
        handleAlertDelete(payload.old as { alert_id: string });
      }
    )
    // Subscribe to incident_threads changes
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'incident_threads' 
      },
      (payload) => {
        console.log('🧵 New thread:', payload.new);
        handleThreadInsert(payload.new as Thread);
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'incident_threads' 
      },
      (payload) => {
        console.log('📝 Thread updated:', payload.new);
        handleThreadUpdate(payload.new as Thread);
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'incident_threads' 
      },
      (payload) => {
        console.log('🗑️ Thread deleted:', payload.old);
        handleThreadDelete(payload.old as { thread_id: string });
      }
    )
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
      if (status === 'SUBSCRIBED') {
        isConnected.set(true);
        connectionError.set(null);
      } else if (status === 'CHANNEL_ERROR') {
        isConnected.set(false);
        connectionError.set('Failed to connect to realtime updates');
      } else if (status === 'TIMED_OUT') {
        isConnected.set(false);
        connectionError.set('Connection timed out');
      } else if (status === 'CLOSED') {
        isConnected.set(false);
      }
    });
  
  // Return cleanup function
  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    isConnected.set(false);
  };
}

// Manual refresh (for pull-to-refresh or refresh button)
export async function refreshAlerts(): Promise<void> {
  await fetchAlerts();
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
