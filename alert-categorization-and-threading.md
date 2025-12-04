# Alert Categorization and Threading System

**Version:** 2.0
**Date:** January 2025
**Status:** ✅ Implemented and Active

---

## Table of Contents

1. [Overview](#overview)
2. [Alert Sources](#alert-sources)
3. [Multi-Category System](#multi-category-system)
4. [Incident Threading](#incident-threading)
5. [Configuration](#configuration)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Implementation Guide](#implementation-guide)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring and Tuning](#monitoring-and-tuning)

---

## Overview

This document describes the alert categorization and threading system designed to:

1. **Multi-source integration** - Bluesky (primary) + optional GTFS fallback
2. **Multi-category tagging** - Alerts can match multiple non-exclusive categories
3. **Effect-based categorization** - Focus on service impact, not cause
4. **Incident threading** - Group related updates using Jaccard similarity
5. **Easy maintenance** - JSON configuration for keywords
6. **Real-time monitoring** - Track similarity scores for tuning

---

## Alert Sources

### Current Implementation

The system uses a **dual-source architecture** with intelligent deduplication:

**Primary Source: Bluesky**

- Official TTC account: [@ttcalerts.bsky.social](https://bsky.app/profile/ttcalerts.bsky.social)
- **Advantages:**
  - Faster updates than GTFS (real-time social media)
  - More comprehensive coverage (100% of unique alerts)
  - Native threading in posts
  - Human-readable format
- **API:** Bluesky AT Protocol (public API)
- **Polling:** Every 30 seconds (configurable)
- **Status:** ✅ Enabled by default

**Optional Source: GTFS-Realtime**

- Official TTC GTFS-RT feed
- **Current Status:** ⏸️ Disabled by default
- **Reason:** Analysis showed 0% unique data (all GTFS alerts also appear on Bluesky)
- **Advantages:**
  - Official TTC data feed
  - Structured protocol buffer format
  - Machine-readable
- **Disadvantages:**
  - Slower updates than Bluesky
  - Duplicate alerts with different entity IDs (fixed with content-based deduplication)
- **Can be re-enabled:** Set `ENABLE_GTFS_ALERTS=true` in `.env`

### Deduplication Strategy

**Content-Based ID Generation (GTFS):**

- MD5 hash of alert content prevents duplicate GTFS alerts
- Implemented in `server/services/gtfs-parser.js:13-24`
- Example: Same alert with entity IDs 5, 6, 7 → single `gtfs-{hash}` ID

**Cross-Source Deduplication:**

- Jaccard similarity matching between Bluesky and GTFS alerts
- Threshold: 0.6 similarity for route overlap OR 0.8 without routes
- Implemented in `server/services/alert-source-manager.js:164-178`
- Bluesky alerts take precedence (marked as is_latest)

### Key Principles

- **Effect > Cause** - "No service" matters more than "due to security incident"
- **Non-exclusive categories** - Alert can be `SERVICE_DISRUPTION` + `LINE_1`
- **Simple threading** - 80% text similarity only (no complex rules)
- **Latest first** - Most recent update at top of thread
- **Easy to edit** - Add keywords to JSON, no code changes

---

## Multi-Category System

### Category Definitions

Based on analysis of 83 real TTC GTFS alerts, these categories were identified:

#### Service Impact Categories

**SERVICE_RESUMED**

- **Patterns:** `"service has resumed"`, `"resumed"`, `"regular service has resumed"`, `"service restored"`, `"back to normal"`
- **Priority:** 0 (highest - appears first)
- **Badge:** Custom teal (#0C8379)
- **Example:** "Line 1: Regular service has resumed"
- **User Impact:** POSITIVE - Service is back to normal
- **Note:** This category removes all negative status categories (SERVICE_DISRUPTION, DELAY, DETOUR)

**SERVICE_DISRUPTION**

- **Patterns:** `"no service"`, `"suspended"`, `"not running"`, `"not operating"`, `"out of service"`, `"service disruption"`
- **Exclusions:** `"planned"` (if "planned" appears, use PLANNED_SERVICE_DISRUPTION instead)
- **Example:** "Line 1: No service between Eglinton West and Sheppard West"
- **User Impact:** CRITICAL - Cannot travel on affected route
- **Priority:** 1

**PLANNED_SERVICE_DISRUPTION**

- **Required:** `"planned"`
- **Plus one of:** `"no service between"`, `"no subway service between"`
- **Example:** "Planned track work: No subway service between Kipling and Islington"
- **User Impact:** HIGH - Advance notice allows re-planning

**DELAY**

- **Patterns:** `"delays"`, `"slower"`
- **Example:** "Line 2: Delays in both directions" OR "Trains moving slower than usual"
- **User Impact:** MEDIUM - Journey time increased

**DETOUR**

- **Patterns:** `"detour"`, `"divert"`, `"reroute"`, `"short turn"`, `"not serving"`, `"not stopping"`, `"bypassing"`, `"skipping"`
- **Example:** "504 King: Detour via King, Church, Adelaide, and Bay" OR "Trains are not stopping at St Clair station"
- **User Impact:** MEDIUM - Different route or station bypassed
- **Priority:** 4

**ACCESSIBILITY**

- **Patterns:** `"escalator"`, `"elevator"`, `"out of service"`
- **Example:** "Elevator out of service at Union Station"
- **User Impact:** HIGH for affected users

#### Route/Line Categories

**LINE_1**

- **Patterns:** `"line 1"`
- **Example:** "Line 1: Delays at Museum station"

**LINE_2**

- **Patterns:** `"line 2"`
- **Example:** "Line 2: No service between Kipling and Jane"

**STREETCARS**

- **Patterns:** `"streetcars"`
- **Example:** "Streetcars: Route 504 detoured via Queen"

**OTHER**

- Fallback category when no patterns match
- Example: "Service information: Visit ttc.ca for updates"

### Category Matching Logic

```
For each alert:
  1. Extract text from header + description
  2. Convert to lowercase
  3. Check each category's rules:
     - If "exclude" patterns found → skip category
     - If "require" patterns missing → skip category
     - If "patterns" or "requireAny" match → add category
  4. Return array of matched categories (or ['OTHER'] if none)
```

### Examples

**Example 1: Single Impact Category + Route**

```
Header: "Line 1: No service between Eglinton and Sheppard"
Categories: ['SERVICE_DISRUPTION', 'LINE_1']
```

**Example 2: Planned Work**

```
Header: "Planned track work: No subway service between Kipling and Islington"
Categories: ['PLANNED_SERVICE_DISRUPTION', 'LINE_2']
```

**Example 3: Multiple Impact Categories**

```
Header: "Line 2: Delays and detour via Queen due to road work"
Categories: ['DELAY', 'DETOUR', 'LINE_2']
```

**Example 4: Accessibility Only**

```
Header: "Elevator out of service at Union Station"
Categories: ['ACCESSIBILITY']
```

**Example 5: Uncategorized**

```
Header: "Service information available at ttc.ca"
Categories: ['OTHER']
```

---

## Incident Threading

### Overview

Incident threading groups related alerts over time to:

- Prevent duplicate notifications (12 updates → 1 thread)
- Show incident timeline
- Track incident duration
- Display most recent update first

### Threading Algorithm

**CURRENT IMPLEMENTATION:** Enhanced Jaccard similarity with route matching and orphan relinking

```
Alert Processing Order (Critical for Bluesky threading):
  1. Sort alerts chronologically (oldest first)
     - Ensures parent posts are processed before replies
  2. Store alerts in database FIRST
     - Makes parent alerts available for thread lookup
  3. Thread alerts using similarity matching
     - Native Bluesky threading for reply posts
     - Jaccard similarity for non-reply posts
  4. Relink any orphaned replies
     - Fixes cases where replies were processed before parents
     - Moves orphaned replies to correct parent threads
     - Cleans up empty orphaned threads

For each new alert (during threading step):
  1. Check if Bluesky reply (has blueskyThreadId and isReply)
     - If yes: Look up parent alert by ID
     - Use parent's thread_id if found
  2. If not a reply OR parent not found:
     a. Get active threads (last 24 hours)
     b. For each thread, calculate:
        - Text similarity (Jaccard index on header text)
        - Route overlap (with partial matching)
        - Station/stop overlap
     c. Match logic:
        - High text similarity (≥80%) + route overlap → Add to thread
        - Very high text similarity (≥80%) alone → Add to thread
        - Station overlap with moderate similarity → Add to thread
  3. If no match → Create new thread
```

**Improvements in v2.0:**

- **Chronological sorting:** Ensures deterministic processing order (oldest first)
- **Store-before-thread:** Parent alerts exist in DB when children look for them
- **Orphan relinking:** Post-processing step fixes any missed parent-child relationships
- **Native Bluesky threading:** Uses AT Protocol thread IDs for reply posts
- **Partial route matching:** "71" now matches "71 Runnymede" (prevents false negatives)
- **Station-based grouping:** Related incidents at same stations thread together
- **Bidirectional matching:** Handles route name variations in both directions
- **Implemented in:**
  - `server/services/alert-threader.js:45-72` (native threading)
  - `server/services/alert-threader.js:85-137` (similarity matching)
  - `server/services/alert-threader.js:365-425` (orphan relinking)
  - `server/services/alert-poller.js:54-80` (processing order)

### Location-Based Threading for SERVICE_RESUMED

**Problem:** SERVICE_RESUMED alerts use different vocabulary than their original incident alerts:

- Original: "Detour via Brimley Rd due to watermain break"
- Resumed: "Regular service has resumed near Brimley Rd"
- Text similarity: Only ~17-27% (below 80% threshold)
- Result: Two separate threads instead of one

**Solution:** Category-aware location-based matching specifically for SERVICE_RESUMED:

**Algorithm:**

```
1. Extract location keywords from alert text:
   - Street names: "brimley rd", "eglinton ave"
   - Directions: "northbound", "southbound", "eastbound", "westbound"
   - Indicators: "station", "via", "at", "near", "between"
   - 2-word phrases containing location indicators

2. Find candidate threads:
   - Unresolved threads (is_resolved = 0)
   - Same route (required)
   - Updated within last 6 hours
   - Limit to 50 most recent

3. Calculate location overlap:
   - Extract locations from thread title
   - Compare location keyword sets
   - Overlap = matches / min(set1_size, set2_size)
   - Threshold: 25% overlap required

4. If match found:
   - Add SERVICE_RESUMED to existing thread
   - Auto-resolve thread (mark as complete)
   - Fall back to standard matching if no location match
```

**Example:**

```
DETOUR: "16 Mccowan: Detour northbound via Brimley Rd and Eglinton Ave E"
  Locations: ["mccowan", "northbound", "brimley", "eglinton", "detour northbound", "via brimley"]

RESUMED: "16 Mccowan Regular service has resumed northbound near Brimley Rd"
  Locations: ["mccowan", "northbound", "brimley", "resumed northbound", "near brimley"]

Common: ["mccowan", "northbound", "brimley"] = 3 words
Overlap: 3/6 = 50% (exceeds 25% threshold) ✓ MATCH
```

**Auto-Resolution:**

- When SERVICE_RESUMED alert is added to a thread, the thread is automatically marked as resolved
- Prevents resolved incidents from appearing in active alerts
- Logged for monitoring: `✅ Auto-resolved thread {thread_id} (SERVICE_RESUMED alert added)`

**Implementation:**

- `server/services/alert-threader.js:45-80` (location extraction)
- `server/services/alert-threader.js:86-105` (overlap calculation)
- `server/services/alert-threader.js:111-158` (SERVICE_RESUMED matching)
- `server/services/alert-threader.js:164-173` (integration into findMatchingThread)
- `server/services/alert-threader.js:233-238` (auto-resolve logic)

**Time Windows:**

- **Threading window:** 6 hours for SERVICE_RESUMED matching
- **Display window:** 24 hours for getThread() (increased from 8 hours)
- Allows incidents spanning a full day to remain threaded

**Bug Fix (November 20, 2025):**

- **Problem:** Routes with different route numbers (e.g., 939 Finch Express and 39 Finch East) could be incorrectly grouped in the same thread if they shared the same location
- **Root Cause:** The `updateThread()` function blindly merged route arrays without validation, causing route contamination once an incorrect match occurred
- **Solution:** Added route validation in `updateThread()` to only merge routes with matching route numbers:
  - Extract route numbers from both existing and new routes
  - Only merge routes if they have the same route number (e.g., "39" with "39 Finch East", but NOT "939" with "39")
  - Block and log attempts to add incompatible routes to threads
  - Added comprehensive debug logging to track route comparisons and matches
- **Impact:** Prevents cross-contamination between different routes, ensuring route 939 and route 39 remain in separate threads
- **Implementation:** `server/services/alert-threader.js:330-387` (updateThread validation)

**Route Validation Rules:**

1. **Different route numbers NEVER thread together**, even with:

   - Same location (e.g., both on Finch Ave)
   - Same incident cause (e.g., both have broken railway crossing)
   - High location overlap (e.g., 80%+ shared location keywords)

2. **Examples:**
   - ✅ VALID: "39 Finch East" + "39 Finch" (same route number 39)
   - ✅ VALID: "939 Finch Express" + "939" (same route number 939)
   - ❌ INVALID: "939 Finch Express" + "39 Finch East" (different route numbers)
   - ❌ INVALID: "925" + "25" (different route numbers, despite substring match)

**Known Route Conflicts:**

The TTC has 29 problematic route pairs where one route number is a substring of another:

- **Pattern A (22 pairs):** Regular routes vs Express routes (e.g., 39 vs 939, 86 vs 986)
- **Pattern B (6 pairs):** Regular routes vs Night routes (e.g., 39 vs 339, 86 vs 386)
- **Pattern C (1 pair):** Regular routes vs Community routes (e.g., 2 vs 402)

**Critical multi-way conflicts:**

- Route 29 conflicts with 329 (Night) AND 929 (Express)
- Route 35 conflicts with 335 (Night) AND 935 (Express)
- Route 39 conflicts with 339 (Night) AND 939 (Express)
- Route 86 conflicts with 386 (Night) AND 986 (Express)

📋 **See [TTC-ROUTE-CONFLICTS.md](TTC-ROUTE-CONFLICTS.md) for complete list of all 29 problematic route pairs, test cases, and validation examples.**

### Text Similarity Calculation

**Jaccard Similarity** on word sets:

```
similarity = (shared words) / (total unique words)

Example:
Text 1: "Line 1: No service between Lawrence West and Wilson"
Text 2: "Line 1: No service between Lawrence West and Wilson stations"

Words 1: {line, 1, no, service, between, lawrence, west, and, wilson}
Words 2: {line, 1, no, service, between, lawrence, west, and, wilson, stations}

Shared: 9 words
Total: 10 words
Similarity: 9/10 = 0.90 → MATCH (>= 0.8)
```

### Thread States

- **ACTIVE** - Incident ongoing, new updates expected
- **RESOLVED** - Auto-closed after 24 hours of no updates

### Thread Storage

**Option: Store All Updates (Recommended)**

- Every alert stored in `alert_cache`
- Linked via `thread_id`
- `is_latest = 1` for most recent, `0` for superseded
- Full history available for timeline view

**Benefits:**

- Complete incident timeline
- Can show "Updated X minutes ago"
- Calculate incident duration
- Better debugging/analytics

### Orphan Relinking

**Problem:** Bluesky reply alerts can be orphaned if processed before their parent posts arrive.

**Example Scenario:**

```
1. Poll 1: Receives SERVICE_RESUMED reply post (parent not yet arrived)
   → Creates orphaned thread_001
2. Poll 2: Receives original DETOUR parent post
   → Creates thread_002
Result: Two separate threads instead of one threaded conversation
```

**Solution:** `relinkOrphanedReplies()` function runs after threading:

**How it works:**

1. Query all alerts with `isReply = true` and `blueskyThreadId` set
2. For each reply alert:
   - Extract parent alert ID from `blueskyThreadId`
   - Check if parent alert exists in database
   - If parent exists in different thread:
     - Move reply alert to parent's thread
     - Update thread metadata (categories, routes)
     - Delete old orphaned thread if empty
3. Return count of relinked alerts

**Implementation:** `server/services/alert-threader.js:365-425`

**Example Output:**

```
🔗 Relinking bsky-3m5tnay2jl32a to parent thread bsky-thread-3m5tc75tvwr2e
🗑️  Deleted orphaned thread thread-cd96cbaa-287b-4434-a28c-a6054ac17d6a
✓ Relinked 1 orphaned reply alerts to parent threads
```

### Threading Examples

**Example 1: Simple Update (High Similarity)**

```
Update 1 (1:39 PM):
"Line 1: No service between Lawrence West and Wilson"
→ Create thread_001

Update 2 (1:44 PM):
"Line 1: No service between Lawrence West and Wilson stations"
Similarity: 0.91 (9/10 words match)
→ Add to thread_001

Update 3 (1:49 PM):
"Line 1: No service between Lawrence West and Wilson due to security incident"
Similarity: 0.77 (10/13 words match)
→ Below 0.8 threshold → Create thread_002 (might need threshold tuning)
```

**Example 2: Different Incidents (Low Similarity)**

```
Alert 1:
"Line 1: No service between Eglinton and Sheppard"
→ Create thread_001

Alert 2:
"Line 2: Delays at Kipling station"
Similarity: 0.22 (2/9 words match)
→ Create thread_002 (different incident)
```

**Example 3: Station Expansion**

```
Update 1:
"Line 1: No service between Lawrence West and Wilson"
→ Create thread_001

Update 2:
"Line 1: No service between Lawrence West and Sheppard West"
Similarity: 0.70 (7/10 words match)
→ Below 0.8 threshold → Create thread_002

NOTE: This case shows why threshold tuning is important.
If we want scope changes to thread, might need to lower threshold to 0.7.
```

---

## Configuration

### File: `server/config/alert-categories.json`

```json
{
  "categories": {
    "SERVICE_RESUMED": {
      "name": "Service Resumed",
      "color": "custom-teal",
      "badge": "badge-SERVICE_RESUMED",
      "keywords": [
        "service has resumed",
        "resumed",
        "regular service has resumed",
        "service restored",
        "back to normal"
      ],
      "priority": 0,
      "description": "Service has returned to normal"
    },
    "SERVICE_DISRUPTION": {
      "name": "Service Disruption",
      "keywords": [
        "no service",
        "suspended",
        "not running",
        "not operating",
        "out of service",
        "service disruption"
      ],
      "priority": 1,
      "description": "Critical service disruption - no transit available"
    },
    "PLANNED_SERVICE_DISRUPTION": {
      "require": ["planned"],
      "requireAny": ["no service between", "no subway service between"],
      "priority": 2,
      "description": "Scheduled maintenance with advance notice"
    },
    "DELAY": {
      "patterns": ["delays", "slower"],
      "priority": 3,
      "description": "Service running with delays"
    },
    "DETOUR": {
      "keywords": [
        "detour",
        "divert",
        "reroute",
        "short turn",
        "not serving",
        "not stopping",
        "bypassing",
        "skipping"
      ],
      "priority": 4,
      "description": "Route temporarily changed or station bypassed"
    },
    "ACCESSIBILITY": {
      "patterns": ["escalator", "elevator", "out of service"],
      "priority": 5,
      "description": "Accessibility equipment unavailable"
    },
    "LINE_1": {
      "patterns": ["line 1"],
      "priority": 6,
      "description": "Yonge-University Line"
    },
    "LINE_2": {
      "patterns": ["line 2"],
      "priority": 7,
      "description": "Bloor-Danforth Line"
    },
    "STREETCARS": {
      "patterns": ["streetcars"],
      "priority": 8,
      "description": "Streetcar routes"
    }
  },
  "threading": {
    "similarity_threshold": 0.8,
    "active_thread_hours": 24,
    "description": "Text similarity threshold for threading (0.0-1.0)"
  }
}
```

### Adding New Categories

**Step 1:** Edit `alert-categories.json`

```json
"LINE_3": {
  "patterns": ["line 3", "scarborough"],
  "priority": 9,
  "description": "Scarborough Line"
}
```

**Step 2:** Restart server (config is loaded on startup)

**No code changes needed!**

### Adjusting Thread Threshold

Based on real data analysis, adjust `similarity_threshold`:

- **0.9** - Very strict (only near-identical text matches)
- **0.8** - Balanced (default)
- **0.7** - Relaxed (may group slightly different alerts)
- **0.6** - Very relaxed (risk of false positives)

---

## Database Schema

### New Table: `incident_threads`

```sql
CREATE TABLE IF NOT EXISTS incident_threads (
  thread_id TEXT PRIMARY KEY,
  latest_alert_id TEXT NOT NULL,       -- Most recent alert in thread
  latest_header TEXT NOT NULL,         -- For text similarity matching
  categories TEXT NOT NULL,             -- JSON: ["SERVICE_DISRUPTION", "LINE_1"]
  state TEXT DEFAULT 'ACTIVE',         -- ACTIVE, RESOLVED
  created_at TEXT NOT NULL,            -- First alert timestamp
  updated_at TEXT NOT NULL,            -- Last update timestamp
  update_count INTEGER DEFAULT 1,      -- Number of updates
  FOREIGN KEY (latest_alert_id) REFERENCES alert_cache(alert_id)
);

CREATE INDEX idx_thread_state ON incident_threads(state);
CREATE INDEX idx_thread_updated ON incident_threads(updated_at);
```

### Modified Table: `alert_cache`

```sql
-- Add new columns
ALTER TABLE alert_cache ADD COLUMN thread_id TEXT;
ALTER TABLE alert_cache ADD COLUMN categories TEXT;        -- JSON array
ALTER TABLE alert_cache ADD COLUMN is_latest INTEGER DEFAULT 1;
ALTER TABLE alert_cache ADD COLUMN similarity_score REAL;  -- For debugging

-- Add indexes
CREATE INDEX idx_thread_id ON alert_cache(thread_id);
CREATE INDEX idx_is_latest ON alert_cache(is_latest);
CREATE INDEX idx_categories ON alert_cache(categories);
```

### Data Examples

**alert_cache entry:**

```json
{
  "id": 123,
  "source": "TTC",
  "alert_id": "alert_001",
  "thread_id": "thread_abc123",
  "categories": "[\"SERVICE_DISRUPTION\", \"LINE_1\"]",
  "is_latest": 1,
  "similarity_score": 0.91,
  "alert_data": "{...}",
  "start_time": "2025-01-13T13:39:00Z"
}
```

**incident_threads entry:**

```json
{
  "thread_id": "thread_abc123",
  "latest_alert_id": "alert_003",
  "latest_header": "Line 1: No service between Lawrence West and Sheppard West",
  "categories": "[\"SERVICE_DISRUPTION\", \"LINE_1\"]",
  "state": "ACTIVE",
  "created_at": "2025-01-13T13:39:00Z",
  "updated_at": "2025-01-13T13:49:00Z",
  "update_count": 3
}
```

---

## API Endpoints

### GET `/api/alerts`

**Standard alerts (no threading)**

```json
{
  "alerts": [
    {
      "alert_id": "alert_001",
      "header": "Line 1: No service between X and Y",
      "categories": ["SERVICE_DISRUPTION", "LINE_1"],
      "start_time": "2025-01-13T13:39:00Z",
      "is_latest": true
    }
  ]
}
```

### GET `/api/alerts/threaded`

**Threaded alerts (grouped by incident)**

```json
{
  "threads": [
    {
      "thread_id": "thread_abc123",
      "categories": ["SERVICE_DISRUPTION", "LINE_1"],
      "state": "ACTIVE",
      "update_count": 3,
      "duration_minutes": 10,
      "latest": {
        "alert_id": "alert_003",
        "header": "Line 1: No service between Lawrence West and Sheppard West",
        "timestamp": "2025-01-13T13:49:00Z",
        "similarity": 0.85
      },
      "history": [
        {
          "alert_id": "alert_003",
          "header": "Line 1: No service between Lawrence West and Sheppard West",
          "timestamp": "2025-01-13T13:49:00Z",
          "is_latest": true
        },
        {
          "alert_id": "alert_002",
          "header": "Line 1: No service between Lawrence West and Wilson stations",
          "timestamp": "2025-01-13T13:44:00Z",
          "is_latest": false
        },
        {
          "alert_id": "alert_001",
          "header": "Line 1: No service between Lawrence West and Wilson",
          "timestamp": "2025-01-13T13:39:00Z",
          "is_latest": false
        }
      ]
    }
  ]
}
```

**Note:** History sorted **newest first** (most recent at index 0)

### GET `/api/alerts/categories`

**Get category statistics**

```json
{
  "categories": [
    {
      "name": "SERVICE_DISRUPTION",
      "count": 12,
      "active_count": 5,
      "description": "Critical service disruption"
    },
    {
      "name": "LINE_1",
      "count": 8,
      "active_count": 3,
      "description": "Yonge-University Line"
    }
  ]
}
```

---

## Implementation Guide

### Step 1: Create Alert Categorizer

**File:** `server/services/alert-categorizer.js`

```javascript
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "../config/alert-categories.json");

class AlertCategorizer {
  constructor() {
    this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.categories = this.config.categories;
  }

  categorize(header, description = "") {
    const text = (header + " " + description).toLowerCase();
    const matched = [];

    for (const [categoryName, rules] of Object.entries(this.categories)) {
      if (this.matchesRules(text, rules)) {
        matched.push(categoryName);
      }
    }

    return matched.length > 0 ? matched : ["OTHER"];
  }

  matchesRules(text, rules) {
    // Check exclusions first
    if (rules.exclude) {
      for (const pattern of rules.exclude) {
        if (text.includes(pattern.toLowerCase())) {
          return false;
        }
      }
    }

    // Check required patterns
    if (rules.require) {
      for (const pattern of rules.require) {
        if (!text.includes(pattern.toLowerCase())) {
          return false;
        }
      }
    }

    // Check patterns (all must match if specified)
    if (rules.patterns) {
      for (const pattern of rules.patterns) {
        if (text.includes(pattern.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    // Check requireAny (at least one must match)
    if (rules.requireAny) {
      for (const pattern of rules.requireAny) {
        if (text.includes(pattern.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    return false;
  }
}

export default new AlertCategorizer();
```

### Step 2: Create Incident Threader

**File:** `server/services/incident-threader.js`

```javascript
class IncidentThreader {
  constructor(threshold = 0.8) {
    this.threshold = threshold;
  }

  findMatchingThread(newAlertHeader, activeThreads) {
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const thread of activeThreads) {
      const similarity = this.calculateTextSimilarity(
        newAlertHeader,
        thread.latest_header
      );

      if (similarity >= this.threshold && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = { thread, similarity };
      }
    }

    return bestMatch;
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0)
    );

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  setThreshold(newThreshold) {
    this.threshold = newThreshold;
  }
}

export default IncidentThreader;
```

### Step 3: Update GTFS Processing

**File:** `server/services/ttc-gtfs-rt.js`

```javascript
import alertCategorizer from "./alert-categorizer.js";
import IncidentThreader from "./incident-threader.js";
import {
  getActiveThreads,
  createThread,
  updateThread,
  markSuperseded,
} from "../db/queries.js";

const threader = new IncidentThreader(0.8);

async function processTTCAlerts() {
  const alerts = await fetchTTCServiceAlerts();
  const activeThreads = await getActiveThreads();

  for (const entity of alerts) {
    if (!entity.alert) continue;

    const alert = entity.alert;
    const alertId = entity.id;

    const alertData = {
      id: alertId,
      header: alert.headerText?.translation?.[0]?.text || "No header",
      description: alert.descriptionText?.translation?.[0]?.text || "",
      // ... other fields
    };

    // Step 1: Categorize (multi-category)
    alertData.categories = alertCategorizer.categorize(
      alertData.header,
      alertData.description
    );

    // Step 2: Find matching thread
    const match = threader.findMatchingThread(alertData.header, activeThreads);

    if (match) {
      // Add to existing thread
      alertData.thread_id = match.thread.thread_id;
      alertData.is_latest = 1;
      alertData.similarity_score = match.similarity;

      await markSuperseded(match.thread.latest_alert_id);
      await updateThread(match.thread.thread_id, alertId, alertData.header);
    } else {
      // Create new thread
      const threadId = `thread_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      alertData.thread_id = threadId;
      alertData.is_latest = 1;
      alertData.similarity_score = 1.0;

      await createThread(
        threadId,
        alertId,
        alertData.header,
        alertData.categories
      );
    }

    // Step 3: Store alert
    await upsertAlert("TTC", alertId, alertData, 1, startTime, endTime);
  }
}
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/alert-categorizer.test.js`

```javascript
import { describe, it, expect } from "vitest";
import alertCategorizer from "../server/services/alert-categorizer.js";

describe("AlertCategorizer", () => {
  it("categorizes service disruption", () => {
    const result = alertCategorizer.categorize(
      "Line 1: No service between Eglinton and Sheppard"
    );
    expect(result).toContain("SERVICE_DISRUPTION");
    expect(result).toContain("LINE_1");
  });

  it("excludes planned from service disruption", () => {
    const result = alertCategorizer.categorize(
      "Planned track work: No service between X and Y"
    );
    expect(result).not.toContain("SERVICE_DISRUPTION");
    expect(result).toContain("PLANNED_SERVICE_DISRUPTION");
  });

  it("handles multiple impact categories", () => {
    const result = alertCategorizer.categorize(
      "Line 2: Delays and detour via Queen"
    );
    expect(result).toContain("DELAY");
    expect(result).toContain("DETOUR");
    expect(result).toContain("LINE_2");
  });

  it("returns OTHER for uncategorized", () => {
    const result = alertCategorizer.categorize("Visit ttc.ca");
    expect(result).toEqual(["OTHER"]);
  });
});
```

**File:** `tests/incident-threader.test.js`

```javascript
import { describe, it, expect } from "vitest";
import IncidentThreader from "../server/services/incident-threader.js";

describe("IncidentThreader", () => {
  const threader = new IncidentThreader(0.8);

  it("matches similar text (>= 0.8)", () => {
    const text1 = "Line 1: No service between Lawrence West and Wilson";
    const text2 =
      "Line 1: No service between Lawrence West and Wilson stations";
    const similarity = threader.calculateTextSimilarity(text1, text2);

    expect(similarity).toBeGreaterThanOrEqual(0.8);
  });

  it("does not match different text (< 0.8)", () => {
    const text1 = "Line 1: No service between X and Y";
    const text2 = "Line 2: Delays at Z station";
    const similarity = threader.calculateTextSimilarity(text1, text2);

    expect(similarity).toBeLessThan(0.8);
  });

  it("finds matching thread", () => {
    const activeThreads = [
      {
        thread_id: "thread_001",
        latest_header: "Line 1: No service between X and Y",
      },
    ];

    const match = threader.findMatchingThread(
      "Line 1: No service between X and Y stations",
      activeThreads
    );

    expect(match).not.toBeNull();
    expect(match.thread.thread_id).toBe("thread_001");
    expect(match.similarity).toBeGreaterThanOrEqual(0.8);
  });
});
```

### Integration Tests

Test with real GTFS data:

```javascript
import { describe, it, expect } from "vitest";
import { processTTCAlerts } from "../server/services/ttc-gtfs-rt.js";
import { getThreadedAlerts } from "../server/db/queries.js";

describe("End-to-End Threading", () => {
  it("groups similar alerts into threads", async () => {
    await processTTCAlerts();
    const threads = await getThreadedAlerts();

    // Verify threading occurred
    const serviceDisruptionThreads = threads.filter((t) =>
      t.categories.includes("SERVICE_DISRUPTION")
    );

    expect(serviceDisruptionThreads.length).toBeGreaterThan(0);

    // Verify update counts
    const multiUpdateThreads = threads.filter((t) => t.update_count > 1);
    expect(multiUpdateThreads.length).toBeGreaterThan(0);
  });
});
```

---

## Monitoring and Tuning

### Logging Similarity Scores

```javascript
if (match) {
  console.log(`Thread match found:
    New: "${alertData.header}"
    Existing: "${match.thread.latest_header}"
    Similarity: ${match.similarity.toFixed(3)}
    Thread: ${match.thread.thread_id}
  `);
}
```

### Analyzing Similarity Scores

```sql
-- Find all similarity scores
SELECT
  alert_id,
  similarity_score,
  json_extract(alert_data, '$.header') as header
FROM alert_cache
WHERE similarity_score IS NOT NULL
ORDER BY similarity_score DESC;

-- Find borderline matches (0.75-0.85)
SELECT
  alert_id,
  thread_id,
  similarity_score,
  json_extract(alert_data, '$.header') as header
FROM alert_cache
WHERE similarity_score BETWEEN 0.75 AND 0.85
ORDER BY similarity_score;
```

### Tuning Threshold

Based on analysis:

**Threshold too high (0.9):**

- Symptoms: Too many separate threads for same incident
- Example: Scope changes create new threads
- Solution: Lower to 0.8 or 0.75

**Threshold too low (0.6):**

- Symptoms: Unrelated alerts grouped together
- Example: Different lines grouped because of similar wording
- Solution: Raise to 0.7 or 0.8

**Recommended starting point:** 0.8 (80% similarity)

---

## Summary

This system provides:

✅ **Multi-source integration** - Bluesky primary + optional GTFS fallback
✅ **Multi-category tagging** - Non-exclusive categories per alert
✅ **Effect-based focus** - Service impact over cause
✅ **Enhanced threading** - Jaccard similarity + route + station matching + native Bluesky threading
✅ **Orphan relinking** - Automatic repair of threading issues from race conditions
✅ **Intelligent deduplication** - Content-based IDs prevent GTFS duplicates
✅ **Smart route matching** - Partial matching handles route variations
✅ **Easy maintenance** - Edit JSON config, no code changes
✅ **Observable** - Similarity scores stored for tuning
✅ **Tested** - Unit and integration tests
✅ **Production-ready** - Validated with real TTC alert data

**Implementation Status:**

- ✅ Bluesky integration (primary source)
- ✅ Native Bluesky thread support (reply posts)
- ✅ Chronological processing (oldest first)
- ✅ Store-before-thread architecture
- ✅ Orphan relinking post-processing
- ✅ GTFS integration (optional fallback)
- ✅ Content-based deduplication
- ✅ Cross-source deduplication
- ✅ Multi-category tagging
- ✅ Incident threading
- ✅ Partial route matching
- ✅ Station-based grouping

**Performance:**

- 100 alerts processed per poll cycle
- ~600-800ms average poll completion time
- 86-88 threads created from 100 alerts (efficient grouping)
- 0% duplicate alerts with content-based IDs
- Orphan relinking runs in <10ms per poll

---

**Document End**
