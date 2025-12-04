<script lang="ts">
  import { Bookmark, BookmarkCheck } from 'lucide-svelte';
  import { bookmarks, isAtMaxBookmarks, type BookmarkedStop } from '$lib/stores/bookmarks';
  import type { TTCStop } from '$lib/data/stops-db';
  import { cn } from '$lib/utils';

  let {
    stop,
    size = 'md',
    class: className = '',
    showLabel = false
  }: {
    stop: TTCStop | BookmarkedStop;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    showLabel?: boolean;
  } = $props();

  // Track bookmarked state reactively
  let isBookmarked = $derived(bookmarks.isBookmarked(stop.id));
  let atMax = $state(false);

  // Subscribe to max state
  $effect(() => {
    const unsubscribe = isAtMaxBookmarks.subscribe(value => {
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
    
    if (isBookmarked) {
      bookmarks.remove(stop.id);
    } else if (!atMax) {
      bookmarks.add(stop);
    }
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={!isBookmarked && atMax}
  class={cn(
    'inline-flex items-center gap-1.5 rounded-md transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    isBookmarked 
      ? 'text-amber-500 hover:text-amber-600' 
      : 'text-muted-foreground hover:text-foreground',
    !isBookmarked && atMax && 'opacity-50 cursor-not-allowed',
    sizeClasses[size],
    className
  )}
  aria-label={isBookmarked ? `Remove ${stop.name} from bookmarks` : `Add ${stop.name} to bookmarks`}
  title={!isBookmarked && atMax ? 'Maximum 10 bookmarks reached' : isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
>
  {#if isBookmarked}
    <BookmarkCheck size={iconSizes[size]} class="fill-current" />
  {:else}
    <Bookmark size={iconSizes[size]} />
  {/if}
  
  {#if showLabel}
    <span class="text-sm">
      {isBookmarked ? 'Saved' : 'Save'}
    </span>
  {/if}
</button>
