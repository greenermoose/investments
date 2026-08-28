# Decision-Data Readiness Audit: 2026-08-28

This public audit records data quality and research readiness without using account balances, position quantities, cost bases, or other private portfolio information. The named issuers were evaluated on identical public-universe standards regardless of any brokerage relationship.

## Stage 1 Eligibility and Solvency Review

The screening standard is gross margin at least 15%, positive free cash flow or at least twelve months of liquidity runway, Debt/Equity no greater than 4.0x, and annual dilution no greater than 4%. Because the repository's automated Stage 1 fields are currently unpopulated, this review fails closed on missing evidence and uses issuer filings directly.

| Symbol | Margin Evidence | Liquidity Evidence | Leverage Evidence | Dilution Evidence | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ENIC | 40.38% revenue less raw-material cost margin; 21.68% operating margin | $1.320B operating cash flow in 2025 | Total liabilities/equity of 1.33x is an upper bound on Debt/Equity | Weighted average ordinary shares were unchanged | PASS; onboarded |
| HST | 15.62% revenue less property-level and condominium cost margin | $1.510B operating cash flow and $768M cash at year end | Approximately $5.1B debt / $6.561B equity = 0.78x | Shares declined 0.41% between year end and the latest reported quarter | PASS; onboarded |
| OMAB | 56.0% operating margin, which establishes a gross-margin floor above 15% | Ps.7.446B operating cash flow; management states working capital is sufficient | Total liabilities/equity of 1.71x is an upper bound on Debt/Equity | Total shares outstanding were unchanged | PASS; onboarded |
| HSBC | A banking issuer does not report a comparable gross-margin measure | Not reached after the first mandatory field failed closed | Not reached | Not reached | NOT ELIGIBLE under the identical screen; not onboarded |

Primary sources: [Enel Chile 2025 Form 20-F](https://www.sec.gov/Archives/edgar/data/1659939/000110465926050251/enic-20251231x20f.htm), [Host Hotels & Resorts 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1070750/000107075026000054/hst-20251231.htm), [OMAB 2025 Form 20-F](https://www.sec.gov/Archives/edgar/data/1378239/000110465926051987/omab-20251231x20f.htm), and [HSBC 2025 Form 20-F](https://www.sec.gov/Archives/edgar/data/1089113/000108911326000010/hsbc-20251231.htm).

The OMAB record was also corrected for its 8:1 ADS ratio and mixed-currency extraction. The latest filing summary now stores 48.271M ADS equivalents, $886.853M revenue, $747.174M debt, and $172.105M cash. Historical filing rows remain source observations and must not be treated as uniformly normalized until the foreign-currency extractor becomes unit-aware.

## Ranked Information Improvements

### Highest Priority

1. Ingest actual option-chain bid, ask, implied volatility, Delta, open interest, volume, and earnings-event exposure. `calculate_pricing.py` currently defaults every underlying to 30% implied volatility, so it cannot select a genuinely liquid Delta-targeted contract or price a Monday limit order from the market.
2. Ingest confirmed earnings dates and material 8-K, 6-K, and 20-F events before every single-session plan. A plan entered once and left unattended needs event risk determined before execution, not monitored during the week.

### High Priority

1. Complete valuation, capital-allocation, dilution, catalyst, and contingent-liability authorship. The pre-task baseline was 1,765 open fields and 133 quality-control warnings. After three newly eligible issuers were added and nine CSIQ/NVDA fields were completed, the store has 1,801 open fields and the full audit reports 143 warnings. The increase is explicit research debt from onboarding, not fabricated completion.
2. Expand operational surveillance. Sentiment surveillance contains zero source observations, while the activist short-seller registry contains only five campaigns. Both are too sparse to support systematic event detection.

### Medium Priority

1. Add portfolio-level concentration, cross-position correlation, maximum drawdown, scenario stress, and the modeled probability of meeting the 20% annualized-return hurdle. Point CAGR estimates do not describe the distribution of outcomes or the risk of simultaneous losses.

### Future Brokerage Uploads

1. Capture position-level market values, acquisition lots, cost basis, open orders, and settled versus unsettled cash. These fields improve reconciliation, exit sizing, and collateral verification even in a tax-advantaged account, although they are not required to archive a position snapshot.

## Completed Priority Research

Canadian Solar's eight missing research fields and NVIDIA's missing off-balance-sheet audit were completed through the research store using SEC filings and issuer-filed exhibits. Canadian Solar's liability section now reflects its disclosed purchase, equipment, project, letter-of-credit, and lease commitments rather than an unrelated utility-company placeholder. NVIDIA's audit records $366B of future commitments plus $7.207B of commenced operating lease obligations from its latest Form 10-Q.

Primary sources: [Canadian Solar 2025 Form 20-F](https://www.sec.gov/Archives/edgar/data/1375877/000110465926041976/csiq-20251231x20f.htm), [Canadian Solar August 2026 Form 6-K exhibit](https://www.sec.gov/Archives/edgar/data/1375877/000110465926095449/tm2622845d1_ex99-1.htm), and [NVIDIA July 2026 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm).
