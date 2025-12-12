<script lang="ts">
  import { _ } from "svelte-i18n";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Filter, RefreshCw, Star, Smartphone } from "lucide-svelte";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  // Steps computed from translations
  const stepIcons = [Filter, Star, RefreshCw, Smartphone];
  const stepKeys = [
    "filterAlerts",
    "setPreferences",
    "stayUpdated",
    "installApp",
  ];
</script>

<Dialog.Root bind:open onOpenChange={(v) => onOpenChange?.(v)}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="text-xl">{$_("howToUse.title")}</Dialog.Title>
      <Dialog.Description>
        {$_("howToUse.description")}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      {#each stepKeys as key, i}
        {@const Icon = stepIcons[i]}
        <div class="flex gap-4 items-start">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Icon class="h-5 w-5" />
          </div>
          <div>
            <h3 class="font-semibold">{$_(`howToUse.${key}.title`)}</h3>
            <p class="text-sm text-muted-foreground">
              {$_(`howToUse.${key}.description`)}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <Dialog.Footer>
      <Button onclick={() => (open = false)} class="w-full"
        >{$_("common.gotIt")}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
