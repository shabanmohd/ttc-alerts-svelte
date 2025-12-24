/**
 * Service to fetch TTC route changes from ttc.ca
 *
 * The TTC website uses Sitecore SXA search API to display service changes.
 * This service fetches and parses those results into a structured format.
 */

export interface RouteChange {
  id: string;
  routes: string[];
  routeName: string;
  title: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  startDateLabel: string | null;
}

interface TTCSearchResult {
  Id: string;
  Url: string;
  Html: string;
}

interface TTCSearchResponse {
  Count: number;
  Results: TTCSearchResult[];
}

const TTC_SEARCH_API =
  "https://www.ttc.ca/sxa/search/results/?v={23DC07D4-6BAC-4B98-A9CC-07606C5B1322}&s={F79E7245-3705-4E03-827E-02569508B481}&l=&p=50&sig=&itemid={B3DD22A4-3F53-4470-A87A-37A77976B07F}";

/**
 * Parse the HTML snippet from TTC API to extract route change info
 */
function parseRouteChangeHtml(html: string): {
  routes: string[];
  routeName: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  startDateLabel: string | null;
} {
  // Extract routes - can be pipe-separated like "501|301|503"
  const routeMatch = html.match(
    /<span class="field-route">([^<]+)<\/span>/
  );
  const routesStr = routeMatch ? routeMatch[1] : "";
  const routes = routesStr.split("|").filter(Boolean);

  // Extract route name
  const routeNameMatch = html.match(
    /<span class="field-routename">([^<]+)<\/span>/
  );
  const routeName = routeNameMatch ? routeNameMatch[1] : "";

  // Extract title
  const titleMatch = html.match(/<span class="field-satitle">([^<]+)<\/span>/);
  const title = titleMatch ? titleMatch[1] : "";

  // Extract start date label (e.g., "starting as early as")
  const startLabelMatch = html.match(
    /<span class="ed-start-label field-value">([^<]+)<span>/
  );
  const startDateLabel = startLabelMatch ? startLabelMatch[1].trim() : null;

  // Extract start date with time
  const startDateMatch = html.match(
    /<span class="ed-start-date field-starteffectivedate">([^<]+)<span/
  );
  let startDate: string | null = null;
  let startTime: string | null = null;

  if (startDateMatch) {
    const startStr = startDateMatch[1].trim();
    const dateTimeParts = parseDateTime(startStr);
    startDate = dateTimeParts.date;
    startTime = dateTimeParts.time;
  } else {
    // Try to find date without the specific class (fallback)
    const fallbackDateMatch = html.match(
      /<span class="sa-start-date-label-wrapper"><\/span>([^<]+)<span/
    );
    if (fallbackDateMatch) {
      const dateTimeParts = parseDateTime(fallbackDateMatch[1].trim());
      startDate = dateTimeParts.date;
      startTime = dateTimeParts.time;
    }
  }

  // Extract end date with time
  const endDateMatch = html.match(
    /<span class="field-endeffectivedate">([^<]+)<\/span>/
  );
  let endDate: string | null = null;
  let endTime: string | null = null;

  if (endDateMatch) {
    const endStr = endDateMatch[1].trim();
    const dateTimeParts = parseDateTime(endStr);
    endDate = dateTimeParts.date;
    endTime = dateTimeParts.time;
  }

  return {
    routes,
    routeName,
    title,
    startDate,
    endDate,
    startTime,
    endTime,
    startDateLabel,
  };
}

/**
 * Parse date/time string like "December 31, 2025 - 11:30 PM" or "November 22, 2025"
 */
function parseDateTime(dateTimeStr: string): {
  date: string | null;
  time: string | null;
} {
  if (!dateTimeStr) return { date: null, time: null };

  // Check if there's a time component (contains " - ")
  const parts = dateTimeStr.split(" - ");
  const dateStr = parts[0].trim();
  const timeStr = parts.length > 1 ? parts[1].trim() : null;

  return {
    date: dateStr || null,
    time: timeStr || null,
  };
}

/**
 * Fetch route changes from TTC website
 */
export async function fetchRouteChanges(): Promise<RouteChange[]> {
  try {
    const response = await fetch(TTC_SEARCH_API);

    if (!response.ok) {
      console.error("Failed to fetch route changes:", response.status);
      return [];
    }

    const data: TTCSearchResponse = await response.json();

    return data.Results.map((result) => {
      const parsed = parseRouteChangeHtml(result.Html);
      return {
        id: result.Id,
        url: `https://www.ttc.ca${result.Url}`,
        ...parsed,
      };
    });
  } catch (error) {
    console.error("Error fetching route changes:", error);
    return [];
  }
}

/**
 * Check if a route change is currently active or upcoming
 */
export function isRouteChangeActive(change: RouteChange): boolean {
  const now = new Date();

  // If there's an end date, check if we've passed it
  if (change.endDate) {
    const endDate = new Date(change.endDate);
    if (endDate < now) {
      return false;
    }
  }

  return true;
}
