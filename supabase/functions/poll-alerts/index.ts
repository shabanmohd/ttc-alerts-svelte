import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API endpoints
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

// Version for debugging
const VERSION = '150'; // BLUESKY-ONLY ARCHITECTURE: TTC API removed for disruptions, using Bluesky reply threading

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

// ============================================================================
// ELEVATOR THREAD ID GENERATION - SINGLE SOURCE OF TRUTH
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
  elevatorCode?: string;
  stopStart?: string;
  stopEnd?: string;
  rszLength?: string;
  targetRemoval?: string;
}

// Type for TTC alert data - RSZ and Elevators ONLY (disruptions now Bluesky-only)
interface TtcAlertData {
  rszAlerts: TtcApiAlert[];
  elevatorAlerts: TtcApiAlert[];
}

// Fetch RSZ and Elevator alerts from TTC API
// REMOVED: disruption alerts - now Bluesky-only architecture
async function fetchTtcData(): Promise<TtcAlertData> {
  const result: TtcAlertData = {
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
    
    // Process route alerts - ONLY RSZ
    for (const routeAlert of routes) {
      const headerText = routeAlert.headerText?.toLowerCase() || '';
      const effectDesc = routeAlert.effectDesc || '';
      
      // Check if it's an RSZ alert
      const isRsz = effectDesc === 'Reduced Speed Zone' || 
                    headerText.includes('slower than usual') ||
                    headerText.includes('reduced speed');
      
      if (isRsz) {
        result.rszAlerts.push(routeAlert);
      }
      // REMOVED: All other route alerts - disruptions now come from Bluesky only
    }
    
    // Process accessibility (elevator/escalator) alerts
    for (const accessAlert of accessibility) {
      result.elevatorAlerts.push(accessAlert);
    }
    
    console.log(`TTC API: ${result.rszAlerts.length} RSZ, ${result.elevatorAlerts.length} elevators (disruptions now Bluesky-only)`);
  } catch (error) {
    console.error('Failed to fetch TTC API:', error);
  }
  
  return result;
}

// Generate a unique alert ID for TTC API alerts (RSZ/Elevator)
function generateTtcAlertId(type: string, route: string, text: string, stopStart?: string, stopEnd?: string): string {
  let idBase = `ttc-${type}-${route}`;
  
  if (stopStart && stopEnd) {
    const cleanStart = stopStart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    const cleanEnd = stopEnd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    idBase += `-${cleanStart}-${cleanEnd}`;
  } else {
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
      continue;
    }

    // Extract route info
    let routes: string[];
    if (route && /^[1-4]$/.test(route)) {
      routes = [`Line ${route}`];
    } else if (route) {
      routes = [route];
    } else {
      routes = extractRoutes(headerText);
    }
    
    // Build description
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
    
    const { data: existing } = await supabase
      .from('alert_cache')
      .select('alert_id')
      .eq('alert_id', alertId)
      .single();
    
    if (existing) {
      continue;
    }

    const stationMatch = headerText.match(/^([^:]+):/);
    const station = stationMatch ? stationMatch[1].trim() : 'Unknown Station';
    
    const cleanedHeaderText = headerText.replace(/-TTC\s*$/i, '').trim();
    const description = cleanedHeaderText;

    const alert = {
      alert_id: alertId,
      header_text: cleanedHeaderText.substring(0, 200),
      description_text: description,
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
      
      console.log(`Elevator alert ${alertId} linked to existing thread ${threadId}`);
      updatedThreads++;
    } else {
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

// ============================================================================
// BLUESKY THREAD ID EXTRACTION - Use native reply threading
// ============================================================================
// Bluesky posts that are replies include `record.reply.root.uri` which points
// to the original post in the thread. Use this as the thread_id for grouping.
function extractBlueskyThreadId(post: any): string {
  // If this post is a reply, use the root post's URI as thread ID
  const replyRoot = post?.record?.reply?.root?.uri;
  if (replyRoot) {
    // Convert AT URI to thread ID: at://did:plc:xxx/app.bsky.feed.post/abc123 -> thread-bsky-abc123
    const rootPostId = replyRoot.split('/').pop() || '';
    return `thread-bsky-${rootPostId}`;
  }
  
  // If not a reply, this post IS the thread root - use its own URI
  const postId = post.uri.split('/').pop() || '';
  return `thread-bsky-${postId}`;
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

    // STEP 1: Fetch TTC API data (RSZ and Elevators ONLY - disruptions are Bluesky-only)
    const ttcData = await fetchTtcData();

    // STEP 2: Fetch Bluesky posts (PRIMARY source for disruptions and SERVICE_RESUMED)
    const response = await fetch(
      `${BLUESKY_API}?actor=ttcalerts.bsky.social&limit=50`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Bluesky API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.feed || [];
    
    let newAlerts = 0;
    let updatedThreads = 0;

    // Get existing Bluesky alerts from last 24 hours
    const { data: existingAlerts } = await supabase
      .from('alert_cache')
      .select('bluesky_uri, header_text')
      .not('bluesky_uri', 'is', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const existingUris = new Set(existingAlerts?.map(a => a.bluesky_uri) || []);
    console.log(`Found ${existingUris.size} existing Bluesky URIs in last 24h`);

    // STEP 3: Process Bluesky posts for disruptions
    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      
      const uri = post.uri;
      if (existingUris.has(uri)) continue;

      const text = post.record.text;
      
      // Skip RSZ-like alerts from Bluesky - TTC API is the source of truth for RSZ
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
      
      // Extract post ID from URI
      const postId = uri.split('/').pop() || uri;
      
      // Get thread ID using Bluesky's native reply threading
      const threadId = extractBlueskyThreadId(post);
      
      // Create alert record
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

      // Check if thread exists
      const { data: existingThread } = await supabase
        .from('incident_threads')
        .select('thread_id, title, is_resolved, categories')
        .eq('thread_id', threadId)
        .single();
      
      if (existingThread) {
        // Thread exists - update it
        // Mark old alerts as not latest
        await supabase
          .from('alert_cache')
          .update({ is_latest: false })
          .eq('thread_id', threadId)
          .neq('alert_id', newAlert.alert_id);

        // Link alert to thread
        await supabase
          .from('alert_cache')
          .update({ thread_id: threadId })
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
          const existingCategories = (existingThread.categories as string[]) || [];
          if (!existingCategories.includes('SERVICE_RESUMED')) {
            updates.categories = [...existingCategories, 'SERVICE_RESUMED'];
          }
          console.log(`SERVICE_RESUMED resolving thread ${threadId}`);
        }

        await supabase
          .from('incident_threads')
          .update(updates)
          .eq('thread_id', threadId);

        updatedThreads++;
        console.log(`Updated thread ${threadId} with alert ${newAlert.alert_id}`);
      } else {
        // Thread doesn't exist - create it
        const { error: threadError } = await supabase
          .from('incident_threads')
          .insert({
            thread_id: threadId,
            title: text.split('\n')[0].substring(0, 200),
            affected_routes: routes,
            categories: [category],
            is_resolved: category === 'SERVICE_RESUMED', // SERVICE_RESUMED threads start resolved
            is_hidden: false,
            created_at: post.record.createdAt,
            updated_at: new Date().toISOString()
          });

        if (threadError) {
          console.error('Thread creation error:', threadError);
        } else {
          // Link alert to new thread
          await supabase
            .from('alert_cache')
            .update({ thread_id: threadId })
            .eq('alert_id', newAlert.alert_id);
          
          console.log(`Created thread ${threadId} for alert ${newAlert.alert_id}`);
          updatedThreads++;
        }
      }
    }

    // STEP 4: Process RSZ alerts from TTC API
    const rszResult = await processRszAlerts(supabase, ttcData.rszAlerts);
    newAlerts += rszResult.newAlerts;
    updatedThreads += rszResult.updatedThreads;

    // STEP 5: Process Elevator alerts from TTC API
    const elevatorResult = await processElevatorAlerts(supabase, ttcData.elevatorAlerts);
    newAlerts += elevatorResult.newAlerts;
    updatedThreads += elevatorResult.updatedThreads;

    // STEP 6: Resolve ACCESSIBILITY threads that are no longer in TTC API
    let resolvedElevators = 0;
    
    const activeElevatorSuffixes = new Set<string>();
    for (const e of ttcData.elevatorAlerts) {
      const { suffix } = generateElevatorThreadId({
        elevatorCode: e.elevatorCode,
        headerText: e.headerText || ''
      });
      activeElevatorSuffixes.add(suffix);
    }
    
    const { data: accessibilityThreads, error: accError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, affected_routes')
      .filter('categories', 'cs', '["ACCESSIBILITY"]')
      .eq('is_resolved', false)
      .eq('is_hidden', false);
    
    if (accError) {
      console.error('Failed to fetch accessibility threads:', accError);
    }
    
    for (const thread of accessibilityThreads || []) {
      const suffixMatch = thread.thread_id?.match(/^thread-elev-(.+)$/);
      const threadSuffix = suffixMatch ? suffixMatch[1] : null;
      
      if (!threadSuffix) {
        // Legacy thread - check by station
        const stationName = Array.isArray(thread.affected_routes) ? thread.affected_routes[0] : '';
        const stationHasActiveElevator = ttcData.elevatorAlerts.some(e => {
          const match = e.headerText?.match(/^([^:]+):/);
          return match && match[1].trim() === stationName;
        });
        
        if (stationName && !stationHasActiveElevator) {
          console.log(`Resolving legacy elevator thread: "${thread.title}"`);
          
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

    // STEP 7: Resolve RSZ threads that are no longer in TTC API
    let resolvedRszThreads = 0;
    
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

    return new Response(
      JSON.stringify({ 
        success: true,
        version: VERSION,
        architecture: 'BLUESKY_ONLY_FOR_DISRUPTIONS',
        rszAlerts: ttcData.rszAlerts.length,
        elevatorAlerts: ttcData.elevatorAlerts.length,
        resolvedElevators,
        resolvedRszThreads,
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
