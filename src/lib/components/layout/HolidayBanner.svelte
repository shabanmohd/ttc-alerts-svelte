<script lang="ts">
  import { _ } from "svelte-i18n";
  import { browser } from "$app/environment";
  import { Calendar, ExternalLink, X } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import {
    getUpcomingHolidays,
    isHolidayDismissed,
    dismissHoliday,
    TTC_HOLIDAY_SCHEDULE_URL,
    type TTCHoliday,
  } from "$lib/data/ttc-holidays";
  import { locale } from "svelte-i18n";

  // Get current language
  let currentLang = $derived($locale?.split("-")[0] || "en");

  // Get upcoming holidays (today and/or tomorrow)
  let holidays = $state<{
    today: TTCHoliday | null;
    tomorrow: TTCHoliday | null;
  }>({
    today: null,
    tomorrow: null,
  });

  // Track dismissed state
  let dismissedToday = $state(false);
  let dismissedTomorrow = $state(false);

  // Initialize on mount
  $effect(() => {
    if (browser) {
      const upcoming = getUpcomingHolidays();
      holidays = upcoming;

      // Check if already dismissed
      if (upcoming.today) {
        dismissedToday = isHolidayDismissed(upcoming.today);
      }
      if (upcoming.tomorrow) {
        dismissedTomorrow = isHolidayDismissed(upcoming.tomorrow);
      }
    }
  });

  // Derived: Should show today's banner?
  let showTodayBanner = $derived(holidays.today && !dismissedToday);

  // Derived: Should show tomorrow's banner?
  let showTomorrowBanner = $derived(holidays.tomorrow && !dismissedTomorrow);

  // Derived: Any banner to show?
  let showAnyBanner = $derived(showTodayBanner || showTomorrowBanner);

  // Get holiday name based on language
  function getHolidayName(holiday: TTCHoliday): string {
    return currentLang === "fr" ? holiday.nameFr : holiday.name;
  }

  function handleDismissToday() {
    if (holidays.today) {
      dismissHoliday(holidays.today);
      dismissedToday = true;
    }
  }

  function handleDismissTomorrow() {
    if (holidays.tomorrow) {
      dismissHoliday(holidays.tomorrow);
      dismissedTomorrow = true;
    }
  }
</script>

{#if showAnyBanner}
  <div class="holiday-banners">
    {#if showTodayBanner && holidays.today}
      <div
        class="holiday-banner today"
        role="alert"
        transition:slide={{ duration: 200 }}
      >
        <div class="banner-content">
          <div class="banner-icon">
            <Calendar class="h-4 w-4" />
          </div>
          <div class="banner-text">
            <span class="banner-message">
              {currentLang === "fr" ? "Aujourd'hui :" : "Today:"}
              {getHolidayName(holidays.today)}
            </span>
            <span class="banner-separator">•</span>
            <span class="banner-description">
              {currentLang === "fr"
                ? "Pour les changements de service —"
                : "For service changes —"}
              <a
                href={TTC_HOLIDAY_SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="banner-link-inline"
              >
                {currentLang === "fr" ? "Visitez le site TTC" : "Visit TTC"}
                <ExternalLink class="h-3.5 w-3.5 inline-icon" />
              </a>
            </span>
          </div>
        </div>
        <div class="banner-actions">
          <button
            class="banner-button dismiss"
            onclick={handleDismissToday}
            aria-label={$_("common.close")}
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    {/if}

    {#if showTomorrowBanner && holidays.tomorrow}
      <div
        class="holiday-banner tomorrow"
        role="alert"
        transition:slide={{ duration: 200 }}
      >
        <div class="banner-content">
          <div class="banner-icon">
            <Calendar class="h-4 w-4" />
          </div>
          <div class="banner-text">
            <span class="banner-message">
              {currentLang === "fr" ? "Demain :" : "Tomorrow:"}
              {getHolidayName(holidays.tomorrow)}
            </span>
            <span class="banner-separator">•</span>
            <span class="banner-description">
              {currentLang === "fr"
                ? "Pour les changements de service —"
                : "For service changes —"}
              <a
                href={TTC_HOLIDAY_SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="banner-link-inline"
              >
                {currentLang === "fr" ? "Visitez le site TTC" : "Visit TTC"}
                <ExternalLink class="h-3.5 w-3.5 inline-icon" />
              </a>
            </span>
          </div>
        </div>
        <div class="banner-actions">
          <button
            class="banner-button dismiss"
            onclick={handleDismissTomorrow}
            aria-label={$_("common.close")}
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .holiday-banners {
    display: flex;
    flex-direction: column;
  }

  /* Account for desktop sidebar */
  @media (min-width: 1024px) {
    .holiday-banners {
      margin-left: 16rem;
    }
  }

  .holiday-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    gap: 0.75rem;
    font-size: calc(0.875rem * var(--text-scale, 1));
    border-bottom: 1px solid;
  }

  /* Amber/warning style for holidays */
  .holiday-banner.today {
    background-color: hsl(45 93% 47% / 0.1);
    border-color: hsl(45 93% 47% / 0.3);
    color: hsl(45 93% 30%);
  }

  :global(.dark) .holiday-banner.today {
    background-color: hsl(45 93% 47% / 0.15);
    color: hsl(45 93% 58%);
  }

  /* Slightly lighter for tomorrow */
  .holiday-banner.tomorrow {
    background-color: hsl(210 40% 96%);
    border-color: hsl(210 30% 88%);
    color: hsl(210 30% 35%);
  }

  :global(.dark) .holiday-banner.tomorrow {
    background-color: hsl(210 40% 20% / 0.5);
    border-color: hsl(210 30% 35%);
    color: hsl(210 30% 75%);
  }

  .banner-content {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .banner-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  @media (min-width: 640px) {
    .banner-text {
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;
    }
  }

  .banner-message {
    font-weight: 600;
    white-space: nowrap;
  }

  .banner-separator {
    display: none;
    opacity: 0.5;
    font-weight: 400;
  }

  @media (min-width: 640px) {
    .banner-separator {
      display: inline;
    }
  }

  .banner-description {
    font-weight: 400;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .banner-link-inline {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 500;
    opacity: 0.9;
    transition: opacity 0.15s ease;
  }

  .banner-link-inline:hover {
    opacity: 1;
  }

  .banner-link-inline :global(.inline-icon) {
    flex-shrink: 0;
  }

  .banner-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius);
    background: transparent;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease;
  }

  .banner-button:hover {
    opacity: 1;
    background-color: hsl(var(--foreground) / 0.1);
  }

  .banner-button.dismiss {
    font-size: 1.25rem;
    font-weight: 300;
    line-height: 1;
  }
</style>
