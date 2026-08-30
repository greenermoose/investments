#!/usr/bin/env python3
"""Label legacy research as unverified placeholder content.

This migration does not create, revise, endorse, or delete any research claim.
It only adds status metadata so downstream models cannot mistake structural
completeness for researched evidence.
"""

import argparse
import json
from datetime import date
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS, RESEARCH_STATUS_PLACEHOLDER, utc_now


ROOT = Path(__file__).resolve().parents[1]
EQUITIES = ROOT / "context" / "data" / "equities"


def migrate(path: Path, dry_run: bool = False) -> bool:
    with path.open("r", encoding="utf-8") as handle:
        record = json.load(handle)
    research = record.get("research")
    if not isinstance(research, dict):
        return False

    changed = False
    metadata = {
        "schema_version": "2.0",
        "experiment_status": EXPERIMENT_STATUS,
        "research_status": RESEARCH_STATUS_PLACEHOLDER,
        "as_of_date": str(research.get("as_of_date") or date.today().isoformat()),
        "authoring_model": str(research.get("authoring_model") or "legacy-unknown"),
        "prompt_version": str(research.get("prompt_version") or "legacy-unknown"),
    }
    for key, value in metadata.items():
        if research.get(key) != value:
            research[key] = value
            changed = True

    if not changed or dry_run:
        return changed

    record["research"] = research
    record["research_last_updated"] = utc_now()
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(record, handle, indent=2)
        handle.write("\n")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    changed = sum(migrate(path, args.dry_run) for path in sorted(EQUITIES.glob("*.json")))
    verb = "would label" if args.dry_run else "labeled"
    print(f"{verb} {changed} legacy research blocks as UNVERIFIED_PLACEHOLDER")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
