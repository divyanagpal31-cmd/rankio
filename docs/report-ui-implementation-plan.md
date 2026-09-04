# Rankio Report UI Implementation Plan

## Reference Assets
- `docs/design/reference-report/report-page-1.jpeg`
- `docs/design/reference-report/report-page-2.jpeg`
- `docs/design/reference-report/report-page-3.jpeg`

These mockups define the visual target for the new report experience.

## Current Report Page vs Mockups

### Current state
The existing `report-page.tsx` is a single-scroll report with:
- one overall score
- category breakdown
- CrUX field data
- detailed analysis table
- recommendations list
- guest preview masking

### What the mockups add
The designs introduce:
- a stronger top summary with report context and export CTA
- a left sidebar with section navigation
- distinct report sections:
  - Executive Summary
  - AI Audit
  - Roadmap
- richer score presentation and maturity state
- score comparison and trend framing
- more polished issue cards and insight cards
- an explicit roadmap / action-plan section
- clearer AI-first language:
  - AEO/GEO
  - citation probability
  - retrieval visibility
  - entity mapping

## Target Report Structure

### 1) Top Bar
- Logo
- report title / site name
- export to PDF button

### 2) Left Navigation
- Executive Summary
- AI Audit
- Roadmap

### 3) Executive Summary Section
- large maturity / global score
- short interpretation paragraph
- site URL chip
- AI maturity scale
- 4 category cards:
  - SEO Foundation
  - AI Visibility
  - UX Clarity
  - Technical Health
- top critical issues

### 4) AI Audit Section
- AI Search Visibility (AEO/GEO)
- Content Intelligence
- Structured Data
- Semantic Health
- UX & Accessibility
- Technical Performance
- SEO Foundation
- AI Impact Assessment

### 5) Roadmap Section
- projected AI score
- current vs target comparison
- quick wins
- medium improvements
- advanced optimization
- long-term authority
- CTA for implementation help

## Data Model Needed
The new UI should be driven from a structured report payload instead of only the current flat score fields.

Recommended report shape:
- `overall_score`
- `industry`
- `maturity_label`
- `summary`
- `site_url`
- `category_scores`
- `critical_issues`
- `audit_sections`
- `roadmap_items`
- `score_delta`
- `export_ready`

## Implementation Phases

### Phase 1 — Layout shell
- Add left sidebar navigation inside the report page
- Add top summary bar and export CTA
- Break the report into the three visual sections

### Phase 2 — Data wiring
- Build a normalized report view model
- Map current `reports.raw_scan_data` and `recommendations` into the new structure
- Support guest preview vs full report

### Phase 3 — Comparison and roadmap
- Add historical comparison cards
- Show score deltas between scans
- Generate roadmap items from findings

### Phase 4 — Polish
- Match spacing, gradients, cards, and chip styling to the mockups
- Add empty/loading/preview states
- Add PDF export support

## Notes
- The report page should stay modular so each section can be reused in PDF export.
- The roadmap section should be backed by the same recommendation engine as the audit section.
- Historical comparison is a core product feature, not an optional enhancement.
