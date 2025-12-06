<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let { class: className = '', size = 'sm' }: Props = $props();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
</script>

<svg
  viewBox="0 0 16 16"
  class={cn('live-signal-icon', sizeClasses[size], className)}
  aria-hidden="true"
>
  <g transform="translate(4.000000, 0.000000)">
    <!-- Outer arc -->
    <path
      d="M2.696,15.99 C2.453,15.99 2.219,15.86 2.101,15.636 C1.932,15.317 2.063,14.926 2.391,14.764 C5.01,13.468 6.637,10.879 6.637,8.008 C6.637,5.133 5.008,2.543 2.384,1.248 C2.056,1.086 1.924,0.695 2.091,0.376 C2.258,0.057 2.658,-0.071 2.99,0.092 C6.062,1.609 7.972,4.642 7.972,8.008 C7.972,11.368 6.065,14.401 2.997,15.92 C2.902,15.968 2.798,15.99 2.696,15.99 L2.696,15.99 Z"
      class="signal-arc signal-arc-3"
      fill="currentColor"
    />
    <!-- Middle arc -->
    <path
      d="M1.13,13.93 C0.89,13.93 0.673,13.797 0.563,13.582 C0.494,13.445 0.478,13.287 0.521,13.14 C0.569,12.972 0.682,12.834 0.839,12.752 C2.612,11.848 3.781,10.036 3.781,8.023 C3.781,6.009 2.609,4.195 0.833,3.29 C0.677,3.211 0.563,3.074 0.516,2.908 C0.472,2.758 0.488,2.6 0.557,2.461 C0.665,2.248 0.883,2.115 1.124,2.115 C1.226,2.115 1.324,2.139 1.415,2.184 C3.614,3.306 4.981,5.542 4.981,8.023 C4.981,10.502 3.616,12.737 1.422,13.857 C1.329,13.905 1.231,13.93 1.13,13.93 L1.13,13.93 Z"
      class="signal-arc signal-arc-2"
      fill="currentColor"
    />
    <!-- Inner arc -->
    <path
      d="M0.173,11.019 C-0.033,11.019 -0.227,10.879 -0.318,10.663 C-0.459,10.343 -0.35,9.95 -0.077,9.784 C0.481,9.45 0.826,8.786 0.826,8.052 C0.826,7.317 0.479,6.652 -0.078,6.318 C-0.35,6.154 -0.46,5.76 -0.322,5.441 C-0.226,5.22 -0.038,5.084 0.171,5.084 C0.259,5.084 0.344,5.107 0.423,5.154 C1.355,5.713 1.934,6.824 1.934,8.052 C1.934,9.28 1.355,10.39 0.424,10.948 C0.346,10.993 0.259,11.019 0.173,11.019 L0.173,11.019 Z"
      class="signal-arc signal-arc-1"
      fill="currentColor"
    />
  </g>
</svg>

<style>
  .live-signal-icon {
    color: #22c55e; /* Green for live */
  }

  /* Animate each arc with a staggered wave effect */
  .signal-arc {
    animation: signal-pulse 1.5s ease-in-out infinite;
  }

  .signal-arc-1 {
    animation-delay: 0s;
  }

  .signal-arc-2 {
    animation-delay: 0.15s;
  }

  .signal-arc-3 {
    animation-delay: 0.3s;
  }

  @keyframes signal-pulse {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .signal-arc {
      animation: none;
      opacity: 1;
    }
  }

  :global(html.reduce-motion) .signal-arc {
    animation: none;
    opacity: 1;
  }
</style>
