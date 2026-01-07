const TTC_LIVE_API = 'https://alerts.ttc.ca/api/alerts/live-alerts';

export const GET = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
  try {
    const response = await fetch(TTC_LIVE_API, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch TTC alerts' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    // TTC API structure: each route item IS an alert (flat structure)
    // routes[].{id, headerText, effect, ...} - NOT routes[].alerts[]
    const alerts = data.routes?.map((alert: any) => ({
      alert_id: `ttc-live-${alert.id}`,
      source: 'ttc-api-live',
      header_text: alert.headerText || alert.title || '',
      description_text: alert.description || null,
      effect: alert.effect || null,
      categories: categorizeAlert(alert),
      affected_routes: alert.route ? [alert.route] : [],
      alert_type: alert.alertType || null,
      cause: alert.cause || null,
      cause_description: alert.causeDescription || null,
      alert_created_at: alert.activePeriod?.start || new Date().toISOString(),
      is_resolved: false,
      raw_data: alert,
    })) ?? [];

    return new Response(JSON.stringify({ alerts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching TTC alerts:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Categorize alert based on effect and content
function categorizeAlert(alert: any): string[] {
  const categories: string[] = [];
  const headerLower = (alert.headerText || '').toLowerCase();
  const effect = alert.effect || '';
  
  // Service resumed
  if (headerLower.includes('resumed') || headerLower.includes('restored') || headerLower.includes('back to normal')) {
    categories.push('SERVICE_RESUMED');
  }
  
  // Effect-based categories
  switch (effect) {
    case 'NO_SERVICE':
      categories.push('SERVICE_DISRUPTION');
      break;
    case 'DETOUR':
      categories.push('DIVERSION');
      break;
    case 'SIGNIFICANT_DELAYS':
      categories.push('DELAY');
      break;
    case 'REDUCED_SERVICE':
      categories.push('REDUCED_SERVICE');
      break;
  }
  
  // Accessibility
  if (headerLower.includes('elevator') || headerLower.includes('escalator')) {
    categories.push('ACCESSIBILITY');
  }
  
  return categories.length > 0 ? categories : ['OTHER'];
}
