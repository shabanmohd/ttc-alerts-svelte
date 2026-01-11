import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

// v3 - Scrape RSZ data from TTC website as alternative to live-alerts API
// Fixed to use correct database schema (incident_threads + alert_cache)
// Fixed thread_hash to use threadId for uniqueness

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TTC_RSZ_URL = 'https://www.ttc.ca/riding-the-ttc/Updates/Reduced-Speed-Zones';

interface RSZZone {
  id: string;
  line: string;
  direction: string;
  stopStart: string;
  stopEnd: string;
  location: string;
  defectLength: number | null;
  distanceBetweenStations: number | null;
  trackPercent: number | null;
  reducedSpeed: number | null;
  normalSpeed: number | null;
  reason: string | null;
  targetRemoval: string | null;
}

/**
 * Generate a stable ID for an RSZ zone
 */
function generateRszId(line: string, stopStart: string, stopEnd: string): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `rsz-line${line}-${normalize(stopStart)}-${normalize(stopEnd)}`;
}

/**
 * Parse a single RSZ table to extract zone data
 */
function parseRszTable(table: Element, line: string, tableDirection: string): RSZZone[] {
  const zones: RSZZone[] = [];
  const rows = table.querySelectorAll('tbody tr');
  
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 8) continue;
    
    // Cell order: Location, Length of defect, Distance, Track %, Reduced speed, Normal speed, Reason, Target removal
    const locationText = cells[0]?.textContent?.trim() || '';
    const defectLengthStr = cells[1]?.textContent?.trim() || '';
    const distanceStr = cells[2]?.textContent?.trim() || '';
    const trackPercentStr = cells[3]?.textContent?.trim() || '';
    const reducedSpeedStr = cells[4]?.textContent?.trim() || '';
    const normalSpeedStr = cells[5]?.textContent?.trim() || '';
    const reason = cells[6]?.textContent?.trim() || null;
    const targetRemoval = cells[7]?.textContent?.trim() || null;
    
    // Parse location: "Southbound Eglinton to Davisville" or "Eastbound Kipling to Islington"
    const locationMatch = locationText.match(/^(Northbound|Southbound|Eastbound|Westbound)\s+(.+?)\s+to\s+(.+)$/i);
    if (!locationMatch) continue;
    
    const direction = locationMatch[1];
    const stopStart = locationMatch[2].trim();
    const stopEnd = locationMatch[3].trim();
    
    // Parse numeric values (remove commas)
    const parseNum = (s: string): number | null => {
      const cleaned = s.replace(/,/g, '').trim();
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? null : num;
    };
    
    zones.push({
      id: generateRszId(line, stopStart, stopEnd),
      line,
      direction,
      stopStart,
      stopEnd,
      location: locationText,
      defectLength: parseNum(defectLengthStr),
      distanceBetweenStations: parseNum(distanceStr),
      trackPercent: parseNum(trackPercentStr),
      reducedSpeed: parseNum(reducedSpeedStr),
      normalSpeed: parseNum(normalSpeedStr),
      reason,
      targetRemoval,
    });
  }
  
  return zones;
}

/**
 * Scrape RSZ data from TTC website
 */
async function scrapeRszData(): Promise<RSZZone[]> {
  console.log('Fetching RSZ page from:', TTC_RSZ_URL);
  
  const response = await fetch(TTC_RSZ_URL, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'TTC-Alerts-App/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch TTC RSZ page: ${response.status}`);
  }
  
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  if (!doc) {
    throw new Error('Failed to parse HTML');
  }
  
  const allZones: RSZZone[] = [];
  
  // Find all RSZ table sections
  // Structure: <div class="component reduced-speed-zone-table"> containing:
  //   - <div class="line-header"> with line info
  //   - <table> with RSZ data
  const sections = doc.querySelectorAll('.reduced-speed-zone-table');
  
  console.log(`Found ${sections.length} RSZ table sections`);
  
  for (const section of sections) {
    // Extract line number from the header
    const header = section.querySelector('.line-header h2');
    const headerText = header?.textContent || '';
    
    // Parse: "Line 1 (Yonge-University) to Vaughan Metropolitan Centre Station"
    const lineMatch = headerText.match(/Line\s*(\d+)/i);
    const line = lineMatch ? lineMatch[1] : '0';
    
    // Determine direction context from header (e.g., "to Finch Station" vs "to Vaughan Metropolitan Centre")
    const tableDirection = headerText.toLowerCase().includes('finch') ? 'Northbound' : 
                          headerText.toLowerCase().includes('vaughan') ? 'Northbound' :
                          headerText.toLowerCase().includes('kennedy') ? 'Eastbound' :
                          headerText.toLowerCase().includes('kipling') ? 'Westbound' : '';
    
    // Find the table in this section
    const table = section.querySelector('table');
    if (!table) continue;
    
    const zones = parseRszTable(table as Element, line, tableDirection);
    console.log(`Line ${line}: Found ${zones.length} zones`);
    allZones.push(...zones);
  }
  
  console.log(`Total RSZ zones scraped: ${allZones.length}`);
  return allZones;
}

/**
 * Generate thread_id for an RSZ zone (matches poll-alerts format)
 */
function generateThreadId(zone: RSZZone): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `thread-rsz-line${zone.line}-${normalize(zone.stopStart)}-${normalize(zone.stopEnd)}`;
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

    // Scrape RSZ data from TTC website
    const zones = await scrapeRszData();
    
    if (zones.length === 0) {
      console.log('No RSZ zones found');
      return new Response(
        JSON.stringify({ success: true, message: 'No RSZ zones found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build set of active thread IDs
    const activeThreadIds = new Set<string>();
    
    // Upsert each zone into database
    let upserted = 0;
    let hidden = 0;
    
    for (const zone of zones) {
      const threadId = generateThreadId(zone);
      activeThreadIds.add(threadId);
      
      // Generate alert_id for this zone
      const alertId = `ttc-rsz-${zone.line}-${zone.stopStart.toLowerCase().replace(/[^a-z0-9]/g, '')}-${zone.stopEnd.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      
      // Build header text similar to TTC API format
      const headerText = `Line ${zone.line}: Subway trains will move slower than usual ${zone.direction.toLowerCase()} from ${zone.stopStart} to ${zone.stopEnd} stations while we work on track issues.`;
      
      // Check if thread exists
      const { data: existingThread } = await supabase
        .from('incident_threads')
        .select('thread_id, is_hidden')
        .eq('thread_id', threadId)
        .single();
      
      if (existingThread) {
        // Update existing thread - unhide if hidden
        if (existingThread.is_hidden) {
          await supabase
            .from('incident_threads')
            .update({
              is_hidden: false,
              title: headerText,
              updated_at: new Date().toISOString(),
            })
            .eq('thread_id', threadId);
          console.log(`Un-hidden thread: ${threadId}`);
        } else {
          // Just update title and timestamp
          await supabase
            .from('incident_threads')
            .update({
              title: headerText,
              updated_at: new Date().toISOString(),
            })
            .eq('thread_id', threadId);
        }
        upserted++;
      } else {
        // Create new thread with explicit thread_hash to avoid collision from auto-generated hash
        // Use threadId as hash source since it's guaranteed unique per zone
        const { error: threadError } = await supabase
          .from('incident_threads')
          .insert({
            thread_id: threadId,
            title: headerText,
            affected_routes: [`Line ${zone.line}`],
            categories: ['RSZ'],
            is_resolved: false,
            is_hidden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thread_hash: threadId, // Use threadId as hash to guarantee uniqueness
          });
        
        if (threadError) {
          console.error(`Failed to create thread ${threadId}:`, threadError);
        } else {
          console.log(`Created thread: ${threadId}`);
          upserted++;
        }
      }
      
      // Upsert alert to alert_cache
      // Build description with metadata
      const descriptionParts: string[] = [];
      if (zone.reducedSpeed && zone.normalSpeed) {
        descriptionParts.push(`Speed: ${zone.reducedSpeed} km/h (normally ${zone.normalSpeed} km/h)`);
      }
      if (zone.defectLength) {
        descriptionParts.push(`Length: ${zone.defectLength}m`);
      }
      if (zone.trackPercent) {
        descriptionParts.push(`Track affected: ${zone.trackPercent}%`);
      }
      if (zone.reason) {
        descriptionParts.push(`Reason: ${zone.reason}`);
      }
      if (zone.targetRemoval) {
        descriptionParts.push(`Target removal: ${zone.targetRemoval}`);
      }
      const descriptionText = descriptionParts.join('\n');
      
      const { error: alertError } = await supabase
        .from('alert_cache')
        .upsert({
          alert_id: alertId,
          thread_id: threadId,
          header_text: headerText,
          description_text: descriptionText || null,
          effect: 'RSZ',
          categories: ['RSZ'],
          affected_routes: [`Line ${zone.line}`],
          is_latest: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'alert_id',
        });
      
      if (alertError) {
        console.error(`Failed to upsert alert ${alertId}:`, alertError);
      }
    }
    
    // Hide RSZ threads that are no longer active
    const { data: allRszThreads } = await supabase
      .from('incident_threads')
      .select('thread_id')
      .like('thread_id', 'thread-rsz-%')
      .eq('is_hidden', false)
      .not('thread_id', 'like', '%legacy%');
    
    if (allRszThreads) {
      for (const thread of allRszThreads) {
        if (!activeThreadIds.has(thread.thread_id)) {
          await supabase
            .from('incident_threads')
            .update({ is_hidden: true })
            .eq('thread_id', thread.thread_id);
          console.log(`Hidden stale thread: ${thread.thread_id}`);
          hidden++;
        }
      }
    }

    const result = {
      success: true,
      scraped: zones.length,
      upserted,
      hidden,
      activeThreadIds: Array.from(activeThreadIds),
    };
    
    console.log('scrape-rsz result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('scrape-rsz error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
