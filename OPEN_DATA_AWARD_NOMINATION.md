# Canadian Open Data Leader of the Year Award Nomination

**Nominee:** [YOUR NAME]  
**Project:** rideTO — Real-time TTC Service Alerts  
**Website:** https://rideto.ca

---

## Turning Open Data Into an Accessible Public Service

As an engineer by education and UX designer by practice, I built rideTO to solve a daily frustration: checking multiple sources just to know if my bus was coming or if the subway was running smoothly. What started as a personal project has grown into a comprehensive transit companion serving Toronto commuters—completely free, with no ads, forever.

### Accessibility

Accessibility isn't an afterthought in rideTO—it's foundational. The app achieves approximately 90% WCAG 2.2 AA compliance through deliberate design choices:

- **Lexend typography**, a font scientifically designed to improve reading for people with dyslexia
- **Reduced motion support** respecting both system preferences and manual overrides
- **Full screen reader compatibility** with ARIA live regions that announce alert changes dynamically
- **High-contrast color system** where every status color exceeds WCAG's 4.5:1 minimum contrast ratio
- **Light, dark, and system theme modes** adapting to user preferences
- **Complete keyboard navigation** with visible focus indicators and skip-to-content links

Beyond technical compliance, rideTO prioritizes **information scannability**: large ETA text at stops for quick glancing, color-coded subway status cards, filterable alert badges, and formatted scheduled maintenance—transforming walls of text into digestible, actionable information.

### Innovation

rideTO transforms raw TTC open data through a smart alert threading algorithm that prevents notification fatigue. When 12 updates describe the same subway delay, users see one consolidated thread—not 12 separate alerts. The system uses Jaccard similarity matching to intelligently group related alerts, automatically detects service resumptions, and keeps scheduled maintenance separate from real-time incidents.

The Progressive Web App architecture enables offline access to cached alerts, instant home screen installation, and real-time WebSocket updates—no app store required, no storage consumed.

### Data Quality

Raw transit data is messy. rideTO addresses this through:

- **90% similarity threshold deduplication** eliminating redundant notifications
- **Route conflict resolution** handling 29 problematic route pairs
- **Automated verification functions** that validate data against TTC sources every 15 minutes
- **Six-category classification** (Disruption, Delay, Diversion, Shuttle, Scheduled, Resolved) bringing structure to unstructured text

### Impact

rideTO serves Toronto's 1.7 million daily TTC riders with real-time alerts polled every 2 minutes, live arrival predictions, and bilingual support (English/French). A comprehensive routes directory displays all TTC routes with their variations and ordered stops—users can save favorites and find nearby stops using location services. No account required. No personal data collected.

### Commitment and Representation

This isn't a weekend project—it's an ongoing commitment. Weekly automated GTFS updates ensure schedule accuracy. Continuous monitoring catches stale alerts. Every design decision prioritizes daily commuters who want to avoid getting blindsided by disruptions they could have known about ahead of time—so they can plan their trips accordingly.

rideTO demonstrates what's possible when open data meets accessible design: a free public resource that serves everyone, including those often left behind by technology.

---

**Word Count:** 500
