import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno types (for IDE only - Deno runtime provides these)
declare const Deno: { env: { get(key: string): string | undefined } };

// v1 - Elevator Data Verification and Auto-Correction System
// Compares TTC API elevator data with database and auto-fixes discrepancies

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

interface TtcElevator {
  id: string;
  headerText: string;
  elevatorCode: string;
  effect: string;
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
 * Generate elevator thread ID - MUST match poll-alerts logic
 */
function generateElevatorThreadId(elevatorCode: string, headerText: string): { threadId: string; suffix: string } {
  // Extract station name from header text
  const stationMatch = headerText.match(/^([^:]+):/);
  const station = stationMatch ? stationMatch[1].trim() : 'Unknown';
  const cleanStation = station.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  // Standard TTC elevator with unique code
  if (elevatorCode && elevatorCode !== 'Non-TTC') {
    return {
      threadId: `thread-elev-${elevatorCode}`,
      suffix: elevatorCode
    };
  }
  
  // Non-TTC elevator - use station + detail
  const detailMatch = headerText.match(/between\s+(.+?)\s+and\s+/i);
  const detail = detailMatch 
    ? detailMatch[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20) 
    : '';
  
  const suffix = `nonttc-${cleanStation}-${detail || 'unknown'}`;
  
  return {
    threadId: `thread-elev-${suffix}`,
    suffix: suffix
  };
}

/**
 * Generate alert ID - MUST match poll-alerts logic
 */
function generateAlertId(elevatorCode: string, headerText: string): string {
  const cleanText = headerText.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `ttc-elev-${elevatorCode || 'unknown'}-${cleanText}`.substring(0, 100);
}

serve(async (req: Request) => {
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

    // STEP 1: Fetch TTC API elevator data (THE AUTHORITY)
    console.log('Fetching TTC API elevator data...');
    const ttcResponse = await fetch(TTC_LIVE_ALERTS_API, {
      headers: { 'Accept': 'application/json' }
    });

    if (!ttcResponse.ok) {
      throw new Error(`TTC API error: ${ttcResponse.status}`);
    }

    const ttcData = await ttcResponse.json();
    const ttcElevators: TtcElevator[] = ttcData.accessibility || [];
    result.ttcApiCount = ttcElevators.length;

    console.log(`TTC API has ${ttcElevators.length} elevator alerts`);

    // Build map of TTC API elevators by thread_id and suffix
    const ttcElevatorsByThreadId = new Map<string, TtcElevator>();
    const ttcSuffixes = new Set<string>();
    
    for (const elev of ttcElevators) {
      const { threadId, suffix } = generateElevatorThreadId(
        elev.elevatorCode || '',
        elev.headerText || ''
      );
      ttcElevatorsByThreadId.set(threadId, elev);
      ttcSuffixes.add(suffix);
      
      result.details[threadId] = {
        headerText: elev.headerText,
        elevatorCode: elev.elevatorCode,
        source: 'TTC_API'
      };
    }

    // STEP 2: Fetch database elevator threads (visible + hidden + resolved)
    const { data: dbThreads, error: dbError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, is_hidden, is_resolved, categories')
      .filter('categories', 'cs', '["ACCESSIBILITY"]');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Only count visible, unresolved threads
    const visibleDbThreads = (dbThreads || []).filter((t: any) => !t.is_hidden && !t.is_resolved);
    result.databaseCount = visibleDbThreads.length;

    console.log(`Database has ${dbThreads?.length || 0} total elevator threads, ${visibleDbThreads.length} visible`);

    // Build map of database threads
    const dbThreadsByThreadId = new Map<string, any>();
    for (const thread of dbThreads || []) {
      dbThreadsByThreadId.set(thread.thread_id, thread);
    }

    // STEP 3: Find discrepancies

    // 3a: Find elevators in TTC API but missing or hidden in database
    for (const [threadId, ttcElev] of ttcElevatorsByThreadId) {
      const dbThread = dbThreadsByThreadId.get(threadId);
      
      if (!dbThread) {
        // Missing entirely - need to create
        result.missingInDb.push(threadId);
        console.log(`MISSING: ${threadId} - "${ttcElev.headerText}"`);
      } else if (dbThread.is_hidden || dbThread.is_resolved) {
        // Exists but hidden/resolved - need to unhide
        result.hiddenButActive.push(threadId);
        console.log(`HIDDEN BUT ACTIVE: ${threadId} - "${dbThread.title}"`);
      }
    }

    // 3b: Find threads in database that are NOT in TTC API (stale)
    for (const [threadId, dbThread] of dbThreadsByThreadId) {
      if (!ttcElevatorsByThreadId.has(threadId) && !dbThread.is_hidden && !dbThread.is_resolved) {
        result.staleInDb.push(threadId);
        console.log(`STALE: ${threadId} - "${dbThread.title}"`);
      }
    }

    // STEP 4: Auto-correct discrepancies

    // 4a: Create missing threads
    for (const threadId of result.missingInDb) {
      const ttcElev = ttcElevatorsByThreadId.get(threadId);
      if (!ttcElev) continue;

      const stationMatch = ttcElev.headerText?.match(/^([^:]+):/);
      const station = stationMatch ? stationMatch[1].trim() : 'Unknown Station';
      const cleanedHeaderText = ttcElev.headerText?.replace(/-TTC\s*$/i, '').trim() || '';
      const alertId = generateAlertId(ttcElev.elevatorCode || '', cleanedHeaderText);

      console.log(`Creating missing thread: ${threadId}`);

      // Create thread
      const { error: threadError } = await supabase
        .from('incident_threads')
        .insert({
          thread_id: threadId,
          title: cleanedHeaderText.substring(0, 200),
          affected_routes: [station],
          categories: ['ACCESSIBILITY'],
          is_resolved: false,
          is_hidden: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thread_hash: threadId // Use threadId as hash for uniqueness
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
            header_text: cleanedHeaderText.substring(0, 200),
            description_text: cleanedHeaderText,
            categories: ['ACCESSIBILITY'],
            affected_routes: [station],
            effect: 'ACCESSIBILITY_ISSUE',
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
      console.log(`Unhiding thread: ${threadId}`);
      
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
      } else {
        console.error(`Failed to unhide thread ${threadId}:`, updateError);
      }
    }

    // 4c: Hide stale threads (no longer in TTC API)
    for (const threadId of result.staleInDb) {
      console.log(`Hiding stale thread: ${threadId}`);
      
      const { error: updateError } = await supabase
        .from('incident_threads')
        .update({
          is_hidden: true,
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (!updateError) {
        result.corrections.hidden++;
      } else {
        console.error(`Failed to hide thread ${threadId}:`, updateError);
      }
    }

    // STEP 5: Final verification
    const { data: finalThreads } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .filter('categories', 'cs', '["ACCESSIBILITY"]')
      .eq('is_hidden', false)
      .eq('is_resolved', false);

    const finalCount = finalThreads?.length || 0;
    
    result.success = finalCount === result.ttcApiCount;
    result.databaseCount = finalCount;

    console.log(`\nVerification complete:`);
    console.log(`  TTC API: ${result.ttcApiCount} elevators`);
    console.log(`  Database (after fix): ${finalCount} visible threads`);
    console.log(`  Corrections: ${result.corrections.created} created, ${result.corrections.unhidden} unhidden, ${result.corrections.hidden} hidden`);
    console.log(`  Match: ${result.success ? 'YES ✅' : 'NO ❌'}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    result.success = false;
    result.details.error = (error as Error).message;
    
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
