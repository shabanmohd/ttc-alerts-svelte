<script lang="ts">
  import { Bookmark } from 'lucide-svelte';
  import { savedRoutes, isAtMaxSavedRoutes } from '$lib/stores/savedRoutes';
  import { cn } from '$lib/utils';

  let {
    route,
    name,
    type = 'bus',
    size = 'md',
    class: className = '',
    showLabel = false
  }: {
    route: string;
    name: string;
    type?: 'bus' | 'streetcar' | 'subway';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    showLabel?: boolean;
  } = $props();

  // Track saved state reactively
  let isSaved = $derived(savedRoutes.isSaved(route));
  let atMax = $state(false);

  // Subscribe to max state
  $effect(() => {
    const unsubscribe = isAtMaxSavedRoutes.subscribe(value => {
      atMax = value;
    });
    return unsubscribe;
  });

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    
    savedRoutes.toggle({ id: route, name, type });
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={!isSaved && atMax}
  class={cn(
    'inline-flex items-center gap-1.5 rounded-md transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    isSaved 
      ? 'text-amber-500 hover:text-amber-600' 
      : 'text-muted-foreground hover:text-foreground',
    !isSaved && atMax && 'opacity-50 cursor-not-allowed',
    sizeClasses[size],
    className
  )}
  aria-label={isSaved ? `Remove route ${route} from saved routes` : `Add route ${route} to saved routes`}
  title={!isSaved && atMax ? 'Maximum 20 saved routes reached' : isSaved ? 'Remove from saved routes' : 'Save route'}
>
  {#if isSaved}
    <Bookmark size={iconSizes[size]} class="fill-current" />
  {:else}
    <Bookmark size={iconSizes[size]} />
  {/if}
  
  {#if showLabel}
    <span class="text-sm">
      {isSaved ? 'Saved' : 'Save'}
    </span>
  {/if}
</button>
