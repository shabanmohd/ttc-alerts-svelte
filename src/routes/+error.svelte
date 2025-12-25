<script lang="ts">
  import { page } from "$app/stores";
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import { Button } from "$lib/components/ui/button";
  import { AlertTriangle, Home, ArrowLeft, SearchX } from "lucide-svelte";
</script>

<svelte:head>
  <title>{$page.status === 404 ? $_("error.notFound.pageTitle") : $_("error.generic.pageTitle")}</title>
</svelte:head>

<Header />

<main class="content-area pb-24">
  <div class="error-container">
    <!-- Error Icon -->
    <div class="error-icon" class:not-found={$page.status === 404}>
      {#if $page.status === 404}
        <SearchX class="h-12 w-12 sm:h-16 sm:w-16" />
      {:else}
        <AlertTriangle class="h-12 w-12 sm:h-16 sm:w-16" />
      {/if}
    </div>

    <!-- Error Code -->
    <div class="error-code">
      {$page.status}
    </div>

    <!-- Error Title -->
    <h1 class="error-title">
      {#if $page.status === 404}
        {$_("error.notFound.title")}
      {:else}
        {$_("error.generic.title")}
      {/if}
    </h1>

    <!-- Error Description -->
    <p class="error-description">
      {#if $page.status === 404}
        {$_("error.notFound.description")}
      {:else if $page.error?.message}
        {$page.error.message}
      {:else}
        {$_("error.generic.description")}
      {/if}
    </p>

    <!-- Action Buttons -->
    <div class="error-actions">
      <Button href="/" class="gap-2">
        <Home class="h-4 w-4" />
        {$_("error.goHome")}
      </Button>
      <Button variant="outline" onclick={() => history.back()} class="gap-2">
        <ArrowLeft class="h-4 w-4" />
        {$_("error.goBack")}
      </Button>
    </div>

    <!-- Helpful Links -->
    <div class="helpful-links">
      <p class="helpful-links-title">{$_("error.helpfulLinks")}</p>
      <div class="links-grid">
        <a href="/alerts" class="link-item">
          {$_("navigation.alerts")}
        </a>
        <a href="/routes" class="link-item">
          {$_("navigation.routes")}
        </a>
        <a href="/settings" class="link-item">
          {$_("navigation.settings")}
        </a>
        <a href="/help" class="link-item">
          {$_("help.title")}
        </a>
      </div>
    </div>
  </div>
</main>

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 60vh;
    padding: 2rem 1rem;
  }

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 6rem;
    height: 6rem;
    border-radius: 9999px;
    background-color: hsl(var(--destructive) / 0.1);
    color: hsl(var(--destructive));
    margin-bottom: 1.5rem;
  }

  @media (min-width: 640px) {
    .error-icon {
      width: 8rem;
      height: 8rem;
    }
  }

  .error-icon.not-found {
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
  }

  .error-code {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  @media (min-width: 640px) {
    .error-code {
      font-size: 6rem;
    }
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin-bottom: 0.75rem;
  }

  @media (min-width: 640px) {
    .error-title {
      font-size: 2rem;
    }
  }

  .error-description {
    font-size: 1rem;
    color: hsl(var(--muted-foreground));
    max-width: 400px;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 280px;
    margin-bottom: 3rem;
  }

  @media (min-width: 640px) {
    .error-actions {
      flex-direction: row;
      max-width: none;
      width: auto;
    }
  }

  .helpful-links {
    border-top: 1px solid hsl(var(--border));
    padding-top: 2rem;
    width: 100%;
    max-width: 400px;
  }

  .helpful-links-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  @media (min-width: 640px) {
    .links-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .link-item {
    display: block;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: background-color 0.2s ease;
  }

  .link-item:hover {
    background-color: hsl(var(--muted-foreground) / 0.15);
  }
</style>
