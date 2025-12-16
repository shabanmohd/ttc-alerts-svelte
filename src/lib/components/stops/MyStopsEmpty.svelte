<script lang="ts">
  import { MapPin, Plus } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";

  interface Props {
    onAddStop: () => void;
  }

  let { onAddStop }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-state-icon">
    <MapPin class="h-8 w-8" />
  </div>
  <h3 class="empty-state-title">Add your favourite stops/stations</h3>
  <p class="empty-state-description">
    Use the search bar above to find and save your favourite stops/stations. See
    the live arrival times for buses, streetcars, and subways.
  </p>
  <Button onclick={onAddStop} class="mt-4">
    <Plus class="h-4 w-4 mr-2" />
    Add a Stop
  </Button>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    margin-bottom: 1rem;
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 280px;
    line-height: 1.5;
  }
</style>
