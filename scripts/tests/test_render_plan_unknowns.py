import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from render_plan import render_plan, validate_orders


class RenderPlanUnknownTests(unittest.TestCase):
    def account(self):
        return {
            "account_name": "Test IRA",
            "total_account_value": 1000.0,
            "settled_cash": 5.0,
            "sgov_shares": 10.5,
            "sgov_market_value": None,
            "total_dry_powder": None,
            "dry_powder_percentage": None,
            "active_positions_count": 1,
            "positions": [{"symbol": "AAA", "shares": 100.0}],
            "open_options": [],
        }

    def document(self, price):
        return {
            "experiment_status": "EXPERIMENTAL",
            "experimental_warning": "Experimental research output. Ratings, forecasts, and order proposals may be wrong.",
            "data_snapshot_id": "EXP-TEST-001",
            "data_as_of": "2026-08-28T20:00:00Z",
            "model_version": "test-model",
            "prompt_version": "test-prompt",
            "missing_inputs": [],
            "stale_inputs": [],
            "anomalous_inputs": [],
            "evidence_percentages": {"TEST": 100.0},
            "plan_date": "2026-08-31",
            "authored_by": "Lead Portfolio Manager Agent",
            "portfolios": [{
                "account_name": "Test IRA",
                "orders": [{
                    "action": "BUY",
                    "symbol": "BBB",
                    "security_type": "EQUITY",
                    "quantity": 1,
                    "order_type": "Limit",
                    "limit_price": price,
                    "rationale": "A sufficiently long synthetic rationale for deterministic validation.",
                }],
                "expirations": [],
            }],
        }

    def test_known_settled_cash_is_usable(self):
        errors = validate_orders(self.document(4.0), [self.account()], {"AAA", "BBB"})
        self.assertEqual(errors, [])

    def test_unknown_sgov_value_cannot_be_used_as_collateral(self):
        errors = validate_orders(self.document(6.0), [self.account()], {"AAA", "BBB"})
        self.assertTrue(any("SGOV market value is unknown" in error for error in errors))

    def test_renderer_displays_unknowns(self):
        text = render_plan(self.document(4.0), [self.account()])
        self.assertIn("SGOV (Cash Proxy):  10.5 shares (UNKNOWN)", text)
        self.assertIn("Total Dry Powder:   UNKNOWN (UNKNOWN of account)", text)


if __name__ == "__main__":
    unittest.main()
