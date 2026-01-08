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
const VERSION = '81';

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
  
  // Match subway lines first: Line 1, Line 2, Line 4
  const lineMatch = text.match(/Line\s*(\d+)/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      routes.push(m); // Keep "Line 1" format
    });
  }
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  const routeWithNameMatch = text.match(/\b(\d{1,3})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      routes.push(m); // Keep "306 Carlton" format
    });
  }
  
  // Match standalone route numbers if not already captured
  const standaloneMatch = text.match(/\b(\d{1,3})(?=\s|:|,|$)/g);
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
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Fetch active routes from TTC API (THE AUTHORITY)
async function fetchTtcActiveRoutes(): Promise<Set<string>> {
  const activeRoutes = new Set<string>();
  
  try {
    const response = await fetch(TTC_LIVE_ALERTS_API, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`TTC API error: ${response.status}`);
      return activeRoutes; // Return empty set, don't fail entirely
    }
    
    const data = await response.json();
    const routes = data.routes || [];
    
    // TTC API returns alerts at the route level (each object IS an alert)
    for (const routeAlert of routes) {
      // Ignore RSZ (Reduced Speed Zone) alerts - "slower than usual" 
      const headerText = routeAlert.headerText?.toLowerCase() || '';
      const isRsz = routeAlert.alertType === 'Planned' && headerText.includes('slower than usual');
      
      if (isRsz) {
        continue; // Skip RSZ alerts
      }
      
      // Look for real disruptions
      const effect = routeAlert.effect || '';
      const isRealDisruption = 
        effect === 'NO_SERVICE' || 
        effect === 'SIGNIFICANT_DELAYS' ||
        effect === 'DETOUR' ||
        routeAlert.severity === 'Critical' ||
        routeAlert.severity === 'High';
      
      if (isRealDisruption) {
        // Use the route number (e.g., "512" for 512 St Clair)
        const routeId = routeAlert.route || routeAlert.id;
        if (routeId) {
          activeRoutes.add(routeId);
        }
      }
    }
    
    console.log(`TTC API: ${activeRoutes.size} routes with real alerts: ${[...activeRoutes].join(', ')}`);
  } catch (error) {
    console.error('Failed to fetch TTC API:', error);
  }
  
  return activeRoutes;
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

    // STEP 1: Fetch TTC API to get authoritative list of active routes
    const ttcActiveRoutes = await fetchTtcActiveRoutes();
    
    // STEP 2: Hide threads that are no longer in TTC API
    // Only hide if they weren't explicitly resolved via SERVICE_RESUMED
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
        
        // Skip threads with no routes (can't cross-reference)
        if (threadRoutes.length === 0) continue;
        
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
    
    // STEP 3: Also unhide threads if their routes ARE back in TTC API
    // (in case alert comes back)
    if (ttcActiveRoutes.size > 0) {
      const { data: hiddenThreadsData } = await supabase
        .from('incident_threads')
        .select('thread_id, title, affected_routes')
        .eq('is_resolved', false)
        .eq('is_hidden', true);
      
      for (const thread of hiddenThreadsData || []) {
        const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
        if (threadRoutes.length === 0) continue;
        
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
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());


    const existingUris = new Set(existingAlerts?.map(a => a.bluesky_uri) || []);

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
      
      // Create alert record matching alert_cache schema
      const alert = {
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
          
          // Lower threshold (50%) for general matching - routes already match
          if (similarity >= 0.5) {
            matchedThread = thread;
            break;
          }
          
          // Even lower threshold (20%) for SERVICE_RESUMED with route overlap
          if (category === 'SERVICE_RESUMED' && similarity >= 0.2) {
            matchedThread = thread;
            break;
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
        }

        await supabase
          .from('incident_threads')
          .update(updates)
          .eq('thread_id', matchedThread.thread_id);

        updatedThreads++;
      } else {
        // Create new thread
        const { data: newThread } = await supabase
          .from('incident_threads')
          .insert({
            title: text.split('\n')[0].substring(0, 200),
            categories: [category],
            affected_routes: routes,
            is_resolved: category === 'SERVICE_RESUMED'
          })
          .select()
          .single();

        if (newThread) {
          // Link alert to new thread
          await supabase
            .from('alert_cache')
            .update({ thread_id: newThread.thread_id })
            .eq('alert_id', newAlert.alert_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        version: VERSION,
        ttcApiActiveRoutes: [...ttcActiveRoutes],
        hiddenThreads,
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
