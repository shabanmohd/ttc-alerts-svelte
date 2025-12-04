<script lang="ts">
  import { Save, Home } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Accordion from '$lib/components/ui/accordion';
  import { toast } from 'svelte-sonner';
  
  // State for preferences
  let selectedModes = $state<Set<string>>(new Set());
  let selectedRoutes = $state<Set<string>>(new Set());
  let selectedAlertTypes = $state<Set<string>>(new Set());
  
  const transportModes = [
    { id: 'subway', icon: '🚇', name: 'Subway', description: 'Lines 1, 2, 4' },
    { id: 'bus', icon: '🚌', name: 'Bus', description: 'All bus routes' },
    { id: 'streetcar', icon: '🚋', name: 'Streetcar', description: 'All streetcar routes' }
  ];
  
  const alertTypes = [
    { id: 'disruption', icon: '🚫', name: 'Service Disruptions', description: 'No service or major outages' },
    { id: 'delay', icon: '⏱️', name: 'Delays', description: 'Service delays and slowdowns' },
    { id: 'detour', icon: '↩️', name: 'Detours', description: 'Route changes and detours' },
    { id: 'planned', icon: '🛠️', name: 'Planned Work', description: 'Scheduled maintenance' }
  ];
  
  function toggleMode(mode: string) {
    selectedModes = new Set(selectedModes);
    if (selectedModes.has(mode)) {
      selectedModes.delete(mode);
    } else {
      selectedModes.add(mode);
    }
  }
  
  function toggleAlertType(type: string) {
    selectedAlertTypes = new Set(selectedAlertTypes);
    if (selectedAlertTypes.has(type)) {
      selectedAlertTypes.delete(type);
    } else {
      selectedAlertTypes.add(type);
    }
  }
  
  async function handleSave() {
    // TODO: Save to Supabase
    toast.success('Preferences saved successfully!');
  }
</script>

<svelte:head>
  <title>Preferences - TTC Alerts</title>
</svelte:head>

<Header />

<main class="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">My Alert Preferences</h1>
    <p class="text-muted-foreground mt-2">
      Set up personalized alerts for your commute.
    </p>
  </div>
  
  <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <!-- Step 1: Transport Modes -->
    <Accordion.Root type="single" value="step-1">
      <Accordion.Item value="step-1">
        <Card.Root>
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold">
                1
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Select Transport Modes</div>
                <div class="text-xs text-muted-foreground hidden sm:block">Choose which TTC services you use</div>
              </div>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <div class="grid grid-cols-1 gap-3 mt-4">
                {#each transportModes as mode}
                  {@const isSelected = selectedModes.has(mode.id)}
                  <button
                    type="button"
                    class="flex items-center gap-3 sm:gap-4 p-4 rounded-lg border-2 transition-all text-left
                           {isSelected 
                             ? 'border-primary bg-primary/5' 
                             : 'border-border hover:border-muted-foreground/50'}"
                    onclick={() => toggleMode(mode.id)}
                  >
                    <div class="text-2xl sm:text-3xl shrink-0">{mode.icon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold">{mode.name}</div>
                      <div class="text-xs sm:text-sm text-muted-foreground">{mode.description}</div>
                    </div>
                    <div class="w-5 h-5 rounded-full border-2 {isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'} flex items-center justify-center shrink-0">
                      {#if isSelected}
                        <svg class="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          </Accordion.Content>
        </Card.Root>
      </Accordion.Item>
    </Accordion.Root>
    
    <!-- Step 2: Alert Types -->
    <Accordion.Root type="single" value="step-2">
      <Accordion.Item value="step-2">
        <Card.Root>
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs sm:text-sm font-semibold">
                2
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Choose Alert Types</div>
                <div class="text-xs text-muted-foreground hidden sm:block">What alerts do you want?</div>
              </div>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <div class="grid grid-cols-1 gap-3 mt-4">
                {#each alertTypes as alertType}
                  {@const isSelected = selectedAlertTypes.has(alertType.id)}
                  <button
                    type="button"
                    class="flex items-center gap-3 sm:gap-4 p-4 rounded-lg border-2 transition-all text-left
                           {isSelected 
                             ? 'border-primary bg-primary/5' 
                             : 'border-border hover:border-muted-foreground/50'}"
                    onclick={() => toggleAlertType(alertType.id)}
                  >
                    <div class="text-2xl sm:text-3xl shrink-0">{alertType.icon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold">{alertType.name}</div>
                      <div class="text-xs sm:text-sm text-muted-foreground">{alertType.description}</div>
                    </div>
                    <div class="w-5 h-5 rounded-full border-2 {isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'} flex items-center justify-center shrink-0">
                      {#if isSelected}
                        <svg class="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          </Accordion.Content>
        </Card.Root>
      </Accordion.Item>
    </Accordion.Root>
    
    <!-- Save Button -->
    <div class="mt-6">
      <Button type="submit" class="w-full" size="lg">
        <Save class="h-5 w-5 mr-2" />
        Save Preferences
      </Button>
    </div>
  </form>
  
  <!-- Return Home -->
  <div class="mt-6 mb-6">
    <Button variant="ghost" class="w-full" href="/">
      <Home class="h-4 w-4 mr-2" />
      Return to Homepage
    </Button>
  </div>
</main>
