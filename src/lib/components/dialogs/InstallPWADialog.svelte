<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Download, Share, Plus, MoreVertical } from "lucide-svelte";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  // Detect browser/platform
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone);
</script>

<Dialog.Root bind:open onOpenChange={(v) => onOpenChange?.(v)}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title class="text-xl">Install TTC Alerts</Dialog.Title>
      <Dialog.Description>
        Add to your home screen for quick access
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-4">
      {#if isStandalone}
        <div class="text-center space-y-2">
          <div
            class="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p class="font-medium">Already installed!</p>
          <p class="text-sm text-muted-foreground">
            You're using the installed version of TTC Alerts.
          </p>
        </div>
      {:else if isIOS}
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              1
            </div>
            <div>
              <p class="font-medium">Tap the Share button</p>
              <p class="text-sm text-muted-foreground flex items-center gap-1">
                Look for <Share class="h-4 w-4 inline" /> at the bottom of Safari
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              2
            </div>
            <div>
              <p class="font-medium">Scroll and tap "Add to Home Screen"</p>
              <p class="text-sm text-muted-foreground flex items-center gap-1">
                Look for <Plus class="h-4 w-4 inline" /> Add to Home Screen
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              3
            </div>
            <div>
              <p class="font-medium">Tap "Add" to confirm</p>
              <p class="text-sm text-muted-foreground">
                The app will appear on your home screen
              </p>
            </div>
          </div>

          <!-- iOS storage warning -->
          <div
            class="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ Important
            </p>
            <p class="text-sm text-amber-600 dark:text-amber-400/90 mt-1">
              Your saved stops and routes won't transfer to the installed app.
              The home screen app uses separate storage from Safari.
            </p>
          </div>
        </div>
      {:else if isAndroid}
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              1
            </div>
            <div>
              <p class="font-medium">Tap the menu button</p>
              <p class="text-sm text-muted-foreground flex items-center gap-1">
                Look for <MoreVertical class="h-4 w-4 inline" /> in Chrome
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              2
            </div>
            <div>
              <p class="font-medium">
                Tap "Install app" or "Add to Home screen"
              </p>
              <p class="text-sm text-muted-foreground">
                Follow the prompts to install
              </p>
            </div>
          </div>
        </div>
      {:else}
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            Look for the install icon <Download class="h-4 w-4 inline" /> in your
            browser's address bar, or use your browser's menu to "Install" or "Add
            to Home Screen".
          </p>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button onclick={() => (open = false)} variant="outline" class="w-full">
        Maybe Later
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
