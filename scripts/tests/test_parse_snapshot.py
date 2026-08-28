import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from parse_snapshot import parse_csv_snapshot, process_portfolio_state


class ParseSnapshotTests(unittest.TestCase):
    def parse_text(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.csv"
            path.write_text(text, encoding="utf-8")
            return process_portfolio_state(parse_csv_snapshot(path))

    def test_authoritative_balance_unknowns_and_fractional_sgov(self):
        accounts = self.parse_text(
            '"Positions for account Test IRA as of 2026/08/28"\n'
            '"Metric","Current","Change"\n'
            '"Cash Balance","$5.00","$0.00"\n'
            '"Long Stock Value","$1,000.00","-$2.00"\n'
            '"Long Option Value","$0.00","$0.00"\n'
            '"Short Option Value","$0.00","$0.00"\n'
            '"Total Account Value","$1,005.00","-$2.00"\n'
            '"Symbol","Price","Quantity","Market Value","Cost/Share","Asset Type"\n'
            '"AAA","UNKNOWN","102","UNKNOWN","UNKNOWN","Security"\n'
            '"SGOV","UNKNOWN","12.34567","UNKNOWN","UNKNOWN","Cash Proxy"\n'
        )
        self.assertEqual(len(accounts), 1)
        account = accounts[0]
        self.assertEqual(account["as_of_date"], "2026-08-28")
        self.assertEqual(account["total_account_value"], 1005.0)
        self.assertEqual(account["sgov_shares"], 12.34567)
        self.assertIsNone(account["sgov_market_value"])
        self.assertIsNone(account["total_dry_powder"])
        self.assertIsNone(account["positions"][0]["mark_price"])
        self.assertIsNone(account["positions"][0]["market_value"])
        self.assertTrue(account["positions"][0]["cc_eligible"])
        self.assertEqual(account["positions"][0]["cc_eligible_blocks"], 1)
        self.assertEqual(account["open_options"], [])
        self.assertEqual(
            account["reconciliation"]["status"],
            "AUTHORITATIVE_TOTAL_WITH_UNRESOLVED_COMPONENTS",
        )

    def test_positions_total_precedes_reconstructed_mismatch(self):
        accounts = self.parse_text(
            '"Positions for account Test Roth as of 2026/08/28"\n'
            '"Symbol","Price","Quantity","Market Value","Cost/Share","Asset Type"\n'
            '"AAA","10.00","10","$100.00","UNKNOWN","Equity"\n'
            '"Cash & Cash Investments","--","--","$5.00","--","Cash"\n'
            '"Positions Total","--","--","$104.50","--",""\n'
        )
        account = accounts[0]
        self.assertEqual(account["total_account_value"], 104.5)
        self.assertEqual(account["reconciliation"]["computed_total_account_value"], 105.0)
        self.assertEqual(account["reconciliation"]["difference_usd"], -0.5)
        self.assertEqual(
            account["reconciliation"]["status"], "AUTHORITATIVE_TOTAL_MISMATCH"
        )

    def test_multiple_accounts_remain_isolated(self):
        accounts = self.parse_text(
            '"Positions for account Account One as of 2026/08/28"\n'
            '"Symbol","Price","Quantity","Market Value","Cost/Share","Asset Type"\n'
            '"AAA","10.00","2","$20.00","UNKNOWN","Equity"\n'
            '"Cash & Cash Investments","--","--","$1.00","--","Cash"\n'
            '"Positions for account Account Two as of 2026/08/28"\n'
            '"Symbol","Price","Quantity","Market Value","Cost/Share","Asset Type"\n'
            '"BBB","20.00","3","$60.00","UNKNOWN","Equity"\n'
            '"Cash & Cash Investments","--","--","$2.00","--","Cash"\n'
        )
        self.assertEqual([account["account_name"] for account in accounts], ["Account One", "Account Two"])
        self.assertEqual(accounts[0]["positions"][0]["symbol"], "AAA")
        self.assertEqual(accounts[1]["positions"][0]["symbol"], "BBB")
        self.assertEqual(accounts[0]["total_account_value"], 21.0)
        self.assertEqual(accounts[1]["total_account_value"], 62.0)

    def test_output_conforms_to_portfolio_schema(self):
        try:
            import jsonschema
        except ImportError as exc:
            self.skipTest(f"jsonschema is unavailable: {exc}")
        accounts = self.parse_text(
            '"Positions for account Schema Test as of 2026/08/28"\n'
            '"Symbol","Price","Quantity","Market Value","Cost/Share","Asset Type"\n'
            '"AAA","10.00","1","$10.00","UNKNOWN","Equity"\n'
            '"Cash & Cash Investments","--","--","$1.00","--","Cash"\n'
        )
        schema = json.loads((ROOT_DIR / "context" / "schemas" / "portfolio_context.json").read_text(encoding="utf-8"))
        jsonschema.Draft7Validator(schema).validate(accounts)


if __name__ == "__main__":
    unittest.main()
