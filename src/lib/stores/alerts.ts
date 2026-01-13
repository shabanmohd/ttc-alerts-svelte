import { writable, derived, get } from 'svelte/store';
import type { Alert, Thread, ThreadWithAlerts, Maintenance, PlannedMaintenance } from '$lib/types/database';
import { supabase } from '$lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Severity category type for filtering alerts
export type SeverityCategory = 'ALL' | 'MAJOR' | 'MINOR' | 'ACCESSIBILITY';

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
 * MAJOR: Significant service disruptions (NO_SERVICE, DETOUR, DELAY) - NOT slow zones
 * MINOR: RSZ/slow zones, service resumed
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
  // DELAY is included here so subway status cards show delays (RSZ already excluded above)
  const majorCategories = ['SERVICE_DISRUPTION', 'DIVERSION', 'DETOUR', 'NO_SERVICE', 'DELAY'];
  if (majorCategories.some(cat => categories.includes(cat))) {
    return 'MAJOR';
  }
  
  // Check categories for minor issues (resolved alerts, etc.)
  const minorCategories = ['SERVICE_RESUMED', 'REGULAR_SERVICE'];
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
  
  // Separate TTC API alerts and non-TTC alerts
  const ttcApiAlerts = sorted.filter(a => a.alert_id.startsWith('ttc-alert-'));
  const nonTtcAlerts = sorted.filter(a => !a.alert_id.startsWith('ttc-alert-'));
  
  const kept: Alert[] = [];
  
  // FIRST: Process TTC API alerts (always keep unique ones)
  // These are needed for getTTCApiDisruptionAlert() to detect official disruptions
  for (const alert of ttcApiAlerts) {
    const hasSimilarTTCAlert = kept.some(keptAlert => {
      const similarity = textSimilarity(
        alert.header_text || '', 
        keptAlert.header_text || ''
      );
      return similarity > 0.9;
    });
    
    if (!hasSimilarTTCAlert) {
      kept.push(alert);
    }
  }
  
  // SECOND: Process non-TTC alerts, deduplicating against ALL kept alerts (including TTC API)
  for (const alert of nonTtcAlerts) {
    const isDuplicate = kept.some(keptAlert => {
      const similarity = textSimilarity(
        alert.header_text || '', 
        keptAlert.header_text || ''
      );
      return similarity > 0.9;
    });
    
    if (!isDuplicate) {
      kept.push(alert);
    }
  }
  
  // Re-sort by date (TTC API alerts may have been inserted out of order)
  return kept.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Derived: threads with their alerts grouped
export const threadsWithAlerts = derived(
  [threads, alerts],
  ([$threads, $alerts]) => {
    return $threads
      // Filter out hidden threads only - keep resolved threads for "Recently Resolved" section
      // Hidden: thread no longer in TTC API without SERVICE_RESUMED confirmation
      .filter(thread => !thread.is_hidden)
      .map((thread): ThreadWithAlerts => {
        const threadAlerts = $alerts
          .filter(a => a.thread_id === thread.thread_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Deduplicate alerts with >90% similar text, keeping the newest
        const deduplicatedAlerts = deduplicateAlerts(threadAlerts);
        
        // Find the alert marked as is_latest (set by poll-alerts backend)
        // This is critical for RSZ/ACCESSIBILITY threads where we manually set is_latest
        // to point to the correct alert (not SERVICE_RESUMED that was incorrectly matched)
        const latestFlaggedAlert = deduplicatedAlerts.find(a => a.is_latest);
        
        return {
          ...thread,
          alerts: deduplicatedAlerts,
          // Prefer the is_latest flagged alert, fallback to most recent by timestamp
          latestAlert: latestFlaggedAlert || deduplicatedAlerts[0]
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
    // STEP 1: Fetch recent alerts (last 24 hours) - this gets most active alerts
    const { data: recentAlerts, error: recentError } = await supabase
      .from('alert_cache')
      .select('alert_id, thread_id, header_text, description_text, effect, categories, affected_routes, is_latest, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (recentError) throw recentError;
    
    // STEP 2: Fetch active, non-hidden threads (including long-running ones like elevators)
    // These may have alerts older than 24 hours but are still active
    const { data: activeThreads, error: threadsError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, categories, affected_routes, is_resolved, is_hidden, resolved_at, created_at, updated_at')
      .eq('is_hidden', false)
      .eq('is_resolved', false);
    
    if (threadsError) throw threadsError;
    
    // STEP 3: Get thread IDs from recent alerts that aren't in activeThreads
    const recentThreadIds = [...new Set((recentAlerts || []).map(a => a.thread_id).filter(Boolean))];
    const activeThreadIds = new Set((activeThreads || []).map(t => t.thread_id));
    const additionalThreadIds = recentThreadIds.filter(id => !activeThreadIds.has(id));
    
    // Fetch additional threads (resolved threads that had recent alerts)
    // IMPORTANT: Must filter out hidden threads to prevent showing stale/hidden data
    let additionalThreads: Thread[] = [];
    if (additionalThreadIds.length > 0) {
      const { data, error: addlError } = await supabase
        .from('incident_threads')
        .select('thread_id, title, categories, affected_routes, is_resolved, is_hidden, resolved_at, created_at, updated_at')
        .in('thread_id', additionalThreadIds)
        .eq('is_hidden', false); // Don't load hidden threads
      
      if (addlError) throw addlError;
      additionalThreads = data || [];
    }
    
    // STEP 4: Fetch alerts for active threads (may be older than 24h)
    const allActiveThreadIds = [...activeThreadIds];
    let activeThreadAlerts: Alert[] = [];
    if (allActiveThreadIds.length > 0) {
      const { data, error: alertsErr } = await supabase
        .from('alert_cache')
        .select('alert_id, thread_id, header_text, description_text, effect, categories, affected_routes, is_latest, created_at')
        .in('thread_id', allActiveThreadIds)
        .eq('is_latest', true);
      
      if (alertsErr) throw alertsErr;
      activeThreadAlerts = data || [];
    }
    
    // Combine all threads and alerts, deduplicating
    const allThreads = [...(activeThreads || []), ...additionalThreads];
    const allAlerts = [...(recentAlerts || []), ...activeThreadAlerts];
    
    // Deduplicate alerts by alert_id
    const uniqueAlerts = Array.from(
      new Map(allAlerts.map(a => [a.alert_id, a])).values()
    );
    
    threads.set(allThreads);
    alerts.set(uniqueAlerts);
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
  
  // If alert has a thread_id, ensure we have the thread
  if (newAlert.thread_id) {
    fetchThreadForAlert(newAlert.thread_id);
  }
}

function handleAlertUpdate(updatedAlert: Alert): void {
  alerts.update(current => 
    current.map(a => a.alert_id === updatedAlert.alert_id ? updatedAlert : a)
  );
  lastUpdated.set(new Date());
  
  // If alert's thread changed or became latest, ensure we have the thread
  if (updatedAlert.thread_id && updatedAlert.is_latest) {
    fetchThreadForAlert(updatedAlert.thread_id);
  }
}

function handleAlertDelete(deletedAlert: { alert_id: string }): void {
  alerts.update(current => 
    current.filter(a => a.alert_id !== deletedAlert.alert_id)
  );
}

// Handle incoming thread from Realtime
function handleThreadInsert(newThread: Thread): void {
  threads.update(current => [newThread, ...current]);
  // Fetch the alert for this new thread
  fetchAlertForThread(newThread.thread_id);
}

function handleThreadUpdate(updatedThread: Thread): void {
  // If thread is now hidden, remove it from the store entirely
  if (updatedThread.is_hidden) {
    threads.update(current => 
      current.filter(t => t.thread_id !== updatedThread.thread_id)
    );
    console.log(`🙈 Thread hidden, removed from store: ${updatedThread.thread_id}`);
    return;
  }
  
  threads.update(current => 
    current.map(t => t.thread_id === updatedThread.thread_id ? updatedThread : t)
  );
  // If thread is now visible (unhidden), ensure we have its alert
  if (!updatedThread.is_hidden && !updatedThread.is_resolved) {
    fetchAlertForThread(updatedThread.thread_id);
  }
}

// Fetch alert for a specific thread (used when thread is added/unhidden)
async function fetchAlertForThread(threadId: string): Promise<void> {
  const currentAlerts = get(alerts);
  // Check if we already have an alert for this thread
  const hasAlert = currentAlerts.some(a => a.thread_id === threadId);
  if (hasAlert) return;
  
  try {
    const { data, error: alertError } = await supabase
      .from('alert_cache')
      .select('alert_id, thread_id, header_text, description_text, effect, categories, affected_routes, is_latest, created_at')
      .eq('thread_id', threadId)
      .eq('is_latest', true)
      .single();
    
    if (alertError || !data) {
      console.warn(`No latest alert found for thread ${threadId}`);
      return;
    }
    
    // Add the alert to the store
    alerts.update(current => {
      // Check again in case it was added concurrently
      if (current.some(a => a.alert_id === data.alert_id)) {
        return current;
      }
      return [data, ...current];
    });
    console.log(`Fetched alert for thread ${threadId}:`, data.alert_id);
  } catch (e) {
    console.error(`Failed to fetch alert for thread ${threadId}:`, e);
  }
}

// Fetch thread for a specific alert (used when alert is added but thread doesn't exist)
async function fetchThreadForAlert(threadId: string): Promise<void> {
  const currentThreads = get(threads);
  // Check if we already have this thread
  const hasThread = currentThreads.some(t => t.thread_id === threadId);
  if (hasThread) return;
  
  try {
    const { data, error: threadError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, categories, affected_routes, is_resolved, is_hidden, resolved_at, created_at, updated_at')
      .eq('thread_id', threadId)
      .single();
    
    if (threadError || !data) {
      console.warn(`No thread found for alert's thread_id ${threadId}`);
      return;
    }
    
    // Only add if thread is visible (not hidden)
    if (data.is_hidden) {
      console.log(`Thread ${threadId} is hidden, not adding to store`);
      return;
    }
    
    // Add the thread to the store
    threads.update(current => {
      // Check again in case it was added concurrently
      if (current.some(t => t.thread_id === data.thread_id)) {
        return current;
      }
      return [data, ...current];
    });
    console.log(`Fetched thread for alert:`, data.thread_id);
  } catch (e) {
    console.error(`Failed to fetch thread for alert's thread_id ${threadId}:`, e);
  }
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
