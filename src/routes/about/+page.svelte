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
    Heart,
    Coffee,
    Database,
    AlertTriangle,
    Shield,
    MapPin,
    Navigation,
    HardDrive,
    Clock,
    Sparkles,
  } from "lucide-svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { getVersionString } from "$lib/build-info";
</script>

<SEO
  title={$_("about.pageTitle")}
  description="Learn about rideTO, a free transit companion built for Toronto commuters. Discover our data sources, accessibility commitment, and privacy practices."
/>
<Header />

<main class="content-area pb-24">
  <!-- Page Header with entrance animation -->
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
      <Info class="h-7 w-7" />
      {$_("about.title")}
    </h1>
    <p class="text-muted-foreground mt-2">
      {$_("about.subtitle")}
    </p>
  </div>

  <!-- App Info -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 50ms">
    <Card.Content>
      <div class="flex items-center gap-4">
        <img
          src="/rideTO_logo.svg"
          alt="rideTO logo"
          width="56"
          height="56"
          class="h-14 w-14"
        />
        <div>
          <img
            src="/LOGO.svg"
            alt="rideTO"
            width="64"
            height="24"
            class="h-6 w-auto"
          />
          <p class="text-sm text-muted-foreground mt-1">
            {$_("about.tagline")}
          </p>
          <p class="text-xs text-muted-foreground/70 mt-1 font-mono">
            {getVersionString()}
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- About the Project -->
  <Card.Root
    class="mb-6 gap-4 animate-fade-in-up"
    style="animation-delay: 100ms"
  >
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Sparkles class="h-5 w-5 text-amber-500" />
        {$_("about.aboutProject")}
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {$_("about.projectDescription")}
      </p>
      <p class="text-sm text-muted-foreground font-medium">
        Key features include:
      </p>
      <ul
        class="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-1"
      >
        <li>{$_("about.projectFeature1")}</li>
        <li>{$_("about.projectFeature2")}</li>
        <li>{$_("about.projectFeature3")}</li>
        <li>{$_("about.projectFeature4")}</li>
        <li>{$_("about.projectFeature5")}</li>
      </ul>
      <p class="text-sm text-muted-foreground font-medium">
        {$_("about.projectFreeForever")}
      </p>
    </Card.Content>
  </Card.Root>

  <!-- About Me -->
  <Card.Root
    class="mb-6 gap-4 animate-fade-in-up"
    style="animation-delay: 150ms"
  >
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
          {$_("about.moreAboutMe")}
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Data Sources -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 200ms">
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
          <AlertTriangle class="h-5 w-5 text-red-500" />
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
  <Card.Root
    class="mb-6 border-blue-500/50 animate-fade-in-up"
    style="animation-delay: 250ms"
  >
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
  <Card.Root
    class="mb-6 gap-4 border-amber-500/50 animate-fade-in-up"
    style="animation-delay: 300ms"
  >
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

  <!-- Support -->
  <Card.Root
    class="mb-6 gap-4 border-rose-500/50 bg-gradient-to-br from-rose-500/5 to-amber-500/5 animate-fade-in-up"
    style="animation-delay: 350ms"
  >
    <Card.Header>
      <Card.Title class="text-lg flex items-center gap-2">
        <Coffee class="h-5 w-5 text-rose-500" />
        {$_("about.supportTitle")}
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {$_("about.supportDescription")}
      </p>
      <p class="text-sm text-muted-foreground">
        {$_("about.supportDescription2")}
      </p>
      <Button
        variant="default"
        class="gap-2 bg-[#D44545] hover:bg-[#C03838] text-white"
        href="https://www.buymeacoffee.com/shabanca"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Coffee class="h-4 w-4" />
        {$_("about.buyMeACoffee")}
      </Button>
    </Card.Content>
  </Card.Root>

  <!-- Footer -->
  <div
    class="text-center text-sm text-muted-foreground space-y-1 animate-fade-in-up"
    style="animation-delay: 400ms"
  >
    <p class="inline-flex items-center gap-1">
      {$_("about.madeWith")}
      <Heart class="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
      {$_("about.inToronto")}
    </p>
    <p>© {new Date().getFullYear()} rideTO</p>
  </div>
</main>
