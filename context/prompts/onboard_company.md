# Onboarding a New Company to the Public Equities Universe

This prompt protocol defines the multi-agent coordination workflow and tool sequence for onboarding a newly discovered US exchange-listed public equity into the tracked investment universe.

## Executive Mandate & Standards

1. Asset Eligibility: US exchange-listed public common stocks only (NYSE, NASDAQ, AMEX). Strictly no OTC/penny stocks, mutual funds, or leveraged ETFs.
2. 20-Year Hurdle: Must demonstrate a credible path to achieving >= 20% annualized return on investment over a multi-year horizon.
3. No Emojis & Clean Markdown: Never use emojis or standalone horizontal rules (`---`) in generated dossiers or data structures.
4. Deterministic Math Invariant: All financial mathematics (CAGR, multiple scaling, 13Q revenue path, 6H shares, 4H price target bounds) must be computed via deterministic scripts (`valuation_model.py`, `return_engine.py`).

## Multi-Agent Execution Sequence

### Phase 1: Equity Research Agent Discovery & Stage 1 Triage

1. Market Discovery: Research the company's business model, industry TAM, competitive edge, and secular drivers using search and regulatory tools.
2. Stage 1 Lightweight Triage:
   - Gross Margin Viability: Gross margin >= 15%.
   - Liquidity Runway: Positive FCF or >= 12-24 months of cash runway.
   - Leverage: Debt/Equity <= 4.0x (manageable debt service).
   - Share Dilution: Annual SBC/share dilution <= 4.0%/year.
3. Solvency & Off-Balance Sheet Encumbrances Audit:
   - Audit SEC 10-K/10-Q footnotes for gross pension/OPEB obligations, Superfund/environmental remediation commitments, mass tort litigation, and take-or-pay purchase agreements.
4. Execution Command:
   ```bash
   python scripts/onboard_company.py --symbol <TICKER> --name "<COMPANY_NAME>" --sector "<SECTOR>" --industry "<INDUSTRY>" --offline
   # Or for live regulatory fetch:
   python scripts/onboard_company.py --symbol <TICKER> --live
   ```

### Phase 2: Investment Thesis Agent Deep Qualitative Authoring

1. Author the Six Mandatory Qualitative Sections:
   - Business Profile: Core operations, operating segments, customer end-markets, executive strategy.
   - TAM & Market Share: Addressable market size in $B, current market share %, 3-year projected share.
   - Competitive Moat Analysis: Switching costs, network effects, IP, scale, pricing power, ROIC defense.
   - Anticipated Catalysts & Timeline: Concrete product names, target launch windows, revenue impact ($B), bridge to 13Q revenue forecast inflections.
   - Share Dilution or Buyback: Board repurchase authorizations, historical buyback pace, dilution risks.
   - Explicit Invalidation Criteria: Numerical and operational tripwires mandating immediate position liquidation.
2. Revenue & Valuation Multiple Narratives:
   - Provide comprehensive justifications for the 13Q revenue path and target exit P/S multiple.
3. Validation & Quality Control:
   ```bash
   python scripts/validate_thesis.py --file context/theses/<TICKER>.md
   python scripts/quality_control.py --audit
   ```

## Provenance & Attribution

Attach data provenance metadata conforming to `context/schemas/data_provenance.json`:
- SEC EDGAR Filings: `TIER_1_PRIMARY_REGULATORY`
- Market Prices: `TIER_2_FINANCIAL_AGGREGATOR`
- Quantitative Return Model: `TIER_1_PRIMARY_REGULATORY` (Return Engine)
- Qualitative Moat & Narrative: `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE` (with active runtime signature)
