# iOS Bottom Navigation Offset Fix

## Problem

When swiping up on iOS (Chrome/Safari), the bottom navigation bar would offset/shift position, especially when the browser's toolbar shows/hides. This is a common issue on iOS due to the dynamic viewport height changes.

## Root Cause

1. **Dynamic Viewport** - iOS Safari/Chrome changes the viewport height when the toolbar shows/hides
2. **Rubber-banding** - iOS default bounce effect causes content to shift
3. **Fixed Positioning** - `position: fixed` elements don't always stay fixed during scroll on iOS
4. **Compositing Layers** - Without explicit GPU layer, the nav can lag during animations

## Solution

### Browser Mode vs PWA Mode - Chrome vs Safari

**Key Insight:** The viewport fix works great for Chrome on iOS but breaks Safari's address bar auto-hide feature. Solution: Use JavaScript to detect **Chrome on iOS specifically** and add a CSS class for targeting.

```javascript
// MobileBottomNav.svelte - onMount
const isIOSChrome = /CriOS/i.test(navigator.userAgent);
const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

// Only apply viewport fix class for Chrome on iOS in browser mode (not PWA)
if (isIOSChrome && !isStandaloneMode) {
  document.documentElement.classList.add('ios-chrome-browser');
}
```

```css
/* Only apply viewport fix to Chrome on iOS browser mode */
/* Safari and PWA keep normal behavior */
html.ios-chrome-browser {
  position: fixed;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

html.ios-chrome-browser body {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

**Why this works:**

- `CriOS` in user agent identifies Chrome on iOS specifically
- Safari on iOS does NOT have `CriOS` in its user agent
- PWA mode is excluded via `display-mode: standalone` check
- Safari keeps its native address bar hide/show behavior
- Only Chrome gets the position:fixed fix it needs

### 1. Dynamic Viewport Height Tracking

Added JavaScript to track actual viewport height:

```svelte
<!-- MobileBottomNav.svelte -->
<script lang="ts">
  import { onMount } from "svelte";

  // Fix for iOS dynamic viewport
  onMount(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${window.innerHeight}px`
      );
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    // Also handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', setViewportHeight);
    };
  });
</script>
```

### 2. Force GPU Compositing Layer

Added `transform: translateZ(0)` to force the nav onto its own GPU layer:

```css
/* layout.css */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* ... other styles ... */
  z-index: 50;

  /* Key fix: use transform to force GPU layer */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}
```

**Why it works:**

- Forces browser to create a separate compositing layer
- Prevents repaints/reflows from affecting the nav
- Smoother animations and positioning

### 3. Fix HTML/Body Positioning (Chrome on iOS Only)

Prevent the viewport from shifting (only for Chrome on iOS, not Safari or PWA):

```css
/* layout.css */
/* Default styles for all modes */
html {
  color-scheme: light;
  background-color: hsl(var(--background));
  overscroll-behavior: none;
  overscroll-behavior-y: none;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  /* ... other styles ... */
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  min-height: 100vh;
  min-height: 100dvh;
}

/* Chrome on iOS browser mode only - fix viewport shifting */
/* Class added via JavaScript detection of CriOS in user agent */
html.ios-chrome-browser {
  position: fixed;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

html.ios-chrome-browser body {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

  /* iOS scrolling fixes */
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

**Why it works:**

- `.ios-chrome-browser` class only added when `CriOS` detected in user agent (Chrome on iOS)
- `html` is `position: fixed` - Prevents viewport shifts from browser chrome
- `body` handles scrolling - Maintains smooth scroll behavior
- `-webkit-overflow-scrolling: touch` - Native iOS momentum scrolling
- `overscroll-behavior-y: none` - Prevents rubber-band bounce
- Safari keeps normal behavior - address bar auto-hides on scroll as expected
- PWA keeps the simpler `min-height: 100dvh` approach which works well in standalone mode

## Key Concepts

### Chrome vs Safari Detection on iOS

Since Chrome and Safari on iOS both match `display-mode: browser`, we use JavaScript user agent detection:

```javascript
// Chrome on iOS has "CriOS" in user agent
const isIOSChrome = /CriOS/i.test(navigator.userAgent);

// Safari on iOS examples:
// "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605... Safari/604.1"

// Chrome on iOS examples:
// "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605... CriOS/120.0..."
```

**Why we need different treatment:**
| Browser | Address bar behavior | Viewport | Needs fix |
|---------|---------------------|----------|-----------|
| Safari iOS | Auto-hide on scroll (good UX) | Dynamic but expected | ❌ No |
| Chrome iOS | Toolbar can shift content | Dynamic, causes nav shift | ✅ Yes |
| PWA | No browser chrome | Stable | ❌ No |

### Position Fixed on iOS

`position: fixed` on iOS doesn't work the same as desktop browsers:

- When toolbar hides/shows, fixed elements can shift
- The viewport height changes dynamically
- Need to explicitly handle these cases

### GPU Compositing

CSS properties that trigger GPU compositing:

- `transform: translateZ(0)` or `translate3d(0,0,0)`
- `will-change: transform`
- Certain `filter` properties
- `opacity` animations

For bottom navs, `translateZ(0)` is preferred because:

- Simple and effective
- No performance overhead of `will-change`
- Wide browser support

### Viewport Units on iOS

- `vh` units are based on initial viewport (with toolbar hidden)
- When toolbar shows, `vh` doesn't update
- Use JavaScript to set custom CSS properties with actual `window.innerHeight`

## Files Modified

1. **src/lib/components/layout/MobileBottomNav.svelte**

   - Added `onMount` hook with viewport height tracking
   - Handles `resize` and `orientationchange` events

2. **src/routes/layout.css**
   - Added `transform: translateZ(0)` to `.mobile-bottom-nav`
   - Updated `html` with iOS viewport fixes
   - Updated `body` with iOS scrolling fixes

## Testing

Test on:

- ✅ iOS Safari (iPhone)
- ✅ iOS Chrome (iPhone)
- ✅ iOS Safari (iPad)
- Both portrait and landscape orientations
- Swipe up to hide toolbar, swipe down to show

## Alternative Solutions

If this solution doesn't work in your case, try:

1. **Use `dvh` (Dynamic Viewport Height):**

   ```css
   height: 100dvh;
   ```

   Only works in newer iOS versions (iOS 15.4+)

2. **Use `env(safe-area-inset-bottom)`:**

   ```css
   padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
   ```

   Already implemented in this project

3. **Use IntersectionObserver:**
   Track when nav enters/exits viewport and adjust positioning

4. **Use `position: sticky`:**
   Sometimes more reliable than `fixed` on iOS
   ```css
   position: sticky;
   bottom: 0;
   ```

## References

- [CSS-Tricks: iOS viewport units](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/)
- [MDN: position - fixed](https://developer.mozilla.org/en-US/docs/Web/CSS/position#fixed)
- [WebKit: Viewport height on iOS](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Stack Overflow: Bottom nav iOS](https://stackoverflow.com/questions/52848856/css-100vh-not-constant-in-mobile-browser)

## Commit Reference

Implemented in commit: `703ae8f` (Dec 11, 2025)

- "fix: iOS bottom nav offset when swiping up in Chrome/Safari"
