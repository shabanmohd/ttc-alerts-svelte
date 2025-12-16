import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// VERSION 43 - Fix accessibility thread auto-resolve logic
// - v43: Separate auto-resolve logic for accessibility vs route-based threads
// - v42: Generate UUID for thread_id when creating TTC API threads
// - v41: Process TTC API accessibility array (elevator/escalator outages)
// - v40: Refined filtering to include SIGNIFICANT_DELAYS even if planned
// - v39: TTC Live API as secondary data source
// - v38: Direction mismatch penalty
const FUNCTION_VERSION = 43;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bluesky API endpoint
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
const TTC_ALERTS_DID = 'did:plc:ttcalerts'; // Replace with actual DID

// Alert categories with keywords
const ALERT_CATEGORIES = {
  SERVICE_DISRUPTION: {
    keywords: ['no service', 'suspended', 'closed', 'not stopping', 'bypassing'],
    priority: 1
  },
  SERVICE_RESUMED: {
    keywords: ['regular service', 'resumed', 'restored', 'back to normal', 'now stopping', 'service has resumed'],
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
  },
  ACCESSIBILITY: {
    keywords: ['elevator', 'escalator', 'accessible', 'wheelchair', 'out of service'],
    priority: 6
  }
};

// Extract Bluesky reply parent info from post record
interface BlueskyReplyInfo {
  parentUri: string | null;
  parentPostId: string | null;
  rootUri: string | null;
}

function extractReplyInfo(record: any): BlueskyReplyInfo {
  const reply = record?.reply;
  if (!reply) {
    return { parentUri: null, parentPostId: null, rootUri: null };
  }
  
  const parentUri = reply.parent?.uri || null;
  const rootUri = reply.root?.uri || null;
  
  // Extract post_id from parent URI: at://did:plc:xxx/app.bsky.feed.post/{post_id}
  let parentPostId: string | null = null;
  if (parentUri) {
    const match = parentUri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
    if (match) {
      parentPostId = `bsky-${match[1]}`;
    }
  }
  
  return { parentUri, parentPostId, rootUri };
}

// Map category to effect (for subway status display: Delay vs Disruption)
function categoryToEffect(category: string): string {
  switch (category) {
    case 'SERVICE_RESUMED':
      return 'RESUMED';
    case 'DELAY':
      return 'SIGNIFICANT_DELAYS';
    case 'DIVERSION':
      return 'DETOUR';
    case 'SHUTTLE':
      return 'MODIFIED_SERVICE';
    case 'PLANNED_CLOSURE':
      return 'SCHEDULED';
    case 'SERVICE_DISRUPTION':
    default:
      return 'NO_SERVICE';
  }
}

// Extract routes from alert text
function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  
  // Match subway lines first: Line 1, Line 2, Line 4, Line 6
  const lineMatch = text.match(/Line\s*\d+/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      routes.push(m); // Keep "Line 1" format
    });
  }
  
  // IMPORTANT: Handle comma-separated route lists like "37, 37A" or "123, 123C, 123D"
  // This pattern appears at the START of TTC alerts
  // Look for patterns like "123, 123C, 123D Sherway" or "37, 37A Islington"
  const commaListMatch = text.match(/^(\d{1,3}(?:[A-Z])?(?:\s*,\s*\d{1,3}[A-Z]?)+)/);
  if (commaListMatch) {
    // Split by comma and extract each route
    const routeList = commaListMatch[1].split(/\s*,\s*/);
    routeList.forEach(r => {
      const trimmed = r.trim();
      if (trimmed && !routes.includes(trimmed)) {
        routes.push(trimmed);
      }
    });
  }
  
  // Match route numbers with letter suffix variants: "37A", "37B", "123C", "123D"
  const routeWithSuffixMatch = text.match(/\b(\d{1,3}[A-Z])\b/g);
  if (routeWithSuffixMatch) {
    routeWithSuffixMatch.forEach(m => {
      if (!routes.includes(m)) {
        routes.push(m);
      }
    });
  }
  
  // Helper: Check if a match is likely an address (not a route)
  // Addresses have patterns like "123 Yonge Ave", "456 Queen St", "789 King Blvd"
  // Routes are at the START or have specific TTC route names
  const isLikelyAddress = (match: string, matchIndex: number): boolean => {
    // If it's at the very start of the text, it's likely a route
    if (matchIndex === 0) return false;
    
    // Check if followed by street suffix (Ave, St, Blvd, Rd, Dr, etc.)
    const afterMatch = text.slice(matchIndex + match.length);
    if (/^\s+(Ave|St|Blvd|Rd|Dr|Cres|Way|Pkwy|Pl|Ct|Ln|Ter|Circle|Gate)\.?\b/i.test(afterMatch)) {
      return true;
    }
    
    // Check if preceded by "to", "at", "near", "from" (address context)
    const beforeMatch = text.slice(0, matchIndex);
    if (/\b(to|at|near|from|between)\s*$/i.test(beforeMatch)) {
      return true;
    }
    
    return false;
  };
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  // But DON'T match if already captured in comma list
  // FILTER OUT addresses like "106 Lansdowne Ave"
  const routeWithNameRegex = /\b(\d{1,3})\s+([A-Z][a-z]+)/g;
  let routeWithNameMatch;
  while ((routeWithNameMatch = routeWithNameRegex.exec(text)) !== null) {
    const fullMatch = routeWithNameMatch[0];
    const numPart = routeWithNameMatch[1];
    const matchIndex = routeWithNameMatch.index;
    
    // Skip if this looks like an address
    if (isLikelyAddress(fullMatch, matchIndex)) {
      continue;
    }
    
    // Skip if we already have this route number
    if (routes.some(r => r.startsWith(numPart))) {
      continue;
    }
    
    routes.push(fullMatch); // Keep "306 Carlton" format
  }
  
  // Match standalone route numbers at start of text: "510 Spadina" where 510 is the route
  const startMatch = text.match(/^(\d{1,3})\s+[A-Z]/);
  if (startMatch && !routes.some(r => r.startsWith(startMatch[1]))) {
    routes.push(startMatch[1]);
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

// Check if two routes have the same route number (route family match)
function routesMatch(route1: string, route2: string): boolean {
  const num1 = extractRouteNumber(route1);
  const num2 = extractRouteNumber(route2);
  return num1 === num2;
}

// Extract location keywords from alert text for better similarity matching
function extractLocationKeywords(text: string): Set<string> {
  const keywords = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Common TTC location words
  const locationPatterns = [
    /\bat\s+(\w+)\s+(ave|st|blvd|rd|dr|cres|way|pkwy)\b/gi,
    /\b(\w+)\s+station\b/gi,
    /\bvia\s+(\w+)/gi,
    /\bnear\s+(\w+)/gi,
  ];
  
  locationPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.add(m.toLowerCase()));
    }
  });
  
  // Extract specific street names
  const streetMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Ave|St|Blvd|Rd|Dr|Cres|Way)\b/g);
  if (streetMatch) {
    streetMatch.forEach(s => keywords.add(s.toLowerCase()));
  }
  
  return keywords;
}

// Extract station names specifically (for subway alerts)
function extractStationName(text: string): string | null {
  const lowerText = text.toLowerCase();
  // Match patterns like "at Jane station", "at St George station", "from Osgoode station"
  const stationMatch = lowerText.match(/(?:at|from|to|between|near)\s+([a-z]+(?:\s+[a-z]+)?)\s+station/i);
  if (stationMatch) {
    return stationMatch[1].toLowerCase();
  }
  // Also match "X station" at end or standalone
  const endMatch = lowerText.match(/([a-z]+(?:\s+[a-z]+)?)\s+station/i);
  if (endMatch) {
    return endMatch[1].toLowerCase();
  }
  return null;
}

// Extract direction from alert text (northbound, southbound, eastbound, westbound)
function extractDirection(text: string): string | null {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('northbound')) return 'northbound';
  if (lowerText.includes('southbound')) return 'southbound';
  if (lowerText.includes('eastbound')) return 'eastbound';
  if (lowerText.includes('westbound')) return 'westbound';
  return null;
}

// Extract incident cause for matching
function extractCause(text: string): string | null {
  const lowerText = text.toLowerCase();
  const causes = ['collision', 'medical emergency', 'fire', 'police', 'construction', 
                  'stalled', 'track work', 'signal problem', 'power', 'trespasser'];
  return causes.find(c => lowerText.includes(c)) || null;
}

// Calculate Jaccard similarity for threading
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Enhanced similarity that considers location and cause
// CRITICAL: Adds PENALTY for different stations to prevent grouping different incidents
function enhancedSimilarity(text1: string, text2: string): number {
  // Base Jaccard similarity
  const jaccard = jaccardSimilarity(text1, text2);
  
  // Location overlap bonus
  const loc1 = extractLocationKeywords(text1);
  const loc2 = extractLocationKeywords(text2);
  const locOverlap = [...loc1].filter(l => loc2.has(l)).length;
  const locationBonus = locOverlap > 0 ? Math.min(0.2, locOverlap * 0.1) : 0;
  
  // Same cause bonus
  const cause1 = extractCause(text1);
  const cause2 = extractCause(text2);
  const causeBonus = (cause1 && cause1 === cause2) ? 0.15 : 0;
  
  // STATION MISMATCH PENALTY: If both texts mention stations but they're DIFFERENT,
  // this is likely a different incident on the same line (e.g., Jane vs St George)
  const station1 = extractStationName(text1);
  const station2 = extractStationName(text2);
  let stationPenalty = 0;
  if (station1 && station2 && station1 !== station2) {
    // Both mention different stations - strong penalty to prevent grouping
    stationPenalty = -0.4;
    console.log(`Station mismatch penalty: "${station1}" ≠ "${station2}", penalty=${stationPenalty}`);
  }
  
  // DIRECTION MISMATCH PENALTY: If both texts mention directions but they're DIFFERENT,
  // treat them as separate incidents (e.g., northbound vs southbound)
  const dir1 = extractDirection(text1);
  const dir2 = extractDirection(text2);
  let directionPenalty = 0;
  if (dir1 && dir2 && dir1 !== dir2) {
    // Both mention different directions - strong penalty to keep them separate
    directionPenalty = -0.5;
    console.log(`Direction mismatch penalty: "${dir1}" ≠ "${dir2}", penalty=${directionPenalty}`);
  }
  
  return Math.max(0, Math.min(1, jaccard + locationBonus + causeBonus + stationPenalty + directionPenalty));
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

    // === CROSS-CHECK WITH TTC LIVE API ===
    // Use official TTC API as authoritative source for resolution status
    // AND as secondary data source for alerts not covered by Bluesky
    const now = new Date();
    let ttcApiResolvedCount = 0;
    let ttcApiError: string | null = null;
    let ttcApiAlerts: any[] = []; // Store TTC API alerts for later processing
    
    try {
      // Fetch live alerts from TTC official API
      const ttcResponse = await fetch('https://alerts.ttc.ca/api/alerts/live-alerts', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (ttcResponse.ok) {
        const ttcData = await ttcResponse.json();
        
        // Extract all currently active routes from TTC API
        const activeRoutes = new Set<string>();
        
        // Process routes array (main service alerts)
        // ALSO save non-planned alerts for secondary data source
        if (ttcData.routes && Array.isArray(ttcData.routes)) {
          for (const alert of ttcData.routes) {
            if (alert.route) {
              // Handle route like "1", "501", "Line 1", etc.
              const route = alert.route.toString();
              activeRoutes.add(route);
              
              // Also add subway line format variations
              if (/^[1-4]$/.test(route)) {
                activeRoutes.add(`Line ${route}`);
              }
            }
            
            // === SAVE ALERTS FOR SECONDARY DATA SOURCE ===
            // Exclude planned closures (REDUCED_SERVICE, NO_SERVICE with alertType: "Planned")
            // Include: SIGNIFICANT_DELAYS even if planned (these are real-time slow zones)
            // Include: DETOUR, ACCESSIBILITY_ISSUE (always non-planned in practice)
            const isPlannedClosure = alert.alertType === 'Planned' && 
              ['NO_SERVICE', 'REDUCED_SERVICE'].includes(alert.effect);
            const hasRelevantEffect = ['NO_SERVICE', 'REDUCED_SERVICE', 'DETOUR', 'SIGNIFICANT_DELAYS', 'ACCESSIBILITY_ISSUE'].includes(alert.effect);
            
            if (!isPlannedClosure && hasRelevantEffect && alert.route && alert.headerText) {
              ttcApiAlerts.push(alert);
            }
          }
        }
        
        // Process siteWideCustom (scheduled closures, major alerts)
        if (ttcData.siteWideCustom && Array.isArray(ttcData.siteWideCustom)) {
          for (const alert of ttcData.siteWideCustom) {
            if (alert.route) {
              const route = alert.route.toString();
              activeRoutes.add(route);
              if (/^[1-4]$/.test(route)) {
                activeRoutes.add(`Line ${route}`);
              }
            }
            // Note: siteWideCustom alerts are typically planned/scheduled, so we don't add them to ttcApiAlerts
          }
        }
        
        // Process accessibility array (elevator/escalator outages)
        // These are ALWAYS active issues and should be imported
        if (ttcData.accessibility && Array.isArray(ttcData.accessibility)) {
          for (const alert of ttcData.accessibility) {
            if (alert.effect === 'ACCESSIBILITY_ISSUE' && alert.headerText) {
              // These alerts have route like "1,19,26,127" - use first route for primary matching
              // but store all for display
              ttcApiAlerts.push(alert);
            }
          }
        }
        
        console.log(`TTC API shows ${activeRoutes.size} routes with active alerts: ${[...activeRoutes].join(', ')}`);
        console.log(`TTC API has ${ttcApiAlerts.length} alerts available as secondary source (${ttcData.accessibility?.length || 0} accessibility)`);
        
        // Get all unresolved threads from our database
        const { data: unresolvedThreads } = await supabase
          .from('incident_threads')
          .select('thread_id, title, affected_routes, categories')
          .eq('is_resolved', false);
        
        if (unresolvedThreads) {
          for (const thread of unresolvedThreads) {
            const threadRoutes = thread.affected_routes || [];
            const threadCategories = thread.categories || [];
            
            // Skip auto-resolve for ACCESSIBILITY threads
            // These have station names as routes (e.g., "Dupont") not route numbers
            // and their resolution is handled separately by checking the TTC accessibility API
            if (threadCategories.includes('ACCESSIBILITY')) {
              // Check if this accessibility alert is still in the TTC API accessibility array
              const isAccessibilityStillActive = ttcData.accessibility?.some((accessAlert: any) => {
                const accessHeader = (accessAlert.headerText || '').toLowerCase();
                const threadTitle = (thread.title || '').toLowerCase();
                // Match by station name in the title
                return threadRoutes.some((route: string) => 
                  accessHeader.includes(route.toLowerCase()) || 
                  threadTitle.includes(route.toLowerCase())
                );
              }) ?? false;
              
              if (!isAccessibilityStillActive) {
                // Accessibility issue no longer in TTC API - mark as resolved
                await supabase
                  .from('incident_threads')
                  .update({ 
                    is_resolved: true,
                    resolved_at: now.toISOString(),
                    updated_at: now.toISOString()
                  })
                  .eq('thread_id', thread.thread_id);
                
                ttcApiResolvedCount++;
                console.log(`TTC API resolved accessibility: ${thread.title}`);
              }
              continue; // Skip the normal route-based resolution check
            }
            
            // Check if ANY of the thread's routes are still active in TTC API
            const isStillActive = threadRoutes.some((route: string) => {
              // Direct match
              if (activeRoutes.has(route)) return true;
              
              // Check route number match (e.g., "501" matches "501")
              const routeNum = route.match(/^(\d+)/)?.[1];
              if (routeNum && activeRoutes.has(routeNum)) return true;
              
              // Check subway line variations
              if (route.toLowerCase().startsWith('line')) {
                const lineNum = route.match(/\d+/)?.[0];
                if (lineNum && (activeRoutes.has(lineNum) || activeRoutes.has(`Line ${lineNum}`))) return true;
              }
              
              return false;
            });
            
            if (!isStillActive) {
              // Route is no longer in TTC API - mark as resolved
              await supabase
                .from('incident_threads')
                .update({ 
                  is_resolved: true,
                  resolved_at: now.toISOString(),
                  updated_at: now.toISOString()
                })
                .eq('thread_id', thread.thread_id);
              
              ttcApiResolvedCount++;
              console.log(`TTC API resolved: ${thread.title} (routes: ${threadRoutes.join(', ')} not in active alerts)`);
            }
          }
        }
      } else {
        ttcApiError = `TTC API returned ${ttcResponse.status}`;
        console.warn('TTC API unavailable:', ttcApiError);
      }
    } catch (ttcErr) {
      ttcApiError = ttcErr.message;
      console.warn('TTC API fetch failed:', ttcApiError);
    }

    // Fetch latest posts from @ttcalerts
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

    // Get existing alert_ids from last 24 hours for deduplication
    // NOTE: We use alert_id (not bluesky_uri) because alert_id is the primary key
    // and is derived from the bluesky post ID
    const { data: existingAlerts } = await supabase
      .from('alert_cache')
      .select('alert_id, thread_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const existingAlertIds = new Set(existingAlerts?.map(a => a.alert_id) || []);
    
    // Build alert_id -> thread_id map for reply chain threading
    const alertToThreadMap = new Map<string, string>();
    existingAlerts?.forEach(a => {
      if (a.thread_id) {
        alertToThreadMap.set(a.alert_id, a.thread_id);
      }
    });

    // NOTE: We now fetch candidate threads INSIDE the loop to catch newly created threads
    // This fixes the bug where SERVICE_RESUMED wouldn't find threads created in the same batch

    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      
      const uri = post.uri;

      // Extract post_id from URI to generate alert_id
      // URI format: at://did:plc:xxx/app.bsky.feed.post/{post_id}
      const postIdMatch = uri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
      if (!postIdMatch) {
        console.warn('Could not extract post_id from URI:', uri);
        continue;
      }
      const alertId = `bsky-${postIdMatch[1]}`;

      // Skip if we already have this alert (deduplication)
      if (existingAlertIds.has(alertId)) continue;

      const text = post.record.text;
      const { category, priority } = categorizeAlert(text);
      const routes = extractRoutes(text);
      
      // Extract Bluesky reply info for thread chaining
      const replyInfo = extractReplyInfo(post.record);
      
      // Log reply info for debugging
      if (replyInfo.parentPostId) {
        console.log(`[REPLY CHAIN] Alert ${alertId} is a reply to ${replyInfo.parentPostId}`);
      }
      
      // Create alert record matching alert_cache schema
      // CRITICAL: alert_id is required (NOT NULL) - must be generated from bluesky URI
      // NOTE: JSONB columns need arrays passed directly, not stringified
      // The Supabase client handles serialization automatically
      const alert = {
        alert_id: alertId,
        bluesky_uri: uri,
        header_text: text.split('\n')[0].substring(0, 200),
        description_text: text,
        categories: JSON.parse(JSON.stringify([category])), // Force clean array
        affected_routes: JSON.parse(JSON.stringify(routes)), // Force clean array
        created_at: post.record.createdAt,
        is_latest: true,
        effect: categoryToEffect(category),
        // Store reply info for debugging and verification
        raw_data: {
          replyParentPostId: replyInfo.parentPostId,
          replyRootPostId: replyInfo.rootUri ? `bsky-${replyInfo.rootUri.split('/').pop()}` : null,
          replyParentUri: replyInfo.parentUri
        }
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
      
      // Add new alert to the map for subsequent reply chain lookups
      // (in case later alerts in this batch reply to this one)
      existingAlertIds.add(alertId);

      // FRESH QUERY: Get candidate threads for matching
      // This is INSIDE the loop to catch threads created by earlier alerts in the same batch
      // Both unresolved AND recently resolved (for SERVICE_RESUMED matching)
      const { data: candidateThreads } = await supabase
        .from('incident_threads')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false });

      // ADDITIONAL QUERY: Get planned maintenance threads with extended time window (5 days)
      // Planned closures (weekends, track work) may have SERVICE_RESUMED posted days later
      let plannedMaintenanceThreads: any[] = [];
      if (category === 'SERVICE_RESUMED') {
        const { data: plannedThreads } = await supabase
          .from('incident_threads')
          .select('*')
          .gte('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
          .or('categories.cs.["PLANNED_CLOSURE"],categories.cs.["PLANNED_SERVICE_DISRUPTION"]')
          .order('created_at', { ascending: false });
        
        plannedMaintenanceThreads = plannedThreads || [];
        if (plannedMaintenanceThreads.length > 0) {
          console.log(`[PLANNED MAINTENANCE] Found ${plannedMaintenanceThreads.length} planned maintenance threads in last 5 days for SERVICE_RESUMED matching`);
        }
      }

      // Thread matching - find best matching thread
      let matchedThread = null;
      let bestSimilarity = 0;
      let matchedViaReply = false;  // Track if we matched via reply chain
      
      // === PRIORITY 1: BLUESKY REPLY CHAIN THREADING ===
      // If this alert is a reply to an existing alert, check if parent has a thread
      if (replyInfo.parentPostId) {
        console.log(`[REPLY CHAIN LOOKUP] Searching for parent ${replyInfo.parentPostId}...`);
        
        // First check our in-memory map (includes alerts from this batch)
        let parentThreadId = alertToThreadMap.get(replyInfo.parentPostId);
        
        if (parentThreadId) {
          console.log(`[REPLY CHAIN] Found parent in memory map: ${parentThreadId}`);
        }
        
        // If not in memory, query database for older alerts
        if (!parentThreadId) {
          const { data: parentAlert } = await supabase
            .from('alert_cache')
            .select('thread_id')
            .eq('alert_id', replyInfo.parentPostId)
            .single();
          
          if (parentAlert?.thread_id) {
            parentThreadId = parentAlert.thread_id;
            console.log(`[REPLY CHAIN] Found parent in database: ${parentThreadId}`);
          } else {
            console.log(`[REPLY CHAIN] Parent ${replyInfo.parentPostId} not found in database`);
          }
        }
        
        if (parentThreadId) {
          // Found parent's thread - get thread details
          const { data: parentThread } = await supabase
            .from('incident_threads')
            .select('*')
            .eq('thread_id', parentThreadId)
            .single();
          
          if (parentThread) {
            // RULE: Check if thread is resolved and handle based on category
            if (parentThread.is_resolved) {
              // SERVICE_RESUMED can match resolved threads (and keep them resolved)
              // Other categories can REOPEN resolved threads via reply chain
              if (category === 'SERVICE_RESUMED') {
                // SERVICE_RESUMED matching resolved thread - keep it resolved
                matchedThread = parentThread;
                matchedViaReply = true;
                console.log(`Reply chain: ${alertId} -> resolved thread ${parentThreadId} (SERVICE_RESUMED)`);
              } else {
                // Non-SERVICE_RESUMED alert replying to resolved thread
                // Per user rule: create new thread instead
                console.log(`Reply chain: ${alertId} -> resolved thread ${parentThreadId} but category=${category}, creating new thread`);
                // matchedThread stays null, will create new thread
              }
            } else {
              // Thread is still active - always match via reply chain
              // Per user rule B: Add to parent thread even if routes mismatch
              matchedThread = parentThread;
              matchedViaReply = true;
              
              const alertBaseRoutes = routes.map(extractRouteNumber);
              const threadRoutes = Array.isArray(parentThread.affected_routes) ? parentThread.affected_routes : [];
              const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
              const hasRouteOverlap = alertBaseRoutes.some(base => threadBaseRoutes.includes(base));
              
              if (!hasRouteOverlap && routes.length > 0) {
                console.log(`Reply chain: ${alertId} -> thread ${parentThreadId} (routes differ: alert=${routes.join(',')} thread=${threadRoutes.join(',')} - adding anyway per rule B)`);
              } else {
                console.log(`Reply chain: ${alertId} -> thread ${parentThreadId} (routes match)`);
              }
            }
          }
        }
      }

      // === PRIORITY 2: PLANNED MAINTENANCE THREADING ===
      // For SERVICE_RESUMED alerts, check planned maintenance threads first (extended 5-day window)
      // This handles weekend closures, track work, etc. where SERVICE_RESUMED may come days later
      if (!matchedThread && category === 'SERVICE_RESUMED' && routes.length > 0 && plannedMaintenanceThreads.length > 0) {
        const alertBaseRoutes = routes.map(extractRouteNumber);
        
        for (const thread of plannedMaintenanceThreads) {
          const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
          if (threadRoutes.length === 0) continue;
          
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          const allAlertRoutesMatchThread = alertBaseRoutes.every(alertBase => 
            threadBaseRoutes.includes(alertBase)
          );
          
          if (allAlertRoutesMatchThread) {
            const similarity = enhancedSimilarity(text, thread.title || '');
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              matchedThread = thread;
              console.log(`[PLANNED MAINTENANCE] SERVICE_RESUMED matched to planned closure thread ${thread.thread_id}, routes=${JSON.stringify(threadRoutes)}, similarity=${similarity.toFixed(2)}`);
            }
          }
        }
      }

      // === PRIORITY 3: SIMILARITY-BASED THREADING ===
      // Only if no match via reply chain
      // CRITICAL: Only attempt thread matching if alert has extracted routes
      // Alerts without routes should NEVER match existing threads
      // This prevents false positives where vague alerts get grouped incorrectly
      if (!matchedThread && routes.length > 0) {
        // Extract base route numbers for family matching
        const alertBaseRoutes = routes.map(extractRouteNumber);
        
        // Check for matching thread based on route family match and enhanced similarity
        for (const thread of candidateThreads || []) {
          const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
          
          // Skip threads with no routes - they can't be reliably matched
          if (threadRoutes.length === 0) continue;
          
          // Extract base route numbers from thread routes
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          
          // STRICT ROUTE MATCHING: All alert routes must match thread routes
          // This prevents Route 16 from matching Route 9 just because they share a location
          const allAlertRoutesMatchThread = alertBaseRoutes.every(alertBase => 
            threadBaseRoutes.includes(alertBase)
          );
          
          // Also check if any alert route matches thread routes (for adding to existing incidents)
          const hasRouteOverlap = alertBaseRoutes.some(alertBase => 
            threadBaseRoutes.includes(alertBase)
          );
          
          // For SERVICE_RESUMED, require strict match (all routes must match)
          // For other alerts, allow partial overlap but validate similarity
          const routeMatchOk = category === 'SERVICE_RESUMED' 
            ? allAlertRoutesMatchThread 
            : hasRouteOverlap;
          
          if (!routeMatchOk) continue;
          
          const threadTitle = thread.title || '';
          // Use enhanced similarity that considers location and cause
          const similarity = enhancedSimilarity(text, threadTitle);
          
          // SERVICE_RESUMED: Can match RESOLVED or UNRESOLVED threads with same route
          // Route match is the PRIMARY criterion - if routes match, we match!
          // Similarity is secondary - only used to choose between multiple route matches
          if (category === 'SERVICE_RESUMED') {
            // If routes match, this is likely the right thread
            // Priority: 1) Unresolved thread with same route (incident still active)
            //           2) Most recently resolved thread with same route
            const isUnresolved = !thread.is_resolved;
            const effectiveSimilarity = isUnresolved 
              ? similarity + 0.5  // Boost unresolved threads significantly
              : similarity;
            
            if (effectiveSimilarity > bestSimilarity) {
              bestSimilarity = effectiveSimilarity;
              matchedThread = thread;
              console.log(`SERVICE_RESUMED match candidate: Thread ${thread.thread_id}, routes=${JSON.stringify(threadRoutes)}, resolved=${thread.is_resolved}, similarity=${similarity.toFixed(2)}, effective=${effectiveSimilarity.toFixed(2)}`);
            }
            continue; // Keep looking for better match
          }
          
          // Skip resolved threads for non-SERVICE_RESUMED alerts
          if (thread.is_resolved) continue;
          
          // General matching: 40% threshold for unresolved threads
          if (similarity >= 0.4 && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchedThread = thread;
            continue;
          }
            
          // For DIVERSION/DETOUR/DELAY alerts, use lower threshold (25%)
          if ((category === 'DIVERSION' || category === 'DELAY') && 
              similarity >= 0.25 && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchedThread = thread;
          }
        }
      }

      if (matchedThread) {
        // VALIDATION: Double-check route overlap before assigning
        // SKIP validation if matched via reply chain (rule B: add to parent anyway)
        if (!matchedViaReply) {
          const alertBaseRoutes = routes.map(extractRouteNumber);
          const threadRoutes = Array.isArray(matchedThread.affected_routes) ? matchedThread.affected_routes : [];
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          const hasValidRouteOverlap = alertBaseRoutes.some(base => threadBaseRoutes.includes(base));
          
          if (!hasValidRouteOverlap && routes.length > 0 && threadRoutes.length > 0) {
            // Route mismatch detected! Log warning and create new thread instead
            console.warn(`Route mismatch: Alert routes ${JSON.stringify(routes)} don't match thread routes ${JSON.stringify(threadRoutes)}. Creating new thread.`);
            matchedThread = null; // Force new thread creation
          }
        }
      }
      
      if (matchedThread) {
        // Update alertToThreadMap for subsequent reply chain lookups
        alertToThreadMap.set(alertId, matchedThread.thread_id);
        
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

        // Merge routes: combine thread's existing routes with new alert's routes
        const existingRoutes = Array.isArray(matchedThread.affected_routes) 
          ? matchedThread.affected_routes 
          : [];
        const mergedRoutes = [...new Set([...existingRoutes, ...routes])];

        // Merge categories: combine thread's existing categories with new alert's category
        const existingCategories = Array.isArray(matchedThread.categories) 
          ? matchedThread.categories 
          : [];
        const mergedCategories = [...new Set([...existingCategories, category])];

        // Update thread - IMPORTANT: Preserve original incident title when SERVICE_RESUMED
        // The thread title should describe the incident, not just "service has resumed"
        const updates: any = {
          updated_at: new Date().toISOString(),
          affected_routes: mergedRoutes,
          categories: mergedCategories  // Update categories to include SERVICE_RESUMED when resolved
        };

        // Only update title if NOT a SERVICE_RESUMED alert
        // SERVICE_RESUMED alerts should keep the original incident description
        if (category !== 'SERVICE_RESUMED') {
          updates.title = text.split('\n')[0].substring(0, 200);
        }

        // Resolve thread if SERVICE_RESUMED
        if (category === 'SERVICE_RESUMED') {
          updates.is_resolved = true;
          updates.resolved_at = new Date().toISOString();
        }

        await supabase
          .from('incident_threads')
          .update(updates)
          .eq('thread_id', matchedThread.thread_id);

        updatedThreads++;
      } else {
        // No matching thread found - use database function to atomically find or create
        // This prevents race conditions by using database-level advisory locks
        const headerTitle = text.split('\n')[0].substring(0, 200);
        
        // Log when SERVICE_RESUMED doesn't find a parent thread (this shouldn't happen often)
        if (category === 'SERVICE_RESUMED') {
          console.log(`SERVICE_RESUMED creating new thread for routes ${JSON.stringify(routes)} - no matching parent found. Text: "${text.substring(0, 100)}..."`);
        }
        
        // Use the database's find_or_create_thread function for atomic operation
        // This handles race conditions properly using advisory locks per route
        const { data: threadResult, error: threadError } = await supabase
          .rpc('find_or_create_thread', {
            p_title: headerTitle,
            p_routes: routes,  // Supabase client converts arrays to JSONB automatically
            p_categories: [category],
            p_is_resolved: category === 'SERVICE_RESUMED'
          });
        
        if (threadError) {
          // Fallback: If RPC fails (e.g., function not deployed yet), use traditional insert
          console.warn('find_or_create_thread RPC failed, using fallback:', threadError.message);
          
          // Check for very recently created threads (within last 5 seconds) with same route
          let joinedRecentThread = false;
          if (routes.length > 0) {
            const alertBaseRoutes = routes.map(extractRouteNumber);
            const { data: recentThreads } = await supabase
              .from('incident_threads')
              .select('*')
              .gte('created_at', new Date(Date.now() - 5000).toISOString());
            
            // Look for matching thread that was just created
            for (const recentThread of recentThreads || []) {
              const recentRoutes = Array.isArray(recentThread.affected_routes) 
                ? recentThread.affected_routes 
                : [];
              if (recentRoutes.length === 0) continue;
              
              const recentBaseRoutes = recentRoutes.map(extractRouteNumber);
              const hasOverlap = alertBaseRoutes.some(base => recentBaseRoutes.includes(base));
              
              if (hasOverlap) {
                // Found a recently created thread for same route - join it instead
                console.log(`Joining recently created thread ${recentThread.thread_id} instead of creating duplicate`);
                
                // Link alert to existing thread
                await supabase
                  .from('alert_cache')
                  .update({ thread_id: recentThread.thread_id })
                  .eq('alert_id', newAlert.alert_id);
                
                // Update alertToThreadMap for subsequent reply chain lookups
                alertToThreadMap.set(alertId, recentThread.thread_id);
                
                // Merge routes
                const mergedRoutes = [...new Set([...recentRoutes, ...routes])];
                await supabase
                  .from('incident_threads')
                  .update({ 
                    affected_routes: mergedRoutes,
                    updated_at: new Date().toISOString()
                  })
                  .eq('thread_id', recentThread.thread_id);
                
                updatedThreads++;
                joinedRecentThread = true;
                break;
              }
            }
          }
          
          // Skip creating new thread if we already joined a recent one
          if (!joinedRecentThread) {
            // Create new thread
            const { data: newThread } = await supabase
              .from('incident_threads')
              .insert({
                title: headerTitle,
                categories: [category],
                affected_routes: routes,
                is_resolved: category === 'SERVICE_RESUMED',
                resolved_at: category === 'SERVICE_RESUMED' ? now.toISOString() : null
              })
              .select()
              .single();

            if (newThread) {
              // Link alert to new thread
              await supabase
                .from('alert_cache')
                .update({ thread_id: newThread.thread_id })
                .eq('alert_id', newAlert.alert_id);
              
              // Update alertToThreadMap for subsequent reply chain lookups
              alertToThreadMap.set(alertId, newThread.thread_id);
            }
          }
        } else if (threadResult && threadResult.length > 0) {
          // RPC succeeded - use the returned thread
          const result = threadResult[0];
          const threadId = result.out_thread_id;
          const isNewThread = result.out_is_new;
          
          // Link alert to thread
          await supabase
            .from('alert_cache')
            .update({ thread_id: threadId })
            .eq('alert_id', newAlert.alert_id);
          
          // Update alertToThreadMap for subsequent reply chain lookups
          alertToThreadMap.set(alertId, threadId);
          
          if (!isNewThread) {
            // Existing thread - merge routes and update
            const { data: existingThread } = await supabase
              .from('incident_threads')
              .select('affected_routes')
              .eq('thread_id', threadId)
              .single();
            
            const existingRoutes = Array.isArray(existingThread?.affected_routes) 
              ? existingThread.affected_routes 
              : [];
            const mergedRoutes = [...new Set([...existingRoutes, ...routes])];
            
            await supabase
              .from('incident_threads')
              .update({ 
                affected_routes: mergedRoutes,
                updated_at: new Date().toISOString()
              })
              .eq('thread_id', threadId);
            
            updatedThreads++;
          }
          
          console.log(`Alert assigned to thread ${threadId} (${isNewThread ? 'new' : 'existing'})`);
        }
      }
    }

    // === PROCESS TTC API ALERTS AS SECONDARY DATA SOURCE ===
    // After processing Bluesky alerts, check if TTC API has alerts for routes 
    // not covered by Bluesky. This fills gaps when @ttcalerts hasn't posted yet.
    let ttcApiNewAlerts = 0;
    
    if (ttcApiAlerts.length > 0) {
      // Get all routes that already have active (unresolved) threads from Bluesky
      const { data: activeBlueskyThreads } = await supabase
        .from('incident_threads')
        .select('affected_routes')
        .eq('is_resolved', false);
      
      const blueskyActiveRoutes = new Set<string>();
      for (const thread of activeBlueskyThreads || []) {
        const routes = thread.affected_routes || [];
        for (const route of routes) {
          blueskyActiveRoutes.add(route);
          // Also add base route number for matching
          const baseRoute = extractRouteNumber(route);
          if (baseRoute) blueskyActiveRoutes.add(baseRoute);
        }
      }
      
      console.log(`Routes already covered by Bluesky threads: ${[...blueskyActiveRoutes].join(', ')}`);
      
      // Process each TTC API alert
      for (const ttcAlert of ttcApiAlerts) {
        const routeStr = ttcAlert.route?.toString() || '';
        
        // Handle comma-separated routes (common in accessibility alerts like "1,19,26,127")
        // Use the first route for primary matching
        const routeParts = routeStr.split(',').map((r: string) => r.trim()).filter(Boolean);
        const primaryRoute = routeParts[0] || routeStr;
        const routeBase = extractRouteNumber(primaryRoute);
        
        // For accessibility alerts, don't skip based on Bluesky coverage
        // These are elevator/escalator issues that are separate from service alerts
        const isAccessibilityAlert = ttcAlert.effect === 'ACCESSIBILITY_ISSUE';
        
        // Skip if this route already has a Bluesky thread (unless it's accessibility)
        // Bluesky is prioritized as primary source for service alerts
        if (!isAccessibilityAlert && (blueskyActiveRoutes.has(primaryRoute) || blueskyActiveRoutes.has(routeBase))) {
          console.log(`TTC API: Skipping route ${primaryRoute} - already covered by Bluesky`);
          continue;
        }
        
        // Generate unique alert_id for TTC API alerts
        // Format: ttc-{effect}-{id}  (simplified to avoid issues with comma routes)
        const ttcAlertId = `ttc-${ttcAlert.effect}-${ttcAlert.id}`;
        
        // Check if we already have this TTC API alert
        if (existingAlertIds.has(ttcAlertId)) {
          console.log(`TTC API: Skipping alert ${ttcAlertId} - already exists`);
          continue;
        }
        
        // Determine category based on TTC API effect
        let category = 'DELAY';
        switch (ttcAlert.effect) {
          case 'NO_SERVICE':
            category = 'SERVICE_DISRUPTION';
            break;
          case 'REDUCED_SERVICE':
            category = 'SERVICE_DISRUPTION';
            break;
          case 'DETOUR':
            category = 'DIVERSION';
            break;
          case 'SIGNIFICANT_DELAYS':
            category = 'DELAY';
            break;
          case 'ACCESSIBILITY_ISSUE':
            category = 'ACCESSIBILITY';
            break;
        }
        
        // Format routes array
        const routes: string[] = [];
        
        // Handle accessibility alerts with multiple comma-separated routes
        if (isAccessibilityAlert && routeParts.length > 0) {
          // For accessibility, use the station name from headerText instead of route numbers
          // The headerText is like "Dupont: Elevator out of service..."
          const stationMatch = ttcAlert.headerText?.match(/^([^:]+):/);
          if (stationMatch) {
            routes.push(stationMatch[1].trim());
          } else {
            // Fallback: include first subway line if present
            for (const r of routeParts) {
              if (/^[1-4]$/.test(r)) {
                routes.push(`Line ${r}`);
                break;
              }
            }
          }
        } else if (/^[1-4]$/.test(primaryRoute)) {
          // Subway line - add both formats
          routes.push(`Line ${primaryRoute}`);
        } else {
          routes.push(primaryRoute);
        }
        
        // Create header text from TTC API data
        const headerText = ttcAlert.headerText || ttcAlert.title || `Route ${primaryRoute} service alert`;
        const descriptionText = ttcAlert.customHeaderText || ttcAlert.headerText || headerText;
        
        // Create alert record
        const alert = {
          alert_id: ttcAlertId,
          bluesky_uri: null, // Not from Bluesky
          header_text: headerText.substring(0, 200),
          description_text: descriptionText,
          categories: JSON.parse(JSON.stringify([category])),
          affected_routes: JSON.parse(JSON.stringify(routes)),
          created_at: ttcAlert.lastUpdated || now.toISOString(),
          is_latest: true,
          effect: ttcAlert.effect,
          raw_data: {
            source: 'ttc-api',
            ttcAlertId: ttcAlert.id,
            severity: ttcAlert.severity,
            cause: ttcAlert.cause,
            causeDescription: ttcAlert.causeDescription,
            stopStart: ttcAlert.stopStart,
            stopEnd: ttcAlert.stopEnd,
            direction: ttcAlert.direction
          }
        };
        
        // Insert alert
        const { data: newAlert, error: insertError } = await supabase
          .from('alert_cache')
          .insert(alert)
          .select()
          .single();
        
        if (insertError) {
          console.error('TTC API alert insert error:', insertError);
          continue;
        }
        
        ttcApiNewAlerts++;
        existingAlertIds.add(ttcAlertId);
        
        // Create or find thread for this TTC API alert
        // Check for existing thread with same route first
        const { data: existingThreads } = await supabase
          .from('incident_threads')
          .select('*')
          .eq('is_resolved', false)
          .contains('affected_routes', routes);
        
        let threadId: string | null = null;
        
        if (existingThreads && existingThreads.length > 0) {
          // Join existing thread
          threadId = existingThreads[0].thread_id;
          
          // Link alert to thread
          await supabase
            .from('alert_cache')
            .update({ thread_id: threadId })
            .eq('alert_id', ttcAlertId);
          
          console.log(`TTC API: Alert ${ttcAlertId} joined existing thread ${threadId}`);
        } else {
          // Create new thread
          // Generate UUID for thread_id (table has NOT NULL constraint with no default)
          const newThreadId = crypto.randomUUID();
          
          const { data: newThread, error: threadError } = await supabase
            .from('incident_threads')
            .insert({
              thread_id: newThreadId,
              title: headerText.substring(0, 200),
              categories: [category],
              affected_routes: routes,
              is_resolved: false
            })
            .select()
            .single();
          
          if (threadError) {
            console.error(`TTC API: Failed to create thread for ${ttcAlertId}:`, threadError);
          } else if (newThread) {
            threadId = newThread.thread_id;
            
            // Link alert to new thread
            await supabase
              .from('alert_cache')
              .update({ thread_id: threadId })
              .eq('alert_id', ttcAlertId);
            
            console.log(`TTC API: Created new thread ${threadId} for alert ${ttcAlertId}`);
          }
        }
        
        // Add route to covered routes so subsequent TTC alerts for same route are skipped
        blueskyActiveRoutes.add(routeStr);
        blueskyActiveRoutes.add(routeBase);
      }
      
      console.log(`TTC API: Added ${ttcApiNewAlerts} new alerts as secondary source`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newAlerts, 
        updatedThreads,
        ttcApiResolvedCount,
        ttcApiNewAlerts,
        ttcApiError,
        version: FUNCTION_VERSION,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, version: FUNCTION_VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
