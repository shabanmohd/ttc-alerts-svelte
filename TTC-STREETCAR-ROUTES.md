# TTC Streetcar Routes - Complete Reference

**Last Updated:** January 2025
**Source:** https://www.ttc.ca/routes-and-schedules/listroutes/streetcar
**Status:** Single Source of Truth for Streetcar Route Information

This document contains all TTC streetcar routes with their official names and service types, matching the TTC website.

## Related Documentation

This file is part of the route badge documentation system. For complete route badge styling information:

- **[ROUTE_BADGE_STYLES.md](ROUTE_BADGE_STYLES.md)** - Complete badge styling implementation reference with CSS classes and color codes
- **[TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)** - Complete bus route reference
- **[route-badges-test.html](client/route-badges-test.html)** - Visual testing page showing all badge styles in action
- **[app.js](client/src/js/app.js)** - Implementation of `getRouteColor()` function

**⚠️ Important:** When adding new streetcar routes or modifying route information, update ALL related documentation files to maintain consistency.

---

## Regular Service (501-512)

| Route | Name | Badge Style |
|-------|------|-------------|
| 501 | Queen | TTC Red |
| 503 | Kingston Rd | TTC Red |
| 504 | King | TTC Red |
| 505 | Dundas | TTC Red |
| 506 | Carlton | TTC Red |
| 509 | Harbourfront | TTC Red |
| 510 | Spadina | TTC Red |
| 511 | Bathurst | TTC Red |
| 512 | St Clair | TTC Red |

## Limited Service (507-508)

| Route | Name | Badge Style |
|-------|------|-------------|
| 507 | Long Branch | White with Red Border |
| 508 | Lake Shore | White with Red Border |

## Night Service (300-312)

| Route | Name | Badge Style |
|-------|------|-------------|
| 301 | Queen | White with Blue Border |
| 304 | King | White with Blue Border |
| 305 | Dundas | White with Blue Border |
| 306 | Carlton | White with Blue Border |
| 310 | Spadina | White with Blue Border |
| 312 | St Clair | White with Blue Border |

## Other Service

| Route | Name | Badge Style |
|-------|------|-------------|
| 882 | Operator Shuttles | TTC Red |

## Badge Style Legend

- **TTC Red**: Regular service streetcars - Red background (#C8102E) with white text
- **White with Red Border**: Limited service streetcars (507, 508) - White background with red border and text (#C8102E)
- **White with Blue Border**: Night service streetcars (300-series) - White background with blue border and text (#003DA5)

## Notes

- Limited service routes: 507, 508
- Night service routes use 300-series numbering (301, 304, 305, 306, 310, 312)
- All streetcar routes use partial route matching in the alert categorization system
- Route numbers are matched as strings to handle potential alpha suffixes
- Route 502 (Downtowner) has been discontinued and is not in current service
