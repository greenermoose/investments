import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from archive_option_chain import build_snapshot
from experiment_contract import readiness_report
from fetch_market_prices import calculate_market_risk_metrics
from fetch_sec import compute_ttm_revenue, derive_fundamental_metrics
from valuation_model import model_equity_valuation


HEALTHY_FUNDAMENTALS = {
    "gross_margin_pct": 50.0,
    "operating_margin_pct": 20.0,
    "free_cash_flow": 10.0,
    "debt_to_equity_ratio": 0.5,
    "roic_pct": 15.0,
}


class ExperimentalContractTests(unittest.TestCase):
    def test_placeholder_research_fails_closed(self):
        result = readiness_report(
            {
                "experiment_status": "EXPERIMENTAL",
                "research_status": "UNVERIFIED_PLACEHOLDER",
                "forecast_scenarios": {"bear": {}, "base": {}, "bull": {}},
            },
            {"current_price": 100.0, "previous_close": 99.0, "nominal_previous_close": 99.0},
            {
                "gross_margin_pct": 50.0,
                "operating_margin_pct": 20.0,
                "free_cash_flow": 10.0,
                "debt_to_equity_ratio": 0.5,
                "roic_pct": 15.0,
            },
        )
        self.assertFalse(result["trade_ready"])
        self.assertIn("agent-authored experimental research", result["missing_inputs"])

    def test_uncorroborated_extreme_move_fails_closed(self):
        result = readiness_report(
            {
                "experiment_status": "EXPERIMENTAL",
                "research_status": "AGENT_AUTHORED_EXPERIMENTAL",
                "forecast_scenarios": {"bear": {}, "base": {}, "bull": {}},
            },
            {
                "current_price": 130.0,
                "previous_close": 100.0,
                "nominal_previous_close": 100.0,
                "day_change_percent": 30.0,
                "data_integrity": {
                    "prior_close_concordant": True,
                    "adjustment_series_consistent": True,
                    "extreme_move": True,
                    "extreme_move_corroborated": False,
                    "quarantined": True,
                },
            },
            HEALTHY_FUNDAMENTALS,
        )
        self.assertFalse(result["trade_ready"])
        self.assertTrue(any("not corroborated" in item for item in result["anomalies"]))

    def test_missing_integrity_verdict_fails_closed(self):
        """A price record collected before the integrity gate existed must not
        be treated as clean merely because it carries no verdict."""
        result = readiness_report(
            {
                "experiment_status": "EXPERIMENTAL",
                "research_status": "AGENT_AUTHORED_EXPERIMENTAL",
                "forecast_scenarios": {"bear": {}, "base": {}, "bull": {}},
            },
            {"current_price": 130.0, "previous_close": 100.0},
            HEALTHY_FUNDAMENTALS,
        )
        self.assertFalse(result["trade_ready"])
        self.assertTrue(
            any("no data-integrity verdict" in item for item in result["anomalies"])
        )


class FundamentalMetricTests(unittest.TestCase):
    def test_metrics_and_missing_values(self):
        metrics = derive_fundamental_metrics({
            "revenue": 100.0,
            "gross_profit": 40.0,
            "operating_income": 20.0,
            "pretax_income": 10.0,
            "income_tax": 2.0,
            "net_income": 12.0,
            "operating_cash_flow": 18.0,
            "capital_expenditure": 3.0,
            "interest_expense": 4.0,
            "total_debt": 30.0,
            "total_shareholders_equity": 70.0,
            "cash_and_cash_equivalents": 10.0,
        })
        self.assertEqual(metrics["gross_margin_pct"], 40.0)
        self.assertEqual(metrics["free_cash_flow"], 15.0)
        self.assertAlmostEqual(metrics["debt_to_equity_ratio"], 30.0 / 70.0)
        self.assertIsNone(derive_fundamental_metrics({})["roic_pct"])


class TrailingTwelveMonthTests(unittest.TestCase):
    """SEC Company Facts reports interim periods cumulatively. Summing Q1, Q2,
    and Q3 as though they were quarters counted Apple's first quarter three
    times and its second twice, reporting $763.1B against a true $466.8B."""

    @staticmethod
    def filing(year, period, start, end, revenue):
        return {
            "fiscal_year": year, "fiscal_period": period,
            "period_start": start, "period_end": end,
            "data": {"revenue": revenue},
        }

    def test_cumulative_year_to_date_is_completed_not_summed(self):
        filings = [
            self.filing(2026, "Q3", "2025-09-28", "2026-06-27", 364_357_000_000.0),
            self.filing(2026, "Q2", "2025-09-28", "2026-03-28", 254_940_000_000.0),
            self.filing(2026, "Q1", "2025-09-28", "2025-12-27", 143_756_000_000.0),
            self.filing(2025, "FY", "2024-09-29", "2025-09-27", 416_161_000_000.0),
            self.filing(2025, "Q3", "2024-09-29", "2025-06-28", 313_695_000_000.0),
        ]
        # 364.357 + 416.161 - 313.695
        self.assertAlmostEqual(
            compute_ttm_revenue(filings) / 1e9, 466.823, places=2,
        )
        self.assertLess(compute_ttm_revenue(filings), 500_000_000_000.0)

    def test_an_annual_filing_is_the_answer_outright(self):
        filings = [self.filing(2025, "FY", "2024-09-29", "2025-09-27", 416_161_000_000.0)]
        self.assertEqual(compute_ttm_revenue(filings), 416_161_000_000.0)

    def test_discrete_quarters_are_summed(self):
        filings = [
            self.filing(2026, "Q4", "2026-04-01", "2026-06-30", 30.0),
            self.filing(2026, "Q3", "2026-01-01", "2026-03-31", 25.0),
            self.filing(2026, "Q2", "2025-10-01", "2025-12-31", 20.0),
            self.filing(2026, "Q1", "2025-07-01", "2025-09-30", 15.0),
        ]
        self.assertEqual(compute_ttm_revenue(filings), 90.0)

    def test_an_incomplete_year_returns_nothing_rather_than_a_partial_sum(self):
        """An understated TTM is not more useful than an absent one, and it is
        far harder to notice."""
        filings = [self.filing(2026, "Q1", "2025-09-28", "2025-12-27", 143_756_000_000.0)]
        self.assertIsNone(compute_ttm_revenue(filings))

    def test_filings_without_periods_are_ignored(self):
        self.assertIsNone(compute_ttm_revenue([{"data": {"revenue": 100.0}}]))
        self.assertIsNone(compute_ttm_revenue([]))


class ValuationMethodTests(unittest.TestCase):
    def research(self, method):
        provenance = {
            "authored_by": "Investment Thesis Agent",
            "authored_date": "2026-08-29",
            "authority_tier": "TIER_1_PRIMARY_REGULATORY",
            "source_class": "REGULATORY",
            "source_locator": "https://www.sec.gov/example",
            "retrieved_at": "2026-08-29T12:00:00Z",
            "raw_content_hash": "0" * 64,
            "verification_status": "VERIFIED_PRIMARY",
        }
        return {
            "experiment_status": "EXPERIMENTAL",
            "research_status": "AGENT_AUTHORED_EXPERIMENTAL",
            "as_of_date": "2026-08-29",
            "authoring_model": "test-model",
            "prompt_version": "test-prompt",
            "valuation_parameters": {
                "valuation_method": method,
                "valuation_inputs": {
                    "current_metric_per_share": 50.0,
                    "annual_metric_growth": 0.10,
                    "target_multiple": 2.0,
                },
                "annual_share_dilution_rate": 0.0,
                "conviction_score": 7.0,
                "opportunity_cost_annualized": 0.08,
                "uncertainty_score": 0.3,
                "horizon_years": 3.0,
                "provenance": provenance,
            },
            "forecast_scenarios": {
                "bear": {"probability": 0.25, "price_target": 80.0, "rationale": "A sufficiently detailed experimental bear scenario rationale for validation."},
                "base": {"probability": 0.50, "price_target": 133.0, "rationale": "A sufficiently detailed experimental base scenario rationale for validation."},
                "bull": {"probability": 0.25, "price_target": 180.0, "rationale": "A sufficiently detailed experimental bull scenario rationale for validation."},
                "uncertainty": "Material uncertainty remains around future book value growth and valuation multiples.",
                "evidence_refs": ["SEC-TEST-ACCESSION"],
                "provenance": provenance,
            },
        }

    def test_bank_rejects_generic_and_unimplemented_models(self):
        """A depository bank may not be priced on the generic formula, and the
        bank model it does require is not implemented -- so it fails closed
        either way rather than producing a number with no defensible meaning."""
        wrong = model_equity_valuation(
            "AAA", 100.0, 100_000_000, 10_000_000_000,
            sector="Financials", industry="Regional Banks", research=self.research("EARNINGS"),
        )
        self.assertEqual(wrong["status"], "UNMODELED")
        self.assertTrue(any("requires BANK_PTB_ROE" in g["reason"] for g in wrong["gaps"]))

        declared = model_equity_valuation(
            "AAA", 100.0, 100_000_000, 10_000_000_000,
            sector="Financials", industry="Regional Banks", research=self.research("BANK_PTB_ROE"),
        )
        self.assertEqual(declared["status"], "UNMODELED")
        self.assertTrue(any("not implemented" in g["reason"] for g in declared["gaps"]))

    def test_investment_bank_is_not_routed_to_the_bank_model(self):
        """Substring matching on "bank" previously captured brokerages, which
        are earnings businesses, not book-value businesses."""
        result = model_equity_valuation(
            "BBB", 100.0, 100_000_000, 10_000_000_000,
            sector="Financials", industry="Investment Banking & Brokerage",
            research=self.research("EARNINGS"),
        )
        self.assertEqual(result["status"], "MODELED")
        self.assertEqual(result["valuation_method"], "EARNINGS")

    def test_margin_bridge_prices_earnings_not_revenue(self):
        """target_margin_pct must be load-bearing: changing it must move the
        valuation. It was previously validated and then discarded."""
        research = self.research("REVENUE_WITH_MARGIN_BRIDGE")
        research["valuation_parameters"]["valuation_inputs"]["target_margin_pct"] = 20.0
        research["valuation_parameters"]["valuation_inputs"]["target_multiple"] = 20.0
        research["forecast_scenarios"]["base"]["price_target"] = 266.0
        research["forecast_scenarios"]["bear"]["price_target"] = 200.0
        research["forecast_scenarios"]["bull"]["price_target"] = 320.0

        modeled = model_equity_valuation(
            "CCC", 100.0, 100_000_000, 10_000_000_000,
            sector="Information Technology", industry="Software", research=research,
        )
        self.assertEqual(modeled["status"], "MODELED")
        bridge = modeled["margin_bridge"]
        self.assertIsNotNone(bridge)
        # 50 revenue/share compounding at 10% for 3 years = 66.55; at a 20%
        # target margin that is 13.31 of earnings; at a 20x multiple, 266.20.
        self.assertAlmostEqual(bridge["horizon_revenue_per_share"], 66.55, places=2)
        self.assertAlmostEqual(bridge["horizon_earnings_per_share"], 13.31, places=2)
        self.assertAlmostEqual(modeled["valuation_method_target"], 266.20, places=2)

        halved = json.loads(json.dumps(research))
        halved["valuation_parameters"]["valuation_inputs"]["target_margin_pct"] = 10.0
        halved_result = model_equity_valuation(
            "CCC", 100.0, 100_000_000, 10_000_000_000,
            sector="Information Technology", industry="Software", research=halved,
        )
        # Halving the margin halves the target, which puts it outside the
        # tolerated divergence from the unchanged base scenario.
        self.assertEqual(halved_result["status"], "UNMODELED")

    def test_margin_bridge_requires_a_positive_margin(self):
        research = self.research("REVENUE_WITH_MARGIN_BRIDGE")
        research["valuation_parameters"]["valuation_inputs"]["target_margin_pct"] = 0.0
        result = model_equity_valuation(
            "DDD", 100.0, 100_000_000, 10_000_000_000,
            sector="Information Technology", industry="Software", research=research,
        )
        self.assertEqual(result["status"], "UNMODELED")
        self.assertTrue(any("target_margin_pct" in g["field"] for g in result["gaps"]))


class OptionArchiveTests(unittest.TestCase):
    def test_chain_normalization_and_crossed_market_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "chain.csv"
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["Type", "Expiration", "Strike", "Bid", "Ask", "IV", "Delta"])
                writer.writeheader()
                writer.writerow({"Type": "Call", "Expiration": "09/18/2026", "Strike": "100", "Bid": "2.00", "Ask": "2.20", "IV": "30%", "Delta": "0.25"})
                writer.writerow({"Type": "Put", "Expiration": "09/18/2026", "Strike": "95", "Bid": "3.00", "Ask": "2.00", "IV": "35%", "Delta": "-0.2"})
            snapshot = build_snapshot(path, "AAA", "2026-08-28T20:15:00Z", "https://www.cboe.com/delayed_quotes/aaa/quote_table", 15, 101.0)
            self.assertEqual(snapshot["experiment_status"], "EXPERIMENTAL")
            self.assertEqual(len(snapshot["contracts"]), 1)
            self.assertEqual(len(snapshot["rejected_rows"]), 1)


class MarketRiskTests(unittest.TestCase):
    def test_observation_counts_prevent_fake_252_day_volatility(self):
        candles = []
        for index in range(30):
            close = 100.0 + index
            candles.append({
                "date": f"2026-07-{index + 1:02d}",
                "split_adj_close": close,
                "split_adj_high": close + 1,
                "split_adj_low": close - 1,
            })
        metrics = calculate_market_risk_metrics(candles)
        self.assertIsNotNone(metrics["realized_volatility_20d_pct"])
        self.assertIsNone(metrics["realized_volatility_60d_pct"])
        self.assertIsNone(metrics["realized_volatility_252d_pct"])


class ExecutionLogConventionTests(unittest.TestCase):
    def test_one_execution_event_per_file(self):
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory) / "logs" / "execution"
            command = [
                sys.executable, str(SCRIPTS_DIR / "record_execution.py"),
                "--proposal-id", "PROP-001", "--account", "Test IRA",
                "--event-type", "FILLED", "--symbol", "AAA",
                "--security-type", "EQUITY", "--quantity", "1",
                "--price", "10", "--fees", "0", "--recorded-at", "2026-08-31T13:30:00Z",
                "--output-root", str(output_root),
            ]
            subprocess.run(command, check=True, capture_output=True, text=True)
            files = list(output_root.iterdir())
            self.assertEqual(len(files), 1)
            self.assertEqual(files[0].suffix, ".json")
            self.assertFalse(any(path.suffix == ".jsonl" for path in output_root.iterdir()))
            payload = json.loads(files[0].read_text(encoding="utf-8"))
            self.assertEqual(payload["event_type"], "FILLED")


if __name__ == "__main__":
    unittest.main()
