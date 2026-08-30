# Prospective Experimental Collection Loop

This document sequences the experimental program. Every step below is
prospective: it records what was believed *before* an outcome could be
observed, so that forecast quality can later be measured rather than asserted.
Nothing here reconstructs history, and no step produces advice.

The scripts referenced are fronted by `python scripts/manage_universe.py experiment <subcommand>`,
which passes arguments straight through to the underlying script. Run any
subcommand with `--help` for its own options.

## Why the order matters

The loop only measures anything if forecasts are frozen before outcomes are
known. A forecast recorded after the fact is not a forecast. Freezing on the
weekend, recording fills on Monday, and scoring only after settlement is what
keeps the record honest; running the steps out of order silently converts the
experiment into a narrative.

## Daily, after the close

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Refresh quotes and risk metrics | `python scripts/fetch_market_prices.py --live` | Prices, volumes, realized volatility, ATR, RSI, beta, and the per-record data-integrity verdict. |
| Extend the price archive | `python scripts/fetch_market_prices.py --archive` | Append to the persistent daily OHLCV archive. |
| Audit integrity | `python scripts/quality_control.py --audit` | Report quarantined records. Quarantined symbols are excluded from proposals; they are not repaired by hand. |

An extreme session move stays quarantined until corroborated by an official
exchange or issuer source, supplied through `--corroboration-file`. Leaving a
symbol quarantined is an acceptable outcome.

## Event-driven, within 24 hours of a filing

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Ingest filings | `SEC_USER_AGENT="<app> <contact email>" python scripts/fetch_sec.py --live` | Company Facts, statements, derived metrics, and an immutable raw archive keyed by content hash. |
| Review affected hypotheses | *(agent)* | When the raw content hash changes, the record is marked `research_refresh_required`. Only an agent may revise a hypothesis; no script may. |

## Friday, after the close

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Archive option chains | `python scripts/manage_universe.py experiment archive-chain <csv> --symbol <SYM> ...` | Store the delayed Cboe chain as an immutable snapshot under `context/data/option_chains/`. |
| Refresh the security master | `python scripts/manage_universe.py experiment security-master --sec-tickers <path> --as-of-date <date>` | Capture listings, tickers, and CIKs as they stood this week. |

Option proposals may only reference strikes and expirations observed in an
archived chain. Until a real chain is archived, no option order can be
proposed, and that is the intended behaviour rather than a defect to work
around.

## Weekend, before any outcome is known

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Freeze forecasts | `python scripts/manage_universe.py experiment freeze-forecast <forecast.json> --data-snapshot-id ... --model-version ... --prompt-version ...` | Record bear/base/bull targets, probabilities, evidence references, and stated limitations. |
| Freeze the experiment | `python scripts/manage_universe.py experiment freeze --as-of <date> --model-version ... --prompt-version ... --input <path> [--input ...] [--proposal <path>]` | Hash every input and proposal into an immutable weekly manifest under `private/experiments/`. |

## Monday, at and after the open

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Record each order event | `python scripts/manage_universe.py experiment record-execution --proposal-id ... --account ... --event-type ... --symbol ... --quantity ... --fees ...` | One immutable JSON file per event: submitted, filled, rejected, cancelled, expired unfilled. |

An unfilled order is a result, not a failure, and is recorded as such. Limits
are never lowered during the week to force a fill.

## Friday settlement and the following weekend

| Step | Command | Purpose |
| :--- | :--- | :--- |
| Reconcile each account | `python scripts/manage_universe.py experiment reconcile --previous <snapshot> --current <snapshot>` | Value bridge and option lifecycle diff per account, cross-checked against the execution log. |
| Record performance | `python scripts/manage_universe.py experiment record-performance --account ... --as-of-date ... --account-value ... --net-external-flow ... --fees ... --previous-value ... --spy ... --qqq ... --sgov ...` | Net-of-fee, pre-tax time-weighted return with deposits and withdrawals neutralised. |
| Score the forecast | `python scripts/manage_universe.py experiment score --forecast <frozen> --actual <observed>` | Forecast error, catalyst Brier score, option premium error, fill rate, and slippage. |

## Continuous obligations

- `python scripts/manage_universe.py experiment check-claims` must exit 0. It
  fails the repository when public text makes a non-experimental claim.
- `python scripts/run_tests.py` must pass before any collected data is trusted.
- Benchmarks (SPY, QQQ, SGOV, and the Cboe option-strategy indexes) are
  measurement tools. They are not permitted holdings.

## What this loop deliberately does not do

It does not promote the system to validated, proven, or decision-grade at any
observation count, and it does not reconstruct historical strategy
performance. Accumulated evidence is reported as a quantity of evidence, never
as a conclusion about capability.
