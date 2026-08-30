#!/usr/bin/env python3
"""Smoke tests for the experimental program's command-line scripts.

These scripts were written, were never referenced anywhere in the repository,
and had no test. Each test here runs the script the way the runbook does and
checks that its output conforms to the schema that describes it, so a script
cannot silently stop producing what the rest of the pipeline reads.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
SCHEMAS_DIR = ROOT_DIR / "context" / "schemas"


def run_script(name, *args, cwd=None):
    return subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / name), *args],
        cwd=str(cwd or ROOT_DIR), capture_output=True, text=True,
    )


def assert_required_fields(testcase, schema_name, payload):
    """Check the document against the required fields its schema declares.

    Nothing in the repository imports jsonschema, so a full validation is not
    available. Required-field presence is the part that actually breaks when a
    writer drifts from its contract.
    """
    with (SCHEMAS_DIR / schema_name).open(encoding="utf-8") as handle:
        schema = json.load(handle)
    required = schema.get("required", [])
    testcase.assertTrue(required, f"{schema_name} declares no required fields")
    missing = [field for field in required if field not in payload]
    testcase.assertEqual(missing, [], f"{schema_name}: missing {missing}")


class ExperimentCliRoutingTests(unittest.TestCase):
    def test_manage_universe_lists_the_experiment_subcommands(self):
        result = run_script("manage_universe.py", "experiment")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        for name in ("freeze", "freeze-forecast", "score", "record-execution",
                     "record-performance", "reconcile", "security-master",
                     "archive-chain", "check-claims"):
            self.assertIn(name, result.stdout)

    def test_check_claims_runs_through_manage_universe(self):
        result = run_script("manage_universe.py", "experiment", "check-claims")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class FreezeForecastTests(unittest.TestCase):
    def forecast(self):
        return {
            "symbol": "TEST",
            "horizon_end_date": "2027-08-29",
            "scenarios": {
                "bear": {"probability": 0.25, "price_target": 80.0},
                "base": {"probability": 0.50, "price_target": 120.0},
                "bull": {"probability": 0.25, "price_target": 160.0},
            },
            "evidence_refs": ["SEC-0000320193-26-000001"],
            "known_limitations": "Revenue mix and margin path are both uncertain over this horizon.",
        }

    def test_a_valid_forecast_freezes_and_matches_its_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            workdir = Path(directory)
            path = workdir / "forecast.json"
            path.write_text(json.dumps(self.forecast()), encoding="utf-8")
            output_root = workdir / "forecasts"
            result = run_script(
                "freeze_forecast.py", str(path),
                "--data-snapshot-id", "UNIVERSE-TEST",
                "--model-version", "test-model", "--prompt-version", "test-prompt",
                "--output-root", str(output_root),
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

            written = sorted(output_root.glob("FCST-*.json"))
            self.assertTrue(written, "freeze_forecast.py wrote no snapshot")
            with written[-1].open(encoding="utf-8") as handle:
                payload = json.load(handle)
            assert_required_fields(self, "forecast_snapshot_schema.json", payload)
            self.assertEqual(payload["experiment_status"], "EXPERIMENTAL")
            self.assertTrue(payload["content_hash"], "the snapshot carries no content hash")

    def test_probabilities_that_do_not_sum_to_one_are_rejected(self):
        """A scenario set that does not sum to 1.0 is not a distribution, and
        scoring it later would produce a number that means nothing."""
        forecast = self.forecast()
        forecast["scenarios"]["bull"]["probability"] = 0.90
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "forecast.json"
            path.write_text(json.dumps(forecast), encoding="utf-8")
            result = run_script(
                "freeze_forecast.py", str(path),
                "--data-snapshot-id", "UNIVERSE-TEST",
                "--model-version", "test-model", "--prompt-version", "test-prompt",
            )
            self.assertNotEqual(result.returncode, 0)

    def test_a_forecast_without_evidence_is_rejected(self):
        forecast = self.forecast()
        forecast["evidence_refs"] = []
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "forecast.json"
            path.write_text(json.dumps(forecast), encoding="utf-8")
            result = run_script(
                "freeze_forecast.py", str(path),
                "--data-snapshot-id", "UNIVERSE-TEST",
                "--model-version", "test-model", "--prompt-version", "test-prompt",
            )
            self.assertNotEqual(result.returncode, 0)


class FreezeExperimentTests(unittest.TestCase):
    def test_freeze_hashes_its_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            workdir = Path(directory)
            source = workdir / "input.json"
            source.write_text(json.dumps({"a": 1}), encoding="utf-8")
            output_root = workdir / "experiments"

            result = run_script(
                "freeze_experiment.py",
                "--as-of", "2026-08-29",
                "--model-version", "test-model", "--prompt-version", "test-prompt",
                "--input", str(source),
                "--output-root", str(output_root),
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

            written = sorted(output_root.rglob("EXP-*.json"))
            self.assertTrue(written, "freeze_experiment.py wrote no manifest")
            with written[-1].open(encoding="utf-8") as handle:
                payload = json.load(handle)
            self.assertEqual(payload.get("experiment_status"), "EXPERIMENTAL")
            blob = json.dumps(payload)
            self.assertIn("sha256", blob.lower().replace("-", ""))


class RecordExecutionTests(unittest.TestCase):
    def test_one_event_per_file_and_schema_conformant(self):
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory) / "execution"
            for index in range(2):
                result = run_script(
                    "record_execution.py",
                    "--proposal-id", f"PROP-{index}",
                    "--account", "Test Account",
                    "--event-type", "FILLED",
                    "--symbol", "TEST",
                    "--security-type", "EQUITY",
                    "--quantity", "10",
                    "--fees", "0.0",
                    "--output-root", str(output_root),
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

            written = sorted(output_root.rglob("EVT-*.json"))
            self.assertEqual(len(written), 2, "events were not written one per file")
            with written[0].open(encoding="utf-8") as handle:
                payload = json.load(handle)
            assert_required_fields(self, "execution_event_schema.json", payload)


class MigrationIdempotencyTests(unittest.TestCase):
    def test_research_migration_is_a_no_op_when_already_applied(self):
        """It has already run against the corpus. Running it again must not
        restamp, rewrite, or bump anything."""
        result = run_script("migrate_experimental_research.py", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("0 legacy research blocks", result.stdout + result.stderr)

    def test_thesis_migration_refuses_to_run_again(self):
        """It recognises only its own legacy banner, so running it against a
        regenerated dossier stacks a second, stale header on top of the correct
        one. It is retired rather than made idempotent, because render_thesis.py
        now writes that header from live state on every render."""
        result = run_script("migrate_experimental_theses.py")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("RETIRED", result.stdout + result.stderr)


class RetiredScriptTests(unittest.TestCase):
    def test_sync_research_from_meta_refuses_to_run(self):
        """It manufactured the research the audit found to be fabricated. It
        must stay a tombstone rather than quietly coming back."""
        result = run_script("sync_research_from_meta.py")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("RETIRED", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
