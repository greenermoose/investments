#!/usr/bin/env python3
"""Assert what the pipeline actually delivered, not only what its helpers can do.

The existing unit tests exercise the contract functions in isolation. They all
passed while the corpus on disk was labelled schema version 2.0 but carried
version 1.0 content, while every risk metric was null, and while 205 dossiers
asserted ratings the universe had already withdrawn. These tests check the
delivered state instead.
"""

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

CONTEXT_UNIVERSE = ROOT_DIR / "context" / "data" / "universe.json"
HTTP_UNIVERSE = ROOT_DIR / "http" / "data" / "universe.json"
EQUITIES_DIR = ROOT_DIR / "context" / "data" / "equities"
THESES_DIR = ROOT_DIR / "context" / "theses"
UNIVERSE_SCHEMA = ROOT_DIR / "context" / "schemas" / "universe_record_schema.json"


def load_universe():
    with HTTP_UNIVERSE.open(encoding="utf-8") as handle:
        return json.load(handle)


class UniverseCorpusTests(unittest.TestCase):
    def setUp(self):
        self.universe = load_universe()

    def test_universe_is_non_empty(self):
        self.assertGreater(len(self.universe), 100)

    def test_both_universe_copies_are_identical(self):
        """They are written from one in-memory list, so any divergence means
        one of them was edited by hand or a write failed part way."""
        self.assertEqual(
            CONTEXT_UNIVERSE.read_bytes(), HTTP_UNIVERSE.read_bytes(),
            "context/data/universe.json and http/data/universe.json disagree",
        )

    def test_every_record_satisfies_the_universe_schema(self):
        with UNIVERSE_SCHEMA.open(encoding="utf-8") as handle:
            schema = json.load(handle)
        required = schema.get("required", [])
        self.assertTrue(required, "the universe schema declares no required fields")
        for record in self.universe:
            missing = [field for field in required if field not in record]
            self.assertEqual(
                missing, [],
                f"{record.get('symbol')} is missing required fields: {missing}",
            )

    def test_every_record_is_labelled_experimental(self):
        for record in self.universe:
            self.assertEqual(record.get("experiment_status"), "EXPERIMENTAL", record.get("symbol"))
            self.assertTrue(record.get("experimental_warning"), record.get("symbol"))
            self.assertTrue(record.get("data_snapshot_id"), record.get("symbol"))

    def test_every_record_carries_an_integrity_verdict(self):
        """An empty data_integrity block means the record predates the gate, and
        must not be mistaken for a record that passed it."""
        for record in self.universe:
            integrity = record.get("data_integrity")
            self.assertTrue(
                integrity, f"{record.get('symbol')} carries no data-integrity verdict",
            )
            self.assertIn("prior_close_concordant", integrity, record.get("symbol"))

    def test_an_unrated_record_carries_no_rating_artefacts(self):
        """The failure this guards against is a rating surviving in one field
        after the inputs behind it were withdrawn from another."""
        for record in self.universe:
            ready = (record.get("data_readiness") or {}).get("trade_ready")
            if ready:
                continue
            symbol = record.get("symbol")
            self.assertIsNone(record.get("thesis_status"), symbol)
            self.assertIsNone(record.get("conviction_score"), symbol)
            self.assertIsNone(record.get("target_exit_price"), symbol)

    def test_risk_metrics_are_populated_for_the_vast_majority(self):
        """These were written into the schema and left null across the whole
        universe because the collector was never re-run."""
        for field in ("rsi_14", "atr_14", "sma_200", "beta_252d", "realized_volatility_252d"):
            populated = sum(1 for r in self.universe if r.get(field) is not None)
            self.assertGreater(
                populated, len(self.universe) * 0.9,
                f"{field} is populated on only {populated}/{len(self.universe)} records",
            )

    def test_fundamentals_go_beyond_the_balance_sheet_stubs(self):
        """Coverage is partial by design -- a company that does not report gross
        profit gets no gross margin -- but the derived metrics must exist."""
        for field in ("operating_margin_pct", "free_cash_flow", "roic_pct", "net_leverage"):
            populated = sum(
                1 for r in self.universe if (r.get("fundamentals") or {}).get(field) is not None
            )
            self.assertGreater(populated, 0, f"{field} is populated on no record at all")


class ResearchCorpusTests(unittest.TestCase):
    def test_every_research_block_declares_its_experimental_metadata(self):
        checked = 0
        for path in sorted(EQUITIES_DIR.glob("*.json")):
            with path.open(encoding="utf-8") as handle:
                record = json.load(handle)
            research = record.get("research")
            if not research:
                continue
            checked += 1
            for field in ("experiment_status", "research_status", "as_of_date",
                          "authoring_model", "prompt_version"):
                self.assertIn(field, research, f"{path.name} research is missing {field}")
            self.assertEqual(research["experiment_status"], "EXPERIMENTAL", path.name)
        self.assertGreater(checked, 100, "found almost no research blocks to check")

    def test_no_equity_record_is_empty_or_unparseable(self):
        for path in sorted(EQUITIES_DIR.glob("*.json")):
            self.assertGreater(path.stat().st_size, 0, f"{path.name} is empty")
            with path.open(encoding="utf-8") as handle:
                json.load(handle)


class DossierCorpusTests(unittest.TestCase):
    def test_no_dossier_asserts_a_rating_it_cannot_support(self):
        """render_thesis.py used to skip unmodelled companies, which left the
        previous rendering -- rating, conviction score, target exit price -- on
        disk indefinitely."""
        universe = {r["symbol"]: r for r in load_universe()}
        offenders = []
        for path in sorted(THESES_DIR.glob("*.md")):
            symbol = path.stem
            record = universe.get(symbol)
            if record is None or (record.get("data_readiness") or {}).get("trade_ready"):
                continue
            text = path.read_text(encoding="utf-8")
            for line in text.splitlines():
                if line.startswith("- **Rating:**") and "NOT MODELED" not in line:
                    offenders.append(f"{path.name}: {line.strip()}")
                if line.startswith("- **Conviction Score:**") and "NOT MODELED" not in line:
                    offenders.append(f"{path.name}: {line.strip()}")
        self.assertEqual(offenders, [], f"dossiers assert unsupported ratings: {offenders[:5]}")


class ClaimScanTests(unittest.TestCase):
    def test_repository_text_makes_no_prohibited_claims(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "check_experimental_claims.py")],
            cwd=str(ROOT_DIR), capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
