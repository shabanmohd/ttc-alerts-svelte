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
  
  // Match route patterns: Line 1, Route 501, 504 King, etc.
  const lineMatch = text.match(/Line\s*(\d)/gi);
  if (lineMatch) {
    lineMatch.forEach(m => {
      const num = m.match(/\d/)?.[0];
      if (num) routes.push(`Line ${num}`);
    });
  }
  
  // Match numbered routes
  const routeMatch = text.match(/\b(\d{1,3})\s*(bus|streetcar)?/gi);
  if (routeMatch) {
    routeMatch.forEach(m => {
      const num = m.match(/\d+/)?.[0];
      if (num && parseInt(num) < 600) routes.push(num);
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

// Calculate Jaccard similarity for threading
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
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
      .from('alerts')
      .select('bluesky_uri, header')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const existingUris = new Set(existingAlerts?.map(a => a.bluesky_uri) || []);

    // Get unresolved threads for matching
    const { data: unresolvedThreads } = await supabase
      .from('alert_threads')
      .select('*')
      .eq('is_resolved', false)
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      
      const uri = post.uri;
      if (existingUris.has(uri)) continue;

      const text = post.record.text;
      const { category, priority } = categorizeAlert(text);
      const routes = extractRoutes(text);
      
      // Create alert record
      const alert = {
        bluesky_uri: uri,
        header: text.split('\n')[0].substring(0, 200),
        body: text,
        category,
        priority,
        routes,
        posted_at: post.record.createdAt,
        is_active: category !== 'SERVICE_RESUMED'
      };

      // Insert alert
      const { data: newAlert, error: insertError } = await supabase
        .from('alerts')
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

      // Check for matching thread (80% Jaccard similarity)
      for (const thread of unresolvedThreads || []) {
        const similarity = jaccardSimilarity(text, thread.initial_header);
        if (similarity >= 0.8) {
          matchedThread = thread;
          break;
        }
      }

      // For SERVICE_RESUMED, use location matching (25% threshold)
      if (category === 'SERVICE_RESUMED' && !matchedThread) {
        for (const thread of unresolvedThreads || []) {
          const hasRouteOverlap = routes.some(r => thread.routes?.includes(r));
          if (hasRouteOverlap) {
            const similarity = jaccardSimilarity(text, thread.initial_header);
            if (similarity >= 0.25) {
              matchedThread = thread;
              break;
            }
          }
        }
      }

      if (matchedThread) {
        // Add to existing thread
        await supabase
          .from('alert_thread_alerts')
          .insert({ thread_id: matchedThread.id, alert_id: newAlert.id });

        // Update thread
        const updates: any = {
          latest_header: text.split('\n')[0].substring(0, 200),
          alert_count: matchedThread.alert_count + 1,
          updated_at: new Date().toISOString()
        };

        // Resolve thread if SERVICE_RESUMED
        if (category === 'SERVICE_RESUMED') {
          updates.is_resolved = true;
          updates.resolved_at = new Date().toISOString();
        }

        await supabase
          .from('alert_threads')
          .update(updates)
          .eq('id', matchedThread.id);

        updatedThreads++;
      } else {
        // Create new thread
        const { data: newThread } = await supabase
          .from('alert_threads')
          .insert({
            initial_header: text.split('\n')[0].substring(0, 200),
            latest_header: text.split('\n')[0].substring(0, 200),
            category,
            priority,
            routes,
            alert_count: 1,
            is_resolved: category === 'SERVICE_RESUMED'
          })
          .select()
          .single();

        if (newThread) {
          await supabase
            .from('alert_thread_alerts')
            .insert({ thread_id: newThread.id, alert_id: newAlert.id });
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
