---
name: memory
description: Cross-run institutional memory management, persistent context synchronization, multi-quarter catalyst tracking, thesis invalidation detection, and errata log auditing for the Memory Agent.
---

# Memory Agent Skill

## Overview
This skill defines the complete operational protocol, persistent memory management, catalyst tracking, and thesis invalidation workflows for the **Memory Agent**.

The Memory Agent ensures the multi-agent collective never suffers from session amnesia or context drift. It acts as the guardian and auditor of institutional memory stored across `context/`, indexing past agent decisions, comparing quarterly earnings against anticipated catalyst milestones, detecting invalidation triggers, and maintaining the errata log.

## Core Responsibilities

### 1. Cross-Run Institutional Memory Management
- Maintain multi-week continuity across all agent runs by indexing past deliberation outputs, trade rationales, holding durations, and rating changes.
- Ensure any decision, modification, or analytical deduction made in prior sessions is discoverable and referenced by subsequent agent runs.

### 2. Catalyst Milestones & Earnings Auditing
- Review active dossiers in `context/theses/*.md` to track upcoming catalyst dates (e.g. product releases, FDA decisions, major customer contract renewals, quarterly earnings).
- Cross-reference newly released Tier 1 SEC 10-Q/10-K filings against the expected outcomes recorded in the thesis catalyst table.
- Update catalyst statuses (`PENDING`, `ACHIEVED`, `MISSED`, `POSTPONED`) and record actual impact on fundamentals.

### 3. Thesis Invalidation & Urgent Liquidation Alerts
- Continuously monitor the **Explicit Invalidation Criteria** section of each thesis dossier.
- If a hard exit trigger occurs (e.g., structural deceleration below the thesis floor, revenue miss exceeding threshold, loss of major customer, accounting irregularity, or CEO departure under distress):
  - Mark the thesis as `INVALIDATED_BROKEN`.
  - Issue an immediate high-priority Liquidation Alert to the Lead Portfolio Manager for Monday market-open divestment (including BUY TO CLOSE mandates for short puts and covered calls).
  - Never allow broken theses to linger or rationalizations to delay capital preservation.

### 4. Data Consistency & Errata Log Administration
- Audit data consistency between `context/theses/`, `http/data/universe.json`, and `scripts/data/`.
- When an assumption, data point, or historical metric is found to be erroneous or hallucinated, follow the standard reconciliation workflow:
  - Verify true value against Tier 1 SEC EDGAR data.
  - Update the affected dossier in place.
  - Log the correction in `context/research/errata_log.md` conforming to `context/schemas/errata_schema.json`.

### 5. SEC Filing Schedule & Catalyst Calendar Synchronization
- Regularly audit upcoming regulatory filing windows from `context/data/sec_filing_calendar.json` via `python scripts/anticipate_sec_filings.py --upcoming-days 30`.
- Match upcoming 10-Q and 10-K estimated filing windows against catalyst target dates in thesis dossiers, alerting the agent team to upcoming earnings report catalysts.

### 6. Avoid List De-Listing Trigger Auditing & Short Seller Monitoring
- Maintain tracking of all equities cataloged on the Avoid List (`triage_status: "AVOID"`) according to `context/strategy/token_triage_and_avoid_pipeline.md`.
- Monitor periodic quarterly earnings releases, debt refinancing notices, and governance updates for declared **De-Listing Triggers** (e.g. positive operating cash flow for 2 consecutive quarters, runway extension > 24 months, gross margin stabilization, or cyclical inflection).
- Monitor new activist short seller reports (`context/data/short_seller_campaigns.json`) via `python scripts/track_short_sellers.py` to ensure emerging fraud investigations trigger thesis reviews or Avoid status.
- When an Avoid company satisfies its de-listing triggers, issue a Promotion Alert transitioning the ticker to `QUALIFIED_CANDIDATE` and queuing it for Stage 2 deep thesis authoring.

## Deterministic Memory Tooling

Audit thesis statuses, catalyst timelines, and invalidation triggers deterministically using `scripts/manage_memory.py`:

```bash
# Run complete institutional memory audit
python scripts/manage_memory.py

# Inspect memory and catalyst state for a specific symbol
python scripts/manage_memory.py --symbol NVDA

# Output structured memory audit in JSON
python scripts/manage_memory.py --json
```

## Thesis Invalidation Flag Protocol

When an invalidation condition is triggered, structure the alert for the Lead Portfolio Manager as follows:

```
================================================================================
CRITICAL INVALIDATION ALERT: BROKEN THESIS DETECTED
================================================================================
SYMBOL:               <TICKER>
CURRENT RATING:       DOWNGRADED TO SELL (IMMEDIATE EXIT)
TRIGGER VIOLATED:     <Trigger Number and Description from context/theses/<TICKER>.md>
EVIDENCE:             <Tier 1 SEC Filing Reference / Reported Metric vs. Floor>
RECOMMENDED ACTION:   1. BUY TO CLOSE all open short puts to avert assignment on a declining stock.
                      2. BUY TO CLOSE all open short calls to unlock 100-share blocks.
                      3. SELL TO CLOSE 100% of underlying common shares at Monday 9:30 AM ET.
                      4. Cancel all open buy limit orders.
================================================================================
```
