# Coverage Universe Expansion & Equity Onboarding Protocol

This prompt protocol defines the multi-agent coordination workflow, user invocation templates, and tool sequence for screening and onboarding US exchange-listed public equities into our tracked coverage universe.

## Executive Mandate & Standards

1. Asset Eligibility: US exchange-listed public common stocks and liquid ADRs only (NYSE, NASDAQ, AMEX). Strictly no OTC/penny stocks, mutual funds, or leveraged ETFs.
2. 20-Year Compounding Hurdle: All candidate equities must demonstrate a credible, quantitatively modeled path to achieving >= 20% annualized return on investment over a 3-year to 5-year holding horizon.
3. No Emojis & Clean Markdown: Never use emojis or standalone horizontal rules (`---`) in generated dossiers, data files, or communication responses.
4. Deterministic Math Invariant: All financial mathematics (CAGR, multiple scaling, 13Q revenue trajectory, 6H shares, 4H price target bounds) must be computed via deterministic scripts (`valuation_model.py`, `return_engine.py`).
5. On-Demand Flexibility: The user may invoke this workflow at any time to add single equities or any number of additional equities in batch (anticipated a few times per year).

## User Invocation Prompt Templates

Copy-paste these prompt templates into your agent session to trigger coverage universe expansion:

### Template 1: Thematic / Sector Screening for 20%+ Compounders
```text
Act as the Equity Research Agent. Search the public markets and SEC filings for high-growth [SECTOR/THEME, e.g. cybersecurity / enterprise cloud / industrial robotics] companies listed on US exchanges that offer high potential to achieve >= 20% annualized ROI. 

Run Stage 1 Lightweight Triage (gross margin >= 15%, runway >= 12m, Debt/Equity <= 4.0x, dilution <= 4%/yr), audit balance sheet solvency and off-balance sheet liabilities, and select the top [COUNT, e.g. 3] highest-conviction candidates.

Onboard these equities into our universe by executing scripts/onboard_company.py with live regulatory data, author complete thesis dossiers with the Investment Thesis Agent, validate schema compliance, and execute scripts/quality_control.py --audit. Provide a summary of newly added equities with expected CAGR and dossier paths.
```

### Template 2: Single Named Equity Onboarding
```text
Act as the Equity Research Agent. Add [TICKER, e.g. CRWD] to our coverage universe.

Ingest authoritative SEC EDGAR 10-K/10-Q filings and live market prices using python scripts/onboard_company.py --symbol [TICKER] --live. Evaluate Stage 1 triage and solvency. Collaborate with the Investment Thesis Agent to author the full 6-part qualitative thesis in context/theses/[TICKER].md, model the 13Q revenue trajectory and 4H price targets, validate schema compliance with scripts/validate_thesis.py, and run scripts/quality_control.py --audit.
```

### Template 3: Batch Multi-Equity Onboarding (Any Number of Additions)
```text
Act as the Equity Research Agent. Add the following [COUNT] equities to our coverage universe: [TICKERS, e.g. NOW, ABNB, NET, MDB].

Execute the batch onboarding pipeline via python scripts/onboard_company.py --symbols [TICKERS] --live. Ensure SEC XBRL statements, market quotes, analyst price targets, and master catalogs (universe.json and sec-data.json) are fully synchronized. Author and validate thesis dossiers for each company, and assert zero discrepancies with scripts/quality_control.py --audit.
```

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
4. Sentiment & Activist Short Seller Scan:
   - Verify absence of active SEC fraud probes or short seller campaigns (`scripts/track_short_sellers.py --symbol <TICKER>`).
5. Execution Command:
   ```bash
   # Single equity live onboarding
   python scripts/onboard_company.py --symbol <TICKER> --live

   # Batch multi-equity live onboarding
   python scripts/onboard_company.py --symbols <T1> <T2> <T3> --live

   # Automated screening and onboarding
   python scripts/onboard_company.py --screen --min-roi 20.0 --sector <SECTOR> --limit <N>
   ```

### Phase 2: Investment Thesis Agent Deep Qualitative Authoring

1. Author the Six Mandatory Qualitative Sections in `context/theses/<TICKER>.md`:
   - Business Profile: Core operations, operating segments, customer end-markets, executive strategy.
   - TAM & Market Share: Addressable market size in $B, current market share %, 3-year projected share.
   - Competitive Moat Analysis: Switching costs, network effects, IP, scale, pricing power, ROIC defense.
   - Anticipated Catalysts & Timeline: Concrete product names, target launch windows, revenue impact ($B), bridge to 13Q revenue forecast inflections.
   - Capital Needs & Strategy: Board repurchase authorizations, historical buyback pace, dilution risks, dividends, debt maturities.
   - Explicit Invalidation Criteria: Numerical and operational tripwires mandating immediate position liquidation.
2. Revenue & Valuation Multiple Narratives:
   - Provide comprehensive justifications for the 13Q revenue path and target exit P/S multiple.

### Phase 3: Secondary Dataset Synchronization & Quality Control

1. Secondary Dataset Sync:
   - Re-synthesize `sec-data.json`, `sec_filing_calendar.json`, `sentiment_surveillance.json`, and `short_seller_campaigns.json`.
2. Deterministic Validation & Audit:
   ```bash
   # Validate thesis schema conformance
   python scripts/validate_thesis.py --file context/theses/<TICKER>.md

   # Execute full repository quality control audit asserting 0 errors / 0 warnings
   python scripts/quality_control.py --audit
   ```

## Provenance & Attribution

Attach data provenance metadata conforming to `context/schemas/data_provenance.json`:
- SEC EDGAR Filings: `TIER_1_PRIMARY_REGULATORY`
- Market Prices: `TIER_2_FINANCIAL_AGGREGATOR`
- Quantitative Return Model: `TIER_1_PRIMARY_REGULATORY` (Return Engine)
- Qualitative Moat & Narrative: `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE` (with active runtime signature)
