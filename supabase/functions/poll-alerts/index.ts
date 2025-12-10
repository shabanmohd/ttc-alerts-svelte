import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bluesky API endpoint
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';

// Threading configuration
const THREADING_CONFIG = {
  // Time windows for thread matching
  THREAD_WINDOW_HOURS: 8,           // Extended from 6 to handle overnight incidents
  
  // Similarity thresholds (raised to prevent false matches)
  GENERAL_THRESHOLD: 0.55,          // Raised from 0.5 - requires stronger text match
  UPDATE_THRESHOLD: 0.35,           // Raised from 0.3 - for DIVERSION/DELAY updates
  RESUMED_THRESHOLD: 0.15,          // Raised from 0.1 - very different vocabulary but need SOME overlap
  
  // Minimum requirements
  MIN_SHARED_WORDS: 3,              // NEW: Require at least 3 shared words regardless of ratio
  MIN_ROUTE_CONFIDENCE: 1,          // Require at least 1 route to be extracted
  
  // Route matching strictness
  REQUIRE_ALL_ROUTES_MATCH: false,  // If true, ALL alert routes must match thread routes
};

// Stop words to ignore in similarity calculation (common words with no semantic value)
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when',
  'who', 'oil', 'its', 'way', 'use', 'how', 'man', 'day', 'get', 'may', 'new',
  'now', 'old', 'see', 'two', 'any', 'into', 'just', 'made', 'over', 'such',
  'time', 'very', 'than', 'them', 'some', 'with', 'could', 'from', 'this', 'that',
  'what', 'were', 'would', 'there', 'their', 'which', 'about', 'after', 'being',
  // TTC-specific common words that appear in most alerts
  'due', 'service', 'route', 'routes', 'bus', 'buses', 'streetcar', 'streetcars',
  'subway', 'line', 'station', 'stations', 'stop', 'stops', 'between', 'via',
  'northbound', 'southbound', 'eastbound', 'westbound', 'running', 'operating'
]);

// Alert categories with keywords
const ALERT_CATEGORIES = {
  SERVICE_DISRUPTION: {
    keywords: ['no service', 'suspended', 'closed', 'not stopping', 'bypassing', 'out of service'],
    priority: 1
  },
  SERVICE_RESUMED: {
    keywords: ['regular service', 'resumed', 'restored', 'back to normal', 'now stopping', 'service restored'],
    priority: 2
  },
  DELAY: {
    keywords: ['delay', 'delayed', 'slower', 'longer wait', 'experiencing delays'],
    priority: 3
  },
  DIVERSION: {
    keywords: ['diverting', 'detour', 'alternate route', 'diversion', 'rerouted'],
    priority: 4
  },
  SHUTTLE: {
    keywords: ['shuttle', 'buses replacing', 'shuttle buses'],
    priority: 4
  },
  PLANNED_CLOSURE: {
    keywords: ['planned', 'scheduled', 'maintenance', 'this weekend', 'scheduled closure'],
    priority: 5
  }
};

// Extract routes from alert text with improved patterns
function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  
  // Match subway lines first: Line 1, Line 2, Line 3 Scarborough, Line 4
  const lineMatch = text.match(/Line\s*(\d+)(?:\s+[A-Za-z]+)?/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      routes.push(m); // Keep "Line 1" or "Line 3 Scarborough" format
    });
  }
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", "39 Finch East", etc.
  // Updated to handle multi-word names like "Finch East", "Victoria Park"
  const routeWithNameMatch = text.match(/\b(\d{1,3})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      // Validate this looks like a route (not just any number followed by text)
      const num = parseInt(m.match(/^\d+/)?.[0] || '0');
      // TTC routes are 1-999, but most are under 600
      if (num >= 1 && num <= 999) {
        routes.push(m); // Keep "306 Carlton" format
      }
    });
  }
  
  // Match routes in format "Route 39" or "route 504"
  const routePrefixMatch = text.match(/\broutes?\s+(\d{1,3})/gi);
  if (routePrefixMatch) {
    routePrefixMatch.forEach(m => {
      const num = m.match(/\d+/)?.[0];
      if (num && !routes.some(r => r.startsWith(num))) {
        routes.push(num);
      }
    });
  }
  
  // Match standalone route numbers if not already captured
  // More restrictive: only at word boundaries with specific context
  const standaloneMatch = text.match(/\b(\d{1,3})(?=\s*(?::|,|bus|streetcar|route|\.|$))/gi);
  if (standaloneMatch) {
    standaloneMatch.forEach(num => {
      const n = parseInt(num);
      // Valid TTC route numbers, avoid common non-route numbers
      if (n >= 1 && n <= 999 && !routes.some(r => extractRouteNumber(r) === num)) {
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

// Extract route NUMBER only (for comparison) - handles various formats
function extractRouteNumber(route: string): string {
  // Handle "Line X" format
  const lineMatch = route.match(/Line\s*(\d+)/i);
  if (lineMatch) {
    return `Line ${lineMatch[1]}`; // Preserve "Line" prefix for subway
  }
  
  // Handle numeric routes like "306 Carlton" or just "306"
  const numMatch = route.match(/^(\d+)/);
  return numMatch ? numMatch[1] : route;
}

// Check if two routes have the same route number
// STRICT: Exact route number comparison to prevent 46 matching 996, 39 matching 939, etc.
function routesMatch(route1: string, route2: string): boolean {
  const num1 = extractRouteNumber(route1);
  const num2 = extractRouteNumber(route2);
  return num1 === num2;
}

// Calculate the number of matching routes between alert and thread
function countMatchingRoutes(alertRoutes: string[], threadRoutes: string[]): number {
  let count = 0;
  for (const alertRoute of alertRoutes) {
    if (threadRoutes.some(threadRoute => routesMatch(alertRoute, threadRoute))) {
      count++;
    }
  }
  return count;
}

// Extract meaningful words from text (filtering stop words and short words)
function extractMeaningfulWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

// Calculate enhanced Jaccard similarity for threading
// Returns both the similarity ratio AND the shared word count
function calculateSimilarity(text1: string, text2: string): { similarity: number; sharedWords: number } {
  const words1 = extractMeaningfulWords(text1);
  const words2 = extractMeaningfulWords(text2);
  
  // Find intersection (shared words)
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  
  // Find union (all unique words)
  const union = new Set([...words1, ...words2]);
  
  // Prevent division by zero
  if (union.size === 0) {
    return { similarity: 0, sharedWords: 0 };
  }
  
  return {
    similarity: intersection.size / union.size,
    sharedWords: intersection.size
  };
}

// Legacy jaccardSimilarity function for backwards compatibility
function jaccardSimilarity(text1: string, text2: string): number {
  return calculateSimilarity(text1, text2).similarity;
}

// Determine if an alert should match a thread based on multiple criteria
function shouldMatchThread(
  alertText: string,
  alertRoutes: string[],
  alertCategory: string,
  thread: { title: string; affected_routes: string[] | null; categories: string[] | null }
): { match: boolean; reason: string; confidence: number } {
  const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
  const threadCategories = Array.isArray(thread.categories) ? thread.categories : [];
  const threadTitle = thread.title || '';
  
  // Gate 1: Both must have routes
  if (alertRoutes.length === 0) {
    return { match: false, reason: 'Alert has no routes', confidence: 0 };
  }
  if (threadRoutes.length === 0) {
    return { match: false, reason: 'Thread has no routes', confidence: 0 };
  }
  
  // Gate 2: Check route overlap with EXACT number matching
  const matchingRouteCount = countMatchingRoutes(alertRoutes, threadRoutes);
  if (matchingRouteCount === 0) {
    return { match: false, reason: 'No route number match', confidence: 0 };
  }
  
  // Gate 3: Calculate text similarity
  const { similarity, sharedWords } = calculateSimilarity(alertText, threadTitle);
  
  // Gate 4: Require minimum shared words to prevent random matches
  if (sharedWords < THREADING_CONFIG.MIN_SHARED_WORDS) {
    return { 
      match: false, 
      reason: `Only ${sharedWords} shared words (need ${THREADING_CONFIG.MIN_SHARED_WORDS})`, 
      confidence: similarity 
    };
  }
  
  // Gate 5: Apply category-specific thresholds
  let threshold: number;
  let thresholdName: string;
  
  if (alertCategory === 'SERVICE_RESUMED') {
    // SERVICE_RESUMED has very different vocabulary
    threshold = THREADING_CONFIG.RESUMED_THRESHOLD;
    thresholdName = 'RESUMED';
  } else if (alertCategory === 'DIVERSION' || alertCategory === 'DELAY') {
    // Updates may use different wording
    threshold = THREADING_CONFIG.UPDATE_THRESHOLD;
    thresholdName = 'UPDATE';
  } else {
    // General matching
    threshold = THREADING_CONFIG.GENERAL_THRESHOLD;
    thresholdName = 'GENERAL';
  }
  
  if (similarity < threshold) {
    return { 
      match: false, 
      reason: `Similarity ${(similarity * 100).toFixed(1)}% < ${thresholdName} threshold ${(threshold * 100).toFixed(1)}%`, 
      confidence: similarity 
    };
  }
  
  // All gates passed - it's a match!
  return { 
    match: true, 
    reason: `Matched with ${matchingRouteCount} routes, ${(similarity * 100).toFixed(1)}% similarity, ${sharedWords} shared words`,
    confidence: similarity 
  };
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

    // Get existing alerts from last 24 hours
    const { data: existingAlerts } = await supabase
      .from('alert_cache')
      .select('bluesky_uri, header_text')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const existingUris = new Set(existingAlerts?.map(a => a.bluesky_uri) || []);

    // Get unresolved threads for matching (extended time window)
    const { data: unresolvedThreads } = await supabase
      .from('incident_threads')
      .select('*')
      .eq('is_resolved', false)
      .gte('updated_at', new Date(Date.now() - THREADING_CONFIG.THREAD_WINDOW_HOURS * 60 * 60 * 1000).toISOString());

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

      // Thread matching using enhanced algorithm
      let matchedThread = null;
      let matchReason = '';
      let matchConfidence = 0;

      // Only attempt thread matching if alert has routes
      if (routes.length >= THREADING_CONFIG.MIN_ROUTE_CONFIDENCE) {
        for (const thread of unresolvedThreads || []) {
          const result = shouldMatchThread(text, routes, category, thread);
          
          if (result.match) {
            matchedThread = thread;
            matchReason = result.reason;
            matchConfidence = result.confidence;
            break;
          }
          
          // Log why thread didn't match (for debugging)
          // console.log(`Thread ${thread.thread_id} rejected: ${result.reason}`);
        }
      } else {
        console.log(`Alert skipped thread matching: only ${routes.length} routes extracted`);
      }

      if (matchedThread) {
        console.log(`Alert matched thread ${matchedThread.thread_id}: ${matchReason}`);
        
        // Mark old alerts in this thread as not latest
        await supabase
          .from('alert_cache')
          .update({ is_latest: false })
          .eq('thread_id', matchedThread.thread_id);

        // Link alert to thread and store similarity score
        await supabase
          .from('alert_cache')
          .update({ 
            thread_id: matchedThread.thread_id,
            similarity_score: matchConfidence
          })
          .eq('alert_id', newAlert.alert_id);

        // Update thread
        const updates: any = {
          title: text.split('\n')[0].substring(0, 200),
          updated_at: new Date().toISOString()
        };

        // Merge routes from new alert into thread
        const existingRoutes = Array.isArray(matchedThread.affected_routes) ? matchedThread.affected_routes : [];
        const allRoutes = [...new Set([...existingRoutes, ...routes])];
        updates.affected_routes = allRoutes;

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
        newAlerts, 
        updatedThreads,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
