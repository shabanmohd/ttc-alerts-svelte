import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TTC Sitecore search API
const TTC_SEARCH_URL = 'https://www.ttc.ca/sxa/search/results/';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build search params
    const searchParams = new URLSearchParams({
      s: JSON.stringify({
        'WidgetDataSourceItem': '{4C10CAAD-F913-42BC-A433-75AD42DC0D6A}',
        'SearchContext': 'Web',
        'ItemID': '{4C10CAAD-F913-42BC-A433-75AD42DC0D6A}',
        'SearchOperation': 'search',
        'SearchResultsSignature': '1d55c3e92a41e2c1e5bef4b3e4b1ab3c',
        'ItemLanguage': 'en',
        'EnablePaging': true,
        'PageSize': 50,
        'PageIndex': 0,
        'SortOrder': 'start-date-desc'
      }),
      itemid: '{4C10CAAD-F913-42BC-A433-75AD42DC0D6A}',
      sig: '1d55c3e92a41e2c1e5bef4b3e4b1ab3c',
      site: 'ttc',
      v: '{EC8EFD7D-3163-47E0-BE56-C95B0D41F089}'
    });

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
    
    let newItems = 0;
    let updatedItems = 0;

    for (const item of results) {
      const maintenanceItem = {
        ttc_id: item.Id || item.ItemId,
        title: item.Title || item.Name,
        description: item.Description || item.Summary,
        affected_routes: extractRoutesFromMaintenance(item),
        start_date: item.StartDate ? new Date(item.StartDate).toISOString() : null,
        end_date: item.EndDate ? new Date(item.EndDate).toISOString() : null,
        location: item.Location || null,
        url: item.Url ? `https://www.ttc.ca${item.Url}` : null,
        is_active: isMaintenanceActive(item)
      };

      // Upsert maintenance item
      const { data: existing } = await supabase
        .from('planned_maintenance')
        .select('id, updated_at')
        .eq('ttc_id', maintenanceItem.ttc_id)
        .single();

      if (existing) {
        await supabase
          .from('planned_maintenance')
          .update({
            ...maintenanceItem,
            updated_at: new Date().toISOString()
          })
          .eq('ttc_id', maintenanceItem.ttc_id);
        updatedItems++;
      } else {
        await supabase
          .from('planned_maintenance')
          .insert(maintenanceItem);
        newItems++;
      }
    }

    // Mark old items as inactive
    const ttcIds = results.map((r: any) => r.Id || r.ItemId).filter(Boolean);
    if (ttcIds.length > 0) {
      await supabase
        .from('planned_maintenance')
        .update({ is_active: false })
        .not('ttc_id', 'in', `(${ttcIds.map((id: string) => `'${id}'`).join(',')})`);
    }

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

function extractRoutesFromMaintenance(item: any): string[] {
  const routes: string[] = [];
  const text = `${item.Title || ''} ${item.Description || ''}`;
  
  // Match Line patterns
  const lineMatch = text.match(/Line\s*(\d)/gi);
  if (lineMatch) {
    lineMatch.forEach((m: string) => {
      const num = m.match(/\d/)?.[0];
      if (num) routes.push(`Line ${num}`);
    });
  }
  
  // Match route numbers
  const routeMatch = text.match(/\b(\d{1,3})\s*(bus|streetcar)?/gi);
  if (routeMatch) {
    routeMatch.forEach((m: string) => {
      const num = m.match(/\d+/)?.[0];
      if (num && parseInt(num) < 600) routes.push(num);
    });
  }
  
  return [...new Set(routes)];
}

function isMaintenanceActive(item: any): boolean {
  const now = new Date();
  const startDate = item.StartDate ? new Date(item.StartDate) : null;
  const endDate = item.EndDate ? new Date(item.EndDate) : null;
  
  if (endDate && endDate < now) return false;
  if (startDate && startDate > now) return true; // Future maintenance is still "active" for display
  return true;
}
