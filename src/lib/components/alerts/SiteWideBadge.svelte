<script lang="ts">
  import { Info } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let {
    size = "default",
    class: className = "",
  }: {
    size?: "sm" | "default" | "lg";
    class?: string;
  } = $props();
</script>

<!-- 
  SiteWide Badge - displays an info icon for general facility/station alerts
  Uses a neutral color scheme (gray/slate) to differentiate from accessibility alerts
-->
<span
  class={cn(
    "sitewide-badge",
    size === "sm" && "sitewide-badge-sm",
    size === "lg" && "sitewide-badge-lg",
    className
  )}
  role="img"
  aria-label="Station facility alert"
>
  <Info class="sitewide-icon" aria-hidden="true" />
</span>

<style>
  .sitewide-badge {
    /* Slate/gray background - neutral info style */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(215 16% 47%);
    color: white;
    border-radius: 0.5rem;
    padding: 0.625rem;
    font-weight: 700;
    line-height: 1;
    min-width: 3.25rem;
    height: 3.25rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .sitewide-badge-sm {
    padding: 0.25rem;
    min-width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
  }

  .sitewide-badge-lg {
    padding: 0.875rem;
    min-width: 4rem;
    height: 4rem;
    border-radius: 0.625rem;
  }

  :global(.sitewide-badge .sitewide-icon) {
    width: 1.75rem;
    height: 1.75rem;
  }

  :global(.sitewide-badge-sm .sitewide-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.sitewide-badge-lg .sitewide-icon) {
    width: 2.25rem;
    height: 2.25rem;
  }

  /* Dark mode adjustments */
  :global(.dark) .sitewide-badge {
    background-color: hsl(215 20% 35%);
  }
</style>
