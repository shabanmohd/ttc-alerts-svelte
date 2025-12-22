<script lang="ts">
  import { AlertCircle, CheckCircle } from "lucide-svelte";

  interface SubwayLine {
    id: string;
    name: string;
    shortName: string;
    color: string;
    textColor: string;
    status: "normal" | "delayed" | "disrupted";
  }

  let { lines }: { lines: SubwayLine[] } = $props();
</script>

<!-- Subway Status Grid - matching production exactly -->
<div class="subway-status-grid" role="region" aria-label="Subway line status">
  {#each lines as line (line.id)}
    <div
      class="subway-status-card"
      class:status-ok={line.status === "normal"}
      class:status-delay={line.status === "delayed"}
      class:status-disruption={line.status === "disrupted"}
      role="status"
      aria-label="{line.name}: {line.status === 'normal'
        ? 'Normal service'
        : line.status}"
    >
      <div class="subway-status-header">
        <span
          class="subway-line-badge"
          style="background-color: {line.color}; color: {line.textColor}"
        >
          {line.shortName}
        </span>
        <span class="subway-line-name">{line.name}</span>
      </div>
      <div class="subway-status-indicator">
        {#if line.status === "normal"}
          <CheckCircle class="w-4 h-4 status-ok-icon" />
          <span class="status-text status-ok-text">Normal service</span>
        {:else if line.status === "delayed"}
          <AlertCircle class="w-4 h-4 status-delay-icon" />
          <span class="status-text status-delay-text">Delay</span>
        {:else}
          <AlertCircle class="w-4 h-4 status-disruption-icon" />
          <span class="status-text status-disruption-text">Disrupted</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  /* Subway Status Grid - exact copy from production */
  .subway-status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  @media (min-width: 640px) {
    .subway-status-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .subway-status-card {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem;
    border-radius: var(--radius);
    background-color: hsl(var(--card));
    border: 2px solid hsl(var(--border));
    text-align: left;
  }

  .subway-status-card.status-ok {
    border-color: hsl(142.1 76.2% 36.3% / 0.3);
    background-color: hsl(142.1 76.2% 36.3% / 0.05);
  }

  .subway-status-card.status-delay {
    border-color: hsl(38 80% 50% / 0.4);
    background-color: hsl(38 80% 94%);
  }

  .subway-status-card.status-disruption {
    border-color: hsl(0 70% 50% / 0.4);
    background-color: hsl(0 70% 96%);
  }

  :global(.dark) .subway-status-card.status-ok {
    background-color: hsl(142.1 76.2% 36.3% / 0.1);
  }

  :global(.dark) .subway-status-card.status-delay {
    background-color: hsl(38 92% 50% / 0.25);
  }

  :global(.dark) .subway-status-card.status-disruption {
    background-color: hsl(0 63% 31% / 0.25);
  }

  .subway-status-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .subway-line-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .subway-line-name {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .subway-status-indicator {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .subway-status-indicator :global(svg) {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .status-text {
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  /* Status icon colors */
  :global(.status-ok-icon) {
    color: hsl(142.1 71.8% 29.2%) !important;
  }

  :global(.status-delay-icon) {
    color: hsl(28 90% 25%) !important;
  }

  :global(.status-disruption-icon) {
    color: hsl(0 72% 30%) !important;
  }

  /* Status text colors */
  .status-ok-text {
    color: hsl(142.1 71.8% 29.2%);
  }

  .status-delay-text {
    color: hsl(28 90% 25%);
  }

  .status-disruption-text {
    color: hsl(0 72% 30%);
  }

  /* Dark mode */
  :global(.dark .status-ok-icon) {
    color: hsl(142.1 70.6% 45.3%) !important;
  }

  :global(.dark) .status-ok-text {
    color: hsl(142.1 70.6% 45.3%);
  }

  :global(.dark .status-delay-icon),
  :global(.dark) .status-delay-text {
    color: hsl(43 96% 70%) !important;
  }

  :global(.dark .status-disruption-icon),
  :global(.dark) .status-disruption-text {
    color: hsl(0 91% 75%) !important;
  }
</style>
