import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API endpoints
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';
const TTC_ALERTS_DID = 'did:plc:ttcalerts'; // Replace with actual DID

// Version for debugging
const VERSION = '103'; // Auto-resolve RSZ threads when no longer in TTC API

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
  PLANNED_CLOSURE: {
    keywords: ['planned', 'scheduled', 'maintenance', 'this weekend'],
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
  // Also matches official names like "Line 1 Yonge-University", "Line 2 Bloor-Danforth"
  // Requires word boundary before "Line" to avoid false matches
  const lineMatch = cleanedText.match(/\bLine\s+(1|2|3|4)\b/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      // Normalize to "Line X" format
      const num = m.match(/\d/)?.[0];
      if (num) routes.push(`Line ${num}`);
    });
  }
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  const routeWithNameMatch = cleanedText.match(/\b(\d{1,3})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      routes.push(m); // Keep "306 Carlton" format
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

// Categorize alert
function categorizeAlert(text: string): { category: string; priority: number } {
  const lowerText = text.toLowerCase();
  
  for (const [category, config] of Object.entries(ALERT_CATEGORIES)) {
    if (config.keywords.some(kw => lowerText.includes(kw))) {
      return { category, priority: config.priority };
    }
  }
  
  return { category: 'OTHER', priority: 10 };
}

// Extract route NUMBER only (for comparison)
function extractRouteNumber(route: string): string {
  const match = route.match(/^(\d+)/);
  return match ? match[1] : route;
}

// Normalize route for comparison (handles "Line 1" vs "1")
function normalizeRoute(route: string): string {
  // Handle "Line X" format
  const lineMatch = route.match(/Line\s*(\d+)/i);
  if (lineMatch) return lineMatch[1];
  // Otherwise extract route number
  return extractRouteNumber(route);
}

// Check if two routes have the same route number
function routesMatch(route1: string, route2: string): boolean {
  const num1 = extractRouteNumber(route1);
  const num2 = extractRouteNumber(route2);
  return num1 === num2;
}

// Calculate Jaccard similarity for threading
function jaccardSimilarity(text1: string, text2: string): number {
  // Strip punctuation from words for better matching (e.g., "islington:" matches "islington")
  const normalizeWord = (w: string) => w.replace(/[^a-z0-9]/g, '');
  const words1 = new Set(text1.toLowerCase().split(/\s+/).map(normalizeWord).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).map(normalizeWord).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
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
  cause: string;
  causeDescription: string;
  alertType: string;
  rszLength?: string;
  targetRemoval?: string;
  elevatorCode?: string;
  stopStart?: string;
  stopEnd?: string;
}

// Type for RSZ/Elevator alert data
interface RszElevatorData {
  activeRoutes: Set<string>;
  rszAlerts: TtcApiAlert[];
  elevatorAlerts: TtcApiAlert[];
}

// Fetch active routes, RSZ alerts, and elevator alerts from TTC API
async function fetchTtcData(): Promise<RszElevatorData> {
  const result: RszElevatorData = {
    activeRoutes: new Set<string>(),
    rszAlerts: [],
    elevatorAlerts: []
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
      const headerText = routeAlert.headerText?.toLowerCase() || '';
      const effectDesc = routeAlert.effectDesc || '';
      const effect = routeAlert.effect || '';
      
      // Check if it's an RSZ alert
      const isRsz = effectDesc === 'Reduced Speed Zone' || 
                    headerText.includes('slower than usual') ||
                    headerText.includes('reduced speed');
      
      if (isRsz) {
        // Collect RSZ alert for later processing
        result.rszAlerts.push(routeAlert);
        continue;
      }
      
      // Regular disruption alerts - add to active routes for thread hiding logic
      const isRealDisruption = 
        effect === 'NO_SERVICE' || 
        effect === 'SIGNIFICANT_DELAYS' ||
        effect === 'DETOUR' ||
        routeAlert.severity === 'Critical' ||
        routeAlert.severity === 'High';
      
      if (isRealDisruption) {
        const routeId = routeAlert.route || routeAlert.id;
        if (routeId) {
          result.activeRoutes.add(routeId);
        }
      }
    }
    
    // Process accessibility (elevator/escalator) alerts
    for (const accessAlert of accessibility) {
      result.elevatorAlerts.push(accessAlert);
    }
    
    console.log(`TTC API: ${result.activeRoutes.size} disruptions, ${result.rszAlerts.length} RSZ, ${result.elevatorAlerts.length} elevators`);
  } catch (error) {
    console.error('Failed to fetch TTC API:', error);
  }
  
  return result;
}

// Fetch active routes from TTC API (THE AUTHORITY) - wrapper for backward compatibility
async function fetchTtcActiveRoutes(): Promise<Set<string>> {
  const data = await fetchTtcData();
  return data.activeRoutes;
}

// Generate a unique alert ID for TTC API alerts (RSZ/Elevator)
function generateTtcAlertId(type: string, route: string, text: string, stopStart?: string, stopEnd?: string): string {
  // Include station names in ID to ensure uniqueness for RSZ alerts
  let idBase = `ttc-${type}-${route}`;
  
  if (stopStart && stopEnd) {
    // Use station names for RSZ alerts to ensure uniqueness
    const cleanStart = stopStart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    const cleanEnd = stopEnd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    idBase += `-${cleanStart}-${cleanEnd}`;
  } else {
    // Fallback to text for other alerts
    const cleanText = text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    idBase += `-${cleanText}`;
  }
  
  return idBase.substring(0, 100);
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
    
    // Check if this alert already exists
    const { data: existing } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .single();
    
    if (existing) {
      continue; // Already have this RSZ alert
    }

    // Extract route info - RSZ alerts are for subway lines
    // TTC API returns route as "1", "2", "3", "4" for subway lines
    // Normalize to "Line 1", "Line 2", etc. for consistency
    let routes: string[];
    if (route && /^[1-4]$/.test(route)) {
      routes = [`Line ${route}`];
    } else if (route) {
      routes = [route];
    } else {
      routes = extractRoutes(headerText);
    }
    
    // Build description with RSZ details
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

    // Create alert record
    const alert = {
      alert_id: alertId,
      header_text: headerText.substring(0, 200),
      description_text: description,
      categories: ['RSZ'],
      affected_routes: routes,
      created_at: new Date().toISOString(),
      is_latest: true,
      effect: 'RSZ' // Use RSZ as effect type
    };

    // Insert alert
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

    // Create/find thread for RSZ alert
    const { data: threadResult, error: threadError } = await supabase
      .rpc('find_or_create_thread', {
        p_title: headerText.substring(0, 200),
        p_routes: routes,
        p_categories: ['RSZ'],
        p_is_resolved: false
      });

    if (threadError) {
      console.error('RSZ thread creation error:', threadError);
    } else if (threadResult && threadResult.length > 0) {
      const threadId = threadResult[0].out_thread_id;
      await supabase
        .from('alert_cache')
        .update({ thread_id: threadId })
        .eq('alert_id', newAlert.alert_id);
      
      console.log(`RSZ alert ${alertId} linked to thread ${threadId}`);
      updatedThreads++;
    }
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
    
    // Check if this alert already exists
    const { data: existing } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .single();
    
    if (existing) {
      continue; // Already have this elevator alert
    }

    // Extract station name from header text (e.g., "Dundas West: Elevator out of service...")
    const stationMatch = headerText.match(/^([^:]+):/);
    const station = stationMatch ? stationMatch[1].trim() : 'Unknown Station';
    
    // Build description
    let description = headerText;
    if (elevator.routeType) {
      description += `\n\nType: ${elevator.routeType}`;
    }
    if (elevatorCode) {
      description += `\nElevator Code: ${elevatorCode}`;
    }

    // Create alert record - use station as "route" for grouping
    const alert = {
      alert_id: alertId,
      header_text: headerText.substring(0, 200),
      description_text: description,
      categories: ['ACCESSIBILITY'],
      affected_routes: [station], // Use station name for filtering/display
      created_at: new Date().toISOString(),
      is_latest: true,
      effect: 'ACCESSIBILITY_ISSUE'
    };

    // Insert alert
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

    // For elevator alerts, create a deterministic thread ID based on elevatorCode
    // This ensures each elevator gets its own thread, but the same elevator doesn't create duplicates
    const threadId = elevatorCode 
      ? `thread-elev-${elevatorCode}` 
      : `thread-elev-${station.replace(/\s+/g, '-').toLowerCase()}-${alertId.slice(-8)}`;
    
    // Check if thread already exists (for this specific elevator)
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .eq('thread_id', threadId)
      .single();
    
    if (existingThread) {
      // Thread exists, just link the alert to it
      await supabase
        .from('alert_cache')
        .update({ thread_id: threadId })
        .eq('alert_id', newAlert.alert_id);
      
      console.log(`Elevator alert ${alertId} linked to existing thread ${threadId}`);
      updatedThreads++;
    } else {
      // Create new thread for this elevator
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
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
        
        console.log(`Elevator alert ${alertId} created new thread ${threadId}`);
        updatedThreads++;
      }
    }
  }

  console.log(`Elevator processing: ${newAlerts} new alerts, ${updatedThreads} threads updated`);
  return { newAlerts, updatedThreads };
}

// Check if a thread's routes have any active TTC API alerts
function threadHasActiveTtcAlert(threadRoutes: string[], ttcActiveRoutes: Set<string>): boolean {
  if (threadRoutes.length === 0 || ttcActiveRoutes.size === 0) {
    return false;
  }
  
  return threadRoutes.some(route => {
    const normalized = normalizeRoute(route);
    return ttcActiveRoutes.has(normalized);
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`poll-alerts v${VERSION} starting...`);

    // STEP 1: Fetch TTC API to get authoritative list of active routes, RSZ alerts, and elevator alerts
    const ttcData = await fetchTtcData();
    const ttcActiveRoutes = ttcData.activeRoutes;
    
    // STEP 2: Hide threads that are no longer in TTC API
    // Only hide if they weren't explicitly resolved via SERVICE_RESUMED
    // EXCLUDES: RSZ and ACCESSIBILITY threads (they manage their own lifecycle)
    let hiddenThreads = 0;
    if (ttcActiveRoutes.size > 0) {
      // Get all unresolved, non-hidden threads
      const { data: activeThreads } = await supabase
        .from('incident_threads')
        .select('thread_id, title, affected_routes, categories')
        .eq('is_resolved', false)
        .eq('is_hidden', false);
      
      for (const thread of activeThreads || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
        
        // Skip threads with no routes (can't cross-reference)
        if (threadRoutes.length === 0) continue;
        
        // Skip RSZ and ACCESSIBILITY threads - they have their own lifecycle
        // These threads use station names or subway line numbers, not route numbers
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) {
          continue;
        }
        
        // Check if ANY of the thread's routes are still active in TTC API
        const hasActiveTtcAlert = threadHasActiveTtcAlert(threadRoutes, ttcActiveRoutes);
        
        if (!hasActiveTtcAlert) {
          // Thread's routes have no active TTC API alerts - HIDE IT
          console.log(`Hiding thread: "${thread.title}" - routes [${threadRoutes.join(', ')}] not in TTC API`);
          
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
    }
    
    // STEP 2b: Mark threads as resolved if they have a matching SERVICE_RESUMED alert
    // (This catches cases where SERVICE_RESUMED ended up in a different thread)
    // CRITICAL: Only match if SERVICE_RESUMED was created AFTER the thread started
    {
      // Get all unresolved threads that could be resolved by SERVICE_RESUMED
      // Includes: SERVICE_DISRUPTION, DIVERSION, DELAY, SHUTTLE (NOT: RSZ, ACCESSIBILITY, SERVICE_RESUMED)
      const { data: unresolvedThreads } = await supabase
        .from('incident_threads')
        .select('thread_id, title, affected_routes, categories, created_at')
        .eq('is_resolved', false)
        .eq('is_hidden', false);
      
      // Get all SERVICE_RESUMED alerts from the last 48 hours
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: resumedAlerts } = await supabase
        .from('alert_cache')
        .select('header_text, affected_routes, created_at')
        .filter('categories', 'cs', '["SERVICE_RESUMED"]')
        .gte('created_at', fortyEightHoursAgo);
      
      for (const thread of unresolvedThreads || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        const threadCats = Array.isArray(thread.categories) ? thread.categories : [];
        const threadCreatedAt = new Date(thread.created_at).getTime();
        if (threadRoutes.length === 0) continue;
        
        // Skip threads that shouldn't be auto-resolved by SERVICE_RESUMED
        if (threadCats.includes('RSZ') || threadCats.includes('ACCESSIBILITY') || threadCats.includes('SERVICE_RESUMED')) {
          continue;
        }
        
        // Check if any SERVICE_RESUMED alert matches this thread's routes
        for (const resumedAlert of resumedAlerts || []) {
          const resumedRoutes = Array.isArray(resumedAlert.affected_routes) ? resumedAlert.affected_routes : [];
          const resumedCreatedAt = new Date(resumedAlert.created_at).getTime();
          
          // CRITICAL: Only match if SERVICE_RESUMED was created AFTER the thread
          // This prevents old "service resumed" alerts from resolving new incidents
          if (resumedCreatedAt <= threadCreatedAt) {
            continue;
          }
          
          // Check route overlap
          const hasRouteMatch = threadRoutes.some(tr => {
            const trNorm = normalizeRoute(tr);
            return resumedRoutes.some(rr => normalizeRoute(rr) === trNorm);
          });
          
          if (hasRouteMatch) {
            // Check text similarity - lower threshold (10%) when routes match since route is the key signal
            const similarity = jaccardSimilarity(thread.title || '', resumedAlert.header_text || '');
            if (similarity >= 0.10) {
              console.log(`Resolving thread "${thread.title}" - matched SERVICE_RESUMED with ${(similarity * 100).toFixed(0)}% similarity`);
              
              await supabase
                .from('incident_threads')
                .update({ 
                  is_resolved: true,
                  is_hidden: true,
                  resolved_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('thread_id', thread.thread_id);
              
              hiddenThreads++;
              break; // Move to next thread
            }
          }
        }
      }
    }
    
    // STEP 3: Also unhide threads if their routes ARE back in TTC API
    // (in case alert comes back)
    // EXCLUDES: RSZ and ACCESSIBILITY threads
    if (ttcActiveRoutes.size > 0) {
      const { data: hiddenThreadsData } = await supabase
        .from('incident_threads')
        .select('thread_id, title, affected_routes, categories')
        .eq('is_resolved', false)
        .eq('is_hidden', true);
      
      for (const thread of hiddenThreadsData || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
        if (threadRoutes.length === 0) continue;
        
        // Skip RSZ and ACCESSIBILITY threads
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) {
          continue;
        }
        
        const hasActiveTtcAlert = threadHasActiveTtcAlert(threadRoutes, ttcActiveRoutes);
        
        if (hasActiveTtcAlert) {
          console.log(`Unhiding thread: "${thread.title}" - routes back in TTC API`);
          
          await supabase
            .from('incident_threads')
            .update({ 
              is_hidden: false,
              updated_at: new Date().toISOString()
            })
            .eq('thread_id', thread.thread_id);
        }
      }
    }

    // STEP 4: Fetch Bluesky for additional context/history
    const response = await fetch(
      `${BLUESKY_API}?actor=ttcalerts.bsky.social&limit=50`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Bluesky API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.feed || [];
    
    let newAlerts = 0;
    let updatedThreads = 0;

    // Get existing alerts from last 24 hours
    const { data: existingAlerts } = await supabase
      .from('alert_cache')
      .select('bluesky_uri, header_text')
      .not('bluesky_uri', 'is', null)  // Only get alerts with bluesky_uri
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());


    const existingUris = new Set(existingAlerts?.map(a => a.bluesky_uri) || []);
    console.log(`Found ${existingUris.size} existing Bluesky URIs in last 24h`);

    // Get unresolved threads for matching
    const { data: unresolvedThreads } = await supabase
      .from('incident_threads')
      .select('*')
      .eq('is_resolved', false)
      .gte('updated_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      
      const uri = post.uri;
      if (existingUris.has(uri)) continue;

      const text = post.record.text;
      const { category, priority } = categorizeAlert(text);
      const routes = extractRoutes(text);
      
      // Extract post ID from URI: at://did:plc:xxx/app.bsky.feed.post/3mbuyu22npk2b -> 3mbuyu22npk2b
      const postId = uri.split('/').pop() || uri;
      
      // Create alert record matching alert_cache schema
      const alert = {
        alert_id: `bsky-${postId}`,
        bluesky_uri: uri,
        header_text: text.split('\n')[0].substring(0, 200),
        description_text: text,
        categories: [category],
        affected_routes: routes,
        created_at: post.record.createdAt,
        is_latest: true,
        effect: category === 'SERVICE_RESUMED' ? 'RESUMED' : 'DISRUPTION'
      };

      // Insert alert
      const { data: newAlert, error: insertError } = await supabase
        .from('alert_cache')
        .insert(alert)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        continue;
      }

      newAlerts++;

      // Thread matching
      let matchedThread = null;

      // Check for matching thread based on EXACT route number match and similarity
      for (const thread of unresolvedThreads || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        
        // Use exact route number matching to prevent 46 matching 996, etc.
        const hasRouteOverlap = routes.some(alertRoute => 
          threadRoutes.some(threadRoute => routesMatch(alertRoute, threadRoute))
        );
        
        if (hasRouteOverlap) {
          const threadTitle = thread.title || '';
          const similarity = jaccardSimilarity(text, threadTitle);
          
          // If routes match AND thread isn't hidden, use lower threshold
          // This ensures follow-up alerts get added to existing threads
          if (!thread.is_hidden) {
            // Very low threshold (15%) for SERVICE_RESUMED - just needs route match really
            if (category === 'SERVICE_RESUMED' && similarity >= 0.15) {
              matchedThread = thread;
              break;
            }
            
            // Low threshold (25%) for general matching when routes match
            if (similarity >= 0.25) {
              matchedThread = thread;
              break;
            }
          }
        }
      }

      if (matchedThread) {
        // Mark old alerts in this thread as not latest
        await supabase
          .from('alert_cache')
          .update({ is_latest: false })
          .eq('thread_id', matchedThread.thread_id);

        // Link alert to thread
        await supabase
          .from('alert_cache')
          .update({ thread_id: matchedThread.thread_id })
          .eq('alert_id', newAlert.alert_id);

        // Update thread
        const updates: any = {
          title: text.split('\n')[0].substring(0, 200),
          updated_at: new Date().toISOString()
        };

        // Resolve thread if SERVICE_RESUMED
        if (category === 'SERVICE_RESUMED') {
          updates.is_resolved = true;
          updates.resolved_at = new Date().toISOString();
          // Add SERVICE_RESUMED to thread categories if not already present
          const existingCategories = (matchedThread.categories as string[]) || [];
          if (!existingCategories.includes('SERVICE_RESUMED')) {
            updates.categories = [...existingCategories, 'SERVICE_RESUMED'];
          }
        }

        await supabase
          .from('incident_threads')
          .update(updates)
          .eq('thread_id', matchedThread.thread_id);

        updatedThreads++;
      } else {
        // Create new thread using the database function that properly generates thread_id
        const { data: threadResult, error: threadError } = await supabase
          .rpc('find_or_create_thread', {
            p_title: text.split('\n')[0].substring(0, 200),
            p_routes: routes,
            p_categories: [category],
            p_is_resolved: category === 'SERVICE_RESUMED'
          });

        if (threadError) {
          console.error('Thread creation error:', threadError);
        } else if (threadResult && threadResult.length > 0) {
          const newThreadId = threadResult[0].out_thread_id;
          // Link alert to new thread
          await supabase
            .from('alert_cache')
            .update({ thread_id: newThreadId })
            .eq('alert_id', newAlert.alert_id);
          
          console.log(`Created/found thread ${newThreadId} for alert ${newAlert.alert_id}`);
        }
      }
    }

    // STEP 5: Process RSZ alerts from TTC API
    const rszResult = await processRszAlerts(supabase, ttcData.rszAlerts);
    newAlerts += rszResult.newAlerts;
    updatedThreads += rszResult.updatedThreads;

    // STEP 6: Process elevator/escalator alerts from TTC API
    const elevatorResult = await processElevatorAlerts(supabase, ttcData.elevatorAlerts);
    newAlerts += elevatorResult.newAlerts;
    updatedThreads += elevatorResult.updatedThreads;

    // STEP 6b: Resolve ACCESSIBILITY threads that are no longer in TTC API
    // Each elevator has a unique elevatorCode, and thread_id = thread-elev-{elevatorCode}
    // Resolve threads where that specific elevator is no longer in TTC API
    let resolvedElevators = 0;
    
    // Build a set of active elevator codes from TTC API
    const ttcActiveElevatorCodes = new Set(
      ttcData.elevatorAlerts
        .map(e => e.elevatorCode)
        .filter(Boolean)
    );
    
    // Get all active ACCESSIBILITY threads - use filter() with 'cs' operator for JSONB containment
    const { data: accessibilityThreads, error: accError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, affected_routes')
      .filter('categories', 'cs', '["ACCESSIBILITY"]')
      .eq('is_resolved', false)
      .eq('is_hidden', false);
    
    if (accError) {
      console.error('STEP 6b: Failed to fetch accessibility threads:', accError);
    }
    
    for (const thread of accessibilityThreads || []) {
      // Extract elevator code from thread_id (format: thread-elev-{elevatorCode})
      const elevatorCodeMatch = thread.thread_id?.match(/^thread-elev-(.+)$/);
      const elevatorCode = elevatorCodeMatch ? elevatorCodeMatch[1] : null;
      
      // Skip threads that don't follow the elevator thread ID pattern (legacy threads)
      // For legacy threads, use station name matching as fallback
      if (!elevatorCode) {
        const stationName = Array.isArray(thread.affected_routes) ? thread.affected_routes[0] : '';
        // Check if ANY elevator at this station is still in TTC API
        const stationHasActiveElevator = ttcData.elevatorAlerts.some(e => {
          const match = e.headerText?.match(/^([^:]+):/);
          return match && match[1].trim() === stationName;
        });
        
        if (stationName && !stationHasActiveElevator) {
          console.log(`STEP 6b: Resolving legacy elevator thread: "${thread.title}" - station "${stationName}" no longer in TTC API`);
          
          const { error: updateError } = await supabase
            .from('incident_threads')
            .update({ 
              is_resolved: true,
              is_hidden: true,
              resolved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('thread_id', thread.thread_id);
          
          if (!updateError) {
            resolvedElevators++;
          }
        }
        continue;
      }
      
      // For new-style threads with elevatorCode in thread_id
      // Check if this specific elevator is still in TTC API
      if (!ttcActiveElevatorCodes.has(elevatorCode)) {
        console.log(`STEP 6b: Resolving elevator thread: "${thread.title}" - elevator "${elevatorCode}" no longer in TTC API`);
        
        const { error: updateError } = await supabase
          .from('incident_threads')
          .update({ 
            is_resolved: true,
            is_hidden: true,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
        
        if (!updateError) {
          resolvedElevators++;
        }
      }
    }

    // STEP 6c: Resolve RSZ threads that no longer have alerts in TTC API
    let resolvedRszThreads = 0;
    const ttcLinesWithRsz = new Set(
      ttcData.rszAlerts.map(rsz => {
        // RSZ alerts have route like "1" - normalize to "Line 1"
        const route = rsz.route || rsz.affectedRoute || '';
        return /^\d$/.test(route) ? `Line ${route}` : route;
      }).filter(Boolean)
    );
    
    // Get all active RSZ threads - use filter() with 'cs' operator for JSONB containment
    const { data: rszThreads } = await supabase
      .from('incident_threads')
      .select('thread_id, title, affected_routes')
      .filter('categories', 'cs', '["RSZ"]')
      .eq('is_resolved', false)
      .eq('is_hidden', false);
    
    for (const thread of rszThreads || []) {
      const lineName = Array.isArray(thread.affected_routes) ? thread.affected_routes[0] : '';
      if (!lineName) continue;
      
      // Check if this line still has RSZ alerts in TTC API
      if (!ttcLinesWithRsz.has(lineName)) {
        console.log(`Resolving RSZ thread: "${thread.title}" - no RSZ alerts for ${lineName} in TTC API`);
        
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

    // STEP 7: Merge duplicate RSZ/ACCESSIBILITY threads by keeping only the newest one per station/line
    // Note: We no longer automatically unhide hidden threads - STEP 6b/6c handle auto-resolving properly
    const { data: rszAccessibilityThreads } = await supabase
      .from('incident_threads')
      .select('thread_id, title, categories, affected_routes, is_hidden, created_at')
      .eq('is_resolved', false)
      .eq('is_hidden', false); // Only consider visible threads for deduplication
    
    let unhiddenRszAccessibility = 0; // No longer unhiding threads
    let mergedDuplicates = 0;
    
    // Group threads by station/route for deduplication
    const threadsByKey: Record<string, any[]> = {};
    
    for (const thread of rszAccessibilityThreads || []) {
      const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
      
      // Only process RSZ and ACCESSIBILITY threads
      if (!threadCategories.includes('RSZ') && !threadCategories.includes('ACCESSIBILITY')) {
        continue;
      }
      
      // Group by affected_routes (station name) for deduplication
      const routes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
      const key = routes.join('|') + '|' + threadCategories.join('|');
      if (!threadsByKey[key]) {
        threadsByKey[key] = [];
      }
      threadsByKey[key].push(thread);
    }
    
    // For each group, keep only the newest thread and hide the rest
    for (const key of Object.keys(threadsByKey)) {
      const threads = threadsByKey[key];
      if (threads.length <= 1) continue;
      
      // Sort by created_at desc (newest first)
      threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Keep the newest, hide the rest
      for (let i = 1; i < threads.length; i++) {
        await supabase
          .from('incident_threads')
          .update({ is_hidden: true, updated_at: new Date().toISOString() })
          .eq('thread_id', threads[i].thread_id);
        mergedDuplicates++;
        console.log(`Hiding duplicate thread: "${threads[i].title}"`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        version: VERSION,
        ttcApiActiveRoutes: [...ttcActiveRoutes],
        rszAlerts: ttcData.rszAlerts.length,
        elevatorAlerts: ttcData.elevatorAlerts.length,
        hiddenThreads,
        resolvedElevators,
        resolvedRszThreads,
        unhiddenRszAccessibility,
        mergedDuplicates,
        newAlerts, 
        updatedThreads,
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
