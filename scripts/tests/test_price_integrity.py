#!/usr/bin/env python3
"""Regression tests for the price-integrity gate.

Both gates covered here shipped non-functional. Prior-close concordance
compared two fields that had become aliases for the same value, so it could
never fire. Extreme-move corroboration was defined as `not extreme_move`, so it
was satisfied by the very condition it was meant to flag. Neither had a test.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from experiment_contract import price_warnings
from fetch_market_prices import assess_price_integrity, select_previous_close


def candle(date, close, adj_close=None, split_factor=1.0, dividend=None):
    return {
        "date": date,
        "split_adj_close": close,
        "nominal_close": round(close * split_factor, 2),
        "adj_close": close if adj_close is None else adj_close,
        "split_factor": split_factor,
        "dividend_amount": dividend,
    }


class PreviousCloseSelectionTests(unittest.TestCase):
    def test_quote_ahead_of_series_uses_the_last_candle(self):
        """The current session is often returned as an all-null bar and dropped,
        leaving the last surviving candle as the prior session. Assuming a fixed
        offset here reported a two-session move as a one-session move."""
        candles = [candle("2026-08-26", 313.45), candle("2026-08-27", 314.58)]
        chosen = select_previous_close(candles, "2026-08-28")
        self.assertEqual(chosen["date"], "2026-08-27")

    def test_settled_session_uses_the_candle_before_it(self):
        candles = [candle("2026-08-27", 314.58), candle("2026-08-28", 319.70)]
        chosen = select_previous_close(candles, "2026-08-28")
        self.assertEqual(chosen["date"], "2026-08-27")

    def test_no_prior_session_returns_nothing(self):
        self.assertIsNone(select_previous_close([], "2026-08-28"))
        self.assertIsNone(select_previous_close([candle("2026-08-28", 10.0)], "2026-08-28"))


class ConcordanceTests(unittest.TestCase):
    def test_agreeing_series_is_concordant(self):
        candles = [candle("2026-08-26", 313.45), candle("2026-08-27", 314.58)]
        verdict = assess_price_integrity(
            candles, source_previous_close=314.58, day_change_percent=1.63,
            has_session_split=False, candle_previous_close_override=314.58,
        )
        self.assertTrue(verdict["prior_close_concordant"])
        self.assertFalse(verdict["quarantined"])

    def test_dividend_explained_gap_is_not_a_defect(self):
        """A source is entitled to quote a dividend-adjusted prior close.
        Treating that as corruption quarantined every dividend payer."""
        candles = [
            candle("2026-08-10", 70.00, dividend=0.51),
            candle("2026-08-26", 88.60),
            candle("2026-08-27", 89.06),
        ]
        verdict = assess_price_integrity(
            candles, source_previous_close=88.60, day_change_percent=0.67,
            has_session_split=False, candle_previous_close_override=89.06,
        )
        self.assertTrue(verdict["prior_close_concordant"])
        self.assertTrue(verdict["dividend_adjusted_source"])
        self.assertFalse(verdict["quarantined"])

    def test_gap_dividends_cannot_explain_is_a_defect(self):
        candles = [candle("2026-08-26", 313.45), candle("2026-08-27", 314.58)]
        verdict = assess_price_integrity(
            candles, source_previous_close=237.30, day_change_percent=1.63,
            has_session_split=False, candle_previous_close_override=314.58,
        )
        self.assertFalse(verdict["prior_close_concordant"])
        self.assertTrue(verdict["quarantined"])
        self.assertTrue(verdict["notes"])

    def test_absent_independent_prior_close_fails_closed(self):
        candles = [candle("2026-08-27", 314.58)]
        verdict = assess_price_integrity(
            candles, source_previous_close=None, day_change_percent=0.0,
            has_session_split=False, candle_previous_close_override=314.58,
        )
        self.assertFalse(verdict["prior_close_concordant"])
        self.assertTrue(verdict["quarantined"])


class AdjustmentSeriesTests(unittest.TestCase):
    def test_rounding_noise_is_not_an_inconsistency(self):
        """Both closes are stored to two decimals, so the ratio wobbles. A
        tolerance at the floating-point floor flagged clean data."""
        candles = [
            candle("2026-08-25", 68.37, adj_close=66.02),
            candle("2026-08-26", 68.42, adj_close=66.07),
            candle("2026-08-27", 69.95, adj_close=67.54),
        ]
        verdict = assess_price_integrity(
            candles, source_previous_close=68.42, day_change_percent=1.0,
            has_session_split=False, candle_previous_close_override=68.42,
        )
        self.assertTrue(verdict["adjustment_series_consistent"])

    def test_a_series_swap_is_caught(self):
        candles = [
            candle("2026-08-25", 100.00, adj_close=90.00),
            candle("2026-08-26", 100.00, adj_close=70.00),
        ]
        verdict = assess_price_integrity(
            candles, source_previous_close=100.00, day_change_percent=0.0,
            has_session_split=False, candle_previous_close_override=100.00,
        )
        self.assertFalse(verdict["adjustment_series_consistent"])
        self.assertTrue(verdict["quarantined"])

    def test_adjusted_close_above_traded_close_is_caught(self):
        candles = [candle("2026-08-26", 100.00, adj_close=140.00)]
        verdict = assess_price_integrity(
            candles, source_previous_close=100.00, day_change_percent=0.0,
            has_session_split=False, candle_previous_close_override=100.00,
        )
        self.assertFalse(verdict["adjustment_series_consistent"])


class ExtremeMoveTests(unittest.TestCase):
    def setUp(self):
        self.candles = [candle("2026-08-26", 100.00), candle("2026-08-27", 100.00)]

    def test_uncorroborated_extreme_move_quarantines(self):
        verdict = assess_price_integrity(
            self.candles, source_previous_close=100.00, day_change_percent=39.59,
            has_session_split=False, candle_previous_close_override=100.00,
        )
        self.assertTrue(verdict["extreme_move"])
        self.assertFalse(verdict["extreme_move_corroborated"])
        self.assertTrue(verdict["quarantined"])

    def test_corroborated_extreme_move_does_not_quarantine(self):
        verdict = assess_price_integrity(
            self.candles, source_previous_close=100.00, day_change_percent=39.59,
            has_session_split=False, candle_previous_close_override=100.00,
            corroboration_sources=["https://www.nasdaq.com/market-activity/stocks/abnb"],
        )
        self.assertTrue(verdict["extreme_move"])
        self.assertTrue(verdict["extreme_move_corroborated"])
        self.assertFalse(verdict["quarantined"])

    def test_corroboration_requires_a_source_not_the_absence_of_a_move(self):
        """The original defect was extreme_move_corroborated = not extreme_move,
        so an ordinary session reported itself as corroborated. Corroboration
        must mean a source was supplied, and nothing else."""
        verdict = assess_price_integrity(
            self.candles, source_previous_close=100.00, day_change_percent=1.2,
            has_session_split=False, candle_previous_close_override=100.00,
        )
        self.assertFalse(verdict["extreme_move"])
        self.assertFalse(
            verdict["extreme_move_corroborated"],
            "an ordinary session reported itself as corroborated",
        )


class ContractConsumptionTests(unittest.TestCase):
    def test_contract_reports_the_collector_verdict(self):
        warnings = price_warnings({
            "current_price": 130.0,
            "previous_close": 100.0,
            "data_integrity": {
                "prior_close_concordant": False,
                "adjustment_series_consistent": True,
                "extreme_move": True,
                "extreme_move_corroborated": False,
                "quarantined": True,
            },
        })
        self.assertTrue(any("previous-close series disagree" in w for w in warnings))
        self.assertTrue(any("not corroborated" in w for w in warnings))
        self.assertTrue(any("quarantined" in w for w in warnings))

    def test_clean_verdict_yields_no_integrity_warnings(self):
        warnings = price_warnings({
            "current_price": 130.0,
            "previous_close": 128.0,
            "data_integrity": {
                "prior_close_concordant": True,
                "adjustment_series_consistent": True,
                "extreme_move": False,
                "extreme_move_corroborated": False,
                "quarantined": False,
            },
        })
        self.assertEqual(warnings, [])


if __name__ == "__main__":
    unittest.main()
