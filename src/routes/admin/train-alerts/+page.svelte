<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { toast } from "svelte-sonner";
  import { createClient } from "@supabase/supabase-js";
  import {
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    RotateCcw,
    Download,
    Upload,
    Filter,
    AlertTriangle,
    Clock,
    Snail,
    Accessibility,
    Building2,
    CalendarClock,
    CheckCircle2,
    EyeOff,
    Loader2,
  } from "lucide-svelte";
  import SEO from "$lib/components/SEO.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";

  // Types
  interface TrainingAlert {
    id: string;
    alert_id: string;
    source: string;
    header_text: string;
    description_text: string | null;
    effect: string | null;
    categories: string[] | null;
    affected_routes: string[] | null;
    alert_created_at: string;
    is_resolved: boolean;
    auto_classification: string;
    human_classification: string | null;
    final_classification: string;
    is_verified: boolean;
    notes: string | null;
  }

  interface Stats {
    total: number;
    validated: number;
    needsReview: number;
    conflicts: number;
    byCategory: Record<string, number>;
    byAutoClassification: Record<string, number>;
  }

  // Classification categories - matches app's actual UI tabs
  // MAJOR = Disruptions & Delays tab (main alerts)
  // MINOR = Slow Zones tab (RSZ only)
  // ACCESSIBILITY = Elevators tab
  const CLASSIFICATIONS = [
    {
      value: "MAJOR",
      label: "Disruptions & Delays",
      icon: AlertTriangle,
      color: "destructive",
      description:
        "Major issues: no service, detours, shuttles, closures, significant delays",
    },
    {
      value: "RSZ",
      label: "Slow Zone (RSZ)",
      icon: Snail,
      color: "secondary",
      description: 'Reduced Speed Zone - "slower than usual", "move slower"',
    },
    {
      value: "ACCESSIBILITY",
      label: "Elevators",
      icon: Accessibility,
      color: "default",
      description: "Elevator or escalator outage",
    },
    {
      value: "SCHEDULED",
      label: "Scheduled",
      icon: CalendarClock,
      color: "outline",
      description: "Planned maintenance (shown in Scheduled tab)",
    },
    {
      value: "RESOLVED",
      label: "Resolved",
      icon: CheckCircle2,
      color: "success",
      description: "Service resumed/restored (shown in Recently Resolved)",
    },
  ] as const;

  // Create an untyped Supabase client for the training table (not in generated types)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // State
  let alerts = $state<TrainingAlert[]>([]);
  let currentIndex = $state(0);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let stats = $state<Stats | null>(null);
  let filterMode = $state<"all" | "needs-review" | "validated" | "conflicts">(
    "needs-review"
  );
  let sourceFilter = $state<"all" | "ttc-api-live" | "database">("all");

  // Current alert
  let currentAlert = $derived(alerts[currentIndex] ?? null);

  // Derived stats
  let progress = $derived(
    stats ? Math.round((stats.validated / stats.total) * 100) : 0
  );

  // Fetch alerts from database
  async function fetchAlerts() {
    isLoading = true;
    try {
      let query = supabase
        .from("alert_training_data")
        .select("*")
        .order("alert_created_at", { ascending: false });

      // Apply filters
      if (filterMode === "needs-review") {
        query = query.is("human_classification", null);
      } else if (filterMode === "validated") {
        query = query.not("human_classification", "is", null);
      } else if (filterMode === "conflicts") {
        // Alerts where human disagrees with auto - need raw filter
        query = query.not("human_classification", "is", null);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // For conflicts filter, filter client-side where human != auto
      let filteredData = data ?? [];
      if (filterMode === "conflicts") {
        filteredData = filteredData.filter(
          (a) =>
            a.human_classification &&
            a.human_classification !== a.auto_classification
        );
      }

      alerts = filteredData;
      currentIndex = 0;
    } catch (err) {
      console.error("Error fetching alerts:", err);
      toast.error("Failed to load alerts");
    } finally {
      isLoading = false;
    }
  }

  // Fetch stats
  async function fetchStats() {
    try {
      // Total count
      const { count: totalCount } = await supabase
        .from("alert_training_data")
        .select("*", { count: "exact", head: true });

      // Validated count
      const { count: validatedCount } = await supabase
        .from("alert_training_data")
        .select("*", { count: "exact", head: true })
        .not("human_classification", "is", null);

      // Get all validated alerts to count conflicts
      const { data: validatedData } = (await supabase
        .from("alert_training_data")
        .select("auto_classification, human_classification")
        .not("human_classification", "is", null)) as {
        data:
          | { auto_classification: string; human_classification: string }[]
          | null;
      };

      // Count conflicts (where human != auto)
      const conflictCount =
        validatedData?.filter(
          (row) => row.human_classification !== row.auto_classification
        ).length ?? 0;

      // Get category breakdown
      const { data: categoryData } = (await supabase
        .from("alert_training_data")
        .select("final_classification")) as {
        data: { final_classification: string }[] | null;
      };

      const byCategory: Record<string, number> = {};
      categoryData?.forEach((row) => {
        const cat = row.final_classification || "UNKNOWN";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      // Get auto-classification breakdown
      const { data: autoData } = (await supabase
        .from("alert_training_data")
        .select("auto_classification")) as {
        data: { auto_classification: string }[] | null;
      };

      const byAutoClassification: Record<string, number> = {};
      autoData?.forEach((row) => {
        const cat = row.auto_classification || "UNKNOWN";
        byAutoClassification[cat] = (byAutoClassification[cat] || 0) + 1;
      });

      stats = {
        total: totalCount ?? 0,
        validated: validatedCount ?? 0,
        needsReview: (totalCount ?? 0) - (validatedCount ?? 0),
        conflicts: conflictCount,
        byCategory,
        byAutoClassification,
      };
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  // Classify current alert
  async function classifyAlert(classification: string) {
    if (!currentAlert) return;

    isSaving = true;
    try {
      const { error } = await supabase
        .from("alert_training_data")
        .update({
          human_classification: classification,
          classified_at: new Date().toISOString(),
        })
        .eq("id", currentAlert.id);

      if (error) throw error;

      // Update local state
      alerts[currentIndex] = {
        ...currentAlert,
        human_classification: classification,
        final_classification: classification,
      };

      toast.success(`Classified as ${classification}`);

      // Update stats locally (optimistic update)
      if (stats) {
        stats = {
          ...stats,
          validated: stats.validated + 1,
          needsReview: stats.needsReview - 1,
        };
      }

      // Move to next alert
      if (currentIndex < alerts.length - 1) {
        currentIndex++;
      } else {
        // Refresh to get updated list
        await fetchAlerts();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error classifying alert:", err);
      toast.error("Failed to save classification");
    } finally {
      isSaving = false;
    }
  }

  // Accept auto-classification
  async function acceptAutoClassification() {
    if (!currentAlert) return;
    await classifyAlert(currentAlert.auto_classification);
  }

  // Clear human classification (revert to auto)
  async function clearClassification() {
    if (!currentAlert) return;

    isSaving = true;
    try {
      const { error } = await supabase
        .from("alert_training_data")
        .update({
          human_classification: null,
          classified_at: null,
        })
        .eq("id", currentAlert.id);

      if (error) throw error;

      // Update local state
      alerts[currentIndex] = {
        ...currentAlert,
        human_classification: null,
        final_classification: currentAlert.auto_classification,
      };

      toast.success("Classification cleared");
    } catch (err) {
      console.error("Error clearing classification:", err);
      toast.error("Failed to clear classification");
    } finally {
      isSaving = false;
    }
  }

  // Import live TTC API alerts for training
  let isImporting = $state(false);

  async function importLiveTTCAlerts() {
    isImporting = true;
    try {
      // Fetch live alerts from TTC API via our endpoint
      const response = await fetch("/api/admin/ttc-live-alerts");
      if (!response.ok) throw new Error("Failed to fetch live alerts");

      const { alerts: liveAlerts } = await response.json();

      if (!liveAlerts?.length) {
        toast.info("No live alerts available from TTC API");
        return;
      }

      // Auto-classify each alert
      const alertsToInsert = liveAlerts.map((alert: any) => ({
        ...alert,
        auto_classification: autoClassify(alert),
      }));

      // Upsert into training data (avoid duplicates)
      const { data, error } = await supabase
        .from("alert_training_data")
        .upsert(alertsToInsert, {
          onConflict: "alert_id",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      toast.success(`Imported ${alertsToInsert.length} live alerts`);
      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      console.error("Error importing live alerts:", err);
      toast.error("Failed to import live alerts");
    } finally {
      isImporting = false;
    }
  }

  // Auto-classify alert - matches app's 5 categories:
  // MAJOR (Disruptions & Delays), RSZ (Slow Zones), ACCESSIBILITY (Elevators), SCHEDULED, RESOLVED
  function autoClassify(alert: any): string {
    const headerLower = (alert.header_text || "").toLowerCase();
    const categories = alert.categories || [];
    const effect = alert.effect || "";

    // 1. RESOLVED: Service resumed alerts
    if (
      categories.includes("SERVICE_RESUMED") ||
      headerLower.includes("resumed") ||
      headerLower.includes("restored") ||
      headerLower.includes("back to normal")
    ) {
      return "RESOLVED";
    }

    // 2. ACCESSIBILITY: Elevator/escalator alerts (Elevators tab)
    if (
      categories.includes("ACCESSIBILITY") ||
      headerLower.includes("elevator") ||
      headerLower.includes("escalator")
    ) {
      return "ACCESSIBILITY";
    }

    // 3. RSZ: Reduced Speed Zone (Slow Zones tab)
    if (
      headerLower.includes("slower than usual") ||
      headerLower.includes("slow zone") ||
      headerLower.includes("reduced speed") ||
      headerLower.includes("move slower") ||
      headerLower.includes("running slower") ||
      headerLower.includes("speed restriction")
    ) {
      return "RSZ";
    }

    // 4. SCHEDULED: Planned maintenance (Scheduled tab)
    if (
      categories.some((c: string) => c.toUpperCase().includes("PLANNED")) ||
      headerLower.includes("due to planned") ||
      headerLower.includes("planned track work") ||
      headerLower.includes("scheduled") ||
      headerLower.includes("weekend closure")
    ) {
      return "SCHEDULED";
    }

    // 5. MAJOR: Everything else (Disruptions & Delays tab)
    // Includes: NO_SERVICE, DETOUR, SIGNIFICANT_DELAYS, closures, shuttles
    return "MAJOR";
  }

  // Export training data as JSON
  async function exportTrainingData() {
    try {
      const { data, error } = await supabase
        .from("alert_training_data")
        .select("*")
        .not("human_classification", "is", null);

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttc-alert-training-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data?.length ?? 0} validated alerts`);
    } catch (err) {
      console.error("Error exporting:", err);
      toast.error("Failed to export data");
    }
  }

  // Navigate alerts
  function goToNext() {
    if (currentIndex < alerts.length - 1) {
      currentIndex++;
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      currentIndex--;
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (isLoading || isSaving || !currentAlert) return;

    switch (event.key) {
      case "ArrowLeft":
        goToPrevious();
        break;
      case "ArrowRight":
        goToNext();
        break;
      case "Enter":
        acceptAutoClassification();
        break;
      case "1":
        classifyAlert("DISRUPTION");
        break;
      case "2":
        classifyAlert("DELAY");
        break;
      case "3":
        classifyAlert("RSZ");
        break;
      case "4":
        classifyAlert("ACCESSIBILITY");
        break;
      case "5":
        classifyAlert("SITE_WIDE");
        break;
      case "6":
        classifyAlert("SCHEDULED");
        break;
      case "7":
        classifyAlert("RESOLVED");
        break;
      case "8":
        classifyAlert("HIDE");
        break;
    }
  }

  // Format date
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Get effect badge variant
  function getEffectVariant(
    effect: string | null
  ): "default" | "destructive" | "outline" | "secondary" {
    switch (effect) {
      case "NO_SERVICE":
        return "destructive";
      case "DETOUR":
      case "SIGNIFICANT_DELAYS":
        return "default";
      default:
        return "secondary";
    }
  }

  // Initialize
  onMount(() => {
    if (browser) {
      fetchAlerts();
      fetchStats();
      window.addEventListener("keydown", handleKeydown);
      return () => window.removeEventListener("keydown", handleKeydown);
    }
  });

  // Refetch when filter changes
  $effect(() => {
    if (browser) {
      // Track filter changes
      const _ = filterMode + sourceFilter;
      fetchAlerts();
    }
  });
</script>

<SEO
  title="Alert Training | Admin"
  description="Train the ML model by classifying TTC alerts"
  noindex={true}
/>

<svelte:head>
  <title>Alert Training | Admin</title>
</svelte:head>

<div class="min-h-screen bg-background">
  <!-- Simple Admin Header -->
  <header
    class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
  >
    <div class="container flex h-14 items-center">
      <a
        href="/settings"
        class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft class="h-5 w-5" />
        <span>Back</span>
      </a>
      <h1 class="ml-4 text-lg font-semibold">Alert Training (Admin)</h1>
    </div>
  </header>

  <main class="container mx-auto max-w-4xl p-4 space-y-6">
    <!-- Stats Overview -->
    {#if stats}
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-lg">Training Progress</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold">{stats.total}</p>
              <p class="text-sm text-muted-foreground">Total Alerts</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600">{stats.validated}</p>
              <p class="text-sm text-muted-foreground">Validated</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-amber-600">
                {stats.needsReview}
              </p>
              <p class="text-sm text-muted-foreground">Needs Review</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600">
                {stats.conflicts}
              </p>
              <p class="text-sm text-muted-foreground">Conflicts</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold">{progress}%</p>
              <p class="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-green-600 transition-all duration-300"
              style="width: {progress}%"
            ></div>
          </div>

          <!-- Category breakdown -->
          <div class="mt-4 flex flex-wrap gap-2">
            {#each Object.entries(stats.byCategory) as [category, count]}
              <Badge variant="outline" class="text-xs">
                {category}: {count}
              </Badge>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Filters and Actions -->
    <div class="flex flex-wrap gap-2 items-center justify-between">
      <div class="flex gap-2">
        <Tabs.Root bind:value={filterMode} class="w-auto">
          <Tabs.List>
            <Tabs.Trigger value="needs-review">Needs Review</Tabs.Trigger>
            <Tabs.Trigger value="validated">Validated</Tabs.Trigger>
            <Tabs.Trigger value="conflicts">Conflicts</Tabs.Trigger>
            <Tabs.Trigger value="all">All</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <select
          bind:value={sourceFilter}
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Sources</option>
          <option value="ttc-api-live">TTC API</option>
          <option value="database">Database</option>
        </select>
      </div>

      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={importLiveTTCAlerts}
          disabled={isImporting}
        >
          {#if isImporting}
            <Loader2 class="h-4 w-4 mr-1 animate-spin" />
            Importing...
          {:else}
            <Upload class="h-4 w-4 mr-1" />
            Import Live
          {/if}
        </Button>
        <Button variant="outline" size="sm" onclick={exportTrainingData}>
          <Download class="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </div>

    <!-- Current Alert Card -->
    {#if isLoading}
      <Card.Root>
        <Card.Content class="p-6">
          <Skeleton class="h-8 w-3/4 mb-4" />
          <Skeleton class="h-4 w-1/2 mb-2" />
          <Skeleton class="h-4 w-2/3" />
        </Card.Content>
      </Card.Root>
    {:else if !currentAlert}
      <Card.Root>
        <Card.Content class="p-12 text-center">
          <CheckCircle2 class="h-16 w-16 mx-auto text-green-600 mb-4" />
          <h2 class="text-xl font-semibold mb-2">All caught up!</h2>
          <p class="text-muted-foreground">
            {#if filterMode === "needs-review"}
              All alerts have been reviewed. Try "All" to see everything.
            {:else}
              No alerts match the current filters.
            {/if}
          </p>
        </Card.Content>
      </Card.Root>
    {:else}
      <Card.Root>
        <Card.Header>
          <div class="flex justify-between items-start">
            <div class="flex gap-2 flex-wrap">
              {#if currentAlert.effect}
                <Badge variant={getEffectVariant(currentAlert.effect)}>
                  {currentAlert.effect}
                </Badge>
              {/if}
              <Badge variant="outline">{currentAlert.source}</Badge>
              {#if currentAlert.is_resolved}
                <Badge variant="secondary">Resolved</Badge>
              {/if}
            </div>
            <span class="text-sm text-muted-foreground">
              {currentIndex + 1} / {alerts.length}
            </span>
          </div>
        </Card.Header>

        <Card.Content class="space-y-4">
          <!-- Alert Text -->
          <div>
            <h2 class="text-xl font-semibold leading-tight">
              {currentAlert.header_text}
            </h2>
            {#if currentAlert.description_text}
              <p class="mt-2 text-muted-foreground">
                {currentAlert.description_text}
              </p>
            {/if}
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Routes:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#if currentAlert.affected_routes?.length}
                  {#each currentAlert.affected_routes as route}
                    <RouteBadge {route} size="sm" />
                  {/each}
                {:else}
                  <span class="text-muted-foreground">None</span>
                {/if}
              </div>
            </div>
            <div>
              <span class="text-muted-foreground">Categories:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#if currentAlert.categories?.length}
                  {#each currentAlert.categories as cat}
                    <Badge variant="outline" class="text-xs">{cat}</Badge>
                  {/each}
                {:else}
                  <span class="text-muted-foreground">None</span>
                {/if}
              </div>
            </div>
            <div>
              <span class="text-muted-foreground">Created:</span>
              <p>{formatDate(currentAlert.alert_created_at)}</p>
            </div>
            <div>
              <span class="text-muted-foreground">Alert ID:</span>
              <p class="font-mono text-xs truncate">{currentAlert.alert_id}</p>
            </div>
          </div>

          <!-- Current Classification -->
          <div class="bg-muted/50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted-foreground mb-1">
                  Auto Classification
                </p>
                <Badge variant="secondary" class="text-base">
                  {currentAlert.auto_classification}
                </Badge>
              </div>
              {#if currentAlert.human_classification}
                <div class="text-right">
                  <p class="text-sm text-muted-foreground mb-1">
                    Your Classification
                  </p>
                  <Badge variant="default" class="text-base">
                    {currentAlert.human_classification}
                  </Badge>
                </div>
              {/if}
            </div>
          </div>
        </Card.Content>

        <Card.Footer class="flex-col gap-4">
          <!-- Quick Actions -->
          <div class="w-full flex gap-2">
            <Button
              variant="outline"
              class="flex-1"
              onclick={acceptAutoClassification}
              disabled={isSaving}
            >
              {#if isSaving}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              {:else}
                <Check class="h-4 w-4 mr-2" />
              {/if}
              Accept Auto ({currentAlert.auto_classification})
            </Button>
            {#if currentAlert.human_classification}
              <Button
                variant="ghost"
                onclick={clearClassification}
                disabled={isSaving}
              >
                <RotateCcw class="h-4 w-4" />
              </Button>
            {/if}
          </div>

          <!-- Classification Buttons -->
          <div class="w-full grid grid-cols-2 md:grid-cols-4 gap-2">
            {#each CLASSIFICATIONS as cls, i}
              <Button
                variant={currentAlert.human_classification === cls.value
                  ? "default"
                  : "outline"}
                size="sm"
                onclick={() => classifyAlert(cls.value)}
                disabled={isSaving}
                class="justify-start"
              >
                <cls.icon class="h-4 w-4 mr-2" />
                <span class="truncate">{cls.label}</span>
                <span class="ml-auto text-xs text-muted-foreground"
                  >{i + 1}</span
                >
              </Button>
            {/each}
          </div>

          <!-- Navigation -->
          <div class="w-full flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onclick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft class="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span class="text-sm text-muted-foreground">
              Use ← → keys to navigate, Enter to accept, 1-8 to classify
            </span>
            <Button
              variant="ghost"
              size="sm"
              onclick={goToNext}
              disabled={currentIndex >= alerts.length - 1}
            >
              Next
              <ChevronRight class="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card.Footer>
      </Card.Root>
    {/if}

    <!-- Keyboard Shortcuts Reference -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm">Keyboard Shortcuts</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <kbd class="px-2 py-1 bg-muted rounded text-xs">←</kbd>
            <kbd class="px-2 py-1 bg-muted rounded text-xs ml-1">→</kbd>
            Navigate
          </div>
          <div>
            <kbd class="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> Accept auto
          </div>
          <div>
            <kbd class="px-2 py-1 bg-muted rounded text-xs">1-5</kbd> Classify
          </div>
          <div class="text-muted-foreground">
            1=Major, 2=RSZ, 3=Elevator, 4=Scheduled, 5=Resolved
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </main>
</div>
