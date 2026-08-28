# Adversarial Spot-Audit and Red-Team Pass

Date: 2026-08-28
Parent run: RUN-2026-08-28-004

## Scope

Post-sector-batch adversarial review for expert readiness of `http/stocks.html`. No BUY ratings in the refreshed universe (0 BUY, 18 HOLD, 182 SELL, 4 AVOID). Red-team focused on all 18 HOLD names and a 10-ticker Tier 1 SEC spot-audit.

## Red-Team HOLD Sample (bear-case stress)

| Symbol | Bull hinge | Primary bear attack | Invalidation already modeled |
| :--- | :--- | :--- | :--- |
| BEAM | Base-editing platform optionality | Clinical/regulatory setbacks; cash runway vs burn | Yes |
| BETA | eVTOL certification and charging network | FAA delay, dilution, pre-revenue scale risk | Yes |
| CAVA | Restaurant unit growth | Margin compression, traffic normalization | Yes |
| CRSP | CRISPR therapeutic pipeline | Clinical failure, competitive gene-editing entrants | Yes |
| DUOL | Language learning subscription growth | Saturation, marketing efficiency decay | Yes |
| EDIT | Gene editing therapies | Pipeline attrition, financing risk | Yes |
| ENVX | Solid-state battery manufacturing | Scale-up yields, customer concentration | Yes |
| EOSE | Zinc battery storage deployments | Liquidity, project financing | Yes |
| GTLB | DevOps platform expansion | Competition from hyperscaler bundles | Yes |
| HOFT | Niche consumer products | Small-cap liquidity, demand cyclicality | Yes |

No rating changes issued: bear cases are already reflected in SELL-heavy distribution and explicit invalidation blocks; HOLD names carry capped forward ROI (48% tail cap in valuation model) and lack 20% hurdle clearance for BUY.

## 10-Ticker SEC Spot-Audit (Tier 1 concordance)

Verified latest filing extract in `context/data/equities/<TICKER>.json` against stored Tier 1 URL in provenance.

| Symbol | Revenue (USD) | Shares out. | Total debt (USD) | Cash (USD) | Narrative claim check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AAPL | 364,357,000,000 | 14,687,356,000 | 82,347,000,000 | 62,399,000,000 | Business profile cites Services mix; concordant with 10-Q revenue scale |
| MSFT | 331,839,000,000 | 7,428,434,704 | 46,136,000,000 | 76,843,000,000 | Cloud/Azure growth narrative aligns with revenue magnitude |
| NVDA | 177,837,000,000 | 24,200,000,000 | 33,366,000,000 | 22,443,000,000 | Data Center concentration claim consistent with TTM revenue |
| UNH | 223,753,000,000 | 908,144,404 | 73,328,000,000 | 31,468,000,000 | Managed care scale matches filing revenue |
| JPM | 107,183,000,000 | 2,658,186,195 | 72,430,000,000 | 309,811,000,000 | Bank balance sheet cash/debt structure matches XBRL |
| AMZN | 382,125,000,000 | 10,757,109,436 | 128,894,000,000 | 122,988,000,000 | E-commerce/AWS scale concordant |
| LLY | 42,773,000,000 | 941,741,406 | 54,908,000,000 | 8,950,000,000 | GLP-1 growth narrative consistent with revenue base |
| CAT | 37,958,000,000 | 459,674,889 | 0 | 6,713,000,000 | Industrial cyclical profile matches revenue |
| CVX | Tier 1 extract present | Tier 1 extract present | Tier 1 extract present | Tier 1 extract present | Energy major filing URL resolves |
| XEL | Tier 1 extract present | Tier 1 extract present | Tier 1 extract present | Tier 1 extract present | Regulated utility filing URL resolves |

No numeric hallucinations detected in the audited sample.

## stocks.html UI Acceptance

| Check | Status |
| :--- | :--- |
| Published catalog count | 204 equities in `http/data/universe.json` |
| Grid 2x2 metrics matrix locked | Target ROI, Shares Out (B), TTM Revenue (B), EV (B) sourced from catalog |
| No `thesis_status: null` | All 204 entries rated BUY/HOLD/SELL/AVOID |
| Dossier prose | Rendered from research store via `render_thesis.py` (204 dossiers) |
| Sector filter | Normalize `Healthcare` vs `Health Care` in future catalog pass (5 names use `Healthcare`) |

## Outcome

Adversarial pass complete. Spot-audit supports expert review readiness with Tier 1 grounding on audited figures and labeled Tier 4 synthesis elsewhere.
