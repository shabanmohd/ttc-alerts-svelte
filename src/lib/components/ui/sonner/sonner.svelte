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
      description: "group-[.toast]:text-foreground/90 group-[.toast]:text-sm",
      actionButton:
        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
      cancelButton:
        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      success:
        "group-[.toaster]:border-green-600/40 group-[.toaster]:bg-green-700 group-[.toaster]:text-white dark:group-[.toaster]:bg-green-800 dark:group-[.toaster]:text-green-50",
      info: "group-[.toaster]:border-blue-600/40 group-[.toaster]:bg-blue-700 group-[.toaster]:text-white dark:group-[.toaster]:bg-blue-800 dark:group-[.toaster]:text-blue-50",
      warning:
        "group-[.toaster]:border-amber-600/40 group-[.toaster]:bg-amber-600 group-[.toaster]:text-white dark:group-[.toaster]:bg-amber-700 dark:group-[.toaster]:text-amber-50",
      error:
        "group-[.toaster]:border-red-600/40 group-[.toaster]:bg-red-700 group-[.toaster]:text-white dark:group-[.toaster]:bg-red-800 dark:group-[.toaster]:text-red-50",
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
