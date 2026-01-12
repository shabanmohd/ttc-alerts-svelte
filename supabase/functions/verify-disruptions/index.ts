import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno types (for IDE only - Deno runtime provides these)
declare const Deno: { env: { get(key: string): string | undefined } };

// v1 - Disruption Data Integrity Verification System
// Compares TTC API disruptions with database and reports discrepancies
// Ensures frontend displays all active disruptions from TTC API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TTC_LIVE_ALERTS_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

interface TtcChildAlert {
  id: string;
  startTime: string;
  endTime: string;
}

interface TtcDisruptionAlert {
  id: string;
  route: string;
  routeType: string;
  headerText: string;
  effect: string;
  effectDesc: string;
  severity: string;
  cause: string;
  causeDescription?: string;
  title: string;
  stopStart?: string;
  stopEnd?: string;
  shuttleType?: string | null;
  childAlerts?: TtcChildAlert[]; // Scheduled time windows
  activePeriod?: {
    start: string;
    end: string;
  };
}

interface VerificationResult {
  success: boolean;
  version: string;
  timestamp: string;
  ttcApiCount: number;
  databaseCount: number;
  integrity: {
    isValid: boolean;
    missingInDb: string[];
    missingInTtcApi: string[];
    hiddenButActive: string[];
  };
  ttcApiDisruptions: Array<{
    id: string;
    route: string;
    type: string;
    effect: string;
    title: string;
  }>;
  dbDisruptions: Array<{
    alertId: string;
    route: string;
    categories: string[];
    threadId: string;
    isHidden: boolean;
  }>;
  summary: string;
}

/**
 * Determine category for a disruption alert based on effect/cause
 */
function determineCategory(alert: TtcDisruptionAlert): string {
  const effect = alert.effect?.toUpperCase() || '';
  const effectDesc = (alert.effectDesc || '').toLowerCase();
  const cause = (alert.cause || '').toLowerCase();
  const title = (alert.title || '').toLowerCase();
  
  // Shuttle bus
  if (alert.shuttleType || title.includes('shuttle') || effectDesc.includes('replaced')) {
    return 'SHUTTLE';
  }
  
  // Diversion
  if (effectDesc.includes('diversion') || title.includes('diverting') || title.includes('detour')) {
    return 'DIVERSION';
  }
  
  // Planned closure
  if (effect === 'NO_SERVICE' || effectDesc.includes('closure')) {
    return 'PLANNED_CLOSURE';
  }
  
  // Delay
  if (effect === 'SIGNIFICANT_DELAYS' || title.includes('delay')) {
    return 'DELAY';
  }
  
  // Service disruption (default for reduced/modified service)
  if (effect === 'REDUCED_SERVICE' || effect === 'MODIFIED_SERVICE') {
    return 'SERVICE_DISRUPTION';
  }
  
  return 'SERVICE_DISRUPTION';
}

/**
 * Check if a scheduled alert is currently active based on childAlerts
 */
function isScheduledAlertCurrentlyActive(alert: TtcDisruptionAlert): boolean {
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
      return true;
    }
  }
  
  // No active time window - this is a future scheduled closure
  return false;
}

/**
 * Check if alert is a disruption we should track (not RSZ, not recently resolved)
 */
function isTrackableDisruption(alert: TtcDisruptionAlert): boolean {
  const effectDesc = (alert.effectDesc || '').toLowerCase();
  const effect = (alert.effect || '').toUpperCase();
  
  // Skip RSZ alerts - they have their own verification system
  if (effectDesc.includes('reduced speed zone') || effectDesc === 'rsz') {
    return false;
  }
  
  // Skip "regular service resumed" - these are recently resolved
  if (effect === 'NO_EFFECT' || effectDesc.includes('regular service')) {
    return false;
  }
  
  // Skip scheduled alerts that are not currently active
  // These should show in "Scheduled" tab, not "Disruptions"
  if (!isScheduledAlertCurrentlyActive(alert)) {
    return false;
  }
  
  // Only track actual disruptions
  const trackableEffects = ['REDUCED_SERVICE', 'MODIFIED_SERVICE', 'DETOUR', 'NO_SERVICE', 'SIGNIFICANT_DELAYS'];
  if (!trackableEffects.includes(effect)) {
    return false;
  }
  
  // Skip if effectDesc indicates it's a minor issue
  if (effectDesc === 'reduced speed zone') {
    return false;
  }
  
  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const result: VerificationResult = {
    success: true,
    version: '1',
    timestamp: new Date().toISOString(),
    ttcApiCount: 0,
    databaseCount: 0,
    integrity: {
      isValid: true,
      missingInDb: [],
      missingInTtcApi: [],
      hiddenButActive: [],
    },
    ttcApiDisruptions: [],
    dbDisruptions: [],
    summary: '',
  };

  try {
    // === 1. Fetch TTC Live Alerts API ===
    console.log('[verify-disruptions] Fetching TTC Live Alerts API...');
    const ttcResponse = await fetch(TTC_LIVE_ALERTS_API);
    if (!ttcResponse.ok) {
      throw new Error(`TTC API error: ${ttcResponse.status}`);
    }
    const ttcData = await ttcResponse.json();
    
    // Filter to only trackable disruptions
    const ttcDisruptions: TtcDisruptionAlert[] = (ttcData.routes || []).filter(
      (alert: TtcDisruptionAlert) => isTrackableDisruption(alert)
    );
    
    result.ttcApiCount = ttcDisruptions.length;
    result.ttcApiDisruptions = ttcDisruptions.map(alert => ({
      id: alert.id,
      route: alert.route,
      type: alert.routeType,
      effect: alert.effect,
      title: alert.headerText?.substring(0, 100) || alert.title?.substring(0, 100) || '',
    }));
    
    console.log(`[verify-disruptions] Found ${ttcDisruptions.length} trackable disruptions in TTC API`);
    
    // === 2. Fetch database disruptions ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all TTC API disruption alerts from database
    const { data: dbAlerts, error: dbError } = await supabase
      .from('alert_cache')
      .select('alert_id, header_text, categories, affected_routes, thread_id')
      .like('alert_id', 'ttc-alert-%');
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    // Get thread hidden status
    const threadIds = [...new Set((dbAlerts || []).map(a => a.thread_id).filter(Boolean))];
    const { data: threads } = await supabase
      .from('incident_threads')
      .select('thread_id, is_hidden, is_resolved')
      .in('thread_id', threadIds);
    
    const threadMap = new Map((threads || []).map(t => [t.thread_id, t]));
    
    result.databaseCount = dbAlerts?.length || 0;
    result.dbDisruptions = (dbAlerts || []).map(alert => ({
      alertId: alert.alert_id,
      route: (alert.affected_routes as string[])?.[0] || 'unknown',
      categories: alert.categories || [],
      threadId: alert.thread_id,
      isHidden: threadMap.get(alert.thread_id)?.is_hidden || false,
    }));
    
    console.log(`[verify-disruptions] Found ${result.databaseCount} disruption alerts in database`);
    
    // === 3. Compare TTC API vs Database ===
    const ttcAlertIds = new Set(ttcDisruptions.map(a => `ttc-alert-${a.id}`));
    const dbAlertIds = new Set((dbAlerts || []).map(a => a.alert_id));
    
    // Alerts in TTC API but not in database
    for (const alert of ttcDisruptions) {
      const expectedId = `ttc-alert-${alert.id}`;
      if (!dbAlertIds.has(expectedId)) {
        result.integrity.missingInDb.push(`${expectedId} (${alert.route}: ${alert.headerText?.substring(0, 50)})`);
      }
    }
    
    // Alerts in database but not in TTC API (might be stale)
    for (const dbAlert of (dbAlerts || [])) {
      // Extract TTC ID from our alert_id format
      const ttcId = dbAlert.alert_id.replace('ttc-alert-', '');
      if (!ttcDisruptions.some(a => a.id === ttcId)) {
        result.integrity.missingInTtcApi.push(`${dbAlert.alert_id} (${dbAlert.header_text?.substring(0, 50)})`);
      }
    }
    
    // Alerts that exist but are hidden (shouldn't be if TTC API says active)
    for (const alert of ttcDisruptions) {
      const expectedId = `ttc-alert-${alert.id}`;
      const dbAlert = (dbAlerts || []).find(a => a.alert_id === expectedId);
      if (dbAlert) {
        const thread = threadMap.get(dbAlert.thread_id);
        if (thread?.is_hidden) {
          result.integrity.hiddenButActive.push(`${expectedId} (thread: ${dbAlert.thread_id})`);
        }
      }
    }
    
    // === 4. Determine integrity status ===
    result.integrity.isValid = 
      result.integrity.missingInDb.length === 0 &&
      result.integrity.hiddenButActive.length === 0;
    
    // === 5. Generate summary ===
    if (result.integrity.isValid) {
      result.summary = `✅ Data integrity VALID: All ${result.ttcApiCount} TTC API disruptions are correctly stored and visible in database.`;
    } else {
      const issues: string[] = [];
      if (result.integrity.missingInDb.length > 0) {
        issues.push(`${result.integrity.missingInDb.length} alerts missing from database`);
      }
      if (result.integrity.hiddenButActive.length > 0) {
        issues.push(`${result.integrity.hiddenButActive.length} alerts hidden but still active`);
      }
      result.summary = `⚠️ Data integrity INVALID: ${issues.join(', ')}. TTC API: ${result.ttcApiCount}, Database: ${result.databaseCount}`;
    }
    
    // Note about stale alerts
    if (result.integrity.missingInTtcApi.length > 0) {
      result.summary += ` | ℹ️ ${result.integrity.missingInTtcApi.length} alerts in DB no longer in TTC API (may be resolved).`;
    }
    
    console.log(`[verify-disruptions] ${result.summary}`);
    
  } catch (error) {
    console.error('[verify-disruptions] Error:', error);
    result.success = false;
    result.summary = `❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: result.success ? 200 : 500,
  });
});
