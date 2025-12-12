<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { cn } from "$lib/utils";
  import { _ } from "svelte-i18n";

  let {
    category,
    class: className = "",
  }: { category: string; class?: string } = $props();

  /**
   * Get the appropriate CSS class for the status badge based on alert category.
   * Colors are WCAG 2.2 AA compliant with minimum 4.5:1 contrast ratio.
   */
  function getStatusClass(category: string): string {
    const cat = category.toUpperCase();

    switch (cat) {
      case "SERVICE_RESUMED":
        return "status-badge-resumed";
      case "SERVICE_DISRUPTION":
        return "status-badge-disruption";
      case "DELAY":
        return "status-badge-delay";
      case "DETOUR":
        return "status-badge-detour";
      case "PLANNED_SERVICE_DISRUPTION":
      case "PLANNED":
        return "status-badge-planned";
      case "SCHEDULED_CLOSURE":
        return "status-badge-scheduled";
      case "BUS":
        return "bg-secondary text-secondary-foreground";
      case "STREETCAR":
        return "bg-[#dc241f] text-white";
      case "SUBWAY":
        return "bg-[#ffcc00] text-black";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  }

  /**
   * Get the i18n key for the category
   */
  function getCategoryKey(category: string): string {
    const cat = category.toUpperCase();

    const categoryKeyMap: Record<string, string> = {
      SERVICE_RESUMED: "status.serviceResumed",
      SERVICE_DISRUPTION: "status.disruption",
      DELAY: "status.delay",
      DETOUR: "status.detour",
      PLANNED_SERVICE_DISRUPTION: "status.planned",
      PLANNED: "status.planned",
      SCHEDULED_CLOSURE: "status.scheduledClosure",
      ACCESSIBILITY: "status.accessibility",
      BUS: "routes.bus",
      STREETCAR: "routes.streetcar",
      SUBWAY: "routes.subway",
      OTHER: "common.other",
    };

    return categoryKeyMap[cat] ?? "";
  }

  /**
   * Format the category string for display in the badge.
   */
  function formatCategory(category: string): string {
    const key = getCategoryKey(category);
    if (key) {
      return $_?.(key) ?? category;
    }

    return category
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
</script>

<span
  class={cn("status-badge", getStatusClass(category), className)}
  role="status"
  aria-label={`Status: ${formatCategory(category)}`}
>
  {formatCategory(category)}
</span>
