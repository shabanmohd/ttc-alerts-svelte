<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    minutes: number;
    size?: 'sm' | 'default' | 'lg';
    showLabel?: boolean;
    class?: string;
  }

  let { 
    minutes, 
    size = 'default',
    showLabel = true,
    class: className = ''
  }: Props = $props();

  /**
   * Get urgency class based on arrival time
   */
  function getUrgencyClass(mins: number): string {
    if (mins <= 2) return 'eta-imminent'; // Red - about to arrive
    if (mins <= 5) return 'eta-soon';     // Amber - coming soon
    return 'eta-normal';                   // Default - plenty of time
  }

  /**
   * Get display text
   */
  function getDisplayText(mins: number): string {
    if (mins === 0) return 'Now';
    if (mins === 1) return '1 min';
    return `${mins} min`;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1 font-medium'
  };
</script>

<span
  class={cn(
    'inline-flex items-center rounded-md font-mono tabular-nums',
    sizeClasses[size],
    getUrgencyClass(minutes),
    className
  )}
  role="timer"
  aria-label={minutes === 0 ? 'Arriving now' : `Arriving in ${minutes} minute${minutes === 1 ? '' : 's'}`}
>
  {getDisplayText(minutes)}
</span>

<style>
  /* ETA urgency colors */
  .eta-imminent {
    background-color: hsl(var(--destructive) / 0.15);
    color: hsl(var(--destructive));
    font-weight: 600;
  }

  .eta-soon {
    background-color: hsl(35 92% 50% / 0.15);
    color: hsl(35 92% 33%);
  }

  :global(.dark) .eta-soon {
    background-color: hsl(35 92% 50% / 0.2);
    color: hsl(35 92% 60%);
  }

  .eta-normal {
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
  }
</style>
