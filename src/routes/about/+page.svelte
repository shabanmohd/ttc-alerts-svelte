<script lang="ts">
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import {
    Info,
    ChevronLeft,
    ExternalLink,
    Globe,
    Linkedin,
    Heart,
    Database,
    AlertTriangle,
    Shield,
    MapPin,
    Navigation,
    HardDrive,
    Train,
    Clock,
  } from "lucide-svelte";
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
      onclick={() => history.back()}
      class="mb-4 -ml-2 gap-1 text-muted-foreground"
    >
      <ChevronLeft class="h-4 w-4" />
      {$_("common.back")}
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
    <Card.Content>
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"
        >
          <Train class="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 class="text-xl font-bold">{$_("header.appName")}</h2>
          <p class="text-sm text-muted-foreground">{$_("about.tagline")}</p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- About Me -->
  <Card.Root class="mb-6 gap-4">
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
          href="https://shabanmohammed.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Globe class="h-4 w-4" />
          Website
        </Button>
        <Button
          variant="outline"
          size="sm"
          href="https://www.linkedin.com/in/shabanmohammed"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Linkedin class="h-4 w-4" />
          LinkedIn
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
      <!-- TTC Service Alerts -->
      <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10"
        >
          <Train class="h-5 w-5 text-red-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium">{$_("about.sourceTTC")}</h4>
          <p class="text-sm text-muted-foreground mt-0.5">
            {$_("about.sourceTTCDesc")}
          </p>
          <a
            href="https://www.ttc.ca/service-alerts"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary underline inline-flex items-center gap-1 mt-1"
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
          <Navigation class="h-5 w-5 text-green-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium">{$_("about.sourceGTFS")}</h4>
          <p class="text-sm text-muted-foreground mt-0.5">
            {$_("about.sourceGTFSDesc")}
          </p>
          <a
            href="https://open.toronto.ca/dataset/ttc-routes-and-schedules/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary underline inline-flex items-center gap-1 mt-1"
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
          <Clock class="h-5 w-5 text-purple-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium">{$_("about.sourceRealtime")}</h4>
          <p class="text-sm text-muted-foreground mt-0.5">
            {$_("about.sourceRealtimeDesc")}
          </p>
          <a
            href="https://retro.umoiq.com/xmlFeedDocs/NextBusXMLFeed.pdf"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary underline inline-flex items-center gap-1 mt-1"
          >
            NextBus API
            <ExternalLink class="h-3 w-3" />
          </a>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Privacy & Location -->
  <Card.Root class="mb-6 border-blue-500/50">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Shield class="h-5 w-5 text-blue-500" />
        {$_("about.privacy")}
      </Card.Title>
      <Card.Description>{$_("about.privacyText")}</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Location Data -->
      <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10"
        >
          <MapPin class="h-5 w-5 text-blue-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium">{$_("about.privacyLocation")}</h4>
          <p class="text-sm text-muted-foreground mt-1">
            {$_("about.privacyLocationDetails")}
          </p>
          <p class="text-sm text-muted-foreground mt-2">
            {$_("about.privacyLocationControl")}
          </p>
        </div>
      </div>

      <!-- Local Storage -->
      <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10"
        >
          <HardDrive class="h-5 w-5 text-emerald-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium">{$_("about.privacyStorage")}</h4>
          <p class="text-sm text-muted-foreground mt-1">
            {$_("about.privacyStorageDetails")}
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Disclaimer -->
  <Card.Root class="mb-6 gap-4 border-amber-500/50">
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <AlertTriangle class="h-5 w-5 text-amber-500" />
        {$_("about.disclaimer")}
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {$_("about.disclaimerText")}
      </p>
      <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p class="text-sm font-medium text-amber-600 dark:text-amber-400">
          {$_("about.disclaimerImportant")}
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Footer -->
  <div class="text-center text-sm text-muted-foreground space-y-1">
    <p class="inline-flex items-center gap-1">
      {$_("about.madeWith")}
      <Heart class="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
      {$_("about.inToronto")}
    </p>
    <p>© {new Date().getFullYear()} TTC Alerts</p>
  </div>
</main>
