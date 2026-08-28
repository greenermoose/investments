# Deterministic Scripts vs. Generative Agent Synthesis

This document establishes the operational boundaries, decision framework, and architectural division of labor between deterministic software scripts (Python/Node.js) and non-deterministic generative AI agent synthesis.

## 1. Executive Summary & Core Philosophy

The repository maintains a strict architectural division between two distinct modes of execution:

1. Deterministic Execution (Code & Scripts): Invariant, mathematical, algorithmic, rule-based, or bulk validation tasks where exactness, reproducibility, zero hallucination, and schema conformance are mandatory. AI agents must never "freestyle" these tasks.
2. Generative Synthesis (AI Agent Inference & Reasoning): Qualitative, analytical, contextual, and strategic tasks requiring semantic comprehension, nuance, research synthesis, and creative language formulation across unstructured data sources.

The boundary between them is a data structure, not a convention. Agents author into the research store; scripts read it. Neither side reaches across.

## 2. The Research Store: Where the Boundary Lives

Every qualitative judgment and every forward-looking parameter in this repository lives in one place: `context/data/equities/<TICKER>.json` under the `research` key, conforming to `context/schemas/equity_research_schema.json`.

- Agents author into it, through `scripts/research_store.py` `write_research`, which validates the block before it is written.
- Scripts read from it, through `load_research` and `require_fields`.
- `scripts/data/company_meta.json`, `http/data/universe.json`, and `context/theses/*.md` are all derived from it. None of them is a system of record.

Two rules follow from this and admit no exceptions.

**A script never authors.** No script composes a sentence about a company, estimates a market size, invents a catalyst, sets a growth rate, or writes an order rationale. If a script emits prose, that prose came verbatim from the research store or it describes the script's own mechanics.

**A script never substitutes.** When a required field is unauthored, the script skips that record, reports the gap, and exits non-zero. It does not fall back to a sector average, a peer median, a template string, or a plausible-looking default. A ticker with no researched parameters gets no valuation, no ROI, and no rating.

The consequence is intentional: the repository under-reports rather than over-reports. `scripts/research_gaps.py` shows exactly what is outstanding.

## 3. Execution Mode Decision Matrix

| Dimension | Deterministic Script (`scripts/*.py`, `scripts/*.js`) | Generative Agent Synthesis (LLM Inference + Tool Calling) |
| :--- | :--- | :--- |
| Primary Objective | Verifiable correctness, exact math, parity checks, bulk automation. | Deep reasoning, qualitative analysis, narrative thesis construction. |
| Permissible Variance | Zero variance. Output is 100% reproducible for identical inputs. | Controlled variance. Outputs synthesize insights with contextual flexibility. |
| Ingestion & Processing | High-volume batch loops across universe records or file trees. | Deep-dive focus on individual companies, filings, transcripts, or plans. |
| Math & Greeks Calculation | Black-Scholes, compound annual return (CAGR), AROC, multiple scaling. | Interpreting the implications of valuation multiples and risk metrics. |
| Schema & Quality Audits | Asserting required fields, data types, null checks, link validity. | Authoring the actual textual content that populates those fields. |
| Data Provenance | Programmatic extraction from Tier 1 SEC EDGAR, exchange feeds, APIs. | Evaluating corporate management tone, competitive moat dynamics, macro risk. |
| Missing Input | Report the gap, skip the record, exit non-zero. | Research it and write it into the store. |

## 4. Concrete Repository Case Studies

### Case Study A: Business Profiles & Competitive Moats
- Generative Agent Task: Reading SEC 10-K Item 1 Business Disclosures, earnings conference transcripts, and industry reports to author a nuanced, high-conviction Business Profile and Moat Breakdown, then writing it to `research.business_profile` and `research.competitive_moat_analysis` with its provenance.
- Deterministic Script Task: `scripts/research_gaps.py` reports which tickers lack those sections; `scripts/render_thesis.py` copies them verbatim into the dossier and refuses to render a ticker missing one; `scripts/quality_control.py --audit` asserts the derived datasets carry what the store carries.
- Historical Note: This case study previously cited a `curate_business_profiles.py` that held two hundred hand-written profiles as Python string literals. Research prose compiled into a module is research in the wrong place. That script and its two siblings were deleted and their contents migrated into the store.

### Case Study B: Options Modeling & Limit Order Execution
- Deterministic Script Task: Calculating exact Black-Scholes option pricing, Delta, Theta, Gamma, Vega, and Annualized Return on Collateral (AROC) via `scripts/calculate_pricing.py`. Agents must never approximate derivatives math in LLM context.
- Generative Agent Task: Formulating the strategic rationale for why a 0.20 Delta Cash-Secured Put on a specific stock represents an attractive risk-reward entry relative to fundamental margin of safety and technical support floors.

### Case Study C: Portfolio Snapshot Parsing & Ingestion
- Deterministic Script Task: Ingesting raw brokerage CSV exports or OCR text, splitting distinct accounts, verifying cash balances, calculating dry powder, and tagging 100-share blocks for Covered Call eligibility via `scripts/parse_snapshot.py`.
- Generative Agent Task: Reviewing the normalized portfolio state, evaluating concentration risk against the 25-position soft limit, and deciding allocation priority among competing buy candidates.

### Case Study D: The Weekly Trading Plan
- Generative Agent Task: The Lead Portfolio Manager Agent decides every trade, sets every limit price, and writes every rationale into an orders file conforming to `context/schemas/trading_plan_orders_schema.json`.
- Deterministic Script Task: `scripts/render_plan.py` validates that order set against the mandate in `AGENTS.md` section 5 (100 percent collateralization on every short option, no naked selling, no speculative long option purchases, limit orders only, portfolio isolation, symbols in the tracked universe), recomputes the collateral and cash arithmetic the agent asserted and fails on disagreement, then renders the plain-ASCII plan.
- Historical Note: Its predecessor `generate_plan.py` selected which puts to sell, set strikes at a fixed percentage of the mark, estimated premiums without consulting a pricing model, asserted option deltas as literal strings, and wrote the rationale for every order. Those are portfolio management decisions.

### Case Study E: Universe Metric Synchronization & Return Engine
- Generative Agent Task: Formulating the forward-looking revenue growth rate, the target price-to-sales multiple, the net dilution rate, and the conviction score, and writing them to `research.valuation_parameters`.
- Deterministic Script Task: `scripts/valuation_model.py` compounds those parameters into the 13-quarter revenue path, the 6-horizon share count, and the 4-horizon price bands, and `scripts/return_engine.py` computes the annualized ROI. Given no authored parameters, the model returns status `UNMODELED` and the ticker carries no rating.

### Case Study F: Coverage Universe Expansion & Equity Onboarding
- Deterministic Script Task: `scripts/onboard_company.py` ingests SEC EDGAR XBRL company facts, queries market quotes, and registers the ticker in the coverage universe. Onboarding brings a company into coverage; it does not research it. A newly onboarded ticker is marked `AWAITING_RESEARCH`.
- Generative Agent Task: Everything that turns coverage into a thesis: the business profile, the moat, the TAM, the catalysts, the parameters, and the invalidation criteria.

## 5. Operational Guidelines for AI Agents

1. Rule 1: Never Freestyle Calculations or Data Invariants
   Do not compute complex financial math, Greeks, compound interest, or data completeness audits using natural language estimation. If a script exists, execute it. If a script does not exist for a repetitive deterministic task, write one in `scripts/` or `scratch/`.

2. Rule 2: Use Generative Reasoning Where Human Judgment Is Required
   When explaining a thesis, synthesizing conflicting news reports, evaluating executive leadership quality, or writing a company description, do not write brittle regexes or programmatic heuristics. Use LLM generation with source tools (`search_web`, `read_url_content`, SEC filings).

3. Rule 3: The Hybrid Pipeline Pattern
   - Phase 1 (Generative Parameter Setting): The agent researches and writes qualitative content and strategic inputs to the research store.
   - Phase 2 (Deterministic Calculation & Verification): Scripts read the store, compute, validate, and render.

4. Rule 4: Data Auditing & Errata Identification
   When checking whether all universe stocks meet a standard, run or write a deterministic audit script. Never browse individual files in an LLM context loop.

5. Rule 5: Author Into the Store, Not Into a Script
   Research belongs in `context/data/equities/<TICKER>.json`, never in a Python literal, a template string, or a lookup table keyed by sector. If you find yourself adding a company name to a dictionary inside a script, the content belongs in the store.

6. Rule 6: Log Agent Sessions in Run Files
   Generative agent roles open and close bounded sessions via `python scripts/activity_ledger.py start-run` and `end-run`. Each session is one file at `context/research/runs/{run_id}.json`. Auto-hooks from deterministic scripts append events when no agent session is active (SYS-* runs). Public intelligence only; never log private portfolio data.

7. Rule 7: Record Errata as Individual JSON Files
   When a claim is found erroneous, record it via `python scripts/errata_log.py record` into `context/research/errata/{erratum_id}.json` and link it from the active run with `ERRATA_LINKED`. See `context/research/errata_protocol.md`. Do not append to monolithic markdown logs.

## 6. Summary Anti-Patterns to Avoid

- Anti-Pattern 1 (Agent Hallucinating Batch Audits): An agent claiming "I verified all stocks and found no errors" without running an audit script.
- Anti-Pattern 2 (Agent Mental Math): An agent approximating option premiums or annualized compounding rates in text without calling `calculate_pricing.py` or `return_engine.py`.
- Anti-Pattern 3 (Over-Scripting Qualitative Text): Generating company analyses through template strings or keyword concatenation instead of generative reasoning.
- Anti-Pattern 4 (Unverified File Modifications): Editing JSON data fields without executing `validate_thesis.py` or `quality_control.py`.
- Anti-Pattern 5 (Research Compiled Into Source): Storing authored prose or hand-set parameters as literals inside a `scripts/*.py` module. The store is the system of record.
- Anti-Pattern 6 (The Plausible Default): A script substituting a sector average, peer median, or template sentence for content no agent has written. A fabricated value is indistinguishable from a researched one once it is on disk, which makes it worse than an empty field. Report the gap instead.
- Anti-Pattern 7 (Laundering a Model Output as an Observation): Presenting this repository's own computed figure as external evidence, such as writing a synthetic "Wall Street Consensus" analyst row from our own price target, or assigning a sentiment score derived from a company's sector rather than from anything observed on a newswire or forum.
