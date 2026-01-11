import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// v1 - RSZ (Slow Zone) Data Verification and Auto-Correction System
// Compares TTC API RSZ data with database and auto-fixes discrepancies

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

interface TtcRszAlert {
  id: string;
  route: string;
  headerText: string;
  effectDesc: string;
  stopStart?: string;
  stopEnd?: string;
}

interface VerificationResult {
  success: boolean;
  ttcApiCount: number;
  databaseCount: number;
  missingInDb: string[];
  hiddenButActive: string[];
  staleInDb: string[];
  corrections: {
    created: number;
    unhidden: number;
    hidden: number;
  };
  details: Record<string, any>;
}

/**
 * Generate RSZ alert ID - MUST match poll-alerts logic
 */
function generateAlertId(route: string, headerText: string, stopStart?: string, stopEnd?: string): string {
  let idBase = `ttc-rsz-${route}`;
  
  if (stopStart && stopEnd) {
    const cleanStart = stopStart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    const cleanEnd = stopEnd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
    idBase += `-${cleanStart}-${cleanEnd}`;
  } else {
    const cleanText = headerText.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    idBase += `-${cleanText}`;
  }
  
  return idBase.substring(0, 100);
}

/**
 * Generate RSZ thread ID from alert ID - MUST match poll-alerts logic
 */
function generateRszThreadId(alertId: string): { threadId: string; lineNumber: string } {
  // Extract line number and station pair from alert_id
  // Format: ttc-rsz-{line}-{startStation}-{endStation}
  const match = alertId.match(/^ttc-rsz-(\d+)-([a-z0-9]+)-([a-z0-9]+)$/i);
  
  if (match) {
    const lineNumber = match[1];
    const startStation = match[2].toLowerCase();
    const endStation = match[3].toLowerCase();
    return {
      threadId: `thread-rsz-line${lineNumber}-${startStation}-${endStation}`,
      lineNumber
    };
  }
  
  // Fallback for non-standard formats
  return {
    threadId: `thread-rsz-${alertId.replace('ttc-rsz-', '')}`,
    lineNumber: '0'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const result: VerificationResult = {
    success: true,
    ttcApiCount: 0,
    databaseCount: 0,
    missingInDb: [],
    hiddenButActive: [],
    staleInDb: [],
    corrections: { created: 0, unhidden: 0, hidden: 0 },
    details: {}
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // STEP 1: Fetch TTC API RSZ data (THE AUTHORITY)
    console.log('Fetching TTC API RSZ data...');
    const ttcResponse = await fetch(TTC_LIVE_ALERTS_API, {
      headers: { 'Accept': 'application/json' }
    });

    if (!ttcResponse.ok) {
      throw new Error(`TTC API error: ${ttcResponse.status}`);
    }

    const ttcData = await ttcResponse.json();
    const routes = ttcData.routes || [];
    
    // Filter RSZ alerts
    const rszAlerts: TtcRszAlert[] = routes.filter((alert: any) => {
      const headerText = alert.headerText?.toLowerCase() || '';
      const effectDesc = alert.effectDesc || '';
      return effectDesc === 'Reduced Speed Zone' || 
             headerText.includes('slower than usual') ||
             headerText.includes('reduced speed');
    });
    
    result.ttcApiCount = rszAlerts.length;
    console.log(`TTC API has ${rszAlerts.length} RSZ alerts`);

    // Build map of TTC API RSZ by thread_id
    const ttcRszByThreadId = new Map<string, TtcRszAlert>();
    
    for (const rsz of rszAlerts) {
      const alertId = generateAlertId(
        rsz.route || '',
        rsz.headerText || '',
        rsz.stopStart,
        rsz.stopEnd
      );
      const { threadId } = generateRszThreadId(alertId);
      ttcRszByThreadId.set(threadId, rsz);
      
      result.details[threadId] = {
        headerText: rsz.headerText,
        route: rsz.route,
        stopStart: rsz.stopStart,
        stopEnd: rsz.stopEnd,
        source: 'TTC_API'
      };
    }

    // STEP 2: Fetch database RSZ threads
    const { data: dbThreads, error: dbError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, is_hidden, is_resolved, affected_routes')
      .filter('categories', 'cs', '["RSZ"]');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const visibleDbThreads = (dbThreads || []).filter(t => !t.is_hidden && !t.is_resolved);
    result.databaseCount = visibleDbThreads.length;

    console.log(`Database has ${dbThreads?.length || 0} total RSZ threads, ${visibleDbThreads.length} visible`);

    // Build map of database threads
    const dbThreadsByThreadId = new Map<string, any>();
    for (const thread of dbThreads || []) {
      dbThreadsByThreadId.set(thread.thread_id, thread);
    }

    // STEP 3: Find discrepancies

    // 3a: Find RSZ in TTC API but missing or hidden in database
    for (const [threadId, ttcRsz] of ttcRszByThreadId) {
      const dbThread = dbThreadsByThreadId.get(threadId);
      
      if (!dbThread) {
        result.missingInDb.push(threadId);
        console.log(`MISSING: ${threadId} - "${ttcRsz.headerText}"`);
      } else if (dbThread.is_hidden || dbThread.is_resolved) {
        result.hiddenButActive.push(threadId);
        console.log(`HIDDEN BUT ACTIVE: ${threadId} - "${dbThread.title}"`);
      }
    }

    // 3b: Find threads in database that are NOT in TTC API (stale)
    for (const [threadId, dbThread] of dbThreadsByThreadId) {
      if (!ttcRszByThreadId.has(threadId) && !dbThread.is_hidden && !dbThread.is_resolved) {
        result.staleInDb.push(threadId);
        console.log(`STALE: ${threadId} - "${dbThread.title}"`);
      }
    }

    // STEP 4: Auto-correct discrepancies

    // 4a: Create missing threads
    for (const threadId of result.missingInDb) {
      const ttcRsz = ttcRszByThreadId.get(threadId);
      if (!ttcRsz) continue;

      const route = ttcRsz.route || '';
      const lineName = /^\d$/.test(route) ? `Line ${route}` : route;
      const alertId = generateAlertId(route, ttcRsz.headerText || '', ttcRsz.stopStart, ttcRsz.stopEnd);

      console.log(`Creating missing RSZ thread: ${threadId}`);

      // Create thread
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          title: (ttcRsz.headerText || '').substring(0, 200),
          affected_routes: [lineName],
          categories: ['RSZ'],
          is_resolved: false,
          is_hidden: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thread_hash: threadId
        });

      if (threadError) {
        console.error(`Failed to create thread ${threadId}:`, threadError);
        continue;
      }

      // Check if alert exists
      const { data: existingAlert } = await supabase
        .from('alert_cache')
        .select('alert_id')
        .eq('alert_id', alertId)
        .single();

      if (!existingAlert) {
        // Create alert
        const { error: alertError } = await supabase
          .from('alert_cache')
          .insert({
            alert_id: alertId,
            thread_id: threadId,
            header_text: (ttcRsz.headerText || '').substring(0, 200),
            categories: ['RSZ'],
            affected_routes: [lineName],
            effect: 'RSZ',
            is_latest: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (alertError) {
          console.error(`Failed to create alert for ${threadId}:`, alertError);
        }
      } else {
        // Link existing alert to thread
        await supabase
          .from('alert_cache')
          .update({ thread_id: threadId })
          .eq('alert_id', alertId);
      }

      result.corrections.created++;
    }

    // 4b: Unhide hidden but active threads
    for (const threadId of result.hiddenButActive) {
      console.log(`Unhiding RSZ thread: ${threadId}`);
      
      const { error: updateError } = await supabase
        .from('incident_threads')
        .update({
          is_hidden: false,
          is_resolved: false,
          resolved_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (!updateError) {
        result.corrections.unhidden++;
      }
    }

    // 4c: Hide stale threads (no longer in TTC API)
    for (const threadId of result.staleInDb) {
      console.log(`Hiding stale RSZ thread: ${threadId}`);
      
      const { error: updateError } = await supabase
        .from('incident_threads')
        .update({
          is_hidden: true,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (!updateError) {
        result.corrections.hidden++;
      }
    }

    // STEP 5: Final verification
    const { data: finalThreads } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .filter('categories', 'cs', '["RSZ"]')
      .eq('is_hidden', false)
      .eq('is_resolved', false);

    const finalCount = finalThreads?.length || 0;
    
    result.success = finalCount === result.ttcApiCount;
    result.databaseCount = finalCount;

    console.log(`\nRSZ Verification complete:`);
    console.log(`  TTC API: ${result.ttcApiCount} RSZ zones`);
    console.log(`  Database (after fix): ${finalCount} visible threads`);
    console.log(`  Corrections: ${result.corrections.created} created, ${result.corrections.unhidden} unhidden, ${result.corrections.hidden} hidden`);
    console.log(`  Match: ${result.success ? 'YES ✅' : 'NO ❌'}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('RSZ Verification error:', error);
    result.success = false;
    result.details.error = error.message;
    
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
