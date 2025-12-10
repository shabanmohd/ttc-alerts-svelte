import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  // Match numbered routes with optional name: "306 Carlton", "504 King", etc.
  // But DON'T match if already captured in comma list
  const routeWithNameMatch = text.match(/\b(\d{1,3})\s+([A-Z][a-z]+)/g);
  if (routeWithNameMatch) {
    routeWithNameMatch.forEach(m => {
      // Extract just the number part
      const numMatch = m.match(/^(\d{1,3})/);
      if (numMatch && !routes.some(r => r.startsWith(numMatch[1]))) {
        routes.push(m); // Keep "306 Carlton" format
      }
    });
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
  
  return Math.min(1, jaccard + locationBonus + causeBonus);
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

    // Get threads for matching - both unresolved AND recently resolved (for SERVICE_RESUMED matching)
    const { data: candidateThreads } = await supabase
      .from('incident_threads')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false });

    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      
      const uri = post.uri;
      if (existingUris.has(uri)) continue;

      const text = post.record.text;
      const { category, priority } = categorizeAlert(text);
      const routes = extractRoutes(text);
      
      // Create alert record matching alert_cache schema
      // NOTE: JSONB columns need arrays passed directly, not stringified
      // The Supabase client handles serialization automatically
      const alert = {
        bluesky_uri: uri,
        header_text: text.split('\n')[0].substring(0, 200),
        description_text: text,
        categories: JSON.parse(JSON.stringify([category])), // Force clean array
        affected_routes: JSON.parse(JSON.stringify(routes)), // Force clean array
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

      // Thread matching - find best matching thread
      let matchedThread = null;
      let bestSimilarity = 0;

      // CRITICAL: Only attempt thread matching if alert has extracted routes
      // Alerts without routes should NEVER match existing threads
      // This prevents false positives where vague alerts get grouped incorrectly
      if (routes.length > 0) {
        // Extract base route numbers for family matching
        const alertBaseRoutes = routes.map(extractRouteNumber);
        
        // Check for matching thread based on route family match and enhanced similarity
        for (const thread of candidateThreads || []) {
          const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
          
          // Skip threads with no routes - they can't be reliably matched
          if (threadRoutes.length === 0) continue;
          
          // Extract base route numbers from thread routes
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          
          // Use route FAMILY matching (37 matches 37A, 37B, etc.)
          const hasRouteOverlap = alertBaseRoutes.some(alertBase => 
            threadBaseRoutes.includes(alertBase)
          );
          
          if (hasRouteOverlap) {
            const threadTitle = thread.title || '';
            // Use enhanced similarity that considers location and cause
            const similarity = enhancedSimilarity(text, threadTitle);
            
            // SERVICE_RESUMED: Can match RESOLVED threads with same route
            // Use very low threshold since vocabulary differs completely
            if (category === 'SERVICE_RESUMED') {
              if (similarity >= 0.1 && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                matchedThread = thread;
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

        // Merge routes: combine thread's existing routes with new alert's routes
        const existingRoutes = Array.isArray(matchedThread.affected_routes) 
          ? matchedThread.affected_routes 
          : [];
        const mergedRoutes = [...new Set([...existingRoutes, ...routes])];

        // Update thread
        const updates: any = {
          title: text.split('\n')[0].substring(0, 200),
          updated_at: new Date().toISOString(),
          affected_routes: mergedRoutes
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
