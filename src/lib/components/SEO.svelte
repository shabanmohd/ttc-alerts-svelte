<script lang="ts">
  import { page } from "$app/stores";

  interface Props {
    title: string;
    description: string;
    image?: string;
    type?: string;
    noindex?: boolean;
  }

  let {
    title,
    description,
    image = "/icons/og-image.png?v=6",
    type = "website",
    noindex = false,
  }: Props = $props();

  const baseUrl = "https://rideto.ca";

  // Reactive canonical URL
  let canonicalUrl = $derived(`${baseUrl}${$page.url.pathname}`);

  // Ensure image is absolute
  let imageUrl = $derived(
    image.startsWith("http") ? image : `${baseUrl}${image}`
  );
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <!-- Canonical URL -->
  <link rel="canonical" href={canonicalUrl} />

  <!-- Robots -->
  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="rideTO - Toronto Transit Alerts" />
  <meta property="og:site_name" content="rideTO" />
  <meta property="og:locale" content="en_CA" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={canonicalUrl} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />

  <!-- Language Alternates -->
  <link rel="alternate" hreflang="en" href={canonicalUrl} />
  <link rel="alternate" hreflang="fr" href="{canonicalUrl}?lang=fr" />
  <link rel="alternate" hreflang="x-default" href={canonicalUrl} />
</svelte:head>
