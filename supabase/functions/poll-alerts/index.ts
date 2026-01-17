import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API endpoints
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

// Version for debugging
const VERSION = '215'; // Fix: cleanup monitoring entry when alert reappears

// Helper: Generate MD5 hash for thread_hash
async function generateMd5Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Grace period: number of polls to wait for service resumed before hiding
// Monitoring started: 2025-01-10 - will auto-revert to 2 polls after 24 hours
const MONITORING_START = new Date('2025-01-10T20:00:00Z'); // UTC time
const MONITORING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const isMonitoringActive = () => Date.now() < MONITORING_START.getTime() + MONITORING_DURATION_MS;
const MAX_MISSED_POLLS = isMonitoringActive() ? 10 : 2;

// Alert categories with keywords
const ALERT_CATEGORIES = {
  SERVICE_DISRUPTION: {
    keywords: ['no service', 'suspended', 'closed', 'not stopping', 'bypassing'],
    priority: 1
  },
  SERVICE_RESUMED: {
    keywords: ['regular service', 'resumed', 'restored', 'back to normal', 'now stopping'],
    priority: 2
  },
  DELAY: {
    keywords: ['delay', 'delayed', 'slower', 'longer wait'],
    priority: 3
  },
  DIVERSION: {
    keywords: ['diverting', 'detour', 'alternate route', 'diversion'],
    priority: 4
  },
  SHUTTLE: {
    keywords: ['shuttle', 'buses replacing'],
    priority: 4
  },
  SCHEDULED_CLOSURE: {
    keywords: ['planned', 'scheduled', 'maintenance', 'this weekend', 'nightly', 'early closure'],
    priority: 5
  }
};

// Extract routes from alert text
function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  
  // Words that precede numbers that are NOT route numbers (e.g., "Bay 2", "Platform 1", "Track 3")
  const nonRoutePatterns = /\b(bay|platform|track|door|gate|level|floor|exit|entrance|stop)\s+\d+/gi;
  // Remove these false positives from the text before extracting routes
  const cleanedText = text.replace(nonRoutePatterns, '');
  
  // Match subway lines - must be "Line X" where X is 1, 2, 3, or 4 (TTC only has these)
  const lineMatch = cleanedText.match(/\bLine\s+(1|2|3|4)\b/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      const num = m.match(/\d/)?.[0];
      if (num) routes.push(`Line ${num}`);
    });
  }
  
  // Match route branches with name: "97B Yonge", "36A Finch West", etc.
  const routeBranchWithNameMatch = cleanedText.match(/\b(\d{1,3}[A-Z])\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/gi);
  if (routeBranchWithNameMatch) {
    routeBranchWithNameMatch.forEach(m => {
      const stopWords = ['regular', 'service', 'detour', 'diversion', 'shuttle', 'delay', 'resumed', 'closed', 'suspended'];
      const words = m.split(/\s+/);
      let routeName = words[0];
      
      if (words[1] && !stopWords.includes(words[1].toLowerCase())) {
        routeName += ' ' + words[1];
        if (words[2] && !stopWords.includes(words[2].toLowerCase())) {
          routeName += ' ' + words[2];
        }
      }
      
      const normalized = routeName.replace(/^(\d+)([a-z])/i, (_, num, letter) => `${num}${letter.toUpperCase()}`);
      routes.push(normalized);
    });
  }
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  const routeWithNameMatch = cleanedText.match(/\b(\d{1,3})\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      const routeNum = m.match(/^\d+/)?.[0];
      if (!routes.some(r => r.match(/^\d+/)?.[0] === routeNum)) {
        const stopWords = ['regular', 'service', 'detour', 'diversion', 'shuttle', 'delay', 'resumed', 'closed', 'suspended'];
        const words = m.split(/\s+/);
        let routeName = words[0];
        
        if (words[1] && !stopWords.includes(words[1].toLowerCase())) {
          routeName += ' ' + words[1];
          if (words[2] && !stopWords.includes(words[2].toLowerCase())) {
            routeName += ' ' + words[2];
          }
        }
        
        routes.push(routeName);
      }
    });
  }
  
  // Match standalone route branches: "97B", "36A", "52F", "79S", etc.
  const standaloneBranchMatch = cleanedText.match(/\b(\d{1,3}[A-Z])(?=\s|:|,|$)/gi);
  if (standaloneBranchMatch) {
    standaloneBranchMatch.forEach(route => {
      const num = parseInt(route);
      if (num < 1000 && !routes.some(r => r.toUpperCase().startsWith(route.toUpperCase()))) {
        routes.push(route.toUpperCase());
      }
    });
  }
  
  // Match standalone route numbers if not already captured
  const standaloneMatch = cleanedText.match(/\b(\d{1,3})(?=\s|:|,|$)/g);
  if (standaloneMatch) {
    standaloneMatch.forEach(num => {
      if (parseInt(num) < 1000 && !routes.some(r => r.startsWith(num))) {
        routes.push(num);
      }
    });
  }
  
  return [...new Set(routes)];
}

// Categorize alert - returns category with highest priority (lowest number)
function categorizeAlert(text: string): { category: string; priority: number } {
  const lowerText = text.toLowerCase();
  
  const sortedCategories = Object.entries(ALERT_CATEGORIES)
    .sort(([, a], [, b]) => a.priority - b.priority);
  
  for (const [category, config] of sortedCategories) {
    if (config.keywords.some(kw => lowerText.includes(kw))) {
      return { category, priority: config.priority };
    }
  }
  
  return { category: 'OTHER', priority: 10 };
}

// Check if alert text indicates service resumed
function isServiceResumed(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ALERT_CATEGORIES.SERVICE_RESUMED.keywords.some(kw => lowerText.includes(kw));
}

// Check if alert is RSZ (Reduced Speed Zone)
function isRszAlert(alert: TtcApiAlert): boolean {
  const effectDesc = alert.effectDesc || '';
  const headerText = (alert.headerText || '').toLowerCase();
  
  return effectDesc === 'Reduced Speed Zone' || 
         headerText.includes('slower than usual') ||
         headerText.includes('reduced speed') ||
         headerText.includes('move slower') ||
         headerText.includes('running slower');
}

// Check if alert is a scheduled maintenance/closure
function isScheduledClosure(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Don't classify cancelled closures as scheduled closures
  if (isClosureCancelled(text)) {
    return false;
  }
  
  const scheduledPatterns = [
    'planned', 'scheduled', 'maintenance', 'this weekend',
    'nightly', 'early closure', 'weekend closure',
    'starting tonight', 'will be closed'
  ];
  return scheduledPatterns.some(p => lowerText.includes(p));
}

// Check if alert is a cancellation of a scheduled closure
function isClosureCancelled(text: string): boolean {
  const lowerText = text.toLowerCase();
  // Pattern: "planned ... has been cancelled" or "scheduled ... cancelled"
  return (
    (lowerText.includes('planned') || lowerText.includes('scheduled')) &&
    (lowerText.includes('cancelled') || lowerText.includes('canceled'))
  );
}

// Check if alert is a site-wide banner (not route-specific)
function isSiteWideBanner(alert: TtcApiAlert): boolean {
  const route = alert.route || '';
  const id = alert.id || '';
  return route === '' || route === 'SiteWide' || id.includes('sitewide');
}

// Get base route number for matching (37A -> 37, Line 1 -> Line 1)
function getBaseRoute(route: string): string {
  // Handle subway lines
  if (route.toLowerCase().startsWith('line')) {
    return route;
  }
  // Extract base number from route branch (37A -> 37)
  const match = route.match(/^(\d+)/);
  return match ? match[1] : route;
}

// Check if two alerts match by route for threading
function alertsMatch(alert1Routes: string[], alert2Routes: string[]): boolean {
  const baseRoutes1 = new Set(alert1Routes.map(getBaseRoute));
  const baseRoutes2 = new Set(alert2Routes.map(getBaseRoute));
  
  for (const route of baseRoutes1) {
    if (baseRoutes2.has(route)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// ELEVATOR THREAD ID GENERATION
// ============================================================================
interface ElevatorInfo {
  elevatorCode: string | null | undefined;
  headerText: string;
  alertId?: string;
}

function generateElevatorThreadId(info: ElevatorInfo): { threadId: string; suffix: string } {
  const { elevatorCode, headerText, alertId } = info;
  
  const stationMatch = headerText.match(/^([^:]+):/);
  const station = stationMatch ? stationMatch[1].trim() : 'Unknown';
  const cleanStation = station.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (elevatorCode && elevatorCode !== 'Non-TTC') {
    return {
      threadId: `thread-elev-${elevatorCode}`,
      suffix: elevatorCode
    };
  }
  
  const detailMatch = headerText.match(/between\s+(.+?)\s+and\s+/i);
  const detail = detailMatch 
    ? detailMatch[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20) 
    : '';
  
  const suffix = `nonttc-${cleanStation}-${detail || (alertId ? alertId.slice(-8) : 'unknown')}`;
  
  return {
    threadId: `thread-elev-${suffix}`,
    suffix: suffix
  };
}

// ============================================================================
// RSZ THREAD ID GENERATION
// ============================================================================
function generateRszThreadId(alertId: string): { threadId: string; lineNumber: string; location: string } {
  const parts = alertId.replace(/^ttc-rsz-/i, '').split('-');
  const lineNumber = parts[0];
  const location = parts.slice(1).join('-');
  
  if (location.toLowerCase().startsWith('line')) {
    return { 
      threadId: `thread-rsz-legacy-${lineNumber}`, 
      lineNumber, 
      location: 'legacy' 
    };
  }
  
  return { 
    threadId: `thread-rsz-line${lineNumber}-${location}`, 
    lineNumber, 
    location 
  };
}

// Type for TTC API alert
interface TtcApiAlert {
  id: string;
  route: string;
  routeType: string;
  headerText: string;
  effect: string;
  effectDesc: string;
  severity: string;
  lastUpdated?: string;
  elevatorCode?: string;
  stopStart?: string;
  stopEnd?: string;
  rszLength?: string;
  targetRemoval?: string;
}

// Type for TTC alert data
interface TtcAlertData {
  disruptionAlerts: TtcApiAlert[];
  serviceResumedAlerts: TtcApiAlert[];
  rszAlerts: TtcApiAlert[];
  elevatorAlerts: TtcApiAlert[];
  scheduledAlerts: TtcApiAlert[];
  cancellationAlerts: TtcApiAlert[];
}

// Fetch and categorize all alerts from TTC API
async function fetchTtcData(): Promise<TtcAlertData> {
  const result: TtcAlertData = {
    disruptionAlerts: [],
    serviceResumedAlerts: [],
    rszAlerts: [],
    elevatorAlerts: [],
    scheduledAlerts: [],
    cancellationAlerts: []
  };
  
  try {
    const response = await fetch(TTC_LIVE_ALERTS_API, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`TTC API error: ${response.status}`);
      return result;
    }
    
    const data = await response.json();
    const routes = data.routes || [];
    const accessibility = data.accessibility || [];
    
    // Process route alerts
    for (const routeAlert of routes) {
      // Skip site-wide banners
      if (isSiteWideBanner(routeAlert)) {
        continue;
      }
      
      const headerText = routeAlert.headerText || '';
      
      // Check if RSZ
      if (isRszAlert(routeAlert)) {
        result.rszAlerts.push(routeAlert);
        continue;
      }
      
      // Check if service resumed
      if (isServiceResumed(headerText)) {
        result.serviceResumedAlerts.push(routeAlert);
        continue;
      }
      
      // Check if closure cancellation (must check BEFORE scheduled closure)
      if (isClosureCancelled(headerText)) {
        result.cancellationAlerts.push(routeAlert);
        continue;
      }
      
      // Check if scheduled closure/maintenance
      if (isScheduledClosure(headerText)) {
        result.scheduledAlerts.push(routeAlert);
        continue;
      }
      
      // Everything else is a disruption
      result.disruptionAlerts.push(routeAlert);
    }
    
    // Process accessibility (elevator/escalator) alerts
    for (const accessAlert of accessibility) {
      result.elevatorAlerts.push(accessAlert);
    }
    
    console.log(`TTC API: ${result.disruptionAlerts.length} disruptions, ${result.serviceResumedAlerts.length} service resumed, ${result.scheduledAlerts.length} scheduled, ${result.cancellationAlerts.length} cancellations, ${result.rszAlerts.length} RSZ, ${result.elevatorAlerts.length} elevators`);
  } catch (error) {
    console.error('Failed to fetch TTC API:', error);
  }
  
  return result;
}

// Generate a unique alert ID for TTC API alerts
// Note: IDs can collide for similar alerts (e.g., "not stopping at Bay" vs "Woodbine")
// The dedup logic in processDisruptionAlerts checks header_text to prevent true duplicates
function generateTtcAlertId(type: string, route: string, text: string, stopStart?: string, stopEnd?: string): string {
  let idBase = `ttc-${type}-${route}`;
  
  if (stopStart && stopEnd) {
    // RSZ alerts use stop names for uniqueness
    const cleanStart = stopStart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    const cleanEnd = stopEnd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    idBase += `-${cleanStart}-${cleanEnd}`;
  } else {
    // Standard text-based ID
    const cleanText = text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    idBase += `-${cleanText}`;
  }
  
  return idBase.substring(0, 100);
}

// Generate thread ID for disruption/scheduled alerts
function generateDisruptionThreadId(alertId: string): string {
  // Alert IDs are like "ttc-alert-40-detour..." or "ttc-scheduled-2-weekend..."
  // Thread IDs should be "thread-alert-40-detour..." (strip the ttc- prefix from alertId)
  const cleanAlertId = alertId.replace(/^ttc-/, '');
  return `thread-${cleanAlertId}`;
}

// Map TTC API effect to our effect types
function mapTtcEffect(effect: string, effectDesc: string, headerText: string): string {
  const lowerEffect = (effect || '').toUpperCase();
  const lowerEffectDesc = (effectDesc || '').toLowerCase();
  const lowerHeader = (headerText || '').toLowerCase();
  
  // Service resumed
  if (isServiceResumed(headerText)) {
    return 'SERVICE_RESUMED';
  }
  
  // Scheduled closure
  if (isScheduledClosure(headerText)) {
    return 'SCHEDULED_CLOSURE';
  }
  
  // Map TTC API effects to our categories
  if (lowerEffect === 'NO_SERVICE' || lowerEffectDesc.includes('no service')) {
    return 'NO_SERVICE';
  }
  if (lowerEffect === 'DETOUR' || lowerEffectDesc.includes('detour')) {
    return 'DETOUR';
  }
  if (lowerEffect === 'SIGNIFICANT_DELAYS' || lowerEffectDesc.includes('delay')) {
    return 'SIGNIFICANT_DELAYS';
  }
  if (lowerEffect === 'REDUCED_SERVICE' || lowerEffectDesc.includes('reduced')) {
    return 'REDUCED_SERVICE';
  }
  if (lowerHeader.includes('shuttle') || lowerHeader.includes('buses replacing')) {
    return 'SHUTTLE';
  }
  if (lowerHeader.includes('divert') || lowerHeader.includes('detour')) {
    return 'DETOUR';
  }
  
  return 'DISRUPTION';
}

// Process disruption alerts from TTC API
async function processDisruptionAlerts(
  supabase: any, 
  disruptionAlerts: TtcApiAlert[],
  serviceResumedAlerts: TtcApiAlert[]
): Promise<{ newAlerts: number; updatedThreads: number; resolvedThreads: number; hiddenThreads: number }> {
  let newAlerts = 0;
  let updatedThreads = 0;
  let resolvedThreads = 0;
  let hiddenThreads = 0;

  // Track current disruption alert IDs
  const currentAlertIds = new Set<string>();
  
  // STEP 1: Process current disruption alerts
  for (const alert of disruptionAlerts) {
    const headerText = alert.headerText || '';
    const route = alert.route || '';
    
    // Skip alerts with empty headerText - these create malformed threads
    if (!headerText.trim()) {
      console.log(`Skipping disruption alert with empty headerText: route=${route}`);
      continue;
    }
    
    const alertId = generateTtcAlertId('alert', route, headerText);
    currentAlertIds.add(alertId);
    
    console.log(`Processing disruption: route=${route}, alertId=${alertId}`);
    
    // Check if this alert already exists by ID
    const { data: existingById, error: existingByIdError } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .maybeSingle();
    
    if (existingByIdError) {
      console.error('Error checking existing disruption alert by ID:', existingByIdError);
      continue;
    }
    
    if (existingById) {
      console.log(`Disruption alert ${alertId} already exists (by ID), skipping`);
      continue;
    }
    
    // v214: Also check by exact header_text to prevent ID collision duplicates
    // This catches cases like "not stopping at Bay" vs "not stopping at Woodbine"
    // which would otherwise generate the same truncated ID
    const { data: existingByText, error: existingByTextError } = await supabase
      .from('alert_cache')
      .select('alert_id, header_text')
      .eq('header_text', headerText.substring(0, 500))
      .eq('is_latest', true)
      .maybeSingle();
    
    if (existingByTextError) {
      console.error('Error checking existing disruption alert by text:', existingByTextError);
      // Don't fail - just proceed with ID-based logic
    } else if (existingByText) {
      console.log(`Disruption alert with same header_text already exists as ${existingByText.alert_id}, skipping ${alertId}`);
      // Add the existing alert ID to current set so it doesn't get marked as resolved
      currentAlertIds.add(existingByText.alert_id);
      continue;
    }
    
    console.log(`Inserting new disruption alert: ${alertId}`);

    // Extract routes
    let routes: string[];
    if (route && /^[1-4]$/.test(route)) {
      routes = [`Line ${route}`];
    } else if (route) {
      routes = [route];
    } else {
      routes = extractRoutes(headerText);
    }
    
    const { category } = categorizeAlert(headerText);
    const effect = mapTtcEffect(alert.effect, alert.effectDesc, headerText);
    const threadId = generateDisruptionThreadId(alertId);

    // Insert alert WITHOUT thread_id first (to avoid FK constraint)
    const alertRecord = {
      alert_id: alertId,
      header_text: headerText.substring(0, 500),
      description_text: headerText,
      categories: [category],
      affected_routes: routes,
      created_at: alert.lastUpdated || new Date().toISOString(),
      is_latest: true,
      effect: effect
    };

    const { data: insertedAlert, error: insertError } = await supabase
      .from('alert_cache')
      .insert(alertRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Disruption alert insert error:', insertError);
      continue;
    }

    newAlerts++;
    console.log(`Inserted disruption alert ${alertId}`);

    // Create/update thread
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id, is_hidden, is_resolved')
      .eq('thread_id', threadId)
      .maybeSingle();
    
    if (!existingThread) {
      // Use MD5 hash of full thread_id for guaranteed uniqueness
      const uniqueHash = await generateMd5Hash(threadId);
      
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          thread_hash: uniqueHash,
          title: headerText.substring(0, 200),
          affected_routes: routes,
          categories: [category],
          is_resolved: false,
          is_hidden: false,
          missed_polls: 0,
          created_at: alert.lastUpdated || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (threadError) {
        console.error('Disruption thread creation error:', threadError);
      } else {
        console.log(`Created new disruption thread ${threadId}`);
        updatedThreads++;
      }
    } else if (existingThread.is_hidden || existingThread.is_resolved) {
      // Unhide/unresolve if alert reappeared
      await supabase
        .from('incident_threads')
        .update({ 
          is_hidden: false, 
          is_resolved: false,
          missed_polls: 0,
          pending_since: null,
          updated_at: new Date().toISOString() 
        })
        .eq('thread_id', threadId);
      
      // Cleanup monitoring entry - alert came back before it resolved
      await supabase
        .from('service_resumed_monitoring')
        .delete()
        .eq('thread_id', threadId)
        .is('service_resumed_at', null);
      
      console.log(`Unhid/unresolved thread ${threadId} - alert reappeared`);
      updatedThreads++;
    } else if (existingThread.missed_polls > 0) {
      // Alert was briefly missing but came back - reset and cleanup monitoring
      await supabase
        .from('incident_threads')
        .update({ 
          missed_polls: 0,
          pending_since: null,
          updated_at: new Date().toISOString() 
        })
        .eq('thread_id', threadId);
      
      // Cleanup monitoring entry - alert came back before it resolved
      await supabase
        .from('service_resumed_monitoring')
        .delete()
        .eq('thread_id', threadId)
        .is('service_resumed_at', null);
      
      console.log(`Thread ${threadId} reappeared - cleaned up monitoring entry`);
    }

    // Update alert with thread_id
    await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', insertedAlert.alert_id);
  }

  // STEP 2: Find threads that are no longer in TTC API (disappeared)
  const { data: activeThreads } = await supabase
    .from('incident_threads')
    .select('thread_id, title, affected_routes, categories, missed_polls, pending_since')
    .like('thread_id', 'thread-alert-%')
    .eq('is_resolved', false)
    .eq('is_hidden', false);

  for (const thread of activeThreads || []) {
    // Extract alert ID from thread ID (thread-alert-X -> ttc-alert-X)
    const alertId = 'ttc-' + thread.thread_id.replace('thread-', '');
    
    if (!currentAlertIds.has(alertId)) {
      // Alert disappeared from TTC API
      const missedPolls = (thread.missed_polls || 0) + 1;
      const pendingSince = thread.pending_since || new Date().toISOString();
      
      console.log(`Thread ${thread.thread_id} disappeared - missed_polls: ${missedPolls}`);
      
      // MONITORING: Track when disruption first disappears (missedPolls == 1)
      if (missedPolls === 1) {
        const route = (thread.affected_routes as string[])?.[0] || 'unknown';
        await supabase
          .from('service_resumed_monitoring')
          .insert({
            thread_id: thread.thread_id,
            route: route,
            disruption_removed_at: new Date().toISOString(),
            polls_since_removal: 0
          });
        console.log(`MONITORING: Started tracking ${thread.thread_id} for service resumed`);
      }
      
      // Check for matching service resumed alert
      let matchedResumed: TtcApiAlert | null = null;
      const threadRoutes = thread.affected_routes || [];
      
      for (const resumed of serviceResumedAlerts) {
        let resumedRoutes: string[];
        if (resumed.route && /^[1-4]$/.test(resumed.route)) {
          resumedRoutes = [`Line ${resumed.route}`];
        } else if (resumed.route) {
          resumedRoutes = [resumed.route];
        } else {
          resumedRoutes = extractRoutes(resumed.headerText || '');
        }
        
        if (alertsMatch(threadRoutes, resumedRoutes)) {
          matchedResumed = resumed;
          break;
        }
      }
      
      if (matchedResumed) {
        // Found matching service resumed - resolve thread with threading
        console.log(`Resolving thread ${thread.thread_id} with service resumed: ${matchedResumed.headerText?.substring(0, 50)}`);
        
        // Insert service resumed alert - use thread-specific ID to allow duplicates for multiple threads
        // Use MD5 hash of full thread_id to ensure uniqueness (truncation caused collisions)
        const threadHash = await generateMd5Hash(thread.thread_id);
        const resumedAlertId = `ttc-resumed-${matchedResumed.route || 'unknown'}-${threadHash.substring(0, 12)}`;
        
        const { data: existingResumed } = await supabase
          .from('alert_cache')
          .select('alert_id')
          .eq('alert_id', resumedAlertId)
          .maybeSingle();
        
        if (!existingResumed) {
          await supabase
            .from('alert_cache')
            .insert({
              alert_id: resumedAlertId,
              thread_id: thread.thread_id,
              header_text: (matchedResumed.headerText || '').substring(0, 500),
              description_text: matchedResumed.headerText || '',
              categories: ['SERVICE_RESUMED'],
              affected_routes: threadRoutes,
              created_at: matchedResumed.lastUpdated || new Date().toISOString(),
              is_latest: true,
              effect: 'SERVICE_RESUMED'
            });
          
          // Mark old alerts as not latest
          await supabase
            .from('alert_cache')
            .update({ is_latest: false })
            .eq('thread_id', thread.thread_id)
            .neq('alert_id', resumedAlertId);
        }
        
        // Update thread - resolve with SERVICE_RESUMED category
        const existingCategories = (thread.categories as string[]) || [];
        const newCategories = existingCategories.includes('SERVICE_RESUMED') 
          ? existingCategories 
          : [...existingCategories, 'SERVICE_RESUMED'];
        
        await supabase
          .from('incident_threads')
          .update({
            is_resolved: true,
            is_hidden: false, // Keep visible in Recently Resolved
            resolved_at: new Date().toISOString(),
            categories: newCategories,
            missed_polls: 0,
            pending_since: null,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
        
        // MONITORING: Update when service resumed is found
        await supabase
          .from('service_resumed_monitoring')
          .update({
            service_resumed_at: new Date().toISOString(),
            polls_since_removal: missedPolls,
            service_resumed_text: (matchedResumed.headerText || '').substring(0, 200)
          })
          .eq('thread_id', thread.thread_id)
          .is('service_resumed_at', null);
        console.log(`MONITORING: Service resumed found for ${thread.thread_id} after ${missedPolls} polls`);
        
        resolvedThreads++;
      } else if (missedPolls >= MAX_MISSED_POLLS) {
        // No service resumed found after grace period - hide thread
        console.log(`Hiding thread ${thread.thread_id} after ${missedPolls} missed polls without service resumed`);
        
        await supabase
          .from('incident_threads')
          .update({
            is_hidden: true,
            missed_polls: missedPolls,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
        
        // MONITORING: Log that thread was hidden without service resumed
        await supabase
          .from('service_resumed_monitoring')
          .update({
            polls_since_removal: missedPolls
          })
          .eq('thread_id', thread.thread_id)
          .is('service_resumed_at', null);
        console.log(`MONITORING: Thread ${thread.thread_id} hidden after ${missedPolls} polls with NO service resumed`);
        
        hiddenThreads++;
      } else {
        // Still within grace period - update missed_polls
        await supabase
          .from('incident_threads')
          .update({
            missed_polls: missedPolls,
            pending_since: pendingSince,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
      }
    }
  }

  // STEP 3: Check if any current service resumed alerts match recently resolved threads that don't have a resumed alert
  for (const resumed of serviceResumedAlerts) {
    let resumedRoutes: string[];
    if (resumed.route && /^[1-4]$/.test(resumed.route)) {
      resumedRoutes = [`Line ${resumed.route}`];
    } else if (resumed.route) {
      resumedRoutes = [resumed.route];
    } else {
      resumedRoutes = extractRoutes(resumed.headerText || '');
    }
    
    // Find resolved threads for this route that don't have a service resumed alert
    const { data: resolvedThreadsWithoutResumed } = await supabase
      .from('incident_threads')
      .select('thread_id, title, affected_routes')
      .like('thread_id', 'thread-alert-%')
      .eq('is_resolved', true)
      .eq('is_hidden', false)
      .gte('resolved_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
    
    for (const thread of resolvedThreadsWithoutResumed || []) {
      const threadRoutes = thread.affected_routes || [];
      
      if (!alertsMatch(threadRoutes, resumedRoutes)) continue;
      
      // Check if this thread already has a service resumed alert
      const { data: existingResumed } = await supabase
        .from('alert_cache')
        .select('alert_id')
        .eq('thread_id', thread.thread_id)
        .eq('effect', 'SERVICE_RESUMED')
        .maybeSingle();
      
      if (existingResumed) continue;
      
      // Insert service resumed alert for this thread - use MD5 hash for uniqueness
      const threadHash = await generateMd5Hash(thread.thread_id);
      const resumedAlertId = `ttc-resumed-${resumed.route || 'unknown'}-${threadHash.substring(0, 12)}`;
      
      // Check if this specific resumed alert already exists
      const { data: existingAlert } = await supabase
        .from('alert_cache')
        .select('alert_id')
        .eq('alert_id', resumedAlertId)
        .maybeSingle();
      
      if (!existingAlert) {
        console.log(`Adding service resumed to resolved thread ${thread.thread_id}: ${resumed.headerText?.substring(0, 50)}`);
        
        await supabase
          .from('alert_cache')
          .insert({
            alert_id: resumedAlertId,
            thread_id: thread.thread_id,
            header_text: (resumed.headerText || '').substring(0, 500),
            description_text: resumed.headerText || '',
            categories: ['SERVICE_RESUMED'],
            affected_routes: threadRoutes,
            created_at: resumed.lastUpdated || new Date().toISOString(),
            is_latest: true,
            effect: 'SERVICE_RESUMED'
          });
        
        // Mark old alerts in this thread as not latest
        await supabase
          .from('alert_cache')
          .update({ is_latest: false })
          .eq('thread_id', thread.thread_id)
          .neq('alert_id', resumedAlertId);
      }
    }
  }

  console.log(`Disruption processing: ${newAlerts} new, ${updatedThreads} updated, ${resolvedThreads} resolved, ${hiddenThreads} hidden`);
  return { newAlerts, updatedThreads, resolvedThreads, hiddenThreads };
}

// Process scheduled closure alerts from TTC API
async function processScheduledAlerts(supabase: any, scheduledAlerts: TtcApiAlert[]): Promise<{ newAlerts: number; updatedThreads: number; hiddenThreads: number }> {
  let newAlerts = 0;
  let updatedThreads = 0;
  let hiddenThreads = 0;

  // Track current scheduled alert IDs
  const currentAlertIds = new Set<string>();
  
  for (const alert of scheduledAlerts) {
    const headerText = alert.headerText || '';
    const route = alert.route || '';
    
    // Skip alerts with empty headerText
    if (!headerText.trim()) {
      console.log(`Skipping scheduled alert with empty headerText: route=${route}`);
      continue;
    }
    
    const alertId = generateTtcAlertId('scheduled', route, headerText);
    currentAlertIds.add(alertId);
    
    // Check if this alert already exists (use maybeSingle to avoid error on no rows)
    const { data: existing, error: existingError } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .maybeSingle();
    
    if (existingError) {
      console.error('Error checking existing scheduled alert:', existingError);
      continue;
    }
    
    if (existing) {
      continue;
    }

    // Extract routes
    let routes: string[];
    if (route && /^[1-4]$/.test(route)) {
      routes = [`Line ${route}`];
    } else if (route) {
      routes = [route];
    } else {
      routes = extractRoutes(headerText);
    }
    
    // Use consistent thread ID format (strip ttc- prefix from alertId)
    const threadId = generateDisruptionThreadId(alertId);

    // Insert alert WITHOUT thread_id first (to avoid FK constraint)
    const alertRecord = {
      alert_id: alertId,
      header_text: headerText.substring(0, 500),
      description_text: headerText,
      categories: ['SCHEDULED_CLOSURE'],
      affected_routes: routes,
      created_at: alert.lastUpdated || new Date().toISOString(),
      is_latest: true,
      effect: 'SCHEDULED_CLOSURE'
    };

    const { data: insertedAlert, error: insertError } = await supabase
      .from('alert_cache')
      .insert(alertRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Scheduled alert insert error:', insertError);
      continue;
    }

    newAlerts++;
    console.log(`Inserted scheduled alert ${alertId}`);

    // Create/update thread
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id, is_hidden')
      .eq('thread_id', threadId)
      .maybeSingle();
    
    if (!existingThread) {
      // Use MD5 hash of thread_id for unique thread_hash
      const uniqueHash = await generateMd5Hash(threadId);
      
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          thread_hash: uniqueHash,
          title: headerText.substring(0, 200),
          affected_routes: routes,
          categories: ['SCHEDULED_CLOSURE'],
          is_resolved: false,
          is_hidden: false,
          missed_polls: 0,
          created_at: alert.lastUpdated || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (threadError) {
        console.error('Scheduled thread creation error:', threadError);
      } else {
        console.log(`Created new scheduled thread ${threadId}`);
        updatedThreads++;
      }
    } else if (existingThread.is_hidden) {
      // Unhide if alert reappeared
      await supabase
        .from('incident_threads')
        .update({ 
          is_hidden: false, 
          missed_polls: 0,
          updated_at: new Date().toISOString() 
        })
        .eq('thread_id', threadId);
      console.log(`Unhid scheduled thread ${threadId}`);
      updatedThreads++;
    }

    // Update alert with thread_id
    await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', insertedAlert.alert_id);
  }

  // Hide scheduled threads that are no longer in TTC API (immediately, no grace period)
  const { data: activeScheduledThreads } = await supabase
    .from('incident_threads')
    .select('thread_id')
    .like('thread_id', 'thread-scheduled-%')
    .eq('is_hidden', false);

  for (const thread of activeScheduledThreads || []) {
    // Extract alert ID from thread ID (thread-scheduled-X -> ttc-scheduled-X)
    const alertId = 'ttc-' + thread.thread_id.replace('thread-', '');
    
    if (!currentAlertIds.has(alertId)) {
      console.log(`Hiding scheduled thread ${thread.thread_id} - no longer in TTC API`);
      
      await supabase
        .from('incident_threads')
        .update({
          is_hidden: true,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', thread.thread_id);
      
      hiddenThreads++;
    }
  }

  console.log(`Scheduled processing: ${newAlerts} new, ${updatedThreads} updated, ${hiddenThreads} hidden`);
  return { newAlerts, updatedThreads, hiddenThreads };
}

// Process closure cancellation alerts from TTC API
// These alerts indicate that a planned closure has been cancelled
// e.g., "Tonight's planned early subway closure between Finch and Eglinton stations has been cancelled."
async function processCancellationAlerts(supabase: any, cancellationAlerts: TtcApiAlert[]): Promise<{ cancelledThreads: number }> {
  let cancelledThreads = 0;

  for (const alert of cancellationAlerts) {
    const headerText = alert.headerText || '';
    const route = alert.route || '';
    
    // Extract the line number from the route or text
    let lineNum: string | null = null;
    if (route && /^[1-4]$/.test(route)) {
      lineNum = route;
    } else {
      // Try to extract from text like "Line 1 Yonge-University"
      const lineMatch = headerText.match(/Line\s*(\d)/i);
      if (lineMatch) {
        lineNum = lineMatch[1];
      }
    }
    
    if (!lineNum) {
      console.log(`Cancellation alert without identifiable line: ${headerText.substring(0, 50)}...`);
      continue;
    }
    
    console.log(`Processing cancellation for Line ${lineNum}: ${headerText.substring(0, 80)}...`);
    
    // Find and hide any active scheduled closure threads for this line
    const { data: scheduledThreads } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .like('thread_id', `thread-scheduled-${lineNum}-%`)
      .eq('is_hidden', false)
      .eq('is_resolved', false);
    
    for (const thread of scheduledThreads || []) {
      console.log(`Cancelling scheduled closure thread ${thread.thread_id} due to cancellation alert`);
      
      await supabase
        .from('incident_threads')
        .update({
          is_hidden: true,
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', thread.thread_id);
      
      cancelledThreads++;
    }
  }

  if (cancelledThreads > 0) {
    console.log(`Cancellation processing: ${cancelledThreads} scheduled closures cancelled`);
  }
  return { cancelledThreads };
}

// Process RSZ alerts from TTC API
async function processRszAlerts(supabase: any, rszAlerts: TtcApiAlert[]): Promise<{ newAlerts: number; updatedThreads: number }> {
  let newAlerts = 0;
  let updatedThreads = 0;

  for (const rsz of rszAlerts) {
    const headerText = rsz.headerText || '';
    const route = rsz.route || '';
    const stopStart = rsz.stopStart || '';
    const stopEnd = rsz.stopEnd || '';
    const alertId = generateTtcAlertId('rsz', route, headerText, stopStart, stopEnd);
    
    const { data: existing, error: existingError } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .maybeSingle();
    
    if (existingError) {
      console.error('Error checking existing RSZ alert:', existingError);
      continue;
    }
    
    if (existing) {
      continue;
    }

    let routes: string[];
    if (route && /^[1-4]$/.test(route)) {
      routes = [`Line ${route}`];
    } else if (route) {
      routes = [route];
    } else {
      routes = extractRoutes(headerText);
    }
    
    let description = headerText;
    if (rsz.rszLength) {
      description += `\n\nReduced Speed Zone Length: ${rsz.rszLength}`;
    }
    if (rsz.targetRemoval) {
      description += `\nTarget Removal: ${rsz.targetRemoval}`;
    }
    if (rsz.stopStart && rsz.stopEnd) {
      description += `\nAffected Area: ${rsz.stopStart} to ${rsz.stopEnd}`;
    }

    const alert = {
      alert_id: alertId,
      header_text: headerText.substring(0, 200),
      description_text: description,
      categories: ['RSZ'],
      affected_routes: routes,
      created_at: new Date().toISOString(),
      is_latest: true,
      effect: 'RSZ'
    };

    const { data: newAlert, error: insertError } = await supabase
      .from('alert_cache')
      .insert(alert)
      .select()
      .single();

    if (insertError) {
      console.error('RSZ insert error:', insertError);
      continue;
    }

    newAlerts++;

    const { threadId } = generateRszThreadId(alertId);
    
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id, is_hidden')
      .eq('thread_id', threadId)
      .single();
    
    if (!existingThread) {
      // Use MD5 hash of thread_id for unique thread_hash
      const uniqueHash = await generateMd5Hash(threadId);
      
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          thread_hash: uniqueHash,
          title: headerText.substring(0, 200),
          affected_routes: routes,
          categories: ['RSZ'],
          is_resolved: false,
          is_hidden: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (threadError) {
        console.error('RSZ thread creation error:', threadError);
      } else {
        console.log(`RSZ: Created new thread ${threadId}`);
      }
    } else if (existingThread.is_hidden) {
      await supabase
        .from('incident_threads')
        .update({ is_hidden: false, updated_at: new Date().toISOString() })
        .eq('thread_id', threadId);
      console.log(`RSZ: Unhid existing thread ${threadId}`);
    }

    await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', newAlert.alert_id);
    
    updatedThreads++;
  }

  console.log(`RSZ processing: ${newAlerts} new alerts, ${updatedThreads} threads updated`);
  return { newAlerts, updatedThreads };
}

// Process elevator/escalator alerts from TTC API
async function processElevatorAlerts(supabase: any, elevatorAlerts: TtcApiAlert[]): Promise<{ newAlerts: number; updatedThreads: number }> {
  let newAlerts = 0;
  let updatedThreads = 0;

  for (const elevator of elevatorAlerts) {
    const headerText = elevator.headerText || '';
    const elevatorCode = elevator.elevatorCode || '';
    const alertId = generateTtcAlertId('elev', elevatorCode || 'unknown', headerText);
    
    const { data: existing, error: existingError } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .maybeSingle();
    
    if (existingError) {
      console.error('Error checking existing elevator alert:', existingError);
      continue;
    }
    
    if (existing) {
      continue;
    }

    const stationMatch = headerText.match(/^([^:]+):/);
    const station = stationMatch ? stationMatch[1].trim() : 'Unknown Station';
    
    const cleanedHeaderText = headerText.replace(/-TTC\s*$/i, '').trim();

    const alert = {
      alert_id: alertId,
      header_text: cleanedHeaderText.substring(0, 200),
      description_text: cleanedHeaderText,
      categories: ['ACCESSIBILITY'],
      affected_routes: [station],
      created_at: new Date().toISOString(),
      is_latest: true,
      effect: 'ACCESSIBILITY_ISSUE'
    };

    const { data: newAlert, error: insertError } = await supabase
      .from('alert_cache')
      .insert(alert)
      .select()
      .single();

    if (insertError) {
      console.error('Elevator insert error:', insertError);
      continue;
    }

    newAlerts++;

    const { threadId } = generateElevatorThreadId({
      elevatorCode,
      headerText: cleanedHeaderText,
      alertId
    });
    
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .eq('thread_id', threadId)
      .single();
    
    if (existingThread) {
      await supabase
        .from('alert_cache')
        .update({ thread_id: threadId })
        .eq('alert_id', newAlert.alert_id);
      
      updatedThreads++;
    } else {
      // Use MD5 hash of thread_id for unique thread_hash
      const uniqueHash = await generateMd5Hash(threadId);
      
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          thread_hash: uniqueHash,
          title: headerText.substring(0, 200),
          affected_routes: [station],
          categories: ['ACCESSIBILITY'],
          is_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (threadError) {
        console.error('Elevator thread creation error:', threadError);
      } else {
        await supabase
          .from('alert_cache')
          .update({ thread_id: threadId })
          .eq('alert_id', newAlert.alert_id);
        
        updatedThreads++;
      }
    }
  }

  console.log(`Elevator processing: ${newAlerts} new alerts, ${updatedThreads} threads updated`);
  return { newAlerts, updatedThreads };
}

// Resolve elevator and RSZ threads that are no longer in TTC API
async function resolveStaleThreads(
  supabase: any, 
  ttcData: TtcAlertData
): Promise<{ resolvedElevators: number; resolvedRszThreads: number }> {
  let resolvedElevators = 0;
  let resolvedRszThreads = 0;

  // ELEVATORS
  const activeElevatorSuffixes = new Set<string>();
  for (const e of ttcData.elevatorAlerts) {
    const { suffix } = generateElevatorThreadId({
      elevatorCode: e.elevatorCode,
      headerText: e.headerText || ''
    });
    activeElevatorSuffixes.add(suffix);
  }
  
  const { data: accessibilityThreads } = await supabase
    .from('incident_threads')
    .select('thread_id, title, affected_routes')
    .filter('categories', 'cs', '["ACCESSIBILITY"]')
    .eq('is_resolved', false)
    .eq('is_hidden', false);
  
  for (const thread of accessibilityThreads || []) {
    const suffixMatch = thread.thread_id?.match(/^thread-elev-(.+)$/);
    const threadSuffix = suffixMatch ? suffixMatch[1] : null;
    
    if (!threadSuffix) {
      const stationName = Array.isArray(thread.affected_routes) ? thread.affected_routes[0] : '';
      const stationHasActiveElevator = ttcData.elevatorAlerts.some(e => {
        const match = e.headerText?.match(/^([^:]+):/);
        return match && match[1].trim() === stationName;
      });
      
      if (stationName && !stationHasActiveElevator) {
        await supabase
          .from('incident_threads')
          .update({ 
            is_resolved: true,
            is_hidden: true,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
        
        resolvedElevators++;
      }
      continue;
    }
    
    if (!activeElevatorSuffixes.has(threadSuffix)) {
      console.log(`Resolving elevator thread: "${thread.title}" - no longer in TTC API`);
      
      await supabase
        .from('incident_threads')
        .update({ 
          is_resolved: true,
          is_hidden: true,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', thread.thread_id);
      
      resolvedElevators++;
    }
  }

  // RSZ
  const activeRszThreadIds = new Set<string>();
  for (const rsz of ttcData.rszAlerts) {
    const route = rsz.route || '';
    const stopStart = rsz.stopStart || '';
    const stopEnd = rsz.stopEnd || '';
    const headerText = rsz.headerText || '';
    
    const alertId = generateTtcAlertId('rsz', route, headerText, stopStart, stopEnd);
    const { threadId } = generateRszThreadId(alertId);
    activeRszThreadIds.add(threadId);
  }
  
  const { data: rszThreads } = await supabase
    .from('incident_threads')
    .select('thread_id, title')
    .filter('categories', 'cs', '["RSZ"]')
    .eq('is_resolved', false)
    .eq('is_hidden', false);
  
  for (const thread of rszThreads || []) {
    if (thread.thread_id?.includes('legacy')) continue;
    
    if (!activeRszThreadIds.has(thread.thread_id)) {
      console.log(`Resolving RSZ thread: "${thread.title}" - no longer in TTC API`);
      
      await supabase
        .from('incident_threads')
        .update({ 
          is_resolved: true,
          is_hidden: true,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', thread.thread_id);
      
      resolvedRszThreads++;
    }
  }

  return { resolvedElevators, resolvedRszThreads };
}

// ============================================================================
// ORPHAN ALERT FIXER - Ensures all alerts have proper threads
// ============================================================================
async function fixOrphanAlerts(supabase: any): Promise<{ fixed: number }> {
  let fixed = 0;
  
  // Find alerts without thread_id that start with 'ttc-'
  const { data: orphans, error } = await supabase
    .from('alert_cache')
    .select('alert_id, header_text, affected_routes, categories, created_at')
    .is('thread_id', null)
    .or('alert_id.like.ttc-alert-%,alert_id.like.ttc-scheduled-%');
  
  if (error) {
    console.error('Error finding orphan alerts:', error);
    return { fixed: 0 };
  }
  
  for (const orphan of orphans || []) {
    console.log(`Fixing orphan alert: ${orphan.alert_id}`);
    
    // Generate thread ID from alert ID (ttc-alert-X -> thread-alert-X)
    const threadId = 'thread-' + orphan.alert_id.replace('ttc-', '');
    
    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .eq('thread_id', threadId)
      .maybeSingle();
    
    if (!existingThread) {
      // Create thread with MD5 hash
      const uniqueHash = await generateMd5Hash(threadId);
      
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          thread_hash: uniqueHash,
          title: (orphan.header_text || 'Unknown alert').substring(0, 200),
          affected_routes: orphan.affected_routes || [],
          categories: orphan.categories || ['Disruption'],
          is_resolved: false,
          is_hidden: false,
          missed_polls: 0,
          created_at: orphan.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (threadError) {
        console.error(`Failed to create thread for orphan ${orphan.alert_id}:`, threadError);
        continue;
      }
      console.log(`Created thread ${threadId} for orphan alert`);
    }
    
    // Link alert to thread
    const { error: updateError } = await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', orphan.alert_id);
    
    if (updateError) {
      console.error(`Failed to link orphan ${orphan.alert_id} to thread:`, updateError);
      continue;
    }
    
    console.log(`Linked orphan alert ${orphan.alert_id} to thread ${threadId}`);
    fixed++;
  }
  
  return { fixed };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // STEP 1: Fetch all TTC API data
    const ttcData = await fetchTtcData();

    // STEP 2: Process disruption alerts (with service resumed threading)
    const disruptionResult = await processDisruptionAlerts(
      supabase, 
      ttcData.disruptionAlerts,
      ttcData.serviceResumedAlerts
    );

    // STEP 3: Process scheduled closure alerts
    const scheduledResult = await processScheduledAlerts(supabase, ttcData.scheduledAlerts);

    // STEP 3.5: Process cancellation alerts (to resolve cancelled scheduled closures)
    const cancellationResult = await processCancellationAlerts(supabase, ttcData.cancellationAlerts);

    // STEP 4: Process RSZ alerts
    const rszResult = await processRszAlerts(supabase, ttcData.rszAlerts);

    // STEP 5: Process Elevator alerts
    const elevatorResult = await processElevatorAlerts(supabase, ttcData.elevatorAlerts);

    // STEP 6: Resolve stale elevator and RSZ threads
    const { resolvedElevators, resolvedRszThreads } = await resolveStaleThreads(supabase, ttcData);

    // STEP 7: Fix any orphan alerts (alerts without threads) - SAFETY NET
    const orphanResult = await fixOrphanAlerts(supabase);
    if (orphanResult.fixed > 0) {
      console.log(`Fixed ${orphanResult.fixed} orphan alerts`);
    }

    // Calculate totals
    const totalNewAlerts = disruptionResult.newAlerts + scheduledResult.newAlerts + rszResult.newAlerts + elevatorResult.newAlerts;
    const totalUpdatedThreads = disruptionResult.updatedThreads + scheduledResult.updatedThreads + rszResult.updatedThreads + elevatorResult.updatedThreads;

    return new Response(
      JSON.stringify({ 
        success: true,
        version: VERSION,
        architecture: 'TTC_API_ONLY',
        ttcApi: {
          disruptions: ttcData.disruptionAlerts.length,
          serviceResumed: ttcData.serviceResumedAlerts.length,
          scheduled: ttcData.scheduledAlerts.length,
          cancellations: ttcData.cancellationAlerts.length,
          rsz: ttcData.rszAlerts.length,
          elevators: ttcData.elevatorAlerts.length
        },
        results: {
          newAlerts: totalNewAlerts,
          updatedThreads: totalUpdatedThreads,
          resolvedThreads: disruptionResult.resolvedThreads,
          hiddenThreads: disruptionResult.hiddenThreads + scheduledResult.hiddenThreads,
          cancelledClosures: cancellationResult.cancelledThreads,
          resolvedElevators,
          resolvedRszThreads,
          orphansFixed: orphanResult.fixed
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, version: VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
