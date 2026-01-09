import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

// v3 - Added fallback date parsing for single-day closures (sa-effective-date)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TTC Sitecore search API - correct endpoint for subway-service page
// Discovered from https://www.ttc.ca/service-advisories/subway-service
const TTC_SEARCH_URL = 'https://www.ttc.ca/sxa/search/results/';

// API parameters from the TTC subway-service page
const SCOPE_ID = '{99D7699F-DB47-4BB1-8946-77561CE7B320}';
const ITEM_ID = '{72CC555F-9128-4581-AD12-3D04AB1C87BA}';
const VARIANT_ID = '{23DC07D4-6BAC-4B98-A9CC-07606C5B1322}';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build search params using the correct TTC API format
    const searchParams = new URLSearchParams({
      s: SCOPE_ID,
      itemid: ITEM_ID,
      sig: '',
      p: '50', // page size
      v: VARIANT_ID,
      o: 'EffectiveStartDate,Ascending' // Sort by start date
    });

    console.log('Fetching TTC subway closures from:', `${TTC_SEARCH_URL}?${searchParams}`);

    const response = await fetch(`${TTC_SEARCH_URL}?${searchParams}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TTC-Alerts-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`TTC API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.Results || [];
    
    console.log(`Found ${results.length} subway closures from TTC API`);
    
    let newItems = 0;
    let updatedItems = 0;
    const processedIds: string[] = [];

    for (const item of results) {
      // Parse the HTML response to extract details
      const parsed = parseMaintenanceItem(item);
      if (!parsed) continue;

      // Generate a unique ID based on URL (more stable than TTC's internal ID)
      const maintenanceId = generateMaintenanceId(item.Url);
      processedIds.push(maintenanceId);

      const maintenanceItem = {
        maintenance_id: maintenanceId,
        subway_line: parsed.subwayLine,
        affected_stations: parsed.affectedStations,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        start_time: parsed.startTime,
        end_time: null,
        reason: 'Station work',
        description: parsed.description,
        details_url: `https://www.ttc.ca${item.Url}`,
        scraped_at: new Date().toISOString(),
        is_active: true
      };

      // Upsert maintenance item
      const { data: existing } = await supabase
        .from('planned_maintenance')
        .select('id')
        .eq('maintenance_id', maintenanceItem.maintenance_id)
        .single();

      if (existing) {
        await supabase
          .from('planned_maintenance')
          .update(maintenanceItem)
          .eq('maintenance_id', maintenanceItem.maintenance_id);
        updatedItems++;
      } else {
        await supabase
          .from('planned_maintenance')
          .insert(maintenanceItem);
        newItems++;
      }
    }

    // Mark items not in current TTC response as inactive (only past items)
    // Use PostgreSQL array containment for proper filtering
    if (processedIds.length > 0) {
      // First, deactivate any items whose end_date has passed
      const { error: deactivatePastError } = await supabase
        .from('planned_maintenance')
        .update({ is_active: false })
        .lt('end_date', new Date().toISOString().split('T')[0]);
      
      if (deactivatePastError) {
        console.error('Error deactivating past items:', deactivatePastError);
      }
      
      // Then deactivate items that are no longer listed by TTC but haven't passed yet
      // This handles cancellations - use filter to find IDs not in processedIds
      const { data: activeItems } = await supabase
        .from('planned_maintenance')
        .select('id, maintenance_id')
        .eq('is_active', true);
      
      if (activeItems) {
        const idsToDeactivate = activeItems
          .filter(item => !processedIds.includes(item.maintenance_id))
          .map(item => item.id);
        
        if (idsToDeactivate.length > 0) {
          const { error: deactivateError } = await supabase
            .from('planned_maintenance')
            .update({ is_active: false })
            .in('id', idsToDeactivate);
          
          if (deactivateError) {
            console.error('Error deactivating removed items:', deactivateError);
          }
        }
      }
    }

    console.log(`Scrape complete: ${newItems} new, ${updatedItems} updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newItems, 
        updatedItems,
        total: results.length,
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

/**
 * Generate a stable ID from the URL
 */
function generateMaintenanceId(url: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  // Simple hash - take first 16 chars of hex
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

/**
 * Parse the TTC search result HTML to extract structured data
 * 
 * Example HTML:
 * <a title="..."><div class="sa-title ...">
 *   <span class="field-routename">line 1 (yonge-university)</span>
 *   <span class="sa-dash">–</span>
 *   <span class="field-satitle">Finch to Eglinton stations – Nightly early closures...</span>
 * </div></a>
 * <div class="sa-effective-date ...">
 *   <span class="field-starteffectivedate">January 26, 2026</span>
 *   <span class="effective-date-tolabel">to </span>
 *   <span class="field-endeffectivedate">January 29, 2026</span>
 * </div>
 */
function parseMaintenanceItem(item: any): {
  subwayLine: string;
  affectedStations: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  description: string;
} | null {
  try {
    const html = item.Html || '';
    
    // Extract subway line
    const lineMatch = html.match(/field-routename[^>]*>([^<]+)</i);
    const subwayLine = lineMatch 
      ? formatSubwayLine(lineMatch[1].trim())
      : 'Unknown Line';
    
    // Extract title/description (affected stations and closure type)
    const titleMatch = html.match(/field-satitle[^>]*>([^<]+)</i);
    const description = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract affected stations from the description
    const stationsMatch = description.match(/^([^–—-]+(?:to[^–—-]+)?stations?)/i);
    const affectedStations = stationsMatch 
      ? stationsMatch[1].trim().replace(/stations?$/i, 'stations')
      : description;
    
    // Extract start date - try field-starteffectivedate first, then fall back to sa-effective-date
    let startDateStr = '';
    const startDateMatch = html.match(/field-starteffectivedate[^>]*>([^<]+)</i);
    if (startDateMatch) {
      startDateStr = startDateMatch[1].trim();
    } else {
      // Fall back: extract date from sa-effective-date div (single-day closures)
      // Format: <div class="sa-effective-date...">January 10, 2026<span>
      const effectiveDateMatch = html.match(/sa-effective-date[^>]*>(?:<[^>]*>)*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      if (effectiveDateMatch) {
        startDateStr = effectiveDateMatch[1].trim();
      }
    }
    
    // Extract end date - try field-endeffectivedate first, then use start date
    const endDateMatch = html.match(/field-endeffectivedate[^>]*>([^<]+)</i);
    const endDateStr = endDateMatch ? endDateMatch[1].trim() : startDateStr;
    
    // Parse dates
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);
    
    if (!startDate) {
      console.warn('Could not parse start date from:', startDateStr, 'HTML snippet:', html.substring(0, 500));
      return null;
    }
    
    // Extract start time if mentioned (e.g., "11 p.m.", "11:59 p.m.")
    const timeMatch = description.match(/(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i);
    const startTime = timeMatch ? parseTime(timeMatch[1]) : null;
    
    return {
      subwayLine,
      affectedStations,
      startDate,
      endDate: endDate || startDate,
      startTime,
      description
    };
  } catch (error) {
    console.error('Error parsing maintenance item:', error, item);
    return null;
  }
}

/**
 * Format subway line name consistently
 * "line 1 (yonge-university)" -> "Line 1 (Yonge - University)"
 */
function formatSubwayLine(raw: string): string {
  const lineNum = raw.match(/line\s*(\d)/i)?.[1];
  if (!lineNum) return raw;
  
  const lineNames: Record<string, string> = {
    '1': 'Line 1 (Yonge - University)',
    '2': 'Line 2 (Bloor - Danforth)',
    '3': 'Line 3 (Scarborough)',
    '4': 'Line 4 (Sheppard)'
  };
  
  return lineNames[lineNum] || `Line ${lineNum}`;
}

/**
 * Parse date string like "January 26, 2026" to "2026-01-26"
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Clean up the string
  const cleaned = dateStr.replace(/&nbsp;/g, ' ').trim();
  
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Parse time string like "11 p.m." or "11:59 p.m." to "23:00:00" or "23:59:00"
 */
function parseTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const isPM = match[3].toLowerCase() === 'p';
  
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}
