<script lang="ts">
  import { X } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    open: boolean;
    title?: string;
    onClose: () => void;
    children?: import('svelte').Snippet;
  }

  let { 
    open = false,
    title = 'Search',
    onClose,
    children
  }: Props = $props();

  // Lock body scroll when modal is open
  $effect(() => {
    if (!browser) return;
    
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      onClose();
    }
  }

  onMount(() => {
    if (browser) {
      document.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  });
</script>

{#if open}
  <div 
    class="fullscreen-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header -->
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title">{title}</h2>
      <Button
        variant="ghost"
        size="sm"
        class="close-button"
        onclick={onClose}
        aria-label="Close"
      >
        <X class="h-5 w-5" />
      </Button>
    </div>

    <!-- Content -->
    <div class="modal-content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .fullscreen-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    background-color: hsl(var(--background));
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border));
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  :global(.close-button) {
    height: 2rem;
    width: 2rem;
    padding: 0;
  }
</style>
