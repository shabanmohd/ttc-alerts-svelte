<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Filter, RefreshCw, Star, Smartphone } from 'lucide-svelte';
  
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  
  let { open = $bindable(false), onOpenChange }: Props = $props();
  
  const steps = [
    {
      icon: Filter,
      title: 'Filter Alerts',
      description: 'Use the filter chips to show only the alert types you care about.'
    },
    {
      icon: Star,
      title: 'Set Preferences',
      description: 'Go to Preferences to select your routes and get personalized alerts.'
    },
    {
      icon: RefreshCw,
      title: 'Stay Updated',
      description: 'Tap the refresh button when it pulses to see new alerts.'
    },
    {
      icon: Smartphone,
      title: 'Install the App',
      description: 'Add to your home screen for quick access and offline support.'
    }
  ];
</script>

<Dialog.Root bind:open onOpenChange={(v) => onOpenChange?.(v)}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="text-xl">How to Use TTC Alerts</Dialog.Title>
      <Dialog.Description>
        Get the most out of your transit alert experience
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="space-y-4 py-4">
      {#each steps as step, i}
        <div class="flex gap-4 items-start">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <step.icon class="h-5 w-5" />
          </div>
          <div>
            <h3 class="font-semibold">{step.title}</h3>
            <p class="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
      {/each}
    </div>
    
    <Dialog.Footer>
      <Button onclick={() => open = false} class="w-full">Got it!</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
