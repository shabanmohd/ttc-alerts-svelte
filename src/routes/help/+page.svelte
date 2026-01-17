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
    Shield,
    Flag,
    Lightbulb,
    Info,
  } from "lucide-svelte";
  import { openDialog } from "$lib/stores/dialogs";
  import SEO from "$lib/components/SEO.svelte";

  // Track which accordion items are open
  let openItems = $state<string[]>(["getting-started"]);
</script>

<SEO
  title={$_("help.pageTitle")}
  description="Get started with rideTO. Learn how to save favorite stops, track routes, understand alert types, and make the most of your Toronto transit experience."
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
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary"
          >
            <span class="font-semibold text-sm">1</span>
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
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary"
          >
            <span class="font-semibold text-sm">2</span>
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
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary"
          >
            <span class="font-semibold text-sm">3</span>
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
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary"
          >
            <span class="font-semibold text-sm">4</span>
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

              <!-- iOS storage warning -->
              <div
                class="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <p
                  class="text-sm font-medium text-amber-700 dark:text-amber-400"
                >
                  ⚠️ {$_("help.iosWarningTitle")}
                </p>
                <p class="text-sm text-amber-600 dark:text-amber-400/90 mt-1">
                  {$_("help.iosWarningText")}
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
                <Shield class="h-4 w-4 text-rose-500" />
              </div>
              <span class="font-medium">{$_("help.dataPrivacy")}</span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="pb-4">
            <div class="space-y-3 text-sm text-muted-foreground pl-11">
              <p>{$_("help.dataContent1")}</p>
              <p>{$_("help.dataContent2")}</p>
              <p>{$_("help.dataContent3")}</p>
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

  <!-- Feedback & Support -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-lg">{$_("help.getInTouch")}</Card.Title>
      <Card.Description>{$_("help.getInTouchDesc")}</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col sm:flex-row flex-wrap gap-3">
      <Button
        variant="outline"
        class="gap-2"
        onclick={() => openDialog("report-bug")}
      >
        <Flag class="h-4 w-4" />
        {$_("feedback.reportIssue")}
      </Button>
      <Button
        variant="outline"
        class="gap-2"
        onclick={() => openDialog("feature-request")}
      >
        <Lightbulb class="h-4 w-4" />
        {$_("feedback.featureRequest")}
      </Button>
      <Button variant="outline" class="gap-2" href="/about">
        <Info class="h-4 w-4" />
        {$_("sidebar.about")}
      </Button>
    </Card.Content>
  </Card.Root>
</main>
