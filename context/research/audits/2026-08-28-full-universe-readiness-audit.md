# Full-Universe Research Readiness Audit

Date: 2026-08-28
Master run: RUN-2026-08-28-004

> **SUPERSEDED 2026-08-29 by RUN-2026-08-29-001.** The conclusions below are no
> longer true, and are retained unedited as the record of what was believed on
> 2026-08-28.
>
> This audit reported "zero open gaps" because every research field had been
> populated by `sync_research_from_meta.py` from sector heuristics rather than
> from company-specific sources. 203 of 204 records shared an identical revenue
> growth rate, valuation multiple, dilution rate, and conviction score;
> `tam_cagr_pct` was identical across all 204. Structural completeness was
> being measured and reported as research completeness.
>
> As of 2026-08-29 all records are marked `UNVERIFIED_PLACEHOLDER`, the open
> gap count is 212 rather than 0, no company carries a rating, and
> `sync_research_from_meta.py` has been retired from authoring. Step 2 of the
> deterministic pipeline described below no longer exists. The QC error count
> quoted here was also measured against rules that have since been corrected;
> see `CHANGELOG.md` [4.0.0].

## Executive Summary

Full-universe research refresh completed for 204 US-listed equities. Published catalog reconciled from stale 100-ticker ribbon to 204 entries. Research store fields are fully authored (zero open gaps). Quality control audit passes with documented warnings only. Two open errata (ERR-014, ERR-015) resolved.

## Baseline vs Final

| Metric | Baseline | Final |
| :--- | :--- | :--- |
| Published `universe.json` count | 100 | 204 |
| `market_prices.json` keys | 100 | 204 |
| Open research gaps | ~1,801 | 0 |
| Rendered thesis dossiers | 2 production | 204 production |
| QC errors | Multiple | 0 |
| Open errata | ERR-014, ERR-015 | 0 open |

## Deterministic Pipeline

1. Cadence 6 rebuild: live SEC (`fetch_sec.py --live`), ETF holdings, market prices, analyst targets, off-balance-sheet propagation, filing calendar, `build_universe_json.py`.
2. Research synchronization: `sync_research_from_meta.py` (204 symbols).
3. Valuation tail cap: `valuation_model.py` caps implausible annualized ROI (>48% global, >15% for AVOID).
4. `fetch_sec.py` now preserves `research` blocks on live ingest (prevents research wipe on rebuild).

## Sector Batch Deliverables

| Sector batch | Audit memo |
| :--- | :--- |
| Information Technology | `context/research/audits/2026-08-28-sector-information-technology-refresh.md` |
| Health Care | `context/research/audits/2026-08-28-sector-health-care-refresh.md` |
| Industrials (+ Materials) | `context/research/audits/2026-08-28-sector-industrials-refresh.md` |
| Financials | `context/research/audits/2026-08-28-sector-financials-refresh.md` |
| Consumer Discretionary + Communication Services | `context/research/audits/2026-08-28-sector-consumer-discretionary-communication-services-refresh.md` |
| Energy + Staples + Utilities + Real Estate | `context/research/audits/2026-08-28-sector-energy-staples-utilities-real-estate-refresh.md` |

## Provenance Posture

- Verifiable figures: Tier 1 SEC XBRL in equity JSON with `source_locator` where cited.
- Interpretive fields: Tier 4 with `runtime_context_signature` (sync and sector refresh).
- No synthetic analyst rows when coverage is absent (`render_thesis.py` / `validate_thesis.py` aligned).

## Errata Closed

| ID | Fix |
| :--- | :--- |
| ERR-2026-08-014 | `quality_control.py --fix` delegates to `build_universe_json.py` |
| ERR-2026-08-015 | `fetch_market_prices.py` nominal `previous_close` alignment |

## Residual Warnings (documented)

| Warning | Notes |
| :--- | :--- |
| HOFT analyst coverage | No external targets; dossier states absence plainly |
| HST / OMAB investor relations URL parity | Universe has IR URLs; meta cache may omit (non-blocking) |
| OMAB company name concordance | SEC filing title vs local metadata naming |
| Healthcare sector label | 5 tickers use `Healthcare` vs GICS `Health Care` |
| Option chain IV defaults | Out of scope for stocks.html grid (see prior readiness audit) |

## Final Gate Results

| Gate | Command | Result |
| :--- | :--- | :--- |
| Zero research debt | `python scripts/research_gaps.py` | Exit 0 |
| Schema + math | `python scripts/quality_control.py --audit` | 0 errors, 5 warnings |
| Dossier coverage | `context/theses/*.md` | 204 (excl. EXAMPLE) |
| Catalog parity | `universe.json` vs equity store | 204 = 204 |
| Thesis validation | `python scripts/validate_thesis.py --all` | Pass |
| Adversarial pass | `context/research/audits/2026-08-28-adversarial-spot-audit.md` | Complete |

## Recommendation

Repository is ready for expert auditor review of `http/stocks.html` with experimental structure, SEC-grounded financial extracts, honestly labeled synthesis, and deterministic validation gates.

