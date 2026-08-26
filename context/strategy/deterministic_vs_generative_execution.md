# Deterministic Scripts vs. Generative Agent Synthesis

This document establishes the operational boundaries, decision framework, and architectural division of labor between deterministic software scripts (Python/Node.js) and non-deterministic generative AI agent synthesis.

## 1. Executive Summary & Core Philosophy

The repository maintains a strict architectural division between two distinct modes of execution:

1. Deterministic Execution (Code & Scripts): Invariant, mathematical, algorithmic, rule-based, or bulk validation tasks where exactness, reproducibility, zero hallucination, and schema conformance are mandatory. AI agents must never "freestyle" these tasks.
2. Generative Synthesis (AI Agent Inference & Reasoning): Qualitative, analytical, contextual, and strategic tasks requiring semantic comprehension, nuance, research synthesis, and creative language formulation across unstructured data sources.

## 2. Execution Mode Decision Matrix

| Dimension | Deterministic Script (`scripts/*.py`, `scripts/*.js`) | Generative Agent Synthesis (LLM Inference + Tool Calling) |
| :--- | :--- | :--- |
| Primary Objective | Verifiable correctness, exact math, parity checks, bulk automation. | Deep reasoning, qualitative analysis, narrative thesis construction. |
| Permissible Variance | Zero variance. Output is 100% reproducible for identical inputs. | Controlled variance. Outputs synthesize insights with contextual flexibility. |
| Ingestion & Processing | High-volume batch loops across universe records or file trees. | Deep-dive focus on individual companies, filings, transcripts, or plans. |
| Math & Greeks Calculation | Black-Scholes, compound annual return (CAGR), AROC, multiple scaling. | Interpreting the implications of valuation multiples and risk metrics. |
| Schema & Quality Audits | Asserting required fields, data types, null checks, link validity. | Authoring the actual textual content that populates those fields. |
| Data Provenance | Programmatic extraction from Tier 1 SEC EDGAR, exchange feeds, APIs. | Evaluating corporate management tone, competitive moat dynamics, macro risk. |

## 3. Concrete Repository Case Studies

### Case Study A: Business Profiles & Competitive Moats
- Generative Agent Task: Reading SEC 10-K Item 1 Business Disclosures, earnings conference transcripts, and industry reports to author a nuanced, high-conviction 3-paragraph Business Profile and Moat Breakdown. This requires semantic understanding, competitive strategy evaluation, and domain expertise.
- Deterministic Script Task: Executing `scripts/quality_control.py --audit` or `curate_business_profiles.py` to assert that every single company in `http/data/universe.json` contains a non-empty `business_summary` string, valid length (>50 chars), and no corrupted placeholder text.

### Case Study B: Options Modeling & Limit Order Execution
- Deterministic Script Task: Calculating exact Black-Scholes option pricing, Delta, Theta, Gamma, Vega, and Annualized Return on Collateral (AROC) via `scripts/calculate_pricing.py`. Agents must never approximate derivatives math in LLM context.
- Generative Agent Task: Formulating the strategic rationale for why a 0.20 Delta Cash-Secured Put on a specific stock represents an attractive risk-reward entry relative to fundamental margin of safety and technical support floors.

### Case Study C: Portfolio Snapshot Parsing & Ingestion
- Deterministic Script Task: Ingesting raw brokerage CSV exports or OCR text, splitting distinct accounts, verifying cash balances, calculating dry powder, and tagging >= 100 share blocks for Covered Call eligibility via `scripts/parse_snapshot.py`.
- Generative Agent Task: Reviewing the normalized portfolio state, evaluating concentration risk against the 25-position soft limit, and deciding allocation priority among competing buy candidates.

### Case Study D: Universe Metric Synchronization & Return Engine
- Deterministic Script Task: Computing annualized ROI paths across 1-year, 2-year, and 3-year horizons given explicit target multiples and revenue trajectories via `scripts/return_engine.py`.
- Generative Agent Task: Formulating the forward-looking 13-quarter revenue path and identifying the structural catalysts that justify a specific exit price-to-sales multiple.

### Case Study E: Coverage Universe Expansion & Equity Onboarding
- Generative Agent Task: Proactively scanning US public exchanges and industry trends for companies with potential to deliver >= 20% annualized ROI, synthesizing competitive advantages, identifying catalyst roadmaps, evaluating management capital allocation, and defining explicit invalidation tripwires.
- Deterministic Script Task: Executing `scripts/onboard_company.py` to ingest SEC EDGAR XBRL company facts, query live/cached market quotes, model 13Q revenue trajectories and 4H price target bounds, update `company_meta.json` and `universe.json`, generate schema-compliant dossiers in `context/theses/`, and assert 0 errors via `quality_control.py --audit`.

## 4. Operational Guidelines for AI Agents

When receiving a user request or working autonomously, agents must evaluate the following four-step decision rule:

1. Rule 1: Never Freestyle Calculations or Data Invariants
   Do not compute complex financial math, Greeks, compound interest, or data completeness audits using natural language estimation. If a script exists (e.g. `calculate_pricing.py`, `return_engine.py`, `onboard_company.py`, `quality_control.py`), execute it via tool commands. If a script does not exist for a repetitive deterministic task, write a deterministic script in `scripts/` or `scratch/`.

2. Rule 2: Use Generative Reasoning Where Human Judgment Is Required
   When tasked with explaining a thesis, synthesizing conflicting news reports, evaluating executive leadership quality, or writing bespoke company descriptions, do not attempt to write brittle regexes or programmatic heuristics. Use LLM generation with appropriate source tools (`search_web`, `read_url_content`, SEC filings).

3. Rule 3: The Hybrid Pipeline Pattern
   Most complex financial workflows follow a two-phase Hybrid Pipeline:
   - Phase 1 (Generative Parameter Setting): The AI agent analyzes qualitative research and determines key strategic inputs (e.g. target growth rates, hurdle rates, qualitative moat grade).
   - Phase 2 (Deterministic Calculation & Verification): The agent feeds these inputs into a deterministic script (`valuation_model.py`, `return_engine.py`, `onboard_company.py`, `validate_thesis.py`) to calculate mathematical outputs and verify schema compliance.

4. Rule 4: Data Auditing & Errata Identification
   When checking whether all universe stocks meet a standard or finding missing fields, always run or write a deterministic Python/Node audit script. Never browse individual files manually in an LLM context loop.

## 5. Summary Anti-Patterns to Avoid

- Anti-Pattern 1 (Agent Hallucinating Batch Audits): An agent claiming "I verified all stocks and found no errors" without running an audit script.
- Anti-Pattern 2 (Agent Mental Math): An agent approximating option premiums or annualized compounding rates in text without calling `calculate_pricing.py` or `return_engine.py`.
- Anti-Pattern 3 (Over-Scripting Qualitative Text): Attempting to generate unique company competitive analyses using programmatic template strings or rigid keyword concatenation instead of generative reasoning.
- Anti-Pattern 4 (Unverified File Modifications): Manually editing JSON data fields without executing schema validation scripts (`validate_thesis.py` or `quality_control.py`).
