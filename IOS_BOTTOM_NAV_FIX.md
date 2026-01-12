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

---

## ISSUE 2: iOS PWA First-Load Gap (RESOLVED)

### Problem Description

When the PWA is first launched on iOS (iPhone with Face ID), there is a visible dark gap between the bottom navigation bar and the actual bottom of the screen. **This gap disappears after refreshing the page.**

### Environment
- Device: iPhone with Face ID (safe area: 34px)
- Mode: PWA standalone (added to home screen)
- Behavior: First launch only - works correctly after refresh

### Visual Description
- Bottom nav appears positioned higher than expected
- Dark gap visible below the nav bar
- Gap is approximately the same size as safe area (~34px)

### Root Cause Analysis

The issue appears to be related to iOS Safari/WebKit's viewport calculation on PWA first launch:

1. **Initial viewport is taller than actual visible area** - iOS reports a viewport height that extends beyond the physical screen
2. **`bottom: 0` positions correctly relative to incorrect viewport** - The nav is at the "bottom" but the viewport extends past the screen
3. **Safe area inset IS being calculated correctly** - Console logs show `[iOS Safe Area] Measured: 34px`
4. **Refresh fixes it** - Suggesting the viewport recalculates correctly on subsequent loads

This is likely a WebKit timing bug where the PWA viewport isn't finalized before the initial render.

### Approaches Attempted (All Failed - Jan 12, 2026)

#### Attempt 1: JS-based Safe Area Fallback
**Approach**: Measure safe area with a test element and set CSS variable
```javascript
function setSafeAreaInset() {
  const test = document.createElement('div');
  test.style.cssText = 'position:fixed;bottom:0;padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(test);
  const value = parseInt(getComputedStyle(test).paddingBottom) || 0;
  document.body.removeChild(test);
  document.documentElement.style.setProperty('--safe-area-inset-bottom-computed', `${value}px`);
}
```
**Result**: Safe area measured correctly (34px) but gap still appeared

#### Attempt 2: Multiple setTimeout Checks
**Approach**: Re-measure safe area at 50ms, 100ms, 300ms, 500ms intervals
**Result**: Same - measurements correct, gap persists

#### Attempt 3: Minimum Safe Area with max()
**Approach**: Force minimum 34px padding
```css
padding-bottom: calc(0.5rem + max(34px, env(safe-area-inset-bottom)));
```
**Result**: Padding applied but viewport issue persists

#### Attempt 4: html.ios-pwa position: fixed
**Approach**: Fix the html element to prevent viewport miscalculation
```css
html.ios-pwa {
  position: fixed;
  overflow: hidden;
  height: 100%;
  width: 100%;
}
```
**Result**: Did not resolve gap issue

#### Attempt 5: html::after Pseudo-element
**Approach**: Add background pseudo-element below nav to cover gap
```css
html.ios-pwa::after {
  content: '';
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background-color: hsl(var(--background));
  z-index: 40;
}
```
**Result**: Pseudo-element rendered but didn't cover the gap (viewport extends beyond it too)

#### Attempt 6: nav::after Extension
**Approach**: Extend nav's own pseudo-element 100px below
```css
.mobile-bottom-nav::after {
  content: '';
  position: absolute;
  bottom: -100px;
  left: 0;
  right: 0;
  height: 100px;
  background-color: inherit;
}
```
**Result**: Same issue - the extension goes into the incorrect viewport area

#### Attempt 7: max-height: 100dvh Constraint
**Approach**: Constrain viewport to dynamic viewport height
```css
html.ios-pwa {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}
```
**Result**: Did not resolve issue

### ✅ SOLUTION: Attempt 8 - visualViewport API + Micro-scroll Workaround (WORKING)

**Status**: ✅ RESOLVED

The fix combines multiple approaches based on CSS-Tricks research and MDN documentation:

#### 1. visualViewport API for Accurate Height
```javascript
const setViewportHeight = () => {
  // Use visualViewport if available (more accurate on mobile)
  const vh = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
  document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
};
```

#### 2. Micro-scroll Workaround to Force Viewport Recalculation
```javascript
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
```

#### 3. iOS PWA Class for CSS Targeting
```javascript
const isIOSPWA = (window.navigator as any).standalone === true;
if (isIOSPWA) {
  document.documentElement.classList.add('ios-pwa');
}
```

#### 4. CSS: Use JS-calculated Viewport Height
```css
html.ios-pwa {
  height: calc(var(--vh, 1vh) * 100);
  height: var(--viewport-height, 100vh);
  overflow: hidden;
  background-color: hsl(var(--background));
}

html.ios-pwa body {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-color: hsl(var(--background));
}
```

#### 5. Nav Extension Pseudo-element (Belt and Suspenders)
```css
/* iOS PWA: Extend nav background below to cover any viewport gap */
html.ios-pwa .mobile-bottom-nav::after {
  content: '';
  position: absolute;
  top: 100%; /* Start right below the nav */
  left: 0;
  right: 0;
  height: 100px; /* Generous extension to cover any gap */
  background-color: inherit;
  pointer-events: none;
}
```

#### 6. visualViewport Resize Listener
```javascript
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    setViewportHeight();
    setSafeAreaInset();
  });
}
```

#### 7. Multiple Delayed Checks
```javascript
// Additional delayed checks for iOS timing issues
setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 50);
setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 150);
setTimeout(() => { setViewportHeight(); setSafeAreaInset(); }, 300);
```

### Why This Works

1. **visualViewport API** - Provides the actual visible viewport dimensions, which are more accurate than `window.innerHeight` on iOS PWA
2. **Micro-scroll** - Forces WebKit to recalculate the viewport immediately after PWA launches
3. **CSS custom properties** - Allow JavaScript to communicate accurate viewport height to CSS
4. **Nav extension** - Ensures the background color extends beyond the nav even if there's a brief moment of incorrect viewport

### Files Modified
- `src/lib/components/layout/MobileBottomNav.svelte` - Added iOS PWA detection, visualViewport API, micro-scroll workaround
- `src/routes/layout.css` - Added `html.ios-pwa` styles and nav extension pseudo-element

### References
- [CSS-Tricks: The trick to viewport units on mobile](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/)
- [MDN: VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

---

Last Updated: 2026-01-12
