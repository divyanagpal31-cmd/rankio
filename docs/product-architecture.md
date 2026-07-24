# Rankio Product Architecture

## Purpose
Rankio is an AI Visibility Intelligence platform that scans a website, interprets how well AI systems can understand and recommend it, and returns a score-driven report with prioritized improvements.

This document is the canonical product architecture for the current build. It should be updated when the core scan flow, scoring model, access rules, or report structure changes.

## Core Principles
- Keep the core score mostly deterministic and evidence-based.
- Use AI for interpretation, retrieval simulation, and recommendation generation.
- Separate scan processing from final report storage.
- Support guest preview, paid access, and historical comparison from the start.
- Make the architecture modular so vertical-specific rules can be added later.

## Final Architecture

### 1) Request Layer
Responsible for accepting and validating a scan request.

Responsibilities:
- Validate URL format
- Detect user identity or visitor identity
- Check entitlement and scan quota
- Enforce rate limits
- Detect duplicate scans and cached reports
- Decide whether the response is preview-only or full

Outputs:
- Accepted scan job, or
- cached report, or
- preview/upgrade response

### 2) Collection Layer
Responsible for crawling the site and collecting signals.

Modules:
- **Crawl Discovery**
  - homepage
  - top pages
  - blog pages
  - sitemap URLs
  - robots.txt
  - canonical URLs

- **Technical Signals**
  - robots directives
  - sitemap presence
  - canonical tags
  - indexing directives
  - meta tags
  - hreflang
  - broken links

- **Performance Signals**
  - Core Web Vitals
  - Lighthouse signals
  - mobile friendliness
  - PageSpeed Insights API data

- **Content Signals**
  - headings
  - FAQ content
  - readability
  - semantic structure
  - entity mentions

- **AI Readiness Signals**
  - brand understanding
  - entity completeness
  - citation readiness
  - LLM retrieval readiness

### 3) Analysis Layer
Responsible for converting raw signals into scores and recommendations.

Components:
- **Scoring Engine**
  - combines module outputs into category scores
  - computes overall AI Visibility Score
  - supports vertical-based weight changes later

- **Recommendation Engine**
  - converts findings into clear fixes
  - ranks issues by impact and effort
  - produces quick wins, medium fixes, and advanced improvements

### 4) Storage Layer
Responsible for saving the results of each scan and enabling historical comparison.

Stored objects:
- report
- historical snapshot
- page-level evidence
- normalized findings
- content chunks for embeddings
- scan job progress

Suggested data model:
- `scan_jobs` for scan execution tracking
- `reports` for final report payloads
- `report_pages` for page-level crawl output
- `report_findings` for normalized issues
- `content_chunks` for embedding and retrieval readiness
- `report_shares` for shareable access

### 5) Presentation Layer
Responsible for showing the result to the user.

Views:
- **Mini report**
  - available for guest or unpaid users
  - shows limited score summary and limited recommendations

- **Full report**
  - available after login and valid payment/entitlement
  - shows full score breakdown, evidence, findings, and recommendations

- **Historical comparison**
  - shows score changes across scans
  - example: `AI Readiness 72 → 81 (+9)`

- **PDF export**
  - generates downloadable report output

## Scan Flow

### User Action
1. User enters a website URL.
2. User clicks the scan button.
3. Frontend validates the URL.
4. Frontend sends the URL and identity context to the backend.

### Backend Processing
1. Validate entitlement, scan limits, and duplicate conditions.
2. Normalize the URL.
3. Check for a fresh cached report.
4. If cached, return the cached report.
5. If not cached, create a scan job.
6. Crawl the site and collect module-wise signals.
7. Run the scoring engine.
8. Save report, findings, pages, and historical snapshot.
9. Return the result to the frontend.

### Frontend Result
1. Show progress while the scan is running.
2. Navigate to the report page when complete.
3. Show mini report or full report based on access tier.

## Scoring Model

### Initial Category Weights
- Technical Readiness — 25%
- Content Readiness — 25%
- AI Understanding — 25%
- Citation Readiness — 25%

### Notes
- These weights can be adjusted later by vertical.
- Example future vertical logic:
  - eCommerce can weigh schema and citation readiness more heavily
  - SaaS can weigh brand understanding and entity completeness more heavily
  - Local business can weigh trust and location signals more heavily

## Historical Comparison

Historical comparison is a core product feature.

Each re-scan should store:
- overall score
- category scores
- key findings
- recommendations
- scan date
- vertical/domain type
- source version

Comparison output example:
- `AI Readiness 72 → 81 (+9)`
- `Content Readiness 64 → 70 (+6)`
- `Citation Readiness 58 → 62 (+4)`

## Access Model

### Guest / Unpaid
- sees mini report only
- can scan if allowed by current public limits

### Starter
- one full report entitlement

### Growth
- five full report entitlements

### Future Pro
- reserved for higher-volume or agency use

## Billing Audit Model

- `subscriptions` stores the purchased credit package and remaining entitlement counters.
- `payment_transactions` stores provider-level billing events such as PayPal order ID, capture ID, amount, currency, status, and raw provider payload.
- `report_unlocks` links each full report unlock to the user, purchased package, transaction, plan slug, credit-used flag, cached flag, and unlock reason.
- Cached re-scans under 24 hours can unlock a full report for a paid user without consuming a new credit, and are recorded as `cached_rescan_24h`.

## Current Implementation Notes
- PageSpeed Insights remains part of the performance layer.
- The scanner should be refactored into modules rather than a single monolithic step.
- The architecture should continue to support future monitoring, competitor tracking, and recurring audits without a rebuild.

## Future Extensions
- Competitor benchmarking
- Ongoing monitoring
- AI visibility tracking over time
- CMS integrations
- Automated fixes and recommendations
- Local, healthcare, news, and education rule packs

## Status
This architecture is the current agreed direction for Rankio.
Future changes should update this file and, when needed, add a short architecture decision record.
