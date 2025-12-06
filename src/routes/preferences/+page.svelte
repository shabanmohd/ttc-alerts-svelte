<script lang="ts">
  import { Save, Home, Check, Plus, Trash2, Search, CheckCircle, XCircle, LogIn, HelpCircle, Bug, Lightbulb, Info, Eye, Type, Zap, CloudSun } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Switch } from '$lib/components/ui/switch';
  import * as Card from '$lib/components/ui/card';
  import * as Accordion from '$lib/components/ui/accordion';
  import { toast } from 'svelte-sonner';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import { HowToUseDialog, SignInDialog, AuthRequiredDialog, CreateAccountDialog } from '$lib/components/dialogs';
  import { isAuthenticated, userName, signOut } from '$lib/stores/auth';
  import { accessibility, type TextScale } from '$lib/stores/accessibility';
  import { StopSearch } from '$lib/components/stops';
  import type { TTCStop } from '$lib/data/stops-db';
  import { 
    routes as userRoutes, 
    modes as userModes, 
    alertTypes as userAlertTypes,
    schedules as userSchedules,
    showWeatherWarnings as userShowWeatherWarnings,
    savePreferences,
    resetPreferences
  } from '$lib/stores/preferences';
  import { onMount } from 'svelte';
  
  // State for dialogs
  let activeDialog = $state<string | null>(null);
  
  // Local editable state (initialized from store)
  let selectedModes = $state<Set<string>>(new Set());
  let selectedRoutes = $state<Set<string>>(new Set());
  let selectedAlertTypes = $state<Set<string>>(new Set());
  let routeSearch = $state('');
  let openAccordion = $state<string>('step-1');
  
  // Stop search state
  let selectedStop = $state<TTCStop | null>(null);
  
  function handleStopSelect(stop: TTCStop) {
    selectedStop = stop;
    // Add all routes from this stop to selected routes
    stop.routes.forEach(route => {
      selectedRoutes = new Set([...selectedRoutes, route]);
    });
    toast.success(`Added ${stop.routes.length} routes from ${stop.name}`);
  }
  
  // Schedule state
  interface Schedule {
    id: number;
    days: Set<string>;
    startTime: string;
    endTime: string;
  }
  let schedules = $state<Schedule[]>([]);
  let nextScheduleId = $state(1);
  
  // Weather warnings toggle
  let showWeatherWarnings = $state(false);
  
  // Initialize from preferences store on mount
  onMount(() => {
    // Initialize from stores
    selectedModes = new Set($userModes);
    selectedRoutes = new Set($userRoutes);
    selectedAlertTypes = new Set($userAlertTypes);
    showWeatherWarnings = $userShowWeatherWarnings;
    
    // Initialize schedules
    if ($userSchedules.length > 0) {
      schedules = $userSchedules.map((s, i) => ({
        id: i + 1,
        days: new Set(s.days),
        startTime: s.startTime,
        endTime: s.endTime
      }));
      nextScheduleId = schedules.length + 1;
    } else {
      // Default schedule
      schedules = [{ id: 1, days: new Set(['mon', 'tue', 'wed', 'thu', 'fri']), startTime: '07:00', endTime: '09:00' }];
      nextScheduleId = 2;
    }
  });
  
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
  
  const days = [
    { id: 'mon', label: 'Mon' },
    { id: 'tue', label: 'Tue' },
    { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' },
    { id: 'fri', label: 'Fri' },
    { id: 'sat', label: 'Sat' },
    { id: 'sun', label: 'Sun' }
  ];
  
  // Sample routes (would come from API)
  const allRoutes = [
    // Subway
    { route: 'Line 1', type: 'subway' },
    { route: 'Line 2', type: 'subway' },
    { route: 'Line 4', type: 'subway' },
    // Bus
    { route: '7 Bathurst', type: 'bus' },
    { route: '29 Dufferin', type: 'bus' },
    { route: '35 Jane', type: 'bus' },
    { route: '52 Lawrence West', type: 'bus' },
    { route: '96 Wilson', type: 'bus' },
    // Limited
    { route: '10 Van Horne', type: 'limited' },
    { route: '99 Arrow Rd', type: 'limited' },
    // Night
    { route: '300 Bloor-Danforth', type: 'night' },
    { route: '320 Yonge', type: 'night' },
    // Express
    { route: '900 Airport Express', type: 'express' },
    { route: '952 Lawrence West Express', type: 'express' },
    // Streetcar
    { route: '501 Queen', type: 'streetcar' },
    { route: '504 King', type: 'streetcar' },
    { route: '510 Spadina', type: 'streetcar' },
    { route: '512 St Clair', type: 'streetcar' }
  ];
  
  const filteredRoutes = $derived(
    routeSearch
      ? allRoutes.filter(r => r.route.toLowerCase().includes(routeSearch.toLowerCase()))
      : allRoutes
  );
  
  function toggleMode(mode: string) {
    selectedModes = new Set(selectedModes);
    if (selectedModes.has(mode)) {
      selectedModes.delete(mode);
    } else {
      selectedModes.add(mode);
    }
  }
  
  function toggleRoute(route: string) {
    selectedRoutes = new Set(selectedRoutes);
    if (selectedRoutes.has(route)) {
      selectedRoutes.delete(route);
    } else {
      selectedRoutes.add(route);
    }
  }
  
  function selectAllRoutes() {
    selectedRoutes = new Set(filteredRoutes.map(r => r.route));
  }
  
  function deselectAllRoutes() {
    selectedRoutes = new Set();
  }
  
  function toggleAlertType(type: string) {
    selectedAlertTypes = new Set(selectedAlertTypes);
    if (selectedAlertTypes.has(type)) {
      selectedAlertTypes.delete(type);
    } else {
      selectedAlertTypes.add(type);
    }
  }
  
  function toggleDay(scheduleId: number, day: string) {
    schedules = schedules.map(s => {
      if (s.id === scheduleId) {
        const newDays = new Set(s.days);
        if (newDays.has(day)) {
          newDays.delete(day);
        } else {
          newDays.add(day);
        }
        return { ...s, days: newDays };
      }
      return s;
    });
  }
  
  function addSchedule() {
    schedules = [...schedules, { 
      id: nextScheduleId, 
      days: new Set(['mon', 'tue', 'wed', 'thu', 'fri']), 
      startTime: '17:00', 
      endTime: '19:00' 
    }];
    nextScheduleId++;
  }
  
  function removeSchedule(id: number) {
    if (schedules.length > 1) {
      schedules = schedules.filter(s => s.id !== id);
    }
  }
  
  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }
  
  function handleSignIn() {
    activeDialog = 'sign-in';
  }
  
  function handleCreateAccount() {
    activeDialog = 'create-account';
  }
  
  async function handleSignOut() {
    await signOut();
  }
  
  async function handleSave() {
    // Check if user is authenticated
    if (!$isAuthenticated) {
      activeDialog = 'auth-required';
      return;
    }
    
    // Convert schedules to the format expected by the store
    const schedulesData = schedules.map(s => ({
      days: Array.from(s.days),
      startTime: s.startTime,
      endTime: s.endTime
    }));
    
    await savePreferences({
      modes: Array.from(selectedModes),
      routes: Array.from(selectedRoutes),
      alertTypes: Array.from(selectedAlertTypes),
      schedules: schedulesData,
      showWeatherWarnings
    });
    
    toast.success('Preferences saved successfully!');
  }
  
  async function handleReset() {
    if (confirm('Are you sure you want to reset all preferences?')) {
      await resetPreferences();
      // Reset local state
      selectedModes = new Set();
      selectedRoutes = new Set();
      selectedAlertTypes = new Set();
      showWeatherWarnings = false;
      schedules = [{ id: 1, days: new Set(['mon', 'tue', 'wed', 'thu', 'fri']), startTime: '07:00', endTime: '09:00' }];
      nextScheduleId = 2;
      toast.success('Preferences reset successfully!');
    }
  }
  
  // Status helpers
  const step1Complete = $derived(selectedModes.size > 0);
  const step2Complete = $derived(selectedRoutes.size > 0);
  const step3Complete = $derived(schedules.length > 0 && schedules.every(s => s.days.size > 0));
  const step4Complete = $derived(selectedAlertTypes.size > 0);
</script>

<svelte:head>
  <title>Preferences - TTC Alerts</title>
</svelte:head>

<Header 
  isAuthenticated={$isAuthenticated}
  username={$userName || ''}
  onOpenDialog={handleOpenDialog}
  onSignIn={handleSignIn}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">My Alert Preferences</h1>
    <p class="text-muted-foreground mt-2 leading-relaxed">
      Set up personalized alerts for your commute. Your preferences are saved to this device.
    </p>
  </div>
  
  <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <!-- Step 1: Transport Modes -->
    <div class="card">
      <Accordion.Root type="single" bind:value={openAccordion}>
        <Accordion.Item value="step-1" class="border-0">
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full {step1Complete ? 'bg-primary' : 'bg-muted'} text-{step1Complete ? 'primary-foreground' : 'muted-foreground'} text-xs sm:text-sm font-semibold">
                {#if step1Complete}
                  <Check class="h-4 w-4" />
                {:else}
                  1
                {/if}
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Select Transport Modes</div>
                <div class="text-xs text-muted-foreground hidden sm:block">Choose which TTC services you use</div>
              </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <span class="badge badge-secondary text-xs">{step1Complete ? `${selectedModes.size} selected` : 'Required'}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <div class="grid grid-cols-1 gap-3 mt-4">
                {#each transportModes as mode}
                  {@const isSelected = selectedModes.has(mode.id)}
                  <button
                    type="button"
                    class="mode-card flex items-center gap-3 sm:gap-4"
                    class:selected={isSelected}
                    data-selected={isSelected}
                    onclick={() => toggleMode(mode.id)}
                    aria-pressed={isSelected}
                    aria-label="{mode.name}: {mode.description}"
                  >
                    <div class="text-2xl sm:text-3xl shrink-0" aria-hidden="true">{mode.icon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold">{mode.name}</div>
                      <div class="text-xs sm:text-sm text-muted-foreground">{mode.description}</div>
                    </div>
                    {#if isSelected}
                      <span class="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: hsl(var(--foreground));" aria-hidden="true">
                        <Check class="h-3 w-3" style="color: hsl(var(--background));" />
                      </span>
                    {:else}
                      <span class="h-5 w-5 rounded-full flex-shrink-0 border-2 border-muted-foreground/30" aria-hidden="true"></span>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
    
    <!-- Step 2: Route Selection -->
    <div class="card">
      <Accordion.Root type="single" bind:value={openAccordion}>
        <Accordion.Item value="step-2" class="border-0">
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full {step2Complete ? 'bg-primary' : 'bg-muted'} text-xs sm:text-sm font-semibold">
                {#if step2Complete}
                  <Check class="h-4 w-4 text-primary-foreground" />
                {:else}
                  <span class="text-muted-foreground">2</span>
                {/if}
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Select Your Routes</div>
                <div class="text-xs text-muted-foreground hidden sm:block">Choose specific routes for alerts</div>
              </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <span class="badge badge-secondary text-xs">{step2Complete ? `${selectedRoutes.size} selected` : 'Required'}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <!-- Search -->
              <div class="mt-4 mb-4">
                <label for="route-search" class="sr-only">Search routes</label>
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input 
                    type="text" 
                    id="route-search"
                    placeholder="Search routes by number or name..." 
                    class="input pl-10 w-full"
                    bind:value={routeSearch}
                  />
                </div>
              </div>
              
              <!-- Select All / Deselect All -->
              <div class="flex gap-2 mb-4">
                <Button variant="outline" size="sm" type="button" class="gap-1" onclick={selectAllRoutes}>
                  <CheckCircle class="h-4 w-4" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" type="button" class="gap-1" onclick={deselectAllRoutes}>
                  <XCircle class="h-4 w-4" />
                  Deselect All
                </Button>
              </div>
              
              <!-- Routes List -->
              <div class="max-h-64 overflow-y-auto p-1">
                <div class="flex flex-wrap gap-3">
                  {#each filteredRoutes as { route }}
                    {@const isSelected = selectedRoutes.has(route)}
                    <button
                      type="button"
                      onclick={() => toggleRoute(route)}
                    >
                      <RouteBadge {route} selectable={true} selected={isSelected} />
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
    
    <!-- Stop Finder (Beta Feature) -->
    <div class="card relative overflow-hidden">
      <div class="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-bl">
        Beta
      </div>
      <div class="px-4 sm:px-6 py-4">
        <div class="flex items-center gap-2 sm:gap-3 mb-4">
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg">
            🚏
          </div>
          <div>
            <div class="font-semibold text-sm sm:text-base">Stop Finder</div>
            <div class="text-xs text-muted-foreground">Search 9,000+ TTC stops</div>
          </div>
        </div>
        <StopSearch 
          onSelect={handleStopSelect}
          placeholder="Search by name or stop ID..." 
        />
        {#if selectedStop}
          <div class="mt-3 p-3 rounded-md bg-muted/50">
            <p class="text-sm font-medium">{selectedStop.name}</p>
            <div class="mt-2 flex flex-wrap gap-1">
              {#each selectedStop.routes as route}
                <RouteBadge {route} size="sm" />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Step 3: Schedule -->
    <div class="card">
      <Accordion.Root type="single" bind:value={openAccordion}>
        <Accordion.Item value="step-3" class="border-0">
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full {step3Complete ? 'bg-primary' : 'bg-muted'} text-xs sm:text-sm font-semibold">
                {#if step3Complete}
                  <Check class="h-4 w-4 text-primary-foreground" />
                {:else}
                  <span class="text-muted-foreground">3</span>
                {/if}
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Set Your Schedule</div>
                <div class="text-xs text-muted-foreground hidden sm:block">When do you want alerts?</div>
              </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <span class="badge badge-secondary text-xs">{step3Complete ? `${schedules.length} schedule${schedules.length > 1 ? 's' : ''}` : 'Required'}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <p class="text-sm text-muted-foreground mt-4 mb-4">
                Add one or more schedules for when you want to receive alerts.
              </p>
              
              <!-- Schedules -->
              {#each schedules as schedule, i (schedule.id)}
                <div class="card mb-4">
                  <div class="p-4">
                    <div class="flex justify-between items-center mb-4">
                      <span class="font-medium">Schedule {i + 1}</span>
                      {#if schedules.length > 1}
                        <Button variant="ghost" size="icon" type="button" class="h-8 w-8" onclick={() => removeSchedule(schedule.id)}>
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      {/if}
                    </div>
                    
                    <!-- Days -->
                    <div class="mb-4">
                      <span class="label mb-2 block text-sm font-medium" id="days-label-{schedule.id}">Days</span>
                      <div class="flex flex-wrap gap-2" role="group" aria-labelledby="days-label-{schedule.id}">
                        {#each days as day}
                          {@const isSelected = schedule.days.has(day.id)}
                          <button
                            type="button"
                            class="mode-card day-card flex items-center gap-2 px-3 py-2"
                            class:selected={isSelected}
                            data-selected={isSelected}
                            onclick={() => toggleDay(schedule.id, day.id)}
                            aria-pressed={isSelected}
                            aria-label={day.label}
                          >
                            {#if isSelected}
                              <span class="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: hsl(var(--foreground));" aria-hidden="true">
                                <Check class="h-3 w-3" style="color: hsl(var(--background));" />
                              </span>
                            {:else}
                              <span class="h-5 w-5 rounded-full flex-shrink-0 border-2 border-muted-foreground/30" aria-hidden="true"></span>
                            {/if}
                            <span class="font-medium text-sm">{day.label}</span>
                          </button>
                        {/each}
                      </div>
                    </div>
                    
                    <!-- Time Range -->
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label for="start-time-{schedule.id}" class="label mb-2 block text-sm font-medium">Start Time</label>
                        <input 
                          id="start-time-{schedule.id}"
                          type="time" 
                          class="input w-full" 
                          bind:value={schedule.startTime}
                        />
                      </div>
                      <div>
                        <label for="end-time-{schedule.id}" class="label mb-2 block text-sm font-medium">End Time</label>
                        <input 
                          id="end-time-{schedule.id}"
                          type="time" 
                          class="input w-full" 
                          bind:value={schedule.endTime}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
              
              <!-- Add Schedule Button -->
              <Button variant="outline" class="w-full gap-2" type="button" onclick={addSchedule}>
                <Plus class="h-4 w-4" />
                Add Another Schedule
              </Button>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
    
    <!-- Step 4: Alert Types -->
    <div class="card">
      <Accordion.Root type="single" bind:value={openAccordion}>
        <Accordion.Item value="step-4" class="border-0">
          <Accordion.Trigger class="w-full px-4 sm:px-6 py-4 hover:no-underline">
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full {step4Complete ? 'bg-primary' : 'bg-muted'} text-xs sm:text-sm font-semibold">
                {#if step4Complete}
                  <Check class="h-4 w-4 text-primary-foreground" />
                {:else}
                  <span class="text-muted-foreground">4</span>
                {/if}
              </div>
              <div class="text-left min-w-0">
                <div class="font-semibold text-sm sm:text-base">Choose Alert Types</div>
                <div class="text-xs text-muted-foreground hidden sm:block">What alerts do you want?</div>
              </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <span class="badge badge-secondary text-xs">{step4Complete ? `${selectedAlertTypes.size} selected` : 'Required'}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="px-4 sm:px-6 pb-4">
              <div class="grid grid-cols-1 gap-3 mt-4">
                {#each alertTypes as alertType}
                  {@const isSelected = selectedAlertTypes.has(alertType.id)}
                  <button
                    type="button"
                    class="mode-card flex items-center gap-3 sm:gap-4"
                    class:selected={isSelected}
                    data-selected={isSelected}
                    onclick={() => toggleAlertType(alertType.id)}
                    aria-pressed={isSelected}
                    aria-label="{alertType.name}: {alertType.description}"
                  >
                    <div class="text-2xl sm:text-3xl shrink-0" aria-hidden="true">{alertType.icon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold">{alertType.name}</div>
                      <div class="text-xs sm:text-sm text-muted-foreground">{alertType.description}</div>
                    </div>
                    <div class="mode-check w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 {isSelected ? '' : 'border-2 border-muted-foreground/30'}" style={isSelected ? 'background-color: hsl(var(--foreground));' : ''} aria-hidden="true">
                      {#if isSelected}
                        <Check class="h-3 w-3" style="color: hsl(var(--background));" />
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
    
    <!-- Save Button -->
    <div class="mt-6">
      <Button type="submit" class="w-full btn-lg gap-2" size="lg">
        <Save class="h-5 w-5" />
        {#if $isAuthenticated}
          Save Preferences
        {:else}
          Save Preferences
        {/if}
      </Button>
      {#if !$isAuthenticated}
        <p class="text-center text-sm text-muted-foreground mt-2">
          An account is required to save preferences
        </p>
      {/if}
    </div>
  </form>
  
  <!-- Auth Section -->
  <div class="mt-6">
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Sync Across Devices</Card.Title>
        <Card.Description>
          {#if $isAuthenticated}
            Your preferences are synced to your account.
          {:else}
            Sign in to access your alerts anywhere.
          {/if}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {#if $isAuthenticated}
          <div class="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span class="text-lg font-semibold text-primary-foreground">
                {($userName || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div class="flex-1">
              <p class="font-medium">{$userName}</p>
              <p class="text-sm text-muted-foreground">Preferences synced</p>
            </div>
          </div>
        {:else}
          <Button class="w-full gap-2" onclick={() => activeDialog = 'sign-in'}>
            <LogIn class="h-4 w-4" />
            Sign In
          </Button>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
  
  <!-- Return Home -->
  <div class="mt-6 mb-6">
    <Button variant="ghost" class="w-full gap-2" href="/">
      <Home class="h-4 w-4" />
      Return to Homepage
    </Button>
  </div>
  
  <!-- Help & Feedback Section (mobile only) -->
  <Card.Root class="mb-6 lg:hidden">
    <Card.Header>
      <Card.Title class="text-base">Help & Feedback</Card.Title>
      <Card.Description>Get help or share your thoughts with us.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-2">
      <Button variant="ghost" class="w-full justify-start gap-3" onclick={() => activeDialog = 'how-to-use'}>
        <HelpCircle class="h-5 w-5 opacity-70" aria-hidden="true" />
        <div class="text-left">
          <div class="font-medium">How to Use</div>
          <div class="text-xs text-muted-foreground">Step-by-step guide</div>
        </div>
      </Button>
      <Button variant="ghost" class="w-full justify-start gap-3">
        <Bug class="h-5 w-5 opacity-70" aria-hidden="true" />
        <div class="text-left">
          <div class="font-medium">Report a Bug</div>
          <div class="text-xs text-muted-foreground">Something not working?</div>
        </div>
      </Button>
      <Button variant="ghost" class="w-full justify-start gap-3">
        <Lightbulb class="h-5 w-5 opacity-70" aria-hidden="true" />
        <div class="text-left">
          <div class="font-medium">Request a Feature</div>
          <div class="text-xs text-muted-foreground">Have an idea?</div>
        </div>
      </Button>
      <Button variant="ghost" class="w-full justify-start gap-3">
        <Info class="h-5 w-5 opacity-70" aria-hidden="true" />
        <div class="text-left">
          <div class="font-medium">About</div>
          <div class="text-xs text-muted-foreground">Version & credits</div>
        </div>
      </Button>
    </Card.Content>
  </Card.Root>
  
  <!-- Accessibility Settings -->
  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title class="text-base flex items-center gap-2">
        <Eye class="h-5 w-5" />
        Accessibility
      </Card.Title>
      <Card.Description>Customize display settings for better readability.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Text Size -->
      <fieldset>
        <legend class="text-sm font-medium mb-3 block">Text Size</legend>
        <div class="flex gap-2" role="radiogroup" aria-label="Text size options">
          {#each [
            { scale: 'normal' as TextScale, label: 'A', size: 'text-sm', name: 'Small' },
            { scale: 'medium' as TextScale, label: 'A', size: 'text-base', name: 'Medium' },
            { scale: 'large' as TextScale, label: 'A', size: 'text-lg', name: 'Large' }
          ] as option}
            {@const isSelected = $accessibility.textScale === option.scale}
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label="{option.name} text size"
              class="flex-1 h-12 px-3 rounded-xl transition-all font-semibold flex items-center justify-between {isSelected ? 'border-2' : 'border border-input hover:bg-accent/50'}"
              style={isSelected ? 'border-color: hsl(var(--foreground));' : ''}
              onclick={() => accessibility.setTextScale(option.scale)}
            >
              <span class={option.size}>{option.label}</span>
              {#if isSelected}
                <span class="h-5 w-5 rounded-full flex items-center justify-center" style="background-color: hsl(var(--foreground));">
                  <Check class="h-3 w-3" style="color: hsl(var(--background));" />
                </span>
              {:else}
                <span class="h-5 w-5 rounded-full border-2 border-muted-foreground/30"></span>
              {/if}
            </button>
          {/each}
        </div>
        <div class="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span>Small</span>
          <span>Medium</span>
          <span>Large</span>
        </div>
      </fieldset>

      <!-- Reduce Motion -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <span id="reduce-motion-label" class="text-sm font-medium flex items-center gap-2">
            <Zap class="h-4 w-4" />
            Reduce Motion
          </span>
          <p id="reduce-motion-desc" class="text-xs text-muted-foreground">Minimize animations and transitions</p>
        </div>
        <Switch
          checked={$accessibility.reduceMotion}
          onCheckedChange={(checked) => accessibility.setReduceMotion(checked)}
          aria-labelledby="reduce-motion-label"
          aria-describedby="reduce-motion-desc"
        />
      </div>

      <!-- Weather Warnings Toggle -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <span id="weather-warnings-label" class="text-sm font-medium flex items-center gap-2">
            <CloudSun class="h-4 w-4" />
            Weather Warnings
          </span>
          <p id="weather-warnings-desc" class="text-xs text-muted-foreground">Show transit-relevant weather alerts on homepage</p>
        </div>
        <Switch
          checked={showWeatherWarnings}
          onCheckedChange={(checked) => showWeatherWarnings = checked}
          aria-labelledby="weather-warnings-label"
          aria-describedby="weather-warnings-desc"
        />
      </div>
    </Card.Content>
  </Card.Root>
  
  <!-- Reset All Preferences -->
  <div class="mb-20 text-center">
    <button 
      type="button" 
      class="text-sm text-muted-foreground hover:text-destructive transition-colors underline-offset-4 hover:underline"
      onclick={handleReset}
    >
      Reset All Preferences
    </button>
  </div>
</main>

<!-- Dialogs -->
<HowToUseDialog 
  open={activeDialog === 'how-to-use'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>

<SignInDialog 
  open={activeDialog === 'sign-in'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }}
/>

<AuthRequiredDialog 
  open={activeDialog === 'auth-required'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }}
  onSignIn={handleSignIn}
  onSignUp={handleCreateAccount}
  title="Account Required to Save"
  description="Create an account to save your preferences and access personalized alerts."
/>

<CreateAccountDialog 
  open={activeDialog === 'create-account'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }}
/>
