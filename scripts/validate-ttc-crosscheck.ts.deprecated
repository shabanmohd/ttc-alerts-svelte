#!/usr/bin/env npx ts-node
/**
 * TTC Live API Cross-Check Validation Script
 * 
 * This script compares:
 * 1. TTC Official Live API alerts (alerts.ttc.ca)
 * 2. Bluesky @ttcalerts feed
 * 3. Our Supabase database
 * 
 * Purpose: Validate that cross-checking methodology is accurate
 * 
 * Run: npx ts-node scripts/validate-ttc-crosscheck.ts
 * 
 * Or run in watch mode for continuous monitoring:
 * npx ts-node scripts/validate-ttc-crosscheck.ts --watch
 */

interface TTCAlert {
  id: string;
  route: string;
  effect: string;
  title: string;
  lastUpdated: string;
  routeType: string;
  severity: string;
}

interface BlueskyPost {
  uri: string;
  text: string;
  createdAt: string;
}

interface DBThread {
  thread_id: string;
  title: string;
  affected_routes: string[];
  is_resolved: boolean;
  created_at: string;
}

interface ComparisonResult {
  timestamp: string;
  ttcActiveRoutes: string[];
  blueskyRecentRoutes: string[];
  dbUnresolvedRoutes: string[];
  matches: {
    ttcVsDb: { matching: string[]; onlyInTtc: string[]; onlyInDb: string[] };
    ttcVsBluesky: { matching: string[]; onlyInTtc: string[]; onlyInBluesky: string[] };
  };
  accuracy: {
    dbMatchesTtc: number; // percentage
    blueskyMatchesTtc: number; // percentage
  };
}

// Config
const TTC_API_URL = 'https://alerts.ttc.ca/api/alerts/live-alerts';
const BLUESKY_API_URL = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=ttcalerts.bsky.social&limit=50';
const SUPABASE_URL = 'https://wmchvmegxcpyfjcuzqzk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtY2h2bWVneGNweWZqY3V6cXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTk4MzgsImV4cCI6MjA3OTQ5NTgzOH0.Jy0t3-TtKIHamd0ZIxZRZxN9Q8rNZuD-IFBta6VdwXM';

// Routes to ignore (long-term maintenance, not incidents)
const IGNORE_EFFECTS = ['SIGNIFICANT_DELAYS', 'ACCESSIBILITY_ISSUE'];

/**
 * Extract route number from route string
 */
function normalizeRoute(route: string): string {
  // Handle "Line 1" -> "1", "501" -> "501", "29C" -> "29"
  const lineMatch = route.match(/line\s*(\d+)/i);
  if (lineMatch) return lineMatch[1];
  
  const numMatch = route.match(/^(\d+)/);
  if (numMatch) return numMatch[1];
  
  return route;
}

/**
 * Fetch TTC Live API alerts
 */
async function fetchTTCAlerts(): Promise<TTCAlert[]> {
  try {
    const response = await fetch(TTC_API_URL);
    if (!response.ok) {
      console.error(`TTC API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const alerts: TTCAlert[] = [];
    
    // Process routes array
    if (data.routes && Array.isArray(data.routes)) {
      for (const alert of data.routes) {
        if (!IGNORE_EFFECTS.includes(alert.effect)) {
          alerts.push({
            id: alert.id,
            route: alert.route,
            effect: alert.effect,
            title: alert.title,
            lastUpdated: alert.lastUpdated,
            routeType: alert.routeType,
            severity: alert.severity
          });
        }
      }
    }
    
    // Process siteWideCustom (scheduled closures)
    if (data.siteWideCustom && Array.isArray(data.siteWideCustom)) {
      for (const alert of data.siteWideCustom) {
        if (!IGNORE_EFFECTS.includes(alert.effect)) {
          alerts.push({
            id: alert.id,
            route: alert.route,
            effect: alert.effect,
            title: alert.title,
            lastUpdated: alert.lastUpdated,
            routeType: alert.routeType,
            severity: alert.severity
          });
        }
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error fetching TTC API:', error);
    return [];
  }
}

/**
 * Fetch recent Bluesky posts
 */
async function fetchBlueskyPosts(): Promise<BlueskyPost[]> {
  try {
    const response = await fetch(BLUESKY_API_URL);
    if (!response.ok) {
      console.error(`Bluesky API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const posts: BlueskyPost[] = [];
    
    if (data.feed && Array.isArray(data.feed)) {
      for (const item of data.feed) {
        posts.push({
          uri: item.post.uri,
          text: item.post.record.text,
          createdAt: item.post.record.createdAt
        });
      }
    }
    
    return posts;
  } catch (error) {
    console.error('Error fetching Bluesky:', error);
    return [];
  }
}

/**
 * Fetch unresolved threads from Supabase
 */
async function fetchDBThreads(): Promise<DBThread[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/incident_threads?is_resolved=eq.false&select=thread_id,title,affected_routes,is_resolved,created_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Supabase returned ${response.status}: ${text}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Supabase:', error);
    return [];
  }
}

/**
 * Extract routes from Bluesky post text
 */
function extractRoutesFromText(text: string): string[] {
  const routes: string[] = [];
  
  // Match route patterns like "501 Queen:", "Line 2 Bloor-Danforth:", "89 Weston:"
  const routePattern = /^(\d+[A-Z]?)\s+\w+:|^Line\s+(\d+)\s+\w+/gim;
  const matches = text.match(routePattern);
  
  if (matches) {
    for (const match of matches) {
      const numMatch = match.match(/^(\d+)/);
      const lineMatch = match.match(/^Line\s+(\d+)/i);
      
      if (numMatch) routes.push(numMatch[1]);
      else if (lineMatch) routes.push(lineMatch[1]);
    }
  }
  
  return routes;
}

/**
 * Check if a Bluesky post is a SERVICE_RESUMED message
 */
function isServiceResumed(text: string): boolean {
  return text.toLowerCase().includes('regular service has resumed') ||
         text.toLowerCase().includes('service has resumed');
}

/**
 * Compare data sources and generate report
 */
async function runComparison(): Promise<ComparisonResult> {
  console.log('\n📊 Fetching data from all sources...\n');
  
  const [ttcAlerts, blueskyPosts, dbThreads] = await Promise.all([
    fetchTTCAlerts(),
    fetchBlueskyPosts(),
    fetchDBThreads()
  ]);
  
  // Extract unique routes from each source
  const ttcRoutes = [...new Set(ttcAlerts.map(a => normalizeRoute(a.route)))];
  
  // From Bluesky, only include active alerts (not SERVICE_RESUMED)
  const blueskyActiveRoutes: string[] = [];
  for (const post of blueskyPosts) {
    if (!isServiceResumed(post.text)) {
      const routes = extractRoutesFromText(post.text);
      for (const route of routes) {
        if (!blueskyActiveRoutes.includes(route)) {
          blueskyActiveRoutes.push(route);
        }
      }
    }
  }
  
  const dbRoutes: string[] = [];
  for (const thread of dbThreads) {
    for (const route of thread.affected_routes || []) {
      const normalized = normalizeRoute(route);
      if (!dbRoutes.includes(normalized)) {
        dbRoutes.push(normalized);
      }
    }
  }
  
  // Calculate matches
  const ttcVsDbMatching = ttcRoutes.filter(r => dbRoutes.includes(r));
  const onlyInTtc = ttcRoutes.filter(r => !dbRoutes.includes(r));
  const onlyInDb = dbRoutes.filter(r => !ttcRoutes.includes(r));
  
  const ttcVsBlueskyMatching = ttcRoutes.filter(r => blueskyActiveRoutes.includes(r));
  const onlyInTtcVsBluesky = ttcRoutes.filter(r => !blueskyActiveRoutes.includes(r));
  const onlyInBluesky = blueskyActiveRoutes.filter(r => !ttcRoutes.includes(r));
  
  // Calculate accuracy percentages
  const dbAccuracy = ttcRoutes.length > 0 
    ? (ttcVsDbMatching.length / ttcRoutes.length) * 100 
    : 100;
  
  const blueskyAccuracy = ttcRoutes.length > 0 
    ? (ttcVsBlueskyMatching.length / ttcRoutes.length) * 100 
    : 100;
  
  return {
    timestamp: new Date().toISOString(),
    ttcActiveRoutes: ttcRoutes,
    blueskyRecentRoutes: blueskyActiveRoutes,
    dbUnresolvedRoutes: dbRoutes,
    matches: {
      ttcVsDb: {
        matching: ttcVsDbMatching,
        onlyInTtc,
        onlyInDb
      },
      ttcVsBluesky: {
        matching: ttcVsBlueskyMatching,
        onlyInTtc: onlyInTtcVsBluesky,
        onlyInBluesky
      }
    },
    accuracy: {
      dbMatchesTtc: Math.round(dbAccuracy),
      blueskyMatchesTtc: Math.round(blueskyAccuracy)
    }
  };
}

/**
 * Print formatted comparison report
 */
function printReport(result: ComparisonResult): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🕐 TTC Cross-Check Validation Report`);
  console.log(`   ${new Date(result.timestamp).toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Data sources summary
  console.log('📡 DATA SOURCES:');
  console.log(`   TTC Live API:    ${result.ttcActiveRoutes.length} active routes`);
  console.log(`   Bluesky Feed:    ${result.blueskyRecentRoutes.length} recent active routes`);
  console.log(`   Our Database:    ${result.dbUnresolvedRoutes.length} unresolved routes\n`);
  
  // Accuracy scores
  console.log('📈 ACCURACY SCORES:');
  const dbEmoji = result.accuracy.dbMatchesTtc >= 80 ? '✅' : result.accuracy.dbMatchesTtc >= 50 ? '⚠️' : '❌';
  const bskyEmoji = result.accuracy.blueskyMatchesTtc >= 80 ? '✅' : result.accuracy.blueskyMatchesTtc >= 50 ? '⚠️' : '❌';
  console.log(`   ${dbEmoji} DB vs TTC:      ${result.accuracy.dbMatchesTtc}% of TTC alerts in our DB`);
  console.log(`   ${bskyEmoji} Bluesky vs TTC: ${result.accuracy.blueskyMatchesTtc}% of TTC alerts in Bluesky\n`);
  
  // TTC vs DB Comparison
  console.log('📊 TTC API vs OUR DATABASE:');
  if (result.matches.ttcVsDb.matching.length > 0) {
    console.log(`   ✅ Matching:    ${result.matches.ttcVsDb.matching.join(', ')}`);
  }
  if (result.matches.ttcVsDb.onlyInTtc.length > 0) {
    console.log(`   ⚠️  Only in TTC: ${result.matches.ttcVsDb.onlyInTtc.join(', ')}`);
    console.log(`      (These should be picked up in next poll cycle)`);
  }
  if (result.matches.ttcVsDb.onlyInDb.length > 0) {
    console.log(`   🔍 Only in DB:  ${result.matches.ttcVsDb.onlyInDb.join(', ')}`);
    console.log(`      (Should be resolved by TTC API cross-check)`);
  }
  
  console.log('');
  
  // TTC vs Bluesky Comparison
  console.log('📊 TTC API vs BLUESKY:');
  if (result.matches.ttcVsBluesky.matching.length > 0) {
    console.log(`   ✅ Matching:      ${result.matches.ttcVsBluesky.matching.join(', ')}`);
  }
  if (result.matches.ttcVsBluesky.onlyInTtc.length > 0) {
    console.log(`   ⚠️  Only in TTC:   ${result.matches.ttcVsBluesky.onlyInTtc.join(', ')}`);
    console.log(`      (Bluesky may be delayed or missing these alerts)`);
  }
  if (result.matches.ttcVsBluesky.onlyInBluesky.length > 0) {
    console.log(`   🔍 Only in Bluesky: ${result.matches.ttcVsBluesky.onlyInBluesky.join(', ')}`);
    console.log(`      (TTC API may have resolved these already)`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  
  // Verdict
  if (result.accuracy.dbMatchesTtc >= 80 && result.matches.ttcVsDb.onlyInDb.length === 0) {
    console.log('✅ VERDICT: Cross-check methodology is WORKING WELL');
    console.log('   Our database accurately reflects TTC service status.');
  } else if (result.accuracy.dbMatchesTtc >= 50) {
    console.log('⚠️  VERDICT: Cross-check is PARTIALLY EFFECTIVE');
    console.log('   Some discrepancies exist - check Bluesky polling frequency.');
  } else {
    console.log('❌ VERDICT: Cross-check needs ATTENTION');
    console.log('   Significant mismatch between TTC API and our database.');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  
  if (watchMode) {
    console.log('🔄 Running in watch mode (every 60 seconds). Press Ctrl+C to stop.\n');
    
    // Run immediately
    const result = await runComparison();
    printReport(result);
    
    // Then run every 60 seconds
    setInterval(async () => {
      const result = await runComparison();
      printReport(result);
    }, 60000);
  } else {
    const result = await runComparison();
    printReport(result);
  }
}

main().catch(console.error);
