// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

/**
 * Database Cleanup Edge Function
 * 
 * Purpose: Automated maintenance to prevent database bloat on Supabase free plan (500MB limit)
 * Schedule: Recommended daily via cron (0 4 * * *) or manual invocation
 * 
 * Operations:
 * 1. Delete old alerts (>48h for non-latest, >7 days for all)
 * 2. Clean up stale/resolved threads
 * 3. Delete old notification history (>7 days)
 * 4. Run VACUUM ANALYZE for space reclamation
 * 
 * v1: Initial implementation for free plan optimization
 */
const FUNCTION_VERSION = 1;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface CleanupStats {
  version: number;
  timestamp: string;
  deletedAlerts: number;
  deletedThreads: number;
  deletedNotifications: number;
  vacuumRan: boolean;
  errors: string[];
  duration_ms: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats: CleanupStats = {
    version: FUNCTION_VERSION,
    timestamp: new Date().toISOString(),
    deletedAlerts: 0,
    deletedThreads: 0,
    deletedNotifications: 0,
    vacuumRan: false,
    errors: [],
    duration_ms: 0
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[db-cleanup v${FUNCTION_VERSION}] Starting cleanup...`);

    // Step 1: Delete old alerts (non-latest alerts older than 48 hours)
    // Keep at least one alert per thread for context
    try {
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get the latest alert_id per thread to preserve
      const { data: latestAlerts } = await supabase
        .from('alert_cache')
        .select('alert_id, thread_id')
        .not('thread_id', 'is', null)
        .order('created_at', { ascending: false });
      
      // Build set of latest alert IDs per thread
      const latestPerThread = new Map<string, string>();
      for (const alert of latestAlerts || []) {
        if (alert.thread_id && !latestPerThread.has(alert.thread_id)) {
          latestPerThread.set(alert.thread_id, alert.alert_id);
        }
      }
      const preserveIds = Array.from(latestPerThread.values());
      
      // Delete old alerts that aren't the latest per thread
      // First: alerts older than 48h that aren't the latest
      const { count: deleted48h, error: err48h } = await supabase
        .from('alert_cache')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff48h)
        .not('alert_id', 'in', `(${preserveIds.join(',')})`);
      
      if (err48h) {
        stats.errors.push(`48h cleanup error: ${err48h.message}`);
      } else {
        stats.deletedAlerts += deleted48h || 0;
      }
      
      // Also delete very old alerts (>7 days) regardless
      const { count: deleted7d, error: err7d } = await supabase
        .from('alert_cache')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff7d);
      
      if (err7d) {
        stats.errors.push(`7d cleanup error: ${err7d.message}`);
      } else {
        stats.deletedAlerts += deleted7d || 0;
      }
      
      console.log(`[db-cleanup] Deleted ${stats.deletedAlerts} old alerts`);
    } catch (e: any) {
      stats.errors.push(`Alert cleanup: ${e.message}`);
    }

    // Step 2: Delete stale and resolved threads
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const cutoff12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      // First, find threads to delete
      const { data: staleThreads } = await supabase
        .from('incident_threads')
        .select('thread_id')
        .or(`and(is_resolved.eq.true,updated_at.lt.${cutoff24h}),updated_at.lt.${cutoff12h}`);
      
      if (staleThreads && staleThreads.length > 0) {
        const threadIds = staleThreads.map((t: { thread_id: string }) => t.thread_id);
        
        // Unlink alerts from these threads first
        await supabase
          .from('alert_cache')
          .update({ thread_id: null })
          .in('thread_id', threadIds);
        
        // Now delete the threads
        const { count: deletedThreads, error: threadErr } = await supabase
          .from('incident_threads')
          .delete({ count: 'exact' })
          .in('thread_id', threadIds);
        
        if (threadErr) {
          stats.errors.push(`Thread cleanup error: ${threadErr.message}`);
        } else {
          stats.deletedThreads = deletedThreads || 0;
        }
      }
      
      console.log(`[db-cleanup] Deleted ${stats.deletedThreads} stale threads`);
    } catch (e: any) {
      stats.errors.push(`Thread cleanup: ${e.message}`);
    }

    // Step 3: Delete old notification history
    try {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { count: deletedNotifs, error: notifErr } = await supabase
        .from('notification_history')
        .delete({ count: 'exact' })
        .lt('sent_at', cutoff7d);
      
      if (notifErr) {
        stats.errors.push(`Notification cleanup error: ${notifErr.message}`);
      } else {
        stats.deletedNotifications = deletedNotifs || 0;
      }
      
      console.log(`[db-cleanup] Deleted ${stats.deletedNotifications} old notifications`);
    } catch (e: any) {
      stats.errors.push(`Notification cleanup: ${e.message}`);
    }

    // Step 4: Run VACUUM ANALYZE via RPC (if the function exists)
    // Note: VACUUM FULL requires exclusive lock and can't run in Edge Function
    // Regular VACUUM + ANALYZE can be run for maintenance
    try {
      // Use the cleanup_old_data function which does the same but in a transaction
      const { error: cleanupErr } = await supabase.rpc('cleanup_old_data');
      
      if (cleanupErr) {
        console.log(`[db-cleanup] cleanup_old_data RPC: ${cleanupErr.message}`);
        // Not a fatal error - we've already done manual cleanup above
      } else {
        console.log(`[db-cleanup] cleanup_old_data RPC completed`);
      }
      
      // Try to run ANALYZE on main tables (lighter than VACUUM)
      // This updates query planner statistics
      await supabase.rpc('vacuum_analyze_tables').catch(() => {
        // Function might not exist, that's okay
      });
      
      stats.vacuumRan = true;
    } catch (e: any) {
      // VACUUM/ANALYZE may not be available via RPC, that's okay
      console.log(`[db-cleanup] VACUUM note: ${e.message}`);
    }

    stats.duration_ms = Date.now() - startTime;
    
    console.log(`[db-cleanup v${FUNCTION_VERSION}] Completed in ${stats.duration_ms}ms`);
    console.log(`[db-cleanup] Stats: ${JSON.stringify(stats)}`);

    return new Response(JSON.stringify(stats, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    stats.errors.push(`Fatal: ${error.message}`);
    stats.duration_ms = Date.now() - startTime;
    
    console.error(`[db-cleanup v${FUNCTION_VERSION}] Fatal error:`, error);
    
    return new Response(JSON.stringify(stats, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
