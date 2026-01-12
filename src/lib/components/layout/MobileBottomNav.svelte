<script lang="ts">
  import { _ } from "svelte-i18n";
  import { Home, AlertTriangle, Settings, Route } from "lucide-svelte";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let isCompact = $state(false);
  let lastScrollY = 0;
  let scrollThreshold = 100; // Pixels scrolled down before compact mode
  let scrollDelta = 0; // Track scroll movement
  let compactBuffer = 20; // Buffer zone to prevent flickering

  function isActive(href: string): boolean {
    const currentPath = $page.url.pathname;
    const homeParam = $page.url.searchParams.get("home");

    if (href === "/settings") {
      return currentPath === "/settings";
    }
    if (href === "/routes") {
      // Active for /routes but not /routes/[route] detail pages
      return currentPath === "/routes";
    }
    if (href === "/alerts") {
      return currentPath === "/alerts";
    }
    // Home tab: active when on / with any ?home= param or no param
    if (href === "/") {
      return currentPath === "/" || currentPath.length === 0;
    }
    return false;
  }

  // Handle scroll for compact mode with smooth transitions
  function handleScroll() {
    // Scroll happens on body element due to iOS fixes
    const currentScrollY = document.body.scrollTop || window.scrollY;
    scrollDelta = currentScrollY - lastScrollY;

    // If at top (within 10px), always show full nav
    if (currentScrollY < 10) {
      isCompact = false;
      lastScrollY = currentScrollY;
      return;
    }

    // Require sustained scrolling to trigger compact mode
    // Scrolling down and past threshold + buffer
    if (scrollDelta > 0 && currentScrollY > scrollThreshold) {
      // Only compact if scrolling down more than buffer
      if (scrollDelta > 5 || isCompact) {
        isCompact = true;
      }
    }
    // Scrolling up: need to scroll up beyond buffer to expand
    else if (scrollDelta < 0) {
      if (Math.abs(scrollDelta) > 5 || !isCompact) {
        isCompact = false;
      }
    }

    lastScrollY = currentScrollY;
  }

  // Fix for iOS dynamic viewport + scroll handling + safe area
  onMount(() => {
    // CSS Tricks method: Set --vh custom property based on actual viewport height
    // This fixes iOS PWA where viewport height can be incorrect on first load
    const setViewportHeight = () => {
      // Use visualViewport if available (more accurate on mobile)
      const vh = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
      document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
    };

    // iOS PWA fix: Calculate safe area inset on mount
    // env(safe-area-inset-bottom) isn't always available immediately in PWA
    const setSafeAreaInset = () => {
      // Create a test element to measure the computed safe area inset
      const testEl = document.createElement('div');
      testEl.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;';
      document.body.appendChild(testEl);
      
      // Get computed height
      const safeAreaHeight = testEl.offsetHeight;
      document.body.removeChild(testEl);
      
      // Set as CSS variable (fallback for when env() isn't ready)
      if (safeAreaHeight > 0) {
        document.documentElement.style.setProperty(
          '--safe-area-inset-bottom-fallback',
          `${safeAreaHeight}px`
        );
        console.log(`[iOS Safe Area] Measured: ${safeAreaHeight}px`);
      }
    };

    // Detect if we're in iOS PWA standalone mode
    const isIOSPWA = (window.navigator as any).standalone === true;
    
    // iOS PWA specific fix: Force viewport recalculation
    // The viewport can be incorrect on first launch, so we force multiple updates
    if (isIOSPWA) {
      document.documentElement.classList.add('ios-pwa');
      
      // Immediate set
      setViewportHeight();
      setSafeAreaInset();
      
      // Force a micro-scroll to trigger viewport recalculation
      // This is a known workaround for iOS PWA viewport bugs
      requestAnimationFrame(() => {
        window.scrollTo(0, 1);
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          setViewportHeight();
          setSafeAreaInset();
        });
      });
      
      // Additional delayed checks for iOS timing issues
      setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 50);
      setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 150);
      setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 300);
      
      // Listen to visualViewport resize for accurate updates
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          setViewportHeight();
          setSafeAreaInset();
        });
      }
    } else {
      setViewportHeight();
      setSafeAreaInset();
      
      // Re-check safe area after a delay (iOS sometimes needs time)
      setTimeout(setSafeAreaInset, 100);
      setTimeout(setSafeAreaInset, 500);
    }
    
    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("resize", setSafeAreaInset);

    // Also handle orientation change
    window.addEventListener("orientationchange", () => {
      setTimeout(setViewportHeight, 100);
    });

    // Detect Chrome on iOS and add class for CSS targeting
    // Chrome on iOS: contains "CriOS" in user agent
    // Safari on iOS: contains "Safari" but NOT "CriOS" or "Chrome"
    const isIOSChrome = /CriOS/i.test(navigator.userAgent);
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Only apply viewport fix class for Chrome on iOS in browser mode (not PWA)
    if (isIOSChrome && !isStandaloneMode) {
      document.documentElement.classList.add("ios-chrome-browser");
    }

    // Add scroll listener for compact mode
    // Listen on both window and body since scrolling happens on body
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.body.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("resize", setSafeAreaInset);
      window.removeEventListener("scroll", handleScroll);
      document.body.removeEventListener("scroll", handleScroll);
      document.documentElement.classList.remove("ios-chrome-browser");
    };
  });
</script>

<nav class="mobile-bottom-nav" class:compact={isCompact}>
  <a href="/" class="nav-item {isActive('/') ? 'active' : ''}">
    <Home />
    <span>{$_("navigation.home")}</span>
  </a>
  <a href="/alerts" class="nav-item {isActive('/alerts') ? 'active' : ''}">
    <AlertTriangle />
    <span>{$_("navigation.alerts")}</span>
  </a>
  <a href="/routes" class="nav-item {isActive('/routes') ? 'active' : ''}">
    <Route />
    <span>{$_("navigation.routes")}</span>
  </a>
  <a href="/settings" class="nav-item {isActive('/settings') ? 'active' : ''}">
    <Settings />
    <span>{$_("navigation.settings")}</span>
  </a>
</nav>
