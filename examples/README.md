# Workflow Examples & Templates

This directory provides public, synthetic mock templates illustrating how the **Agentic Investment Advisor** system operates.

## Overview

All real user portfolio snapshots, brokerage exports, and personalized trading plans belong in the **`private/`** directory, which is permanently gitignored.

The files in `examples/` are clean templates designed to:
1. Demonstrate the exact input and output structure expected by the sub-agent pipeline.
2. Allow anyone who clones this repository to test the agent workflow immediately without inputting real financial data.

## Files in this Directory

- **`sample_portfolio.csv`**: A synthetic brokerage export showing standard equity holdings, SGOV cash proxy, cash reserves, and short options positions.
- **`sample_trading_plan.txt`**: A sample plain ASCII text weekly order sheet demonstrating multi-portfolio isolation, single-session set-and-forget execution, and entry-time contingencies.

## How to Run the Workflow with Your Real Portfolio

1. **Place Your Input in `private/snapshots/`:**
   - Export your positions from your brokerage as a CSV, or capture a clean screenshot of your weekend portfolio.
   - Save the file to `private/snapshots/` (e.g. `private/snapshots/2026-08-15-positions.csv`).

2. **Execute the Agent Prompts:**
   - Follow the multi-agent deliberation prompt detailed in `context/prompts/weekly_deliberation.md`.
   - The agents will parse your portfolio from `private/snapshots/`, cross-reference company theses in `context/theses/`, and screen market opportunities.

3. **Save Your Personalized Plan to `private/plans/`:**
   - Save the resulting weekly plan to `private/plans/YYYY-MM-DD-plan.txt`.
   - Because `private/` is gitignored, your account numbers, dollar balances, and personalized trading orders will never be committed to source control.

4. **Contribute Generalized Knowledge to `context/theses/`:**
   - When the agent system produces research on a company, save the company thesis to `context/theses/<TICKER>.md`.
   - This expands the collective intelligence of the repository for future weekly runs without disclosing your personal holdings.
