<script lang="ts">
  import { OctagonX, Clock, CheckCircle, Calendar, Gauge } from "lucide-svelte";

  type StatusType = "slowzone" | "delay" | "disruption" | "scheduled";

  interface SubwayLine {
    id: string;
    name: string;
    shortName: string;
    color: string;
    textColor: string;
    status: "ok" | "slowzone" | "delay" | "disruption" | "scheduled";
    uniqueTypes: StatusType[];
    alertCount: number;
  }

  let { lines }: { lines: SubwayLine[] } = $props();

  // Helper: get display name for status type
  function getStatusTypeName(type: StatusType): string {
    switch (type) {
      case "slowzone":
        return "Slow Zone";
      case "delay":
        return "Delay";
      case "disruption":
        return "Disruption";
      case "scheduled":
        return "Scheduled";
    }
  }
</script>

<!-- Subway Status Grid - matching production exactly -->
<div class="subway-status-grid" role="region" aria-label="Subway line status">
  {#each lines as line (line.id)}
    <div
      class="subway-status-card"
      class:status-ok={line.status === "ok"}
      class:status-slowzone={line.status === "slowzone"}
      class:status-delay={line.status === "delay"}
      class:status-disruption={line.status === "disruption"}
      class:status-scheduled={line.status === "scheduled"}
      role="status"
      aria-label="{line.name}: {line.status === 'ok'
        ? 'Normal service'
        : `${line.alertCount} issue${line.alertCount > 1 ? 's' : ''}: ${line.uniqueTypes.map((t) => getStatusTypeName(t)).join(', ')}`}"
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
        {#if line.status === "ok"}
          <CheckCircle class="w-4 h-4 status-ok-icon" />
          <span class="status-text status-ok-text">Normal service</span>
        {:else}
          <!-- Show all unique issue types with icons -->
          <div class="multi-status-container">
            {#each line.uniqueTypes as type}
              <div class="status-type-item status-type-{type}">
                {#if type === "disruption"}
                  <OctagonX class="w-4 h-4 status-disruption-icon" />
                  <span class="status-text status-disruption-text"
                    >Disruption</span
                  >
                {:else if type === "delay"}
                  <Clock class="w-4 h-4 status-delay-icon" />
                  <span class="status-text status-delay-text">Delay</span>
                {:else if type === "slowzone"}
                  <Gauge class="w-4 h-4 status-slowzone-icon" />
                  <span class="status-text status-slowzone-text">Slow Zone</span>
                {:else if type === "scheduled"}
                  <Calendar
                    class="w-4 h-4 status-scheduled-icon flex-shrink-0"
                  />
                  <span class="status-text status-scheduled-text"
                    >Scheduled</span
                  >
                {/if}
              </div>
            {/each}
          </div>
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

  /* Slow Zone status - amber/orange to match the filter pill */
  .subway-status-card.status-slowzone {
    border-color: hsl(45 93% 47% / 0.5);
    background-color: hsl(45 93% 95%);
  }

  :global(.dark) .subway-status-card.status-slowzone {
    background-color: hsl(45 93% 50% / 0.2);
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

  :global(.status-slowzone-icon) {
    color: hsl(45 93% 30%) !important;
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

  .status-slowzone-text {
    color: hsl(45 93% 30%);
  }

  .status-disruption-text {
    color: hsl(0 72% 30%);
  }

  /* Scheduled status */
  .subway-status-card.status-scheduled {
    border-color: hsl(213 94% 50% / 0.4);
    background-color: hsl(213 94% 96%);
  }

  :global(.dark) .subway-status-card.status-scheduled {
    background-color: hsl(213 94% 50% / 0.15);
  }

  :global(.status-scheduled-icon) {
    color: hsl(213 94% 35%) !important;
  }

  .status-scheduled-text {
    color: hsl(213 94% 35%);
  }

  :global(.dark .status-scheduled-icon),
  :global(.dark) .status-scheduled-text {
    color: hsl(213 94% 70%) !important;
  }

  /* Multi-status container for compound statuses */
  .multi-status-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .status-type-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .status-type-item :global(svg) {
    flex-shrink: 0;
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

  :global(.dark .status-slowzone-icon),
  :global(.dark) .status-slowzone-text {
    color: hsl(45 93% 60%) !important;
  }

  :global(.dark .status-disruption-icon),
  :global(.dark) .status-disruption-text {
    color: hsl(0 91% 75%) !important;
  }
</style>
