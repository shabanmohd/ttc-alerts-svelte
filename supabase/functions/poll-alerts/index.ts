import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_VERSION = 49;
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const BLUESKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';

const ALERT_CATEGORIES: Record<string, { keywords: string[]; priority: number }> = {
  SERVICE_DISRUPTION: { keywords: ['no service', 'suspended', 'closed', 'not stopping', 'bypassing'], priority: 1 },
  SERVICE_RESUMED: { keywords: ['regular service', 'resumed', 'restored', 'back to normal', 'now stopping', 'service has resumed'], priority: 2 },
  DELAY: { keywords: ['delay', 'delayed', 'slower', 'longer wait'], priority: 3 },
  DIVERSION: { keywords: ['diverting', 'detour', 'alternate route', 'diversion'], priority: 4 },
  SHUTTLE: { keywords: ['shuttle', 'buses replacing'], priority: 4 },
  PLANNED_CLOSURE: { keywords: ['planned', 'scheduled', 'maintenance', 'this weekend'], priority: 5 },
  ACCESSIBILITY: { keywords: ['elevator', 'escalator', 'accessible', 'wheelchair', 'out of service'], priority: 6 }
};

function extractReplyInfo(record: any): { parentUri: string | null; parentPostId: string | null; rootUri: string | null } {
  const reply = record?.reply;
  if (!reply) return { parentUri: null, parentPostId: null, rootUri: null };
  const parentUri = reply.parent?.uri || null;
  const rootUri = reply.root?.uri || null;
  let parentPostId: string | null = null;
  if (parentUri) {
    const match = parentUri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
    if (match) parentPostId = `bsky-${match[1]}`;
  }
  return { parentUri, parentPostId, rootUri };
}

function categoryToEffect(category: string): string {
  const map: Record<string, string> = { SERVICE_RESUMED: 'RESUMED', DELAY: 'SIGNIFICANT_DELAYS', DIVERSION: 'DETOUR', SHUTTLE: 'MODIFIED_SERVICE', PLANNED_CLOSURE: 'SCHEDULED' };
  return map[category] || 'NO_SERVICE';
}

function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  const lineMatch = text.match(/Line\s*\d+/gi);
  if (lineMatch) lineMatch.forEach(m => routes.push(m));
  
  const commaListMatch = text.match(/^(\d{1,3}(?:[A-Z])?(?:\s*,\s*\d{1,3}[A-Z]?)+)/);
  if (commaListMatch) commaListMatch[1].split(/\s*,\s*/).forEach(r => { if (r.trim() && !routes.includes(r.trim())) routes.push(r.trim()); });
  
  const routeWithSuffixMatch = text.match(/\b(\d{1,3}[A-Z])\b/g);
  if (routeWithSuffixMatch) routeWithSuffixMatch.forEach(m => { if (!routes.includes(m)) routes.push(m); });
  
  const isLikelyAddress = (match: string, idx: number): boolean => {
    if (idx === 0) return false;
    const after = text.slice(idx + match.length);
    if (/^\s+(Ave|St|Blvd|Rd|Dr|Cres|Way|Pkwy|Pl|Ct|Ln|Ter|Circle|Gate)\.?\b/i.test(after)) return true;
    const before = text.slice(0, idx);
    return /\b(to|at|near|from|between)\s*$/i.test(before);
  };
  
  const routeWithNameRegex = /\b(\d{1,3})\s+([A-Z][a-z]+)/g;
  let m;
  while ((m = routeWithNameRegex.exec(text)) !== null) {
    if (!isLikelyAddress(m[0], m.index) && !routes.some(r => r.startsWith(m[1]))) routes.push(m[0]);
  }
  
  const startMatch = text.match(/^(\d{1,3})\s+[A-Z]/);
  if (startMatch && !routes.some(r => r.startsWith(startMatch[1]))) routes.push(startMatch[1]);
  
  return [...new Set(routes)];
}

function categorizeAlert(text: string): { category: string; priority: number } {
  const lower = text.toLowerCase();
  for (const [cat, cfg] of Object.entries(ALERT_CATEGORIES)) {
    if (cfg.keywords.some(kw => lower.includes(kw))) return { category: cat, priority: cfg.priority };
  }
  return { category: 'OTHER', priority: 10 };
}

function extractRouteNumber(route: string): string { return route.match(/^(\d+)/)?.[1] || route; }

function extractStationName(text: string): string | null {
  const lower = text.toLowerCase();
  const m = lower.match(/(?:at|from|to|between|near)\s+([a-z]+(?:\s+[a-z]+)?)\s+station/i) || lower.match(/([a-z]+(?:\s+[a-z]+)?)\s+station/i);
  return m ? m[1].toLowerCase() : null;
}

function extractDirection(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('northbound')) return 'northbound';
  if (lower.includes('southbound')) return 'southbound';
  if (lower.includes('eastbound')) return 'eastbound';
  if (lower.includes('westbound')) return 'westbound';
  return null;
}

function extractCause(text: string): string | null {
  const lower = text.toLowerCase();
  const causes = ['collision', 'medical emergency', 'fire', 'police', 'construction', 'stalled', 'track work', 'signal problem', 'power', 'trespasser'];
  return causes.find(c => lower.includes(c)) || null;
}

function extractLocationKeywords(text: string): Set<string> {
  const kw = new Set<string>();
  const patterns = [/\bat\s+(\w+)\s+(ave|st|blvd|rd|dr|cres|way|pkwy)\b/gi, /\b(\w+)\s+station\b/gi, /\bvia\s+(\w+)/gi, /\bnear\s+(\w+)/gi];
  patterns.forEach(p => { const matches = text.match(p); if (matches) matches.forEach(m => kw.add(m.toLowerCase())); });
  const streetMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Ave|St|Blvd|Rd|Dr|Cres|Way)\b/g);
  if (streetMatch) streetMatch.forEach(s => kw.add(s.toLowerCase()));
  return kw;
}

// Strict RSZ (Reduced Speed Zone) detection for BlueSky posts
// TTC API is authoritative for RSZ alerts - ALL BlueSky RSZ posts are filtered out
function isSpeedReductionPost(text: string): boolean {
  const lower = text.toLowerCase();
  // Detect any mention of slow/reduced speed - we filter ALL of these from BlueSky
  const patterns = [
    'slower than usual',   // Main RSZ phrase from TTC
    'reduced speed',
    'slow zone',
    'speed restriction',
    'slower speeds',
    'operating at reduced speed',
    'trains running slower',
    'slower service',
    'move slower',         // "trains will move slower"
    'running slower'
  ];
  return patterns.some(pattern => lower.includes(pattern));
}

function jaccardSimilarity(t1: string, t2: string): number {
  const w1 = new Set(t1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const w2 = new Set(t2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const inter = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return inter.size / union.size;
}

function enhancedSimilarity(t1: string, t2: string): number {
  let score = jaccardSimilarity(t1, t2);
  const loc1 = extractLocationKeywords(t1), loc2 = extractLocationKeywords(t2);
  const locOverlap = [...loc1].filter(l => loc2.has(l)).length;
  score += locOverlap > 0 ? Math.min(0.2, locOverlap * 0.1) : 0;
  const c1 = extractCause(t1), c2 = extractCause(t2);
  if (c1 && c1 === c2) score += 0.15;
  const s1 = extractStationName(t1), s2 = extractStationName(t2);
  if (s1 && s2 && s1 !== s2) score -= 0.4;
  const d1 = extractDirection(t1), d2 = extractDirection(t2);
  if (d1 && d2 && d1 !== d2) score -= 0.5;
  return Math.max(0, Math.min(1, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const now = new Date();
    let ttcApiResolvedCount = 0, ttcApiError: string | null = null, ttcApiAlerts: any[] = [];
    let rszDeletedCount = 0;
    
    // Track active RSZ alerts from TTC API for cleanup
    const activeRszAlertIds = new Set<string>();
    
    // Fetch TTC Live API
    try {
      const ttcRes = await fetch('https://alerts.ttc.ca/api/alerts/live-alerts', { headers: { 'Accept': 'application/json' } });
      if (ttcRes.ok) {
        const ttcData = await ttcRes.json();
        const activeRoutes = new Set<string>();
        
        if (ttcData.routes?.length) {
          for (const a of ttcData.routes) {
            if (a.route) { activeRoutes.add(a.route.toString()); if (/^[1-4]$/.test(a.route.toString())) activeRoutes.add(`Line ${a.route}`); }
            const isPlanned = a.alertType === 'Planned' && ['NO_SERVICE', 'REDUCED_SERVICE'].includes(a.effect);
            if (!isPlanned && ['NO_SERVICE', 'REDUCED_SERVICE', 'DETOUR', 'SIGNIFICANT_DELAYS', 'ACCESSIBILITY_ISSUE'].includes(a.effect) && a.route && a.headerText) {
              ttcApiAlerts.push(a);
              // Track active RSZ alert IDs
              if (a.effect === 'SIGNIFICANT_DELAYS' && a.stopStart && a.stopEnd) {
                const primaryRoute = a.route?.toString().split(',')[0]?.trim() || '';
                const dir = a.direction ? `-${a.direction.replace(/\s+/g, '')}` : '';
                const rszId = `ttc-RSZ-${primaryRoute}-${a.stopStart}-${a.stopEnd}${dir}`.replace(/\s+/g, '-');
                activeRszAlertIds.add(rszId);
              }
            }
          }
        }
        if (ttcData.siteWideCustom?.length) {
          for (const a of ttcData.siteWideCustom) {
            if (a.route) { activeRoutes.add(a.route.toString()); if (/^[1-4]$/.test(a.route.toString())) activeRoutes.add(`Line ${a.route}`); }
          }
        }
        if (ttcData.accessibility?.length) {
          for (const a of ttcData.accessibility) { if (a.effect === 'ACCESSIBILITY_ISSUE' && a.headerText) ttcApiAlerts.push(a); }
        }
        
        // DELETE stale RSZ alerts not in TTC API (instead of marking resolved)
        // RSZ alerts should vanish when resolved, not appear in Resolved tab
        const { data: existingRszAlerts } = await supabase.from('alert_cache').select('alert_id, thread_id').like('alert_id', 'ttc-RSZ-%');
        if (existingRszAlerts) {
          for (const rszAlert of existingRszAlerts) {
            if (!activeRszAlertIds.has(rszAlert.alert_id)) {
              // Delete the RSZ alert
              await supabase.from('alert_cache').delete().eq('alert_id', rszAlert.alert_id);
              rszDeletedCount++;
              
              // If thread has no more alerts, delete the thread too
              if (rszAlert.thread_id) {
                const { count } = await supabase.from('alert_cache').select('alert_id', { count: 'exact', head: true }).eq('thread_id', rszAlert.thread_id);
                if (count === 0) {
                  await supabase.from('incident_threads').delete().eq('thread_id', rszAlert.thread_id);
                }
              }
            }
          }
        }
        
        // Auto-resolve NON-RSZ threads not in TTC API
        const { data: unresolvedThreads } = await supabase.from('incident_threads').select('thread_id, title, affected_routes, categories').eq('is_resolved', false);
        if (unresolvedThreads) {
          for (const thread of unresolvedThreads) {
            // Skip RSZ threads - they are handled by deletion above
            const isRszThread = (thread.title || '').toLowerCase().includes('slower than usual');
            if (isRszThread) continue;
            
            const threadRoutes = thread.affected_routes || [];
            if ((thread.categories || []).includes('ACCESSIBILITY')) {
              const stillActive = ttcData.accessibility?.some((acc: any) => threadRoutes.some((r: string) => (acc.headerText || '').toLowerCase().includes(r.toLowerCase()))) ?? false;
              if (!stillActive) {
                await supabase.from('incident_threads').update({ is_resolved: true, resolved_at: now.toISOString(), updated_at: now.toISOString() }).eq('thread_id', thread.thread_id);
                ttcApiResolvedCount++;
              }
              continue;
            }
            const isStillActive = threadRoutes.some((r: string) => {
              if (activeRoutes.has(r)) return true;
              const num = r.match(/^(\d+)/)?.[1];
              if (num && activeRoutes.has(num)) return true;
              if (r.toLowerCase().startsWith('line')) { const ln = r.match(/\d+/)?.[0]; if (ln && (activeRoutes.has(ln) || activeRoutes.has(`Line ${ln}`))) return true; }
              return false;
            });
            if (!isStillActive) {
              await supabase.from('incident_threads').update({ is_resolved: true, resolved_at: now.toISOString(), updated_at: now.toISOString() }).eq('thread_id', thread.thread_id);
              ttcApiResolvedCount++;
            }
          }
        }
      } else { ttcApiError = `TTC API returned ${ttcRes.status}`; }
    } catch (e: any) { ttcApiError = e.message; }

    // Fetch Bluesky
    const bskyRes = await fetch(`${BLUESKY_API}?actor=ttcalerts.bsky.social&limit=50`, { headers: { 'Accept': 'application/json' } });
    if (!bskyRes.ok) throw new Error(`Bluesky API error: ${bskyRes.status}`);
    const bskyData = await bskyRes.json();
    // Sort posts by createdAt ascending (oldest first) so DELAY creates thread before SERVICE_RESUMED
    const posts = (bskyData.feed || []).sort((a: any, b: any) => 
      new Date(a.post?.record?.createdAt || 0).getTime() - new Date(b.post?.record?.createdAt || 0).getTime()
    );
    
    let newAlerts = 0, updatedThreads = 0, skippedRszAlerts = 0;
    const { data: existingAlerts } = await supabase.from('alert_cache').select('alert_id, thread_id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const existingAlertIds = new Set(existingAlerts?.map(a => a.alert_id) || []);
    const alertToThreadMap = new Map<string, string>();
    existingAlerts?.forEach(a => { if (a.thread_id) alertToThreadMap.set(a.alert_id, a.thread_id); });

    for (const item of posts) {
      const post = item.post;
      if (!post?.record?.text) continue;
      const uri = post.uri;
      const postIdMatch = uri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
      if (!postIdMatch) continue;
      const alertId = `bsky-${postIdMatch[1]}`;
      if (existingAlertIds.has(alertId)) continue;

      const text = post.record.text;
      const { category, priority } = categorizeAlert(text);
      const routes = extractRoutes(text);
      const replyInfo = extractReplyInfo(post.record);
      
      // ALWAYS skip BlueSky RSZ posts - TTC API is the sole authoritative source for RSZ
      // TTC API provides accurate RSZ data (exact stops, direction) and auto-removes when resolved
      if (isSpeedReductionPost(text)) {
        skippedRszAlerts++;
        continue; // Skip ALL BlueSky RSZ posts regardless of route
      }
      
      const alert = {
        alert_id: alertId, bluesky_uri: uri, header_text: text.split('\n')[0].substring(0, 200), description_text: text,
        categories: JSON.parse(JSON.stringify([category])), affected_routes: JSON.parse(JSON.stringify(routes)),
        created_at: post.record.createdAt, is_latest: true, effect: categoryToEffect(category),
        raw_data: { replyParentPostId: replyInfo.parentPostId, replyRootPostId: replyInfo.rootUri ? `bsky-${replyInfo.rootUri.split('/').pop()}` : null, replyParentUri: replyInfo.parentUri }
      };

      const { data: newAlert, error: insertError } = await supabase.from('alert_cache').insert(alert).select().single();
      if (insertError) continue;
      newAlerts++;
      existingAlertIds.add(alertId);

      const { data: candidateThreads } = await supabase.from('incident_threads').select('*').gte('updated_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()).order('updated_at', { ascending: false });
      
      let plannedMaintenanceThreads: any[] = [];
      if (category === 'SERVICE_RESUMED') {
        const { data: pt } = await supabase.from('incident_threads').select('*').gte('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()).or('categories.cs.["PLANNED_CLOSURE"],categories.cs.["PLANNED_SERVICE_DISRUPTION"]').order('created_at', { ascending: false });
        plannedMaintenanceThreads = pt || [];
      }

      let matchedThread: any = null, bestSimilarity = 0, matchedViaReply = false;
      
      // Priority 1: Reply chain
      if (replyInfo.parentPostId) {
        let parentThreadId = alertToThreadMap.get(replyInfo.parentPostId);
        if (!parentThreadId) {
          const { data: pa } = await supabase.from('alert_cache').select('thread_id').eq('alert_id', replyInfo.parentPostId).single();
          if (pa?.thread_id) parentThreadId = pa.thread_id;
        }
        if (parentThreadId) {
          const { data: pt } = await supabase.from('incident_threads').select('*').eq('thread_id', parentThreadId).single();
          if (pt) {
            if (pt.is_resolved) { if (category === 'SERVICE_RESUMED') { matchedThread = pt; matchedViaReply = true; } }
            else { matchedThread = pt; matchedViaReply = true; }
          }
        }
      }

      // Priority 2: Planned maintenance (for SERVICE_RESUMED)
      if (!matchedThread && category === 'SERVICE_RESUMED' && routes.length > 0 && plannedMaintenanceThreads.length > 0) {
        const alertBaseRoutes = routes.map(extractRouteNumber);
        for (const thread of plannedMaintenanceThreads) {
          const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
          if (!threadRoutes.length) continue;
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          if (alertBaseRoutes.every(ab => threadBaseRoutes.includes(ab))) {
            const sim = enhancedSimilarity(text, thread.title || '');
            if (sim > bestSimilarity) { bestSimilarity = sim; matchedThread = thread; }
          }
        }
      }

      // Priority 3: Similarity matching
      if (!matchedThread && routes.length > 0) {
        const alertBaseRoutes = routes.map(extractRouteNumber);
        for (const thread of candidateThreads || []) {
          const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
          if (!threadRoutes.length) continue;
          // Skip RSZ threads for non-RSZ alerts (RSZ threads have "slower than usual" in title)
          const isRszThread = (thread.title || '').toLowerCase().includes('slower than usual');
          if (isRszThread && !text.toLowerCase().includes('slower than usual')) continue;
          const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
          const allMatch = alertBaseRoutes.every(ab => threadBaseRoutes.includes(ab));
          const hasOverlap = alertBaseRoutes.some(ab => threadBaseRoutes.includes(ab));
          const routeOk = category === 'SERVICE_RESUMED' ? allMatch : hasOverlap;
          if (!routeOk) continue;
          const sim = enhancedSimilarity(text, thread.title || '');
          if (category === 'SERVICE_RESUMED') {
            const eff = !thread.is_resolved ? sim + 0.5 : sim;
            if (eff > bestSimilarity) { bestSimilarity = eff; matchedThread = thread; }
          } else if (!thread.is_resolved) {
            if (sim >= 0.4 && sim > bestSimilarity) { bestSimilarity = sim; matchedThread = thread; }
            else if ((category === 'DIVERSION' || category === 'DELAY') && sim >= 0.25 && sim > bestSimilarity) { bestSimilarity = sim; matchedThread = thread; }
          }
        }
      }

      // Validate route overlap
      if (matchedThread && !matchedViaReply) {
        const alertBaseRoutes = routes.map(extractRouteNumber);
        const threadRoutes = Array.isArray(matchedThread.affected_routes) ? matchedThread.affected_routes : [];
        const threadBaseRoutes = threadRoutes.map(extractRouteNumber);
        if (!alertBaseRoutes.some(b => threadBaseRoutes.includes(b)) && routes.length > 0 && threadRoutes.length > 0) matchedThread = null;
      }
      
      if (matchedThread) {
        alertToThreadMap.set(alertId, matchedThread.thread_id);
        await supabase.from('alert_cache').update({ is_latest: false }).eq('thread_id', matchedThread.thread_id);
        await supabase.from('alert_cache').update({ thread_id: matchedThread.thread_id }).eq('alert_id', newAlert.alert_id);
        const existingRoutes = Array.isArray(matchedThread.affected_routes) ? matchedThread.affected_routes : [];
        const mergedRoutes = [...new Set([...existingRoutes, ...routes])];
        const existingCats = Array.isArray(matchedThread.categories) ? matchedThread.categories : [];
        const mergedCats = [...new Set([...existingCats, category])];
        const updates: any = { updated_at: new Date().toISOString(), affected_routes: mergedRoutes, categories: mergedCats };
        if (category !== 'SERVICE_RESUMED') updates.title = text.split('\n')[0].substring(0, 200);
        if (category === 'SERVICE_RESUMED') { updates.is_resolved = true; updates.resolved_at = new Date().toISOString(); }
        await supabase.from('incident_threads').update(updates).eq('thread_id', matchedThread.thread_id);
        updatedThreads++;
      } else {
        const headerTitle = text.split('\n')[0].substring(0, 200);
        const { data: threadResult, error: threadError } = await supabase.rpc('find_or_create_thread', { p_title: headerTitle, p_routes: routes, p_categories: [category], p_is_resolved: category === 'SERVICE_RESUMED' });
        if (threadError) {
          let joined = false;
          if (routes.length > 0) {
            const alertBaseRoutes = routes.map(extractRouteNumber);
            const { data: recent } = await supabase.from('incident_threads').select('*').gte('created_at', new Date(Date.now() - 5000).toISOString());
            for (const rt of recent || []) {
              const rRoutes = Array.isArray(rt.affected_routes) ? rt.affected_routes : [];
              if (rRoutes.length && alertBaseRoutes.some(b => rRoutes.map(extractRouteNumber).includes(b))) {
                await supabase.from('alert_cache').update({ thread_id: rt.thread_id }).eq('alert_id', newAlert.alert_id);
                alertToThreadMap.set(alertId, rt.thread_id);
                await supabase.from('incident_threads').update({ affected_routes: [...new Set([...rRoutes, ...routes])], updated_at: new Date().toISOString() }).eq('thread_id', rt.thread_id);
                updatedThreads++; joined = true; break;
              }
            }
          }
          if (!joined) {
            const { data: nt } = await supabase.from('incident_threads').insert({ title: headerTitle, categories: [category], affected_routes: routes, is_resolved: category === 'SERVICE_RESUMED', resolved_at: category === 'SERVICE_RESUMED' ? now.toISOString() : null }).select().single();
            if (nt) { await supabase.from('alert_cache').update({ thread_id: nt.thread_id }).eq('alert_id', newAlert.alert_id); alertToThreadMap.set(alertId, nt.thread_id); }
          }
        } else if (threadResult?.length) {
          const r = threadResult[0];
          await supabase.from('alert_cache').update({ thread_id: r.out_thread_id }).eq('alert_id', newAlert.alert_id);
          alertToThreadMap.set(alertId, r.out_thread_id);
          if (!r.out_is_new) {
            const { data: et } = await supabase.from('incident_threads').select('affected_routes').eq('thread_id', r.out_thread_id).single();
            const er = Array.isArray(et?.affected_routes) ? et.affected_routes : [];
            await supabase.from('incident_threads').update({ affected_routes: [...new Set([...er, ...routes])], updated_at: new Date().toISOString() }).eq('thread_id', r.out_thread_id);
            updatedThreads++;
          }
        }
      }
    }

    // Process TTC API alerts
    let ttcApiNewAlerts = 0;
    if (ttcApiAlerts.length > 0) {
      const { data: activeBlueskyThreads } = await supabase.from('incident_threads').select('affected_routes').eq('is_resolved', false);
      const blueskyActiveRoutes = new Set<string>();
      for (const t of activeBlueskyThreads || []) { for (const r of t.affected_routes || []) { blueskyActiveRoutes.add(r); const b = extractRouteNumber(r); if (b) blueskyActiveRoutes.add(b); } }

      for (const ttcAlert of ttcApiAlerts) {
        const routeStr = ttcAlert.route?.toString() || '';
        const routeParts = routeStr.split(',').map((r: string) => r.trim()).filter(Boolean);
        const primaryRoute = routeParts[0] || routeStr;
        const routeBase = extractRouteNumber(primaryRoute);
        const isAccessibility = ttcAlert.effect === 'ACCESSIBILITY_ISSUE';
        const isRSZ = ttcAlert.effect === 'SIGNIFICANT_DELAYS';
        
        if (!isAccessibility && !isRSZ && (blueskyActiveRoutes.has(primaryRoute) || blueskyActiveRoutes.has(routeBase))) continue;
        
        let ttcAlertId: string;
        if (isRSZ && ttcAlert.stopStart && ttcAlert.stopEnd) {
          const dir = ttcAlert.direction ? `-${ttcAlert.direction.replace(/\s+/g, '')}` : '';
          ttcAlertId = `ttc-RSZ-${primaryRoute}-${ttcAlert.stopStart}-${ttcAlert.stopEnd}${dir}`.replace(/\s+/g, '-');
        } else { ttcAlertId = `ttc-${ttcAlert.effect}-${ttcAlert.id}`; }
        
        if (existingAlertIds.has(ttcAlertId)) {
          if (isRSZ) { await supabase.from('alert_cache').update({ created_at: now.toISOString() }).eq('alert_id', ttcAlertId); }
          continue;
        }
        
        let category = 'DELAY';
        if (ttcAlert.effect === 'NO_SERVICE' || ttcAlert.effect === 'REDUCED_SERVICE') category = 'SERVICE_DISRUPTION';
        else if (ttcAlert.effect === 'DETOUR') category = 'DIVERSION';
        else if (ttcAlert.effect === 'ACCESSIBILITY_ISSUE') category = 'ACCESSIBILITY';
        
        const routes: string[] = [];
        if (isAccessibility && routeParts.length > 0) {
          const sm = ttcAlert.headerText?.match(/^([^:]+):/);
          if (sm) routes.push(sm[1].trim());
          else for (const r of routeParts) { if (/^[1-4]$/.test(r)) { routes.push(`Line ${r}`); break; } }
        } else if (/^[1-4]$/.test(primaryRoute)) { routes.push(`Line ${primaryRoute}`); }
        else { routes.push(primaryRoute); }
        
        const headerText = ttcAlert.headerText || ttcAlert.title || `Route ${primaryRoute} service alert`;
        const alert = {
          alert_id: ttcAlertId, bluesky_uri: null, header_text: headerText.substring(0, 200), description_text: ttcAlert.customHeaderText || headerText,
          categories: JSON.parse(JSON.stringify([category])), affected_routes: JSON.parse(JSON.stringify(routes)),
          created_at: ttcAlert.lastUpdated || now.toISOString(), is_latest: true, effect: ttcAlert.effect,
          raw_data: { source: 'ttc-api', ttcAlertId: ttcAlert.id, severity: ttcAlert.severity, cause: ttcAlert.cause, causeDescription: ttcAlert.causeDescription, stopStart: ttcAlert.stopStart, stopEnd: ttcAlert.stopEnd, direction: ttcAlert.direction }
        };
        
        const { error: insertError } = await supabase.from('alert_cache').insert(alert).select().single();
        if (insertError) continue;
        ttcApiNewAlerts++;
        existingAlertIds.add(ttcAlertId);
        
        let threadId: string | null = null;
        if (isRSZ) {
          const { data: rszThreads } = await supabase.from('incident_threads').select('*, alert_cache!inner(*)').eq('is_resolved', false).contains('affected_routes', routes);
          for (const t of rszThreads || []) {
            for (const a of t.alert_cache || []) {
              const rd = a.raw_data || {};
              if (rd.stopStart === ttcAlert.stopStart && rd.stopEnd === ttcAlert.stopEnd && rd.direction === ttcAlert.direction) { threadId = t.thread_id; break; }
            }
            if (threadId) break;
          }
          if (threadId) await supabase.from('alert_cache').update({ thread_id: threadId }).eq('alert_id', ttcAlertId);
        } else {
          const { data: et } = await supabase.from('incident_threads').select('*').eq('is_resolved', false).contains('affected_routes', routes);
          if (et?.length) { threadId = et[0].thread_id; await supabase.from('alert_cache').update({ thread_id: threadId }).eq('alert_id', ttcAlertId); }
        }
        
        if (!threadId) {
          const newThreadId = crypto.randomUUID();
          const { data: nt, error: te } = await supabase.from('incident_threads').insert({ thread_id: newThreadId, title: headerText.substring(0, 200), categories: [category], affected_routes: routes, is_resolved: false }).select().single();
          if (!te && nt) { threadId = nt.thread_id; await supabase.from('alert_cache').update({ thread_id: threadId }).eq('alert_id', ttcAlertId); }
        }
        if (!isRSZ) { blueskyActiveRoutes.add(routeStr); blueskyActiveRoutes.add(routeBase); }
      }
    }

    return new Response(JSON.stringify({ success: true, newAlerts, updatedThreads, ttcApiResolvedCount, ttcApiNewAlerts, skippedRszAlerts, rszDeletedCount, ttcApiError, version: FUNCTION_VERSION, timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, version: FUNCTION_VERSION }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
