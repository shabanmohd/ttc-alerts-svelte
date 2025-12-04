import { writable, derived } from 'svelte/store';
import type { Alert, Thread, ThreadWithAlerts, AlertCategory } from '$lib/types/database';
import { supabase } from '$lib/supabase';

// Dummy data for development
const DUMMY_ALERTS: Alert[] = [
  {
    id: 1,
    alert_id: 'alert-001',
    thread_id: 'thread-001',
    header_text: '102 Markham Rd Regular service has resumed northbound near Castlemore Ave at Mingay Ave',
    description_text: 'Regular service has resumed following earlier detour.',
    severity: 'INFO',
    cause: 'CONSTRUCTION',
    effect: 'MODIFIED_SERVICE',
    url: null,
    routes: ['102 Markham Rd'],
    stops: [],
    categories: ['SERVICE_RESUMED'],
    is_active: true,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    alert_id: 'alert-002',
    thread_id: 'thread-002',
    header_text: 'Line 1 experiencing delays due to signal problems at Bloor-Yonge station',
    description_text: 'Crews are on site investigating. Delays of up to 10 minutes in both directions.',
    severity: 'WARNING',
    cause: 'TECHNICAL_PROBLEM',
    effect: 'SIGNIFICANT_DELAYS',
    url: null,
    routes: ['Line 1'],
    stops: ['Bloor-Yonge'],
    categories: ['SERVICE_DISRUPTION', 'DELAY'],
    is_active: true,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    alert_id: 'alert-003',
    thread_id: 'thread-003',
    header_text: '504 King diverting via Queen St due to emergency road work',
    description_text: 'Eastbound 504 King diverting via Queen St between Spadina and Parliament. Regular stops missed along King St.',
    severity: 'WARNING',
    cause: 'CONSTRUCTION',
    effect: 'DETOUR',
    url: null,
    routes: ['504 King'],
    stops: [],
    categories: ['DETOUR'],
    is_active: true,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    alert_id: 'alert-004',
    thread_id: 'thread-004',
    header_text: '35 Jane experiencing delays of up to 15 minutes southbound',
    description_text: 'Heavy traffic congestion near Jane and Finch. Extra buses being deployed.',
    severity: 'WARNING',
    cause: 'TRAFFIC',
    effect: 'SIGNIFICANT_DELAYS',
    url: null,
    routes: ['35 Jane'],
    stops: [],
    categories: ['DELAY'],
    is_active: true,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    alert_id: 'alert-005',
    thread_id: 'thread-005',
    header_text: 'Line 2 - No service between Kennedy and Warden stations',
    description_text: 'Shuttle buses operating. Use Line 3 Scarborough as alternative where possible.',
    severity: 'SEVERE',
    cause: 'MAINTENANCE',
    effect: 'NO_SERVICE',
    url: 'https://ttc.ca/service-advisories',
    routes: ['Line 2'],
    stops: ['Kennedy', 'Warden'],
    categories: ['SERVICE_DISRUPTION'],
    is_active: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 6,
    alert_id: 'alert-006',
    thread_id: 'thread-006',
    header_text: '510 Spadina - Planned track maintenance this weekend',
    description_text: 'No streetcar service Saturday Dec 7 - Sunday Dec 8. Replacement buses will operate.',
    severity: 'INFO',
    cause: 'MAINTENANCE',
    effect: 'NO_SERVICE',
    url: null,
    routes: ['510 Spadina'],
    stops: [],
    categories: ['PLANNED_SERVICE_DISRUPTION'],
    is_active: true,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 7,
    alert_id: 'alert-007',
    thread_id: 'thread-002',
    header_text: 'Line 1 delays increasing to 15 minutes at Bloor-Yonge',
    description_text: 'Signal issues persist. Consider using Line 2 as alternative.',
    severity: 'WARNING',
    cause: 'TECHNICAL_PROBLEM',
    effect: 'SIGNIFICANT_DELAYS',
    url: null,
    routes: ['Line 1'],
    stops: ['Bloor-Yonge'],
    categories: ['SERVICE_DISRUPTION', 'DELAY'],
    is_active: true,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago (earlier update)
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

const DUMMY_THREADS: Thread[] = [
  {
    thread_id: 'thread-001',
    first_alert_id: 'alert-001',
    alert_ids: ['alert-001'],
    routes: ['102 Markham Rd'],
    categories: ['SERVICE_RESUMED'],
    is_resolved: false,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    thread_id: 'thread-002',
    first_alert_id: 'alert-007',
    alert_ids: ['alert-002', 'alert-007'],
    routes: ['Line 1'],
    categories: ['SERVICE_DISRUPTION', 'DELAY'],
    is_resolved: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    thread_id: 'thread-003',
    first_alert_id: 'alert-003',
    alert_ids: ['alert-003'],
    routes: ['504 King'],
    categories: ['DETOUR'],
    is_resolved: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    thread_id: 'thread-004',
    first_alert_id: 'alert-004',
    alert_ids: ['alert-004'],
    routes: ['35 Jane'],
    categories: ['DELAY'],
    is_resolved: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    thread_id: 'thread-005',
    first_alert_id: 'alert-005',
    alert_ids: ['alert-005'],
    routes: ['Line 2'],
    categories: ['SERVICE_DISRUPTION'],
    is_resolved: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    thread_id: 'thread-006',
    first_alert_id: 'alert-006',
    alert_ids: ['alert-006'],
    routes: ['510 Spadina'],
    categories: ['PLANNED_SERVICE_DISRUPTION'],
    is_resolved: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  }
];

// Use dummy data in development
const USE_DUMMY_DATA = true;

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
    // Use dummy data in development
    if (USE_DUMMY_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      threads.set(DUMMY_THREADS);
      alerts.set(DUMMY_ALERTS);
      lastUpdated.set(new Date());
      return;
    }
    
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
