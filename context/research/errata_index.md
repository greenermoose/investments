# Errata Index

Generated index of errata records in `context/research/errata/`. Do not edit by hand; regenerate with `python scripts/errata_log.py render-index`.

See [errata_protocol.md](errata_protocol.md) for the verification workflow.

| Erratum ID | Date | Target File | Field / Claim | Category | Status | Identified By |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| ERR-2026-08-001 | 2026-08-16 | `context/theses/BA.md` | Boeing 737 MAX Backlog Share | STALE_PARAMETRIC_MEMORY | RESOLVED | Memory Agent |
| ERR-2026-08-002 | 2026-08-16 | `context/theses/NVDA.md` | Data Center Revenue Q1 2026 | TRANSCRIPTION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-003 | 2026-08-17 | `scripts/data/company_meta.json` | BETA Company Name & Description | HALLUCINATION | RESOLVED | Memory Agent |
| ERR-2026-08-004 | 2026-08-17 | `scripts/data/company_meta.json` | XYZ Company Name & Description | TRANSCRIPTION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-005 | 2026-08-17 | `scripts/data/company_meta.json` | MSTR Company Name & Description | TRANSCRIPTION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-006 | 2026-08-17 | `scripts/data/market_prices.json` | BETA Market Price Record | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-007 | 2026-08-17 | `scripts/data/market_prices.json` | XYZ Market Price Record | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-008 | 2026-08-17 | `scripts/data/company_meta.json` | ZM Official Company Name | TRANSCRIPTION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-009 | 2026-08-17 | `scripts/return_engine.py` / `context/theses/*.md` | Universe ROI Predictions & Target Price Valuation Models | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-010 | 2026-08-17 | `scripts/valuation_model.py` / `context/theses/CSIQ.md` | Target P/S Multiple Lower Bound & Target Exit Price Synch... | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-011 | 2026-08-26 | `http/docs/sources.html` / `context/sources/catalog.md` | Consolidated Feed Provider Designation for NYSE / NASDAQ | HALLUCINATION | RESOLVED | Memory Agent |
| ERR-2026-08-012 | 2026-08-28 | `context/data/universe.json`, `context/theses/TSM.md`, `context/theses/PDD.md`, `scripts/*.py` | Foreign Private Issuer ADR Ratios & Currency Conversion (... | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-013 | 2026-08-28 | `scripts/parse_snapshot.py` | Portfolio Snapshot CSV Ingestion (quantity, cash, SGOV, o... | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-014 | 2026-08-28 | `scripts/quality_control.py` (`fix_all`, line ~1178)` | Master universe catalog schema fidelity under `--fix` | METHODOLOGY_CALCULATION_ERROR | OPEN | Memory Agent |
| ERR-2026-08-015 | 2026-08-28 | `context/data/universe.json`, `context/data/market_prices.json` | `previous_close`, `day_change`, `day_change_percent` spli... | UPSTREAM_API_ANOMALY | OPEN | Memory Agent |
| ERR-2026-08-016 | 2026-08-28 | `scripts/onboard_company.py`, `scripts/triage_universe.py`, `scripts/screen_market.py`, `scripts/calculate_pricing.py` | Argparse help string percent escaping | TRANSCRIPTION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-017 | 2026-08-28 | `scripts/data/company_meta.json`, `context/theses/HOFT.md` | HOFT company name, sector, and industry classification | HALLUCINATION | RESOLVED | Memory Agent |
| ERR-2026-08-018 | 2026-08-28 | `scripts/generate_plan.py` (`build_plan_orders_for_account`)` | Equity liquidation order generation for held positions ra... | METHODOLOGY_CALCULATION_ERROR | RESOLVED | Memory Agent |
| ERR-2026-08-019 | 2026-08-28 | `context/data/equities/CSIQ.json` | Canadian Solar off-balance-sheet and contingent-liability... | HALLUCINATION | RESOLVED | Investment Thesis Agent |
