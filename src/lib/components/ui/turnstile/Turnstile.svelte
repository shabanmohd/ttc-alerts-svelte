<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";

  interface Props {
    siteKey?: string;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact";
    onSuccess?: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
  }

  let {
    siteKey = "0x4AAAAAACHF4JXq-mvLYcmf", // Production key
    theme = "auto",
    size = "normal",
    onSuccess,
    onError,
    onExpire,
  }: Props = $props();

  let container: HTMLDivElement;
  let widgetId: string | null = null;

  // Get theme based on document
  function getTheme(): "light" | "dark" {
    if (theme !== "auto") return theme;
    if (!browser) return "light";
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }

  // Render turnstile widget
  function renderWidget() {
    if (!browser || !container || !window.turnstile) return;

    // Remove existing widget if any
    if (widgetId) {
      window.turnstile.remove(widgetId);
      widgetId = null;
    }

    widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      theme: getTheme(),
      size,
      callback: (token: string) => {
        onSuccess?.(token);
      },
      "error-callback": () => {
        onError?.();
      },
      "expired-callback": () => {
        onExpire?.();
      },
    });
  }

  // Reset the widget (call this after form submission)
  export function reset() {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }

  // Get current token
  export function getToken(): string | undefined {
    if (widgetId && window.turnstile) {
      return window.turnstile.getResponse(widgetId);
    }
    return undefined;
  }

  onMount(() => {
    if (!browser) return;

    // Wait for turnstile script to load
    const checkTurnstile = setInterval(() => {
      if (window.turnstile) {
        clearInterval(checkTurnstile);
        renderWidget();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkTurnstile), 10000);
  });

  onDestroy(() => {
    if (widgetId && browser && window.turnstile) {
      window.turnstile.remove(widgetId);
    }
  });
</script>

<svelte:head>
  <script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
    async
    defer
  ></script>
</svelte:head>

<div bind:this={container} class="turnstile-container"></div>

<style>
  .turnstile-container {
    display: flex;
    justify-content: center;
    min-height: 65px;
  }
</style>
