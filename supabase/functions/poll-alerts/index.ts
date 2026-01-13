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
const VERSION = '147'; // Unhide scheduled closure threads when alert already exists

// Helper function to check if an alert is about a future/scheduled closure
// (not a real-time disruption) - matches frontend isScheduledFutureClosure()
function isScheduledClosure(headerText: string): boolean {
  const lowerText = (headerText || '').toLowerCase();
  // Patterns indicating a future/scheduled event, not a real-time issue
  const scheduledPatterns = [
    /starting\s+\d+\s*(p\.?m\.?|a\.?m\.?),?\s*nightly/i,
    /nightly.*from\s+\d+/i,
    /there will be no.*service.*starting/i,
    /no\s+(subway\s+)?service.*starting\s+\d+/i,
    /full\s+weekend\s+closure/i,
    /nightly\s+early\s+closure/i,
  ];
  return scheduledPatterns.some((pattern) => pattern.test(lowerText));
}

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
  
  // Match route branches with name: "97B Yonge", "36A Finch West", "52F Lawrence", etc.
  // Branch letters include A-D (most common), F, G (52 route), S (79S, 336S)
  // Stop before common non-route words like "Regular", "service", "Detour", etc.
  const routeBranchWithNameMatch = cleanedText.match(/\b(\d{1,3}[A-Z])\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/gi);
  if (routeBranchWithNameMatch) {
    routeBranchWithNameMatch.forEach(m => {
      // Stop at common non-route words
      const stopWords = ['regular', 'service', 'detour', 'diversion', 'shuttle', 'delay', 'resumed', 'closed', 'suspended'];
      const words = m.split(/\s+/);
      let routeName = words[0]; // Always include the route number (e.g., "97B")
      
      // Add the first word after route number if it's not a stop word
      if (words[1] && !stopWords.includes(words[1].toLowerCase())) {
        routeName += ' ' + words[1];
        // Add second word if present and not a stop word
        if (words[2] && !stopWords.includes(words[2].toLowerCase())) {
          routeName += ' ' + words[2];
        }
      }
      
      // Normalize branch letter to uppercase
      const normalized = routeName.replace(/^(\d+)([a-z])/i, (_, num, letter) => `${num}${letter.toUpperCase()}`);
      routes.push(normalized);
    });
  }
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  // Stop before common non-route words
  const routeWithNameMatch = cleanedText.match(/\b(\d{1,3})\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      // Skip if already captured as a branch route
      const routeNum = m.match(/^\d+/)?.[0];
      if (!routes.some(r => r.match(/^\d+/)?.[0] === routeNum)) {
        // Stop at common non-route words
        const stopWords = ['regular', 'service', 'detour', 'diversion', 'shuttle', 'delay', 'resumed', 'closed', 'suspended'];
        const words = m.split(/\s+/);
        let routeName = words[0]; // Route number
        
        // Add route name words, stopping at stop words
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
  
  // Sort entries by priority to ensure consistent matching order
  const sortedCategories = Object.entries(ALERT_CATEGORIES)
    .sort(([, a], [, b]) => a.priority - b.priority);
  
  for (const [category, config] of sortedCategories) {
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

// ============================================================================
// ELEVATOR THREAD ID GENERATION - SINGLE SOURCE OF TRUTH
// ============================================================================
// This function MUST be used everywhere elevator thread IDs are generated
// to ensure consistency between creation, resolution, and orphan repair.

interface ElevatorInfo {
  elevatorCode: string | null | undefined;
  headerText: string;
  alertId?: string; // For fallback when detail can't be extracted
}

function generateElevatorThreadId(info: ElevatorInfo): { threadId: string; suffix: string } {
  const { elevatorCode, headerText, alertId } = info;
  
  // Extract station name from header text (e.g., "TMU: Elevator out of service...")
  const stationMatch = headerText.match(/^([^:]+):/);
  const station = stationMatch ? stationMatch[1].trim() : 'Unknown';
  const cleanStation = station.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  // Standard TTC elevator with unique code (e.g., 57P2L, 16Y2L)
  if (elevatorCode && elevatorCode !== 'Non-TTC') {
    return {
      threadId: `thread-elev-${elevatorCode}`,
      suffix: elevatorCode
    };
  }
  
  // Non-TTC or unknown elevator - use "nonttc-{station}-{detail}" pattern
  // Extract detail from description (text between "between" and " and")
  // FIXED: Use lookahead for " and " instead of character class [^and] which 
  // incorrectly matches any char except 'a', 'n', or 'd'
  const detailMatch = headerText.match(/between\s+(.+?)\s+and\s+/i);
  const detail = detailMatch 
    ? detailMatch[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20) 
    : '';
  
  // Build suffix: nonttc-{station}-{detail}
  // Using "nonttc" prefix ensures clear separation from standard elevator codes
  const suffix = `nonttc-${cleanStation}-${detail || (alertId ? alertId.slice(-8) : 'unknown')}`;
  
  return {
    threadId: `thread-elev-${suffix}`,
    suffix: suffix
  };
}

// Type for child alert (scheduled time windows)
interface TtcChildAlert {
  id: string;
  startTime: string;
  endTime: string;
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
  childAlerts?: TtcChildAlert[]; // Scheduled time windows
  activePeriod?: {
    start: string;
    end: string;
  };
}

// Check if a scheduled alert is currently active based on childAlerts
function isScheduledAlertCurrentlyActive(alert: TtcApiAlert): boolean {
  // If no childAlerts, assume it's always active (non-scheduled)
  if (!alert.childAlerts || alert.childAlerts.length === 0) {
    return true;
  }
  
  const now = new Date();
  
  // Check if current time falls within any childAlert window
  for (const child of alert.childAlerts) {
    const start = new Date(child.startTime);
    const end = new Date(child.endTime);
    
    if (now >= start && now <= end) {
      console.log(`Scheduled alert ${alert.id} is ACTIVE (child ${child.id}: ${child.startTime} - ${child.endTime})`);
      return true;
    }
  }
  
  // No active time window - this is a future scheduled closure
  console.log(`Scheduled alert ${alert.id} is NOT active yet (has ${alert.childAlerts.length} scheduled windows)`);
  return false;
}

// Type for RSZ/Elevator alert data
interface TtcAlertData {
  activeRoutes: Set<string>;
  rszAlerts: TtcApiAlert[];
  elevatorAlerts: TtcApiAlert[];
  disruptionAlerts: TtcApiAlert[]; // NEW: Regular disruptions (delays, closures, shuttles)
}

// Fetch active routes, RSZ alerts, and elevator alerts from TTC API
async function fetchTtcData(): Promise<TtcAlertData> {
  const result: TtcAlertData = {
    activeRoutes: new Set<string>(),
    rszAlerts: [],
    elevatorAlerts: [],
    disruptionAlerts: [] // NEW
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
      
      // Skip service resumed alerts - these go to Recently Resolved
      const isServiceResumed = 
        effectDesc === 'Service Resumed' ||
        headerText.includes('regular service has resumed') ||
        headerText.includes('service has resumed');
      
      if (isServiceResumed) {
        continue;
      }
      
      // Check if this is a scheduled closure with specific time windows
      // If it has childAlerts, only include if currently within an active window
      if (routeAlert.childAlerts && routeAlert.childAlerts.length > 0) {
        if (!isScheduledAlertCurrentlyActive(routeAlert)) {
          // Scheduled closure is NOT currently active - skip it for disruptions
          // It will be visible in the "Scheduled" tab instead
          console.log(`Skipping scheduled closure (not active yet): ${routeAlert.route} - ${routeAlert.headerText?.substring(0, 50)}`);
          continue;
        }
      }
      
      // All other TTC API route alerts are real disruptions
      // This includes:
      // - NO_SERVICE, SIGNIFICANT_DELAYS, DETOUR (standard GTFS-RT)
      // - MODIFIED_SERVICE, SHUTTLE (custom TTC effects)  
      // - "Subway Closure - Early Access" (nightly closures) - ONLY when currently active
      // - Any alert with Critical/High severity
      // We now add ALL non-RSZ, non-ServiceResumed, non-scheduled-future alerts to activeRoutes
      const routeId = routeAlert.route || routeAlert.id;
      if (routeId) {
        result.activeRoutes.add(routeId);
        result.disruptionAlerts.push(routeAlert); // Collect for processing
        console.log(`TTC disruption: route=${routeId}, effect=${effect}, effectDesc=${effectDesc}`);
      }
    }
    
    // Process accessibility (elevator/escalator) alerts
    for (const accessAlert of accessibility) {
      result.elevatorAlerts.push(accessAlert);
    }
    
    console.log(`TTC API: ${result.disruptionAlerts.length} disruptions, ${result.rszAlerts.length} RSZ, ${result.elevatorAlerts.length} elevators`);
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

// Generate thread ID for RSZ alerts based on alert_id pattern
// This ensures consistent thread IDs across processRszAlerts() and STEP 6e repair
function generateRszThreadId(alertId: string): { threadId: string; lineNumber: string; location: string } {
  // Pattern: ttc-rsz-{line}-{start}-{end}
  // Example: ttc-rsz-1-eglinton-davisville -> thread-rsz-line1-eglinton-davisville
  
  // Remove ttc-rsz- prefix
  const parts = alertId.replace(/^ttc-rsz-/i, '').split('-');
  const lineNumber = parts[0]; // "1" or "2"
  const location = parts.slice(1).join('-'); // "eglinton-davisville"
  
  // Check for legacy format (e.g., "line1yongeuniversitysubwaytrainswillmoves")
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

    // Create/find thread for RSZ alert using consistent generateRszThreadId
    const { threadId, lineNumber } = generateRszThreadId(alertId);
    
    // Check if thread exists
    const { data: existingThread } = await supabase
      .from('incident_threads')
      .select('thread_id, is_hidden')
      .eq('thread_id', threadId)
      .single();
    
    if (!existingThread) {
      // Create the thread
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
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
      // Thread exists but is hidden - unhide it
      await supabase
        .from('incident_threads')
        .update({ is_hidden: false, updated_at: new Date().toISOString() })
        .eq('thread_id', threadId);
      console.log(`RSZ: Unhid existing thread ${threadId}`);
    }

    // Link alert to thread
    await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', newAlert.alert_id);
    
    console.log(`RSZ alert ${alertId} linked to thread ${threadId}`);
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
    
    // Build description - use header text only (no technical metadata for display)
    // The elevatorCode is already embedded in alert_id and thread_id for debugging
    // Also strip trailing "-TTC" suffix that appears in some API responses
    const cleanedHeaderText = headerText.replace(/-TTC\s*$/i, '').trim();
    const description = cleanedHeaderText;

    // Create alert record - use station as "route" for grouping
    const alert = {
      alert_id: alertId,
      header_text: cleanedHeaderText.substring(0, 200),
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

    // Use centralized thread ID generator for consistency
    // This ensures STEP 6b resolution logic matches this creation logic
    const { threadId } = generateElevatorThreadId({
      elevatorCode,
      headerText: cleanedHeaderText,
      alertId
    });
    
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

// NEW: Process disruption alerts from TTC API (delays, closures, shuttles)
// This is the primary source of truth for active disruptions
async function processDisruptionAlerts(supabase: any, disruptionAlerts: TtcApiAlert[]): Promise<{ newAlerts: number; updatedThreads: number }> {
  let newAlerts = 0;
  let updatedThreads = 0;

  for (const disruption of disruptionAlerts) {
    const headerText = disruption.headerText || '';
    const route = disruption.route || '';
    const effect = disruption.effect || '';
    const effectDesc = disruption.effectDesc || '';
    const severity = disruption.severity || '';
    const ttcAlertId = disruption.id || '';
    
    // Generate unique alert ID based on TTC API alert ID
    const alertId = `ttc-alert-${ttcAlertId}`;
    
    // Check if this alert already exists
    const { data: existing } = await supabase
      .from('alert_cache')
      .select('alert_id, thread_id')
      .eq('alert_id', alertId)
      .single();
    
    if (existing) {
      // Alert exists - but check if its thread is hidden and unhide it
      // This handles nightly scheduled closures that reappear each night
      if (existing.thread_id) {
        const { data: existingThread } = await supabase
          .from('incident_threads')
          .select('is_hidden')
          .eq('thread_id', existing.thread_id)
          .single();
        
        if (existingThread?.is_hidden) {
          await supabase
            .from('incident_threads')
            .update({ 
              is_hidden: false, 
              is_resolved: false,
              updated_at: new Date().toISOString() 
            })
            .eq('thread_id', existing.thread_id);
          console.log(`TTC API: Unhid thread ${existing.thread_id} for existing alert ${alertId}`);
          updatedThreads++;
        }
      }
      continue; // Already have this alert
    }

    // Categorize based on effect/effectDesc
    let category = 'OTHER';
    if (effect === 'NO_SERVICE' || effectDesc.includes('Closure') || effectDesc.includes('No Service')) {
      category = 'SERVICE_DISRUPTION';
    } else if (effect === 'SIGNIFICANT_DELAYS' || effectDesc === 'Delays') {
      category = 'DELAY';
    } else if (effect === 'MODIFIED_SERVICE' || effectDesc === 'Replaced' || effectDesc.includes('Shuttle')) {
      category = 'SHUTTLE';
    } else if (effect === 'DETOUR' || effectDesc === 'Detour') {
      category = 'DIVERSION';
    } else if (effect === 'REDUCED_SERVICE') {
      category = 'PLANNED_CLOSURE';
    }

    // Extract routes from the alert
    let routes: string[] = [];
    if (disruption.routeType === 'Subway') {
      // Subway: use "Line X" format
      routes = [`Line ${route}`];
    } else if (route) {
      // Bus/Streetcar: extract route with name from headerText or use route number
      // Branch letters include A-D (most common), F, G (52 route), S (79S, 336S)
      const routeNameMatch = headerText.match(new RegExp(`^(${route}[A-Z]?\\s+[A-Z][a-z]+):`));
      if (routeNameMatch) {
        routes = [routeNameMatch[1]];
      } else {
        routes = [route];
      }
    }

    // Create alert record
    const alert = {
      alert_id: alertId,
      header_text: headerText.substring(0, 200),
      description_text: headerText,
      categories: [category],
      affected_routes: routes,
      created_at: new Date().toISOString(),
      is_latest: true,
      effect: effect || category
    };

    // Insert alert
    const { data: newAlert, error: insertError } = await supabase
      .from('alert_cache')
      .insert(alert)
      .select()
      .single();

    if (insertError) {
      console.error('Disruption insert error:', insertError);
      continue;
    }

    newAlerts++;

    // STEP 1: First, look for an existing unresolved thread with matching routes AND similar text
    // This handles race conditions where Bluesky created a thread first with UUID format
    // IMPORTANT: Use similarity matching to avoid grouping unrelated incidents on the same route
    const routeNum = extractRouteNumber(routes[0] || '');
    let matchedThreadId: string | null = null;
    
    if (routeNum) {
      const { data: existingThreads } = await supabase
        .from('incident_threads')
        .select('thread_id, affected_routes, categories, title')
        .eq('is_resolved', false)
        .eq('is_hidden', false);
      
      for (const thread of existingThreads || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
        const threadTitle = thread.title || '';
        
        // Skip RSZ/ACCESSIBILITY threads
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) continue;
        
        // Check if route numbers match
        const hasRouteMatch = threadRoutes.some(tr => extractRouteNumber(tr) === routeNum);
        if (hasRouteMatch) {
          // Also check text similarity to avoid grouping unrelated incidents on same route
          const similarity = jaccardSimilarity(headerText, threadTitle);
          if (similarity >= 0.25) {
            matchedThreadId = thread.thread_id;
            console.log(`TTC API: Found existing thread ${matchedThreadId} for route ${routeNum} with ${(similarity * 100).toFixed(0)}% similarity`);
            break;
          }
        }
      }
    }

    // STEP 2: If no matching thread found, create one with deterministic ID
    // IMPORTANT: Scheduled closures get their own thread ID to avoid mixing with real-time incidents
    const routeKey = routes[0]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
    const isScheduled = isScheduledClosure(headerText);
    
    // For scheduled closures: use "scheduled_closure" in thread ID
    // For real-time incidents: use the category
    const threadType = isScheduled ? 'scheduled_closure' : category.toLowerCase();
    const threadId = matchedThreadId || `thread-ttc-${routeKey}-${threadType}`;
    
    if (isScheduled) {
      console.log(`TTC API: Scheduled closure detected for ${routes[0] || 'unknown'}, using thread ${threadId}`);
    }

    if (!matchedThreadId) {
      // Check if our deterministic thread ID exists
      const { data: existingThread } = await supabase
        .from('incident_threads')
        .select('thread_id, is_hidden')
        .eq('thread_id', threadId)
        .single();
      
      if (!existingThread) {
        // Create new thread
        const { error: threadError } = await supabase
          .from('incident_threads')
          .insert({
            thread_id: threadId,
            title: headerText.substring(0, 200),
            affected_routes: routes,
            categories: [category],
            is_resolved: false,
            is_hidden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (threadError) {
          console.error('Disruption thread creation error:', threadError);
        } else {
          console.log(`TTC API: Created new thread ${threadId}`);
        }
      } else if (existingThread.is_hidden) {
        // Thread exists but is hidden - unhide it since alert is back
        await supabase
          .from('incident_threads')
          .update({ 
            is_hidden: false, 
            is_resolved: false,
            title: headerText.substring(0, 200),
            updated_at: new Date().toISOString() 
          })
          .eq('thread_id', threadId);
        console.log(`TTC API: Unhid existing thread ${threadId}`);
      } else {
        // Thread exists and visible - update title to latest
        await supabase
          .from('incident_threads')
          .update({ 
            title: headerText.substring(0, 200),
            updated_at: new Date().toISOString() 
          })
          .eq('thread_id', threadId);
      }
    } else {
      // Update existing matched thread with latest title
      await supabase
        .from('incident_threads')
        .update({ 
          title: headerText.substring(0, 200),
          updated_at: new Date().toISOString() 
        })
        .eq('thread_id', threadId);
    }

    // Link alert to thread
    await supabase
      .from('alert_cache')
      .update({ thread_id: threadId })
      .eq('alert_id', newAlert.alert_id);
    
    console.log(`TTC API: Alert ${alertId} linked to thread ${threadId}`);
    updatedThreads++;
  }

  console.log(`Disruption processing: ${newAlerts} new alerts, ${updatedThreads} threads updated`);
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
        const threadId = thread.thread_id || '';
        
        // Skip threads with no routes (can't cross-reference)
        if (threadRoutes.length === 0) continue;
        
        // LAYER 1: Skip RSZ and ACCESSIBILITY threads - they have their own lifecycle
        // These threads use station names or subway line numbers, not route numbers
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) {
          continue;
        }
        
        // LAYER 2: Belt-and-suspenders check on thread_id patterns
        if (threadId.includes('rsz') || threadId.includes('elev') || threadId.includes('accessibility')) {
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
        const threadId = thread.thread_id || '';
        if (threadRoutes.length === 0) continue;
        
        // LAYER 1: Skip RSZ and ACCESSIBILITY threads
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) {
          continue;
        }
        
        // LAYER 2: Belt-and-suspenders check on thread_id patterns
        if (threadId.includes('rsz') || threadId.includes('elev') || threadId.includes('accessibility')) {
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
      
      // Skip RSZ-like alerts from Bluesky - TTC API is the source of truth for RSZ
      // These alerts should only come from processRszAlerts()
      const lowerText = text.toLowerCase();
      const isRszText = lowerText.includes('slower than usual') ||
                        lowerText.includes('reduced speed') ||
                        lowerText.includes('move slower') ||
                        lowerText.includes('running slower') ||
                        lowerText.includes('slow zone');
      if (isRszText) {
        console.log(`Skipping Bluesky RSZ alert - TTC API is source of truth: ${text.substring(0, 50)}...`);
        continue;
      }
      
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
        const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
        const threadId = thread.thread_id || '';
        
        // CRITICAL: Skip RSZ and ACCESSIBILITY threads during Bluesky matching
        // These threads have their own lifecycle managed by TTC API (STEP 6b/6c)
        // SERVICE_RESUMED posts should NOT resolve these threads
        // LAYER 1: Check categories array
        if (threadCategories.includes('RSZ') || threadCategories.includes('ACCESSIBILITY')) {
          continue;
        }
        
        // LAYER 2: Belt-and-suspenders check on thread_id patterns
        // Prevents issues if categories array is malformed
        if (threadId.includes('rsz') || threadId.includes('elev') || threadId.includes('accessibility')) {
          console.log(`Skipping protected thread ${threadId} during Bluesky matching (thread_id pattern match)`);
          continue;
        }
        
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
        // CRITICAL: NEVER resolve RSZ or ACCESSIBILITY threads via SERVICE_RESUMED
        // These threads have their own lifecycle managed by TTC API
        const matchedCategories = (matchedThread.categories as string[]) || [];
        const isProtectedThread = matchedCategories.includes('RSZ') || matchedCategories.includes('ACCESSIBILITY');
        
        if (category === 'SERVICE_RESUMED' && !isProtectedThread) {
          updates.is_resolved = true;
          updates.resolved_at = new Date().toISOString();
          // Add SERVICE_RESUMED to thread categories if not already present
          if (!matchedCategories.includes('SERVICE_RESUMED')) {
            updates.categories = [...matchedCategories, 'SERVICE_RESUMED'];
          }
        }

        await supabase
          .from('incident_threads')
          .update(updates)
          .eq('thread_id', matchedThread.thread_id);

        updatedThreads++;
      } else {
        // No matching thread found
        // ARCHITECTURAL RULE: Bluesky only creates threads for SERVICE_RESUMED (Recently Resolved)
        // All other categories (DIVERSION, DELAY, etc.) must come from TTC API
        // Skip Bluesky alerts that don't match existing threads (unless SERVICE_RESUMED)
        if (category !== 'SERVICE_RESUMED') {
          console.log(`Skipping Bluesky alert "${text.substring(0, 50)}..." - no matching thread and not SERVICE_RESUMED`);
          continue;
        }
        
        // Create new thread ONLY for SERVICE_RESUMED (Recently Resolved)
        const { data: threadResult, error: threadError } = await supabase
          .rpc('find_or_create_thread', {
            p_title: text.split('\n')[0].substring(0, 200),
            p_routes: routes,
            p_categories: [category],
            p_is_resolved: true // SERVICE_RESUMED threads are always resolved
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
          
          console.log(`Created SERVICE_RESUMED thread ${newThreadId} for alert ${newAlert.alert_id}`);
        }
      }
    }

    // STEP 5: Process RSZ alerts from TTC API
    const rszResult = await processRszAlerts(supabase, ttcData.rszAlerts);
    newAlerts += rszResult.newAlerts;
    updatedThreads += rszResult.updatedThreads;

    // STEP 5b: Process disruption alerts from TTC API (delays, closures, shuttles)
    // This is the PRIMARY source for active disruptions - NOT Bluesky
    const disruptionResult = await processDisruptionAlerts(supabase, ttcData.disruptionAlerts);
    newAlerts += disruptionResult.newAlerts;
    updatedThreads += disruptionResult.updatedThreads;

    // STEP 6: Process elevator/escalator alerts from TTC API
    const elevatorResult = await processElevatorAlerts(supabase, ttcData.elevatorAlerts);
    newAlerts += elevatorResult.newAlerts;
    updatedThreads += elevatorResult.updatedThreads;

    // STEP 6b: Resolve ACCESSIBILITY threads that are no longer in TTC API
    // Uses the same generateElevatorThreadId() function as processElevatorAlerts
    // to ensure consistent thread ID matching between creation and resolution.
    let resolvedElevators = 0;
    
    // Build a set of active thread ID suffixes from TTC API using the SAME logic
    // as processElevatorAlerts. This is critical for matching!
    const activeElevatorSuffixes = new Set<string>();
    for (const e of ttcData.elevatorAlerts) {
      const { suffix } = generateElevatorThreadId({
        elevatorCode: e.elevatorCode,
        headerText: e.headerText || ''
      });
      activeElevatorSuffixes.add(suffix);
      console.log(`STEP 6b: Active elevator suffix: ${suffix} (code: ${e.elevatorCode || 'Non-TTC'})`);
    }
    
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
      // Extract suffix from thread_id (format: thread-elev-{suffix})
      const suffixMatch = thread.thread_id?.match(/^thread-elev-(.+)$/);
      const threadSuffix = suffixMatch ? suffixMatch[1] : null;
      
      // Skip threads that don't follow the elevator thread ID pattern (legacy threads)
      if (!threadSuffix) {
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
      
      // Check if this thread's suffix is still in the active set
      if (!activeElevatorSuffixes.has(threadSuffix)) {
        console.log(`STEP 6b: Resolving elevator thread: "${thread.title}" - suffix "${threadSuffix}" no longer in TTC API`);
        
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
    
    // STEP 6b-repair: Unhide ACCESSIBILITY threads that ARE in TTC API but were incorrectly hidden
    // This can happen due to race conditions or temporary API glitches
    let unhiddenElevators = 0;
    
    // Get all hidden (but not resolved) ACCESSIBILITY threads
    const { data: hiddenElevatorThreads } = await supabase
      .from('incident_threads')
      .select('thread_id, title')
      .filter('categories', 'cs', '["ACCESSIBILITY"]')
      .eq('is_hidden', true)
      .eq('is_resolved', false);
    
    for (const thread of hiddenElevatorThreads || []) {
      const suffixMatch = thread.thread_id?.match(/^thread-elev-(.+)$/);
      const threadSuffix = suffixMatch ? suffixMatch[1] : null;
      
      // Check if this thread's suffix is in the active set (should be visible)
      if (threadSuffix && activeElevatorSuffixes.has(threadSuffix)) {
        console.log(`STEP 6b-repair: Unhiding elevator thread: "${thread.title}" - suffix "${threadSuffix}" is active in TTC API`);
        
        const { error: updateError } = await supabase
          .from('incident_threads')
          .update({ 
            is_hidden: false,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', thread.thread_id);
        
        if (!updateError) {
          unhiddenElevators++;
        }
      }
    }
    
    console.log(`STEP 6b: Resolved ${resolvedElevators} elevator threads, unhid ${unhiddenElevators}`);
    
    // STEP 6b-repair-alerts: Ensure all alerts in visible ACCESSIBILITY threads have is_latest = true
    // This fixes data integrity issues where alerts may have incorrect is_latest flags
    const { data: activeAccessibilityThreadIds } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .filter('categories', 'cs', '["ACCESSIBILITY"]')
      .eq('is_hidden', false)
      .eq('is_resolved', false);
    
    if (activeAccessibilityThreadIds && activeAccessibilityThreadIds.length > 0) {
      const threadIds = activeAccessibilityThreadIds.map(t => t.thread_id);
      
      const { data: alertsFixed, error: alertFixError } = await supabase
        .from('alert_cache')
        .update({ is_latest: true })
        .in('thread_id', threadIds)
        .eq('is_latest', false)
        .select('alert_id');
      
      if (!alertFixError && alertsFixed && alertsFixed.length > 0) {
        console.log(`STEP 6b-repair-alerts: Fixed is_latest flag for ${alertsFixed.length} elevator alerts`);
      }
    }

    // STEP 6c: Manage RSZ thread lifecycle based on TTC API
    let resolvedRszThreads = 0;
    let repairedRszThreads = 0;
    
    // Build a set of active RSZ thread_ids from TTC API alerts
    // This allows us to track individual zones, not just lines
    const activeRszThreadIds = new Set<string>();
    const ttcLinesWithRsz = new Set<string>();
    
    for (const rsz of ttcData.rszAlerts) {
      const route = rsz.route || rsz.affectedRoute || '';
      const stopStart = rsz.stopStart || '';
      const stopEnd = rsz.stopEnd || '';
      const headerText = rsz.headerText || '';
      
      // Normalize line name
      const lineName = /^\d$/.test(route) ? `Line ${route}` : route;
      if (lineName) ttcLinesWithRsz.add(lineName);
      
      // Generate the alert_id and thread_id using the same logic as processRszAlerts
      const alertId = generateTtcAlertId('rsz', route, headerText, stopStart, stopEnd);
      const { threadId } = generateRszThreadId(alertId);
      activeRszThreadIds.add(threadId);
      
      console.log(`STEP 6c: Active RSZ thread_id: ${threadId} (${lineName} ${stopStart} -> ${stopEnd})`);
    }
    
    console.log(`STEP 6c: Found ${activeRszThreadIds.size} active RSZ zones from TTC API`);
    
    // STEP 6c-repair: Un-resolve RSZ threads that were incorrectly resolved
    // If the specific RSZ zone is in TTC API, ensure the thread is active
    // Also fixes title and is_latest flag to point to actual RSZ alert (not SERVICE_RESUMED)
    if (activeRszThreadIds.size > 0) {
      const { data: resolvedRszData } = await supabase
        .from('incident_threads')
        .select('thread_id, title, affected_routes')
        .filter('categories', 'cs', '["RSZ"]')
        .eq('is_resolved', true);
      
      for (const thread of resolvedRszData || []) {
        // Check if this specific thread_id is in the active set
        if (activeRszThreadIds.has(thread.thread_id)) {
          console.log(`STEP 6c-repair: Un-resolving RSZ thread: "${thread.title}" - thread_id "${thread.thread_id}" is active in TTC API`);
          
          // First, reset all is_latest flags for this thread's alerts
          await supabase
            .from('alerts')
            .update({ is_latest: false })
            .eq('thread_id', thread.thread_id);
          
          // Find the most recent RSZ alert (not SERVICE_RESUMED) for this thread
          const { data: latestRszAlert } = await supabase
            .from('alerts')
            .select('id, header_text')
            .eq('thread_id', thread.thread_id)
            .eq('effect', 'RSZ')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Set is_latest on the correct RSZ alert
          if (latestRszAlert) {
            await supabase
              .from('alerts')
              .update({ is_latest: true })
              .eq('id', latestRszAlert.id);
          }
          
          // Update the thread with correct title and clear SERVICE_RESUMED from categories
          await supabase
            .from('incident_threads')
            .update({ 
              is_resolved: false,
              is_hidden: false,
              resolved_at: null,
              updated_at: new Date().toISOString(),
              // Remove SERVICE_RESUMED from categories if present (it was added incorrectly)
              categories: ['RSZ'],
              // Fix title to match actual RSZ alert, not SERVICE_RESUMED
              title: latestRszAlert?.header_text || thread.title
            })
            .eq('thread_id', thread.thread_id);
          
          repairedRszThreads++;
        }
      }
    }
    
    // STEP 6c-resolve: Resolve RSZ threads that no longer have their specific zone in TTC API
    // Get all active RSZ threads - use filter() with 'cs' operator for JSONB containment
    const { data: rszThreads } = await supabase
      .from('incident_threads')
      .select('thread_id, title, affected_routes')
      .filter('categories', 'cs', '["RSZ"]')
      .eq('is_resolved', false)
      .eq('is_hidden', false);
    
    for (const thread of rszThreads || []) {
      // Skip legacy threads - they don't follow the zone-based pattern
      if (thread.thread_id?.includes('legacy')) {
        continue;
      }
      
      // Check if this specific thread_id is in the active set from TTC API
      if (!activeRszThreadIds.has(thread.thread_id)) {
        console.log(`STEP 6c-resolve: Hiding RSZ thread: "${thread.title}" - thread_id "${thread.thread_id}" no longer in TTC API`);
        
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
    
    // STEP 6c-fix-title: Fix RSZ thread titles if they have SERVICE_RESUMED text
    // This catches cases where SERVICE_RESUMED was matched to RSZ thread incorrectly
    for (const thread of rszThreads || []) {
      // Check if thread title contains "resumed" (case-insensitive)
      const titleLower = (thread.title || '').toLowerCase();
      if (titleLower.includes('resumed') || titleLower.includes('regular service')) {
        console.log(`STEP 6c-fix-title: Fixing RSZ thread title: "${thread.title}"`);
        
        // Reset all is_latest flags for this thread
        await supabase
          .from('alerts')
          .update({ is_latest: false })
          .eq('thread_id', thread.thread_id);
        
        // Find the most recent RSZ alert (not SERVICE_RESUMED) for this thread
        const { data: latestRszAlert } = await supabase
          .from('alerts')
          .select('id, header_text')
          .eq('thread_id', thread.thread_id)
          .eq('effect', 'RSZ')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestRszAlert) {
          // Set is_latest on the correct RSZ alert
          await supabase
            .from('alerts')
            .update({ is_latest: true })
            .eq('id', latestRszAlert.id);
          
          // Update thread title
          await supabase
            .from('incident_threads')
            .update({ 
              title: latestRszAlert.header_text,
              updated_at: new Date().toISOString()
            })
            .eq('thread_id', thread.thread_id);
          
          console.log(`STEP 6c-fix-title: Fixed RSZ thread title to: "${latestRszAlert.header_text}"`);
        }
      }
    }
    
    // STEP 6c-repair-alerts: Ensure all alerts in visible RSZ threads have is_latest = true
    // This fixes data integrity issues similar to elevator alerts
    const { data: activeRszThreadIds2 } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .filter('categories', 'cs', '["RSZ"]')
      .eq('is_hidden', false)
      .eq('is_resolved', false);
    
    if (activeRszThreadIds2 && activeRszThreadIds2.length > 0) {
      const rszThreadIdList = activeRszThreadIds2.map(t => t.thread_id);
      
      const { data: rszAlertsFixed, error: rszAlertFixError } = await supabase
        .from('alert_cache')
        .update({ is_latest: true })
        .in('thread_id', rszThreadIdList)
        .eq('is_latest', false)
        .select('alert_id');
      
      if (!rszAlertFixError && rszAlertsFixed && rszAlertsFixed.length > 0) {
        console.log(`STEP 6c-repair-alerts: Fixed is_latest flag for ${rszAlertsFixed.length} RSZ alerts`);
      }
    }
    
    // STEP 6d: Repair orphaned elevator alerts (alerts with no thread_id)
    // This can happen if thread creation failed after alert insert
    // Uses the same generateElevatorThreadId() function for consistency
    const { data: orphanedAlerts } = await supabase
      .from('alert_cache')
      .select('alert_id, header_text, effect')
      .is('thread_id', null)
      .eq('effect', 'ACCESSIBILITY_ISSUE');
    
    let repairedElevators = 0;
    for (const orphan of orphanedAlerts || []) {
      // Extract elevator code from alert_id
      // Handle both "ttc-elev-15S2L-..." -> "15S2L" AND "ttc-elev-Non-TTC-..." -> "Non-TTC"
      let elevatorCode: string | null = null;
      
      // First check for Non-TTC pattern
      if (orphan.alert_id.startsWith('ttc-elev-Non-TTC-')) {
        elevatorCode = 'Non-TTC';
      } else {
        // Standard pattern: ttc-elev-{code}-...
        const codeMatch = orphan.alert_id.match(/^ttc-elev-([^-]+)-/);
        if (codeMatch) {
          elevatorCode = codeMatch[1];
        }
      }
      
      if (!elevatorCode) continue;
      
      // Extract station name from header text
      const stationMatch = orphan.header_text?.match(/^([^:]+):/);
      const station = stationMatch ? stationMatch[1].trim() : 'Unknown Station';
      
      // Use centralized thread ID generator for consistency with processElevatorAlerts and STEP 6b
      const { threadId } = generateElevatorThreadId({
        elevatorCode,
        headerText: orphan.header_text || '',
        alertId: orphan.alert_id
      });
      
      // Check if thread exists
      const { data: existingThread } = await supabase
        .from('incident_threads')
        .select('thread_id')
        .eq('thread_id', threadId)
        .single();
      
      if (!existingThread) {
        // Create the missing thread
        console.log(`STEP 6d: Creating missing thread ${threadId} for orphaned elevator alert ${orphan.alert_id}`);
        await supabase
          .from('incident_threads')
          .insert({
            thread_id: threadId,
            title: orphan.header_text,
            affected_routes: [station],
            categories: ['ACCESSIBILITY'],
            is_resolved: false,
            is_hidden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      // Link the alert to the thread
      await supabase
        .from('alert_cache')
        .update({ thread_id: threadId, is_latest: true })
        .eq('alert_id', orphan.alert_id);
      
      repairedElevators++;
      console.log(`STEP 6d: Linked orphaned elevator alert ${orphan.alert_id} to ${threadId}`);
    }

    // STEP 6e: Repair orphaned RSZ alerts (alerts with no thread_id)
    // This can happen if thread creation failed after alert insert
    // Uses the generateRszThreadId() function for consistent thread IDs
    const { data: orphanedRszAlerts } = await supabase
      .from('alert_cache')
      .select('alert_id, header_text, affected_routes')
      .is('thread_id', null)
      .eq('effect', 'RSZ');
    
    let repairedRsz = 0;
    for (const orphan of orphanedRszAlerts || []) {
      // Generate thread ID from alert_id pattern
      const { threadId, lineNumber, location } = generateRszThreadId(orphan.alert_id);
      
      if (!threadId || location === 'legacy') {
        // Skip legacy format - shouldn't create more legacy threads
        console.log(`STEP 6e: Skipping legacy RSZ alert ${orphan.alert_id}`);
        continue;
      }
      
      // Check if thread exists
      const { data: existingThread } = await supabase
        .from('incident_threads')
        .select('thread_id, is_hidden')
        .eq('thread_id', threadId)
        .single();
      
      if (!existingThread) {
        // Create the missing thread
        const routes = Array.isArray(orphan.affected_routes) ? orphan.affected_routes : [`Line ${lineNumber}`];
        console.log(`STEP 6e: Creating missing thread ${threadId} for orphaned RSZ alert ${orphan.alert_id}`);
        await supabase
          .from('incident_threads')
          .insert({
            thread_id: threadId,
            title: orphan.header_text,
            affected_routes: routes,
            categories: ['RSZ'],
            is_resolved: false,
            is_hidden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } else if (existingThread.is_hidden) {
        // Thread exists but is hidden - unhide it
        console.log(`STEP 6e: Unhiding hidden RSZ thread ${threadId}`);
        await supabase
          .from('incident_threads')
          .update({ is_hidden: false, updated_at: new Date().toISOString() })
          .eq('thread_id', threadId);
      }
      
      // Link the alert to the thread
      await supabase
        .from('alert_cache')
        .update({ thread_id: threadId, is_latest: true })
        .eq('alert_id', orphan.alert_id);
      
      repairedRsz++;
      console.log(`STEP 6e: Linked orphaned RSZ alert ${orphan.alert_id} to ${threadId}`);
    }

    // STEP 7: Merge duplicate ACCESSIBILITY threads by keeping only the newest one per station
    // NOTE: RSZ threads are EXCLUDED - each RSZ zone is unique even on the same line
    // RSZ threads have thread_id like "thread-rsz-line1-eglinton-davisville" which encodes location
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
      
      // SKIP RSZ threads - each zone is unique, never merge them
      // RSZ threads encode their location in thread_id (thread-rsz-line1-eglinton-davisville)
      if (threadCategories.includes('RSZ')) {
        continue;
      }
      
      // Only process ACCESSIBILITY threads for deduplication
      if (!threadCategories.includes('ACCESSIBILITY')) {
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
        disruptionAlerts: ttcData.disruptionAlerts.length,
        rszAlerts: ttcData.rszAlerts.length,
        elevatorAlerts: ttcData.elevatorAlerts.length,
        hiddenThreads,
        resolvedElevators,
        unhiddenElevators,
        resolvedRszThreads,
        repairedRszThreads,
        repairedElevators,
        repairedRsz, // STEP 6e: Orphaned RSZ alerts repaired
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
