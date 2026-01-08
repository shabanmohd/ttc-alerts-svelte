// Monitor Alert Accuracy Edge Function
// Compares TTC API alerts vs frontend data (via Supabase query)
// Runs every 5 minutes via pg_cron

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TTC API endpoint
const TTC_API_URL = "https://alerts.ttc.ca/api/alerts/live-alerts";

// Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TTCAlert {
  route: string;
  title: string;
  effect: string;
}

interface FrontendAlert {
  route: string;
  title: string;
  status: string;
}

interface DiscrepancyItem {
  route: string;
  ttc_title?: string;
  ttc_effect?: string;
  frontend_title?: string;
  frontend_status?: string;
}

interface CheckResult {
  timestamp: string;
  ttc_count: number;
  frontend_count: number;
  matched: number;
  completeness: number;
  precision: number;
  missing: DiscrepancyItem[];
  stale: DiscrepancyItem[];
}

// Calculate Jaccard similarity between two strings
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Extract route number from title (e.g., "504 King: ..." -> "504")
function extractRoute(title: string): string {
  // Handle subway lines
  if (title.toLowerCase().includes('line 1')) return 'Line 1';
  if (title.toLowerCase().includes('line 2')) return 'Line 2';
  if (title.toLowerCase().includes('line 3')) return 'Line 3';
  if (title.toLowerCase().includes('line 4')) return 'Line 4';
  
  // Extract route number from start of title
  const match = title.match(/^(\d+)/);
  return match ? match[1] : title.split(':')[0].trim();
}

// Fetch alerts from TTC API (excluding RSZ)
async function fetchTTCAlerts(): Promise<TTCAlert[]> {
  try {
    const response = await fetch(TTC_API_URL);
    if (!response.ok) {
      throw new Error(`TTC API error: ${response.status}`);
    }
    
    const data = await response.json();
    const alerts: TTCAlert[] = [];
    
    // Process routes array, excluding RSZ
    for (const route of data.routes || []) {
      // Skip RSZ alerts
      if (route.effectDesc === "Reduced Speed Zone") continue;
      
      // TTC API has route number in the 'route' field
      alerts.push({
        route: route.route || route.routeGroup || '',
        title: route.title || '',
        effect: route.effectDesc || 'Unknown'
      });
    }
    
    return alerts;
  } catch (error) {
    console.error("Error fetching TTC API:", error);
    throw error;
  }
}

// Fetch alerts from Supabase (same query as frontend)
async function fetchFrontendAlerts(): Promise<FrontendAlert[]> {
  try {
    // Query incident_threads with their latest alerts
    // This mirrors what the frontend's threadsWithAlerts store does
    const { data: alerts, error } = await supabase
      .from('alert_cache')
      .select(`
        alert_id,
        thread_id,
        header_text,
        effect,
        categories,
        affected_routes,
        is_latest,
        created_at
      `)
      .eq('is_latest', true)
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (error) throw error;
    
    // Get threads
    const threadIds = [...new Set((alerts || []).map(a => a.thread_id).filter(Boolean))];
    
    const { data: threads, error: threadsError } = await supabase
      .from('incident_threads')
      .select('thread_id, title, categories, affected_routes, is_resolved, is_hidden')
      .in('thread_id', threadIds);
    
    if (threadsError) throw threadsError;
    
    // Filter to active, non-hidden, non-RSZ threads
    const activeThreads = (threads || []).filter(t => 
      !t.is_resolved && 
      !t.is_hidden &&
      !t.thread_id?.toLowerCase().includes('ttc-rsz-') &&
      !(t.categories || []).includes('RSZ') &&
      !(t.categories || []).includes('ACCESSIBILITY')
    );
    
    // Map threads to frontend alerts
    const frontendAlerts: FrontendAlert[] = [];
    
    for (const thread of activeThreads) {
      const threadAlert = (alerts || []).find(a => a.thread_id === thread.thread_id);
      if (!threadAlert) continue;
      
      const route = extractRoute(thread.title || threadAlert.header_text || '');
      const categories = (thread.categories as string[]) || [];
      
      // Determine status from categories
      let status = 'Unknown';
      if (categories.includes('SERVICE_DISRUPTION') || categories.includes('NO_SERVICE')) {
        status = 'Disruption';
      } else if (categories.includes('DETOUR')) {
        status = 'Detour';
      } else if (categories.includes('DELAY')) {
        status = 'Delay';
      } else if (threadAlert.effect) {
        status = threadAlert.effect;
      }
      
      frontendAlerts.push({
        route,
        title: thread.title || threadAlert.header_text || '',
        status
      });
    }
    
    return frontendAlerts;
  } catch (error) {
    console.error("Error fetching frontend alerts:", error);
    throw error;
  }
}

// Compare alerts and find matches/discrepancies
function compareAlerts(ttcAlerts: TTCAlert[], frontendAlerts: FrontendAlert[]): {
  matched: TTCAlert[];
  missing: DiscrepancyItem[];
  stale: DiscrepancyItem[];
} {
  const matched: TTCAlert[] = [];
  const missing: DiscrepancyItem[] = [];
  const stale: DiscrepancyItem[] = [];
  
  const matchedFrontendIndices = new Set<number>();
  
  // For each TTC alert, find matching frontend alert
  for (const ttcAlert of ttcAlerts) {
    let foundMatch = false;
    
    for (let i = 0; i < frontendAlerts.length; i++) {
      if (matchedFrontendIndices.has(i)) continue;
      
      const frontendAlert = frontendAlerts[i];
      
      // Check route match
      const routeMatch = ttcAlert.route === frontendAlert.route ||
        ttcAlert.route.toLowerCase() === frontendAlert.route.toLowerCase();
      
      // Check title similarity
      const titleSimilarity = jaccardSimilarity(ttcAlert.title, frontendAlert.title);
      
      // Match if route matches AND title is at least 30% similar
      if (routeMatch && titleSimilarity >= 0.3) {
        matched.push(ttcAlert);
        matchedFrontendIndices.add(i);
        foundMatch = true;
        break;
      }
    }
    
    if (!foundMatch) {
      missing.push({
        route: ttcAlert.route,
        ttc_title: ttcAlert.title,
        ttc_effect: ttcAlert.effect
      });
    }
  }
  
  // Find stale frontend alerts (not in TTC API)
  for (let i = 0; i < frontendAlerts.length; i++) {
    if (!matchedFrontendIndices.has(i)) {
      const frontendAlert = frontendAlerts[i];
      stale.push({
        route: frontendAlert.route,
        frontend_title: frontendAlert.title,
        frontend_status: frontendAlert.status
      });
    }
  }
  
  return { matched, missing, stale };
}

// Store check result in database
async function storeResult(result: CheckResult): Promise<void> {
  const status = result.completeness >= 95 && result.precision >= 98 ? 'healthy' :
                 result.completeness >= 80 && result.precision >= 90 ? 'warning' : 'critical';
  
  const { error } = await supabase
    .from('alert_accuracy_logs')
    .insert({
      checked_at: result.timestamp,
      ttc_alert_count: result.ttc_count,
      frontend_alert_count: result.frontend_count,
      matched_count: result.matched,
      completeness: result.completeness,
      precision: result.precision,
      missing_count: result.missing.length,
      stale_count: result.stale.length,
      status
    });
  
  if (error) {
    console.error("Error storing result:", error);
    throw error;
  }
}

// Update or create daily report
async function updateDailyReport(result: CheckResult): Promise<void> {
  const today = result.timestamp.split('T')[0]; // "2026-01-08"
  
  // Get existing report
  const { data: existing } = await supabase
    .from('alert_accuracy_reports')
    .select('*')
    .eq('report_date', today)
    .single();
  
  if (existing) {
    // Update existing report with new averages
    const newTotalChecks = existing.total_checks + 1;
    const newAvgCompleteness = ((existing.avg_completeness * existing.total_checks) + result.completeness) / newTotalChecks;
    const newAvgPrecision = ((existing.avg_precision * existing.total_checks) + result.precision) / newTotalChecks;
    
    const { error } = await supabase
      .from('alert_accuracy_reports')
      .update({
        updated_at: result.timestamp,
        total_checks: newTotalChecks,
        avg_completeness: Math.round(newAvgCompleteness * 100) / 100,
        avg_precision: Math.round(newAvgPrecision * 100) / 100,
        total_missing_instances: existing.total_missing_instances + result.missing.length,
        total_stale_instances: existing.total_stale_instances + result.stale.length
      })
      .eq('report_date', today);
    
    if (error) console.error("Error updating report:", error);
  } else {
    // Create new report
    const { error } = await supabase
      .from('alert_accuracy_reports')
      .insert({
        report_date: today,
        created_at: result.timestamp,
        updated_at: result.timestamp,
        total_checks: 1,
        avg_completeness: result.completeness,
        avg_precision: result.precision,
        total_missing_instances: result.missing.length,
        total_stale_instances: result.stale.length,
        unique_missing_alerts: result.missing.length,
        unique_stale_alerts: result.stale.length
      });
    
    if (error) console.error("Error creating report:", error);
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    console.log("Starting alert accuracy check...");
    
    // Fetch both data sources
    const [ttcAlerts, frontendAlerts] = await Promise.all([
      fetchTTCAlerts(),
      fetchFrontendAlerts()
    ]);
    
    console.log(`TTC alerts: ${ttcAlerts.length}, Frontend alerts: ${frontendAlerts.length}`);
    
    // Compare
    const { matched, missing, stale } = compareAlerts(ttcAlerts, frontendAlerts);
    
    // Calculate metrics
    const completeness = ttcAlerts.length > 0 
      ? Math.round((matched.length / ttcAlerts.length) * 10000) / 100 
      : 100;
    const precision = frontendAlerts.length > 0 
      ? Math.round((matched.length / frontendAlerts.length) * 10000) / 100 
      : 100;
    
    const result: CheckResult = {
      timestamp: new Date().toISOString(),
      ttc_count: ttcAlerts.length,
      frontend_count: frontendAlerts.length,
      matched: matched.length,
      completeness,
      precision,
      missing,
      stale
    };
    
    // Store results
    await storeResult(result);
    await updateDailyReport(result);
    
    const duration = Date.now() - startTime;
    console.log(`Check complete in ${duration}ms. Completeness: ${completeness}%, Precision: ${precision}%`);
    
    return new Response(JSON.stringify({
      success: true,
      ...result,
      // Include raw alerts for comparison view
      ttc_alerts: ttcAlerts,
      frontend_alerts: frontendAlerts,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Monitor error:", errorMessage);
    
    // Store error in logs
    await supabase
      .from('alert_accuracy_logs')
      .insert({
        checked_at: new Date().toISOString(),
        ttc_alert_count: 0,
        frontend_alert_count: 0,
        matched_count: 0,
        completeness: 0,
        precision: 0,
        missing_count: 0,
        stale_count: 0,
        status: 'critical',
        duration_ms: Date.now() - startTime,
        error_message: errorMessage
      });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
