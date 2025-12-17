<script lang="ts">
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Info,
    ChevronLeft,
    ExternalLink,
    Github,
    Heart,
    Code,
    Database,
    AlertTriangle,
  } from "lucide-svelte";

  // App version - could be injected from build process
  const APP_VERSION = "1.0.0";
  const BUILD_DATE = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
</script>

<svelte:head>
  <title>{$_("about.pageTitle")}</title>
</svelte:head>

<Header />

<main class="content-area pb-24">
  <!-- Page Header -->
  <div class="mb-6">
    <Button
      variant="ghost"
      href="/settings"
      class="mb-4 -ml-2 gap-1 text-muted-foreground"
    >
      <ChevronLeft class="h-4 w-4" />
      {$_("settings.title")}
    </Button>
    <h1
      class="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"
    >
      <Info class="h-7 w-7" />
      {$_("about.title")}
    </h1>
    <p class="text-muted-foreground mt-2">
      {$_("about.subtitle")}
    </p>
  </div>

  <!-- App Info -->
  <Card.Root class="mb-6">
    <Card.Content class="pt-6">
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-4xl"
        >
          🚇
        </div>
        <div>
          <h2 class="text-xl font-bold">{$_("header.appName")}</h2>
          <p class="text-sm text-muted-foreground">{$_("about.tagline")}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- About Me -->
  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Heart class="h-5 w-5 text-rose-500" />
        {$_("about.aboutDeveloper")}
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {$_("about.developerBio")}
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
          href="https://github.com/yourusername"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github class="h-4 w-4" />
          GitHub
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Data Sources -->
  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Database class="h-5 w-5 text-blue-500" />
        {$_("about.dataSources")}
      </Card.Title>
      <Card.Description>{$_("about.dataSourcesDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="space-y-3">
        <!-- TTC Service Alerts -->
        <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10"
          >
            <span class="text-lg">🚇</span>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm">{$_("about.sourceTTC")}</h4>
            <p class="text-xs text-muted-foreground mt-0.5">
              {$_("about.sourceTTCDesc")}
            </p>
            <a
              href="https://www.ttc.ca/service-alerts"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              ttc.ca/service-alerts
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>

        <!-- TTC GTFS Data -->
        <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10"
          >
            <span class="text-lg">📍</span>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm">{$_("about.sourceGTFS")}</h4>
            <p class="text-xs text-muted-foreground mt-0.5">
              {$_("about.sourceGTFSDesc")}
            </p>
            <a
              href="https://open.toronto.ca/dataset/ttc-routes-and-schedules/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              Toronto Open Data
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>

        <!-- TTC Real-Time -->
        <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10"
          >
            <span class="text-lg">⏱️</span>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm">{$_("about.sourceRealtime")}</h4>
            <p class="text-xs text-muted-foreground mt-0.5">
              {$_("about.sourceRealtimeDesc")}
            </p>
            <a
              href="https://retro.umoiq.com/xmlFeedDocs/NextBusXMLFeed.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              NextBus API
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Disclaimer -->
  <Card.Root class="mb-6 border-amber-500/50">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <AlertTriangle class="h-5 w-5 text-amber-500" />
        {$_("about.disclaimer")}
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p class="text-sm text-muted-foreground">
        {$_("about.disclaimerText")}
      </p>
      <div
        class="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
      >
        <p class="text-sm font-medium text-amber-600 dark:text-amber-400">
          {$_("about.disclaimerImportant")}
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Open Source -->
  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Code class="h-5 w-5 text-emerald-500" />
        {$_("about.openSource")}
      </Card.Title>
      <Card.Description>{$_("about.openSourceDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid gap-2 text-sm">
        <div
          class="flex justify-between items-center py-2 border-b border-border"
        >
          <span class="text-muted-foreground">Svelte</span>
          <span class="font-mono text-xs">v5</span>
        </div>
        <div
          class="flex justify-between items-center py-2 border-b border-border"
        >
          <span class="text-muted-foreground">SvelteKit</span>
          <span class="font-mono text-xs">v2</span>
        </div>
        <div
          class="flex justify-between items-center py-2 border-b border-border"
        >
          <span class="text-muted-foreground">Tailwind CSS</span>
          <span class="font-mono text-xs">v4</span>
        </div>
        <div
          class="flex justify-between items-center py-2 border-b border-border"
        >
          <span class="text-muted-foreground">shadcn-svelte</span>
          <span class="font-mono text-xs">v2</span>
        </div>
        <div
          class="flex justify-between items-center py-2 border-b border-border"
        >
          <span class="text-muted-foreground">Supabase</span>
          <span class="font-mono text-xs">Backend</span>
        </div>
        <div class="flex justify-between items-center py-2">
          <span class="text-muted-foreground">Cloudflare Pages</span>
          <span class="font-mono text-xs">Hosting</span>
        </div>
      </div>

      <Separator />

      <p class="text-xs text-muted-foreground">
        {$_("about.licenseInfo")}
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Footer -->
  <div class="text-center text-xs text-muted-foreground space-y-1">
    <p>{$_("about.madeWith")} 🧡 {$_("about.inToronto")}</p>
    <p>© {new Date().getFullYear()} TTC Alerts</p>
  </div>
</main>
