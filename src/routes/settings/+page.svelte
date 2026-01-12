<script lang="ts">
  import { _ } from "svelte-i18n";
  import {
    MapPin,
    Route,
    Settings,
    Trash2,
    Globe,
    Palette,
    HelpCircle,
    Flag,
    Lightbulb,
    Info,
    Home,
    Check,
    X,
    SlidersHorizontal,
    CirclePause,
    MapPinned,
    ExternalLink,
    Database,
    ChevronLeft,
  } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { toast } from "svelte-sonner";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import RouteSearch from "$lib/components/alerts/RouteSearch.svelte";
  import {
    HowToUseDialog,
    ReportIssueDialog,
    FeatureRequestDialog,
  } from "$lib/components/dialogs";
  import { StopSearch } from "$lib/components/stops";
  import type { TTCStop } from "$lib/data/stops-db";
  import { savedStops, type SavedStop } from "$lib/stores/savedStops";
  import { savedRoutes, type SavedRoute } from "$lib/stores/savedRoutes";
  import SEO from "$lib/components/SEO.svelte";
  import {
    localPreferences,
    type UserPreferences,
  } from "$lib/stores/localPreferences";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  // Dialog state
  let activeDialog = $state<string | null>(null);

  // Confirmation dialog state
  let confirmDeleteStop = $state<{ id: string; name: string } | null>(null);
  let confirmDeleteRoute = $state<{ id: string; name: string } | null>(null);
  let showClearAllDialog = $state(false);

  // Location permission state
  let locationPermission = $state<
    "granted" | "denied" | "prompt" | "unsupported"
  >("prompt");
  let isCheckingLocation = $state(false);

  // Derived checked state for the switch - ensures it's always read-only
  let locationSwitchChecked = $derived(locationPermission === "granted");

  // Check location permission status
  async function checkLocationPermission() {
    if (!browser) return;

    if (!("geolocation" in navigator)) {
      locationPermission = "unsupported";
      return;
    }

    try {
      // Use Permissions API if available
      if ("permissions" in navigator) {
        const result = await navigator.permissions.query({
          name: "geolocation",
        });
        locationPermission = result.state as "granted" | "denied" | "prompt";

        // Listen for permission changes
        result.onchange = () => {
          locationPermission = result.state as "granted" | "denied" | "prompt";
        };
      }
    } catch (error) {
      console.error("Error checking location permission:", error);
    }
  }

  // Request location permission
  async function handleLocationToggle(checked: boolean) {
    // Always revert to actual state first - prevent optimistic UI update
    const currentState = locationPermission === "granted";

    if (!browser || !("geolocation" in navigator)) {
      toast.error($_("toasts.locationNotSupported"));
      return;
    }

    // If already in desired state, show info message
    if (checked === currentState) {
      if (checked) {
        toast.info($_("toasts.locationChangeInBrowser"), {
          description: $_("toasts.locationChangeInBrowserDesc"),
          duration: 5000,
        });
      }
      return;
    }

    // If trying to turn off when granted
    if (!checked && locationPermission === "granted") {
      toast.info($_("toasts.locationDisableInBrowser"), {
        description: $_("toasts.locationDisableInBrowserDesc"),
        duration: 5000,
      });
      return;
    }

    // If permission was denied
    if (locationPermission === "denied") {
      toast.info($_("toasts.locationBlocked"), {
        description: $_("toasts.locationBlockedDesc"),
        duration: 5000,
      });
      return;
    }

    // Only proceed if trying to enable and permission is "prompt"
    if (!checked || locationPermission !== "prompt") {
      return;
    }

    // Request permission by trying to get location
    isCheckingLocation = true;
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      locationPermission = "granted";
      toast.success($_("toasts.locationEnabled"));
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === geoError.PERMISSION_DENIED) {
        locationPermission = "denied";
        toast.error($_("toasts.locationDenied"));
      } else {
        toast.error($_("toasts.locationFailed"));
      }
    } finally {
      isCheckingLocation = false;
    }
  }

  // Initialize stores on mount
  onMount(async () => {
    if (browser) {
      await savedStops.init();
      await savedRoutes.init();
      await localPreferences.init();
      await checkLocationPermission();
    }
  });

  // Handle stop selection from search
  async function handleStopSelect(stop: TTCStop) {
    const success = await savedStops.add({
      id: stop.id,
      name: stop.name,
      routes: stop.routes,
    });

    if (success) {
      toast.success($_("toasts.stopAdded"), { description: stop.name });
    } else if (savedStops.isAtMax) {
      toast.error($_("toasts.maxStopsReached"));
    } else {
      toast.info($_("toasts.stopAlreadySaved"));
    }
  }

  // Handle stop removal with confirmation
  function promptRemoveStop(stopId: string, stopName: string) {
    confirmDeleteStop = { id: stopId, name: stopName };
  }

  async function confirmRemoveStop() {
    if (!confirmDeleteStop) return;
    const success = await savedStops.remove(confirmDeleteStop.id);
    if (success) {
      toast.success($_("toasts.stopRemoved"));
    }
    confirmDeleteStop = null;
  }

  // Handle route removal with confirmation
  function promptRemoveRoute(routeId: string, routeName: string) {
    confirmDeleteRoute = { id: routeId, name: routeName };
  }

  async function confirmRemoveRoute() {
    if (!confirmDeleteRoute) return;
    const success = await savedRoutes.remove(confirmDeleteRoute.id);
    if (success) {
      toast.success($_("toasts.routeRemoved"));
    }
    confirmDeleteRoute = null;
  }

  // Preference handlers
  async function handleLanguageChange(lang: "en" | "fr") {
    await localPreferences.updatePreference("language", lang);
    toast.success(
      lang === "en" ? "Language set to English" : "Langue définie sur Français"
    );
  }

  async function handleThemeChange(theme: "light" | "dark" | "system") {
    await localPreferences.updatePreference("theme", theme);
  }

  async function handleReduceMotionChange() {
    const current = $localPreferences.reduceMotion;
    await localPreferences.updatePreference("reduceMotion", !current);
  }

  // Clear all data
  function handleClearAllData() {
    showClearAllDialog = true;
  }

  async function confirmClearAllData() {
    await savedStops.clear();
    await savedRoutes.clear();
    await localPreferences.reset();
    showClearAllDialog = false;
    toast.success($_("toasts.allDataCleared"));
  }
</script>

<SEO
  title={$_("pages.settings.title")}
  description="Customize your rideTO experience - manage saved stops and routes, change language, theme settings, and clear app data."
  noindex={true}
/>

<Header />

<main class="content-area pb-24">
  <!-- Page Header -->
  <div class="mb-6 animate-fade-in-up" style="animation-delay: 0ms">
    <Button
      variant="ghost"
      onclick={() => history.back()}
      class="mb-4 -ml-2 gap-1 text-muted-foreground"
    >
      <ChevronLeft class="h-4 w-4" />
      {$_("common.back")}
    </Button>
    <h1
      class="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"
    >
      <Settings class="h-7 w-7" />
      {$_("settings.title")}
    </h1>
    <p class="text-muted-foreground mt-2">
      {$_("settings.description")}
    </p>
  </div>

  <!-- ==================== SAVED STOPS ==================== -->
  <Card.Root
    class="mb-6 animate-fade-in-up overflow-visible relative z-20"
    style="animation-delay: 50ms"
  >
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <MapPin class="h-5 w-5 text-primary" />
        {$_("settings.savedStops")}
      </Card.Title>
      <Card.Description>
        {$_("settings.savedStopsDesc")}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 overflow-visible">
      <!-- Search to add stops -->
      <div class="relative z-50">
        <p class="text-sm text-muted-foreground mb-2">
          {$_("settings.addStop")}
        </p>
        <StopSearch
          onSelect={handleStopSelect}
          placeholder={$_("search.placeholderStop")}
        />
      </div>

      <!-- Saved stops list -->
      {#if $savedStops.length > 0}
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {$_("settings.savedStopsCount", {
              values: { count: $savedStops.length },
            })}
          </p>
          <div class="space-y-2">
            {#each $savedStops as stop, i (stop.id)}
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in-up"
                style="animation-delay: {Math.min(i * 40, 200)}ms"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-sm truncate">{stop.name}</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    {#each stop.routes as route}
                      <RouteBadge {route} size="sm" />
                    {/each}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 shrink-0"
                  onclick={() => promptRemoveStop(stop.id, stop.name)}
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-4">
          No saved stops yet. Search above to add your first stop.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- ==================== SAVED ROUTES ==================== -->
  <Card.Root
    class="mb-6 animate-fade-in-up overflow-visible relative z-10"
    style="animation-delay: 100ms"
  >
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Route class="h-5 w-5 text-primary" />
        {$_("settings.savedRoutes")}
      </Card.Title>
      <Card.Description>
        {$_("settings.savedRoutesDesc")}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Search to add routes -->
      <div>
        <p class="text-sm text-muted-foreground mb-2">
          {$_("settings.addRoute")}
        </p>
        <RouteSearch placeholder={$_("search.placeholderRoute")} />
      </div>

      <!-- Saved routes list -->
      {#if $savedRoutes.length > 0}
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {$_("settings.savedRoutesCount", {
              values: { count: $savedRoutes.length },
            })}
          </p>
          <div class="space-y-2">
            {#each $savedRoutes as route, i (route.id)}
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in-up"
                style="animation-delay: {Math.min(i * 40, 200)}ms"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <RouteBadge route={route.id} size="sm" />
                  <span class="text-sm truncate"
                    >{route.name.replace(/^\d+\s*/, "")}</span
                  >
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 shrink-0"
                  onclick={() => promptRemoveRoute(route.id, route.name)}
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-4">
          {$_("settings.noSavedRoutes")}
        </p>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- ==================== PREFERENCES ==================== -->
  <Card.Root
    class="mb-6 animate-fade-in-up relative z-0"
    style="animation-delay: 150ms"
  >
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <SlidersHorizontal class="h-5 w-5 text-primary" />
        {$_("settings.preferences")}
      </Card.Title>
      <Card.Description>{$_("settings.preferencesDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Language -->
      <fieldset>
        <legend class="text-sm font-medium mb-3 flex items-center gap-2">
          <Globe class="h-4 w-4" />
          {$_("settings.language")}
        </legend>
        <div class="flex gap-2">
          <button
            class="h-10 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 cursor-pointer {$localPreferences.language ===
            'en'
              ? 'border-2'
              : 'border border-input hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
            style={$localPreferences.language === "en"
              ? "border-color: hsl(var(--foreground));"
              : ""}
            onclick={() => handleLanguageChange("en")}
          >
            {#if $localPreferences.language === "en"}
              <span
                class="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style="background-color: hsl(var(--foreground));"
              >
                <Check class="h-3 w-3" style="color: hsl(var(--background));" />
              </span>
            {:else}
              <span
                class="h-5 w-5 rounded-full shrink-0 border-2 border-muted-foreground/30"
              ></span>
            {/if}
            <span>English</span>
          </button>
          <button
            class="h-10 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 cursor-pointer {$localPreferences.language ===
            'fr'
              ? 'border-2'
              : 'border border-input hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
            style={$localPreferences.language === "fr"
              ? "border-color: hsl(var(--foreground));"
              : ""}
            onclick={() => handleLanguageChange("fr")}
          >
            {#if $localPreferences.language === "fr"}
              <span
                class="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style="background-color: hsl(var(--foreground));"
              >
                <Check class="h-3 w-3" style="color: hsl(var(--background));" />
              </span>
            {:else}
              <span
                class="h-5 w-5 rounded-full shrink-0 border-2 border-muted-foreground/30"
              ></span>
            {/if}
            <span>Français</span>
          </button>
        </div>
      </fieldset>

      <!-- Theme -->
      <fieldset>
        <legend class="text-sm font-medium mb-3 flex items-center gap-2">
          <Palette class="h-4 w-4" />
          {$_("settings.theme")}
        </legend>
        <div class="flex flex-wrap gap-2">
          {#each [{ value: "light" as const, labelKey: "theme.light" }, { value: "dark" as const, labelKey: "theme.dark" }, { value: "system" as const, labelKey: "theme.system" }] as option}
            {@const isSelected = $localPreferences.theme === option.value}
            <button
              class="h-10 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 cursor-pointer {isSelected
                ? 'border-2'
                : 'border border-input hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
              style={isSelected ? "border-color: hsl(var(--foreground));" : ""}
              onclick={() => handleThemeChange(option.value)}
            >
              {#if isSelected}
                <span
                  class="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                  style="background-color: hsl(var(--foreground));"
                >
                  <Check
                    class="h-3 w-3"
                    style="color: hsl(var(--background));"
                  />
                </span>
              {:else}
                <span
                  class="h-5 w-5 rounded-full shrink-0 border-2 border-muted-foreground/30"
                ></span>
              {/if}
              <span>{$_(option.labelKey)}</span>
            </button>
          {/each}
        </div>
      </fieldset>

      <!-- Reduce Motion -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <span
            id="reduce-motion-label"
            class="text-sm font-medium flex items-center gap-2"
          >
            <CirclePause class="h-4 w-4" />
            {$_("settings.reduceMotion")}
          </span>
          <p id="reduce-motion-desc" class="text-sm text-muted-foreground">
            {$_("settings.minimizeAnimations")}
          </p>
        </div>
        <Switch
          checked={$localPreferences.reduceMotion}
          onCheckedChange={handleReduceMotionChange}
          aria-labelledby="reduce-motion-label"
          aria-describedby="reduce-motion-desc"
        />
      </div>

      <!-- Location Permission -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <span
            id="location-label"
            class="text-sm font-medium flex items-center gap-2"
          >
            <MapPinned class="h-4 w-4" />
            {$_("settings.locationAccess")}
          </span>
          <p id="location-desc" class="text-sm text-muted-foreground">
            {#if locationPermission === "granted"}
              {$_("settings.locationEnabled")}
            {:else if locationPermission === "denied"}
              {$_("settings.locationBlocked")}
            {:else if locationPermission === "unsupported"}
              {$_("settings.locationUnsupported")}
            {:else}
              {$_("settings.locationDescription")}
            {/if}
          </p>
        </div>
        {#if locationPermission === "unsupported"}
          <span class="text-sm text-muted-foreground px-2 py-1 rounded bg-muted"
            >{$_("settings.unavailable")}</span
          >
        {:else}
          <button
            type="button"
            role="switch"
            aria-checked={locationPermission === "granted"}
            aria-labelledby="location-label"
            aria-describedby="location-desc"
            disabled={isCheckingLocation}
            onclick={() =>
              handleLocationToggle(locationPermission !== "granted")}
            class="switch-track focus-visible:ring-ring/50 peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 {locationPermission ===
            'granted'
              ? 'switch-checked'
              : 'switch-unchecked'}"
          >
            <span
              class="pointer-events-none flex items-center justify-center size-5 rounded-full shadow-md ring-0 transition-transform {locationPermission ===
              'granted'
                ? 'translate-x-[1.35rem] switch-thumb-checked'
                : 'translate-x-0.5 switch-thumb-unchecked'}"
            >
              {#if locationPermission === "granted"}
                <Check class="h-3 w-3 switch-icon-checked" strokeWidth={3} />
              {:else}
                <X class="h-3 w-3 switch-icon-unchecked" strokeWidth={3} />
              {/if}
            </span>
          </button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ==================== DATA MANAGEMENT ==================== -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 200ms">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Database class="h-5 w-5 text-primary" />
        {$_("settings.dataManagement")}
      </Card.Title>
      <Card.Description>
        {$_("settings.dataManagementDesc")}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3">
      <Button
        variant="outline"
        class="w-full gap-2 hover:bg-red-500/15 dark:hover:bg-red-500/25"
        style="border-color: hsl(var(--destructive)); color: hsl(var(--destructive));"
        onclick={handleClearAllData}
      >
        <Trash2 class="h-4 w-4" />
        {$_("settings.clearAllData")}
      </Button>
      <p class="text-sm text-muted-foreground text-center">
        {$_("settings.clearAllDataDesc")}
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ==================== HELP & INFO ==================== -->
  <!-- Hidden everywhere since it's available in sidebar/hamburger menu
  <Card.Root class="mb-6 hidden">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <HelpCircle class="h-5 w-5 text-primary" />
        {$_("settings.helpAndInfo")}
      </Card.Title>
      <Card.Description>
        {$_("settings.helpDescription")}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3">
      <Button variant="outline" class="w-full gap-2" href="/help">
        <HelpCircle class="h-4 w-4" />
        {$_("sidebar.howToUse")}
      </Button>
      <Button
        variant="outline"
        class="w-full gap-2"
        onclick={() => (activeDialog = "report-bug")}
      >
        <Flag class="h-4 w-4" />
        {$_("sidebar.reportBug")}
      </Button>
      <Button
        variant="outline"
        class="w-full gap-2"
        onclick={() => (activeDialog = "feature-request")}
      >
        <Lightbulb class="h-4 w-4" />
        {$_("sidebar.featureRequest")}
      </Button>
      <Button variant="outline" class="w-full gap-2" href="/about">
        <Info class="h-4 w-4" />
        {$_("sidebar.about")}
      </Button>
    </Card.Content>
  </Card.Root>
  -->

  <!-- Return Home -->
  <Button variant="ghost" class="w-full gap-2 mb-6" href="/">
    <Home class="h-4 w-4" />
    {$_("settings.returnHome")}
  </Button>
</main>

<!-- Dialogs -->
<HowToUseDialog
  open={activeDialog === "how-to-use"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<ReportIssueDialog
  open={activeDialog === "report-bug"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<FeatureRequestDialog
  open={activeDialog === "feature-request"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<!-- Delete Stop Confirmation -->
<Dialog.Root
  open={confirmDeleteStop !== null}
  onOpenChange={(open) => {
    if (!open) confirmDeleteStop = null;
  }}
>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
      >
        <Trash2 class="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold"
        >Remove Stop?</Dialog.Title
      >
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        Are you sure you want to remove <span
          class="font-medium text-foreground">"{confirmDeleteStop?.name}"</span
        >? This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer
      class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center"
    >
      <Button
        variant="outline"
        class="w-full sm:w-auto"
        onclick={() => (confirmDeleteStop = null)}>Cancel</Button
      >
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={confirmRemoveStop}
      >
        Remove Stop
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete Route Confirmation -->
<Dialog.Root
  open={confirmDeleteRoute !== null}
  onOpenChange={(open) => {
    if (!open) confirmDeleteRoute = null;
  }}
>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
      >
        <Trash2 class="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold"
        >Remove Route?</Dialog.Title
      >
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        Are you sure you want to remove <span
          class="font-medium text-foreground">"{confirmDeleteRoute?.name}"</span
        >? This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer
      class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center"
    >
      <Button
        variant="outline"
        class="w-full sm:w-auto"
        onclick={() => (confirmDeleteRoute = null)}>Cancel</Button
      >
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={confirmRemoveRoute}
      >
        Remove Route
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Clear All Data Confirmation -->
<Dialog.Root
  open={showClearAllDialog}
  onOpenChange={(open) => {
    if (!open) showClearAllDialog = false;
  }}
>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
      >
        <Trash2 class="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold"
        >Clear All Data?</Dialog.Title
      >
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        This will permanently delete all your saved stops, routes, and reset all
        preferences. This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer
      class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center"
    >
      <Button
        variant="outline"
        class="w-full sm:w-auto"
        onclick={() => (showClearAllDialog = false)}>Cancel</Button
      >
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={confirmClearAllData}
      >
        Clear All Data
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
