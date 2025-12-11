<script lang="ts">
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from "svelte-sonner";
  import { mode } from "mode-watcher";

  let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
  theme={mode.current}
  class="toaster group"
  toastOptions={{
    classes: {
      toast:
        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
      title: "group-[.toast]:text-foreground group-[.toast]:font-medium",
      description:
        "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
      actionButton:
        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
      cancelButton:
        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      success:
        "group-[.toaster]:border-green-500/30 group-[.toaster]:bg-green-500/10 dark:group-[.toaster]:bg-green-500/20",
      info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-500/10 dark:group-[.toaster]:bg-blue-500/20",
      warning:
        "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/10 dark:group-[.toaster]:bg-amber-500/20",
      error:
        "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-500/10 dark:group-[.toaster]:bg-red-500/20",
    },
  }}
  position="bottom-center"
  richColors={false}
  expand={false}
  duration={3000}
  visibleToasts={3}
  closeButton={false}
  style="--normal-bg: hsl(var(--background)); --normal-text: hsl(var(--foreground)); --normal-border: hsl(var(--border));"
  {...restProps}
/>
