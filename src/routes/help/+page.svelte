<script lang="ts">
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
  import {
    HelpCircle,
    Filter,
    Star,
    Bell,
    Smartphone,
    MapPin,
    RefreshCw,
    AlertTriangle,
    Settings,
    ChevronLeft,
    ExternalLink,
    Fingerprint,
    Shield,
  } from "lucide-svelte";

  // Track which accordion items are open
  let openItems = $state<string[]>(["getting-started"]);
</script>

<svelte:head>
  <title>{$_("help.pageTitle")}</title>
</svelte:head>

<Header />

<main class="content-area pb-24">
  <!-- Page Header -->
  <div class="mb-6 animate-fade-in-up" style="animation-delay: 0ms">
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
      <HelpCircle class="h-7 w-7" />
      {$_("help.title")}
    </h1>
    <p class="text-muted-foreground mt-2">
      {$_("help.subtitle")}
    </p>
  </div>

  <!-- Quick Start Section -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 50ms">
    <Card.Header>
      <Card.Title class="text-lg">{$_("help.quickStart")}</Card.Title>
      <Card.Description>{$_("help.quickStartDesc")}</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Step 1 -->
        <div class="flex gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <span class="font-bold">1</span>
          </div>
          <div>
            <h3 class="font-semibold">{$_("help.step1Title")}</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {$_("help.step1Desc")}
            </p>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <span class="font-bold">2</span>
          </div>
          <div>
            <h3 class="font-semibold">{$_("help.step2Title")}</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {$_("help.step2Desc")}
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <span class="font-bold">3</span>
          </div>
          <div>
            <h3 class="font-semibold">{$_("help.step3Title")}</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {$_("help.step3Desc")}
            </p>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="flex gap-3 p-3 rounded-lg bg-muted/50">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <span class="font-bold">4</span>
          </div>
          <div>
            <h3 class="font-semibold">{$_("help.step4Title")}</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {$_("help.step4Desc")}
            </p>
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Features Guide -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 100ms">
    <Card.Header>
      <Card.Title class="text-lg">{$_("help.featuresGuide")}</Card.Title>
      <Card.Description>{$_("help.featuresGuideDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="p-0">
      <Accordion.Root type="multiple" bind:value={openItems} class="w-full">
        <!-- Getting Started -->
        <Accordion.Item
          value="getting-started"
          class="border-b border-border px-6"
        >
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10"
              >
                <Star class="h-4 w-4 text-blue-500" />
              </div>
              <span class="font-medium">{$_("help.gettingStarted")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.gettingStartedContent1")}</p>
              <p>{$_("help.gettingStartedContent2")}</p>
              <p>{$_("help.gettingStartedContent3")}</p>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- Understanding Alerts -->
        <Accordion.Item
          value="understanding-alerts"
          class="border-b border-border px-6"
        >
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10"
              >
                <AlertTriangle class="h-4 w-4 text-amber-500" />
              </div>
              <span class="font-medium">{$_("help.understandingAlerts")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.understandingAlertsContent1")}</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong class="text-foreground"
                    >{$_("help.alertTypeDisruption")}</strong
                  >
                  - {$_("help.alertTypeDisruptionDesc")}
                </li>
                <li>
                  <strong class="text-foreground"
                    >{$_("help.alertTypeDelay")}</strong
                  >
                  - {$_("help.alertTypeDelayDesc")}
                </li>
                <li>
                  <strong class="text-foreground"
                    >{$_("help.alertTypeDetour")}</strong
                  >
                  - {$_("help.alertTypeDetourDesc")}
                </li>
                <li>
                  <strong class="text-foreground"
                    >{$_("help.alertTypeResumed")}</strong
                  >
                  - {$_("help.alertTypeResumedDesc")}
                </li>
              </ul>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- Filtering & Search -->
        <Accordion.Item value="filtering" class="border-b border-border px-6">
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10"
              >
                <Filter class="h-4 w-4 text-green-500" />
              </div>
              <span class="font-medium">{$_("help.filteringSearch")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.filteringContent1")}</p>
              <p>{$_("help.filteringContent2")}</p>
              <p>{$_("help.filteringContent3")}</p>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- Saving Routes & Stops -->
        <Accordion.Item value="saving" class="border-b border-border px-6">
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10"
              >
                <MapPin class="h-4 w-4 text-purple-500" />
              </div>
              <span class="font-medium">{$_("help.savingRoutesStops")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.savingContent1")}</p>
              <p>{$_("help.savingContent2")}</p>
              <p>{$_("help.savingContent3")}</p>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- Install as App -->
        <Accordion.Item value="install" class="border-b border-border px-6">
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10"
              >
                <Smartphone class="h-4 w-4 text-cyan-500" />
              </div>
              <span class="font-medium">{$_("help.installApp")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.installContent1")}</p>
              <div class="space-y-2 mt-2">
                <p>
                  <strong class="text-foreground">iOS Safari:</strong>
                  {$_("help.installIOS")}
                </p>
                <p>
                  <strong class="text-foreground">Android Chrome:</strong>
                  {$_("help.installAndroid")}
                </p>
                <p>
                  <strong class="text-foreground">Desktop:</strong>
                  {$_("help.installDesktop")}
                </p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <!-- Account & Security -->
        <Accordion.Item value="account" class="px-6">
          <Accordion.Trigger class="py-4 hover:no-underline">
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10"
              >
                <Fingerprint class="h-4 w-4 text-rose-500" />
              </div>
              <span class="font-medium">{$_("help.accountSecurity")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.accountContent1")}</p>
              <p>{$_("help.accountContent2")}</p>
              <p>{$_("help.accountContent3")}</p>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </Card.Content>
  </Card.Root>

  <!-- Troubleshooting -->
  <Card.Root class="mb-6 animate-fade-in-up" style="animation-delay: 150ms">
    <Card.Header>
      <Card.Title class="text-lg">{$_("help.troubleshooting")}</Card.Title>
      <Card.Description>{$_("help.troubleshootingDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="p-0">
      <Accordion.Root type="multiple" class="w-full">
        <Accordion.Item
          value="alerts-not-loading"
          class="border-b border-border px-6"
        >
          <Accordion.Trigger class="py-4 hover:no-underline text-left">
            <span class="font-medium">{$_("help.faq1Question")}</span>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-2 text-sm text-muted-foreground">
              <p>{$_("help.faq1Answer1")}</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>{$_("help.faq1Tip1")}</li>
                <li>{$_("help.faq1Tip2")}</li>
                <li>{$_("help.faq1Tip3")}</li>
              </ul>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item
          value="app-wont-install"
          class="border-b border-border px-6"
        >
          <Accordion.Trigger class="py-4 hover:no-underline text-left">
            <span class="font-medium">{$_("help.faq2Question")}</span>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-2 text-sm text-muted-foreground">
              <p>{$_("help.faq2Answer1")}</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>{$_("help.faq2Tip1")}</li>
                <li>{$_("help.faq2Tip2")}</li>
                <li>{$_("help.faq2Tip3")}</li>
              </ul>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item
          value="biometric-issues"
          class="border-b border-border px-6"
        >
          <Accordion.Trigger class="py-4 hover:no-underline text-left">
            <span class="font-medium">{$_("help.faq3Question")}</span>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-2 text-sm text-muted-foreground">
              <p>{$_("help.faq3Answer1")}</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>{$_("help.faq3Tip1")}</li>
                <li>{$_("help.faq3Tip2")}</li>
                <li>{$_("help.faq3Tip3")}</li>
              </ul>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="data-outdated" class="px-6">
          <Accordion.Trigger class="py-4 hover:no-underline text-left">
            <span class="font-medium">{$_("help.faq4Question")}</span>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-2 text-sm text-muted-foreground">
              <p>{$_("help.faq4Answer1")}</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>{$_("help.faq4Tip1")}</li>
                <li>{$_("help.faq4Tip2")}</li>
              </ul>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </Card.Content>
  </Card.Root>

  <!-- Need More Help? -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-lg">{$_("help.needMoreHelp")}</Card.Title>
      <Card.Description>{$_("help.needMoreHelpDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col sm:flex-row gap-3">
      <Button variant="outline" class="gap-2" href="/settings">
        <Settings class="h-4 w-4" />
        {$_("help.goToSettings")}
      </Button>
      <Button
        variant="outline"
        class="gap-2"
        href="https://www.ttc.ca/service-alerts"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink class="h-4 w-4" />
        {$_("help.officialTTC")}
      </Button>
    </Card.Content>
  </Card.Root>
</main>
