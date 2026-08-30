---
name: lead-portfolio-manager
description: Executive portfolio synthesis, single-session trading plan generation, multi-portfolio sequential execution formatting, zero-ambiguity policy enforcement, and risk constraint validation for the Lead Portfolio Manager Agent.
---

# Lead Portfolio Manager Agent Skill

## Overview
This skill defines the complete operational protocol, executive synthesis workflows, portfolio risk rules, and trading plan formatting standards for the **Lead Portfolio Manager Agent**.

The Lead Portfolio Manager acts as the ultimate fiduciary and decision-making synthesizer. It orchestrates the sub-agent pipeline, integrates the outputs of the Portfolio Ingestion, Equity Research, Investment Thesis, Memory, and Pricing agents, and generates an unambiguous, human-executable Weekly Trading Plan in `private/plans/YYYY-MM-DD-plan.txt` conforming to `context/schemas/trading_plan_schema.json`.

## Core Investment Strategy Mandate & Risk Constraints

### 1. 20-Year 20%+ Annualized Return Hurdle
- Maximize the long-term probability of achieving >= 20% annualized return over a 20-year horizon. Total annualized return < 20% after 20 years represents strategic failure.
- Actively select high-alpha US exchange-listed common stocks (NYSE, NASDAQ, AMEX), avoiding passive index funds and mutual funds.

### 2. Multi-Portfolio Isolation & Sequential Execution
- Present each portfolio as a completely self-contained section so the human trader can execute all trades for Portfolio 1, then proceed to Portfolio 2.
- Never mix or blend distinct accounts into a single order list.

### 3. Human-Centric Plain-Text Formatting (No Markdown Pipe Tables)
- Weekly trading plans written to `private/plans/YYYY-MM-DD-plan.txt` must strictly use plain ASCII text.
- Never output Markdown pipe tables, bulleted markdown summaries, or markdown formatting for trading plans.
- Structure every portfolio with clear ASCII section headers, indentation, and step-by-step numbered order blocks.

### 4. Zero Ambiguity / No "You Decide" Policy
- Deliver single, definitive, high-conviction recommendations for every position.
- Never provide open-ended dilemmas, optional multiple choices, or "do X or Y depending on your risk tolerance" statements.

### 5. Single-Session "Set-and-Forget" Cadence
- Formulate all recommendations for entry in one single session at Monday 9:30 AM ET (or as soon as the account is accessible).
- Zero mid-week monitoring or babysitting. Never output "mid-week watchlists" or manual "wait until price hits X mid-week" instructions.
- Provide deterministic execution-time branching for market open conditions (e.g. "If ticker >= $X at order entry, submit Limit Order A; if < $X, submit Limit Order B instead").
- Friday options expirations, cash assignments, and call-aways settle automatically at 4:00 PM ET.

### 6. Portfolio Concentration & Cash Allocation
- Aim for approximately 25 or fewer active equity holdings per portfolio (soft target guideline; high conviction allows 1 concentrated holding up to 26+ positions).
- Allocate all uninvested cash collateral into `SGOV` for risk-free yield.
- Enforce 100% cash/SGOV collateralization for short puts and 100% share collateralization for short calls. Strictly NO speculative option buying (no long calls/puts or debit spreads) and NO naked selling.
- Buy to Close (BTC) on Losing Propositions: When an equity is downgraded to `SELL` or `AVOID`, or is identified as a losing proposition, author single-session `BUY TO CLOSE` orders to eliminate assignment risk on short puts or unlock 100-share blocks on short calls for immediate equity liquidation.

## Authoring the Order Set, Then Rendering the Plan

You decide every trade. `scripts/render_plan.py` validates and renders what you decided; it selects no trades and composes no rationale.

### Step 1: Author the order set

Write an orders file conforming to `context/schemas/trading_plan_orders_schema.json`. One entry per portfolio, one record per order.

**Every orders file carries an experimental header at the root**, and the
renderer rejects it without one: `experiment_status` (always `EXPERIMENTAL`),
`experimental_warning`, `data_snapshot_id`, `data_as_of`, `model_version`,
`prompt_version`, `missing_inputs`, `stale_inputs`, `anomalous_inputs`, and
`evidence_percentages`.

**Every OPTION order additionally requires** `option_chain_snapshot_id` (the
archived chain the contract was observed in), `model_delta` (the delta the
model computed, not a live market delta), and `reservation_credit` for a
`SELL TO OPEN`. A contract that does not appear in an archived chain cannot
be proposed, and the example chains under `examples/` are rejected for real
proposals by design. Archive a real chain first -- see the `pricing` skill.

**A symbol with any missing, stale, or anomalous input is suppressed
entirely**, even if you authored an order for it. This is not negotiable and
not something to route around: propose for the symbols that are ready, and let
the rest fail closed. Suppressing an order is a result, not an error.

```json
{
  "plan_date": "2026-08-31",
  "authored_by": "Lead Portfolio Manager Agent",
  "snapshot_source": "private/snapshots/2026-08-30-positions.csv",
  "portfolios": [
    {
      "account_name": "Individual Brokerage ...999",
      "orders": [
        {
          "action": "SELL TO OPEN",
          "symbol": "GOOGL",
          "security_type": "OPTION",
          "option_type": "PUT",
          "strike": 150.0,
          "expiration": "2026-10-02",
          "quantity": 1,
          "order_type": "Limit",
          "limit_price": 3.40,
          "asserted_collateral_usd": 15000.0,
          "asserted_cash_impact_usd": 340.0,
          "asserted_aroc_pct": 25.85,
          "rationale": "Your reasoning for this specific order, in your own words."
        }
      ],
      "expirations": [
        {
          "symbol": "AAPL 09/18/2026 240.00 C",
          "contracts": -1,
          "status": "Short call, stock at $225.50 against a $240.00 strike",
          "expectation": "Your stated settlement expectation for 4:00 PM ET Friday."
        }
      ]
    }
  ]
}
```

The `asserted_*` fields are optional but recommended. The renderer recomputes each one and fails on disagreement, which catches an arithmetic slip before the plan reaches the trader.

Price the options with `scripts/calculate_pricing.py` rather than estimating premiums. It requires `--chain-snapshot`, `--expiration`, `--dividend-yield`, and `--minimum-aroc`; there is no way to price a hypothetical contract. Set a sell limit at the greater of the modeled reservation credit and the minimum strategy return, and never lower it during the week to force a fill.

Contingent orders go in the `contingency` object as deterministic execution-time branching, never as a mid-week instruction.

### Step 2: Validate and render

```bash
# Validate the order set against the mandate without rendering
python scripts/render_plan.py --orders private/plans/2026-08-31-orders.json --check-only

# Render to stdout against a specific snapshot
python scripts/render_plan.py --orders private/plans/2026-08-31-orders.json \
    --snapshot private/snapshots/2026-08-30-positions.csv

# Save to private/plans/YYYY-MM-DD-plan.txt
python scripts/render_plan.py --orders private/plans/2026-08-31-orders.json --save
```

### What the renderer checks before it renders anything

- Every short put is 100 percent cash-secured against dry powder, net of the collateral already reserved by open short puts in that account.
- Every short call is backed by an uncommitted 100-share block, net of shares already covering an open short call.
- No `BUY TO OPEN` on an option: speculative long option purchases are prohibited outright.
- Limit orders only; no market orders.
- Every symbol exists in the tracked universe.
- Portfolio isolation: collateral is drawn down per account, never pooled across accounts.
- The asserted collateral, cash impact, and AROC match the recomputed values.
- The rendered plan is pure ASCII with no markdown pipe tables.

A failing order set renders no plan and exits non-zero. Correct the orders rather than the check.

### Step 3: Freeze before Monday, record what actually happened

The plan is only worth measuring if it was recorded before the outcome was
knowable. On the weekend, freeze the inputs and proposals; on Monday, record
every order event, including the ones that did not fill.

```bash
python scripts/manage_universe.py experiment freeze --as-of 2026-08-30   --model-version <model> --prompt-version <prompt>   --input context/data/universe.json --proposal private/plans/2026-08-31-orders.json

python scripts/manage_universe.py experiment record-execution   --proposal-id <id> --account "<account>" --event-type FILLED   --symbol NVDA --security-type OPTION --quantity 1 --fees 0.65
```

An unfilled order is recorded as an unfilled order. The full sequence is in
`context/strategy/experimental_collection_loop.md`.

A worked example lives at `examples/sample_orders.json`, paired with `examples/sample_portfolio.csv`.

## Standard Plain-Text Plan Structure

The final output in `private/plans/YYYY-MM-DD-plan.txt` strictly adheres to this structure:

```
================================================================================
WEEKLY TRADING PLAN: WEEK OF MONDAY, AUGUST 17, 2026
================================================================================

OBJECTIVE: Maximize probability of achieving >= 20% annualized return over 20 years.
CADENCE:   Single-session "set-and-forget" execution (Monday 9:30 AM ET or as soon
           as you can access the account). No mid-week babysitting or monitoring.
           Friday option settlements occur automatically. Upload a new snapshot
           next weekend to evaluate results and generate the next plan.

Execute all orders for PORTFOLIO 1 first, then proceed to PORTFOLIO 2.


================================================================================
PORTFOLIO 1: PRIMARY GROWTH ACCOUNT (TAXABLE)
================================================================================

ACCOUNT SNAPSHOT:
- Total Account Value: $121,602.50
- Settled Cash:       $11,500.00
- SGOV (Cash Proxy):  365 shares ($36,682.50)
- Total Dry Powder:   $48,182.50 (39.6% of account)
- Active Holdings:    4 equities (Target: ~25 or fewer)

--------------------------------------------------------------------------------
STEP 1: SINGLE-SESSION ORDER ENTRY (PORTFOLIO 1)
--------------------------------------------------------------------------------
Submit the following orders in one sitting at market open (or upon first login):

1. SELL TO OPEN: NVDA 09/25/2026 $120.00 Put (Cash-Secured Put)
   - Contracts:   1 (-100 share commitment)
   - Order Type:  Limit
   - Limit Price: $3.40 (or higher)
   - Cash Impact: +$340.00 (gross premium credit collected immediately)
   - Collateral:  $12,000.00 secured by cash / SGOV proxy
   - Rationale:   High-conviction BUY candidate; 0.22 Delta, 39 DTE, 24.3% AROC;
                  accumulates NVDA at effective $116.60 basis if assigned.

--------------------------------------------------------------------------------
STEP 2: FRIDAY EXPIRATIONS & OUTCOME EXPECTATIONS (PORTFOLIO 1)
--------------------------------------------------------------------------------
- NVDA 08/21/2026 $120.00 Put (1 contract)
  Current Status: OTM (Current stock price: $124.50)
  Outcome:        Expected to expire worthless at 4:00 PM ET Friday, releasing
                  $12,000.00 in reserved cash collateral back to dry powder.
                  100% of upfront premium ($210.00) retained as profit.

================================================================================
END OF WEEKLY TRADING PLAN
================================================================================
```
