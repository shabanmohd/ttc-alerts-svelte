<script lang="ts">
  import { Drawer as DrawerPrimitive } from "vaul-svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  type ClosePropsWithRef = DrawerPrimitive.CloseProps & {
    ref?: HTMLButtonElement | null;
  };
  let { ref = $bindable(null), ...restProps }: ClosePropsWithRef = $props();
</script>

<DrawerPrimitive.Close bind:ref data-slot="drawer-close" {...restProps} />
