<script lang="ts">
  import { Accessibility } from "lucide-svelte";
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
  Accessibility Badge - displays the international accessibility symbol
  Uses blue/white color scheme per WCAG guidelines
  HSL: 217 91% 60% for accessibility blue
-->
<span
  class={cn(
    "accessibility-badge",
    size === "sm" && "accessibility-badge-sm",
    size === "lg" && "accessibility-badge-lg",
    className
  )}
  role="img"
  aria-label="Accessibility alert"
>
  <Accessibility class="accessibility-icon" aria-hidden="true" />
</span>

<style>
  .accessibility-badge {
    /* Blue background with white icon - WCAG compliant */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(217 91% 50%);
    color: white;
    border-radius: 0.5rem;
    padding: 0.625rem;
    font-weight: 700;
    line-height: 1;
    min-width: 3.25rem;
    height: 3.25rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .accessibility-badge-sm {
    padding: 0.25rem;
    min-width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.25rem;
  }

  .accessibility-badge-lg {
    padding: 0.75rem;
    min-width: 4rem;
    height: 4rem;
    border-radius: 0.625rem;
  }

  .accessibility-badge :global(.accessibility-icon) {
    width: 2rem;
    height: 2rem;
  }

  .accessibility-badge-sm :global(.accessibility-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .accessibility-badge-lg :global(.accessibility-icon) {
    width: 2.5rem;
    height: 2.5rem;
  }

  /* Dark mode adjustment for better contrast */
  :global(.dark) .accessibility-badge {
    background-color: hsl(217 91% 55%);
  }
</style>
