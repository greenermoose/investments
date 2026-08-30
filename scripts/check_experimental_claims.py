#!/usr/bin/env python3
"""Fail when public system text makes prohibited non-experimental claims."""

from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = (
    ROOT / "README.md", ROOT / "ROADMAP.md", ROOT / "AGENTS.md",
    ROOT / "DISCLAIMER.md",
    ROOT / "context", ROOT / "http", ROOT / "scripts", ROOT / "examples",
    ROOT / ".agents",
)
TEXT_SUFFIXES = {".md", ".html", ".js", ".py", ".json", ".txt"}
# CHANGELOG.md is excluded because it is append-only history. A dated entry
# recording that the system was once called something else is a true statement
# about the past; editing it to satisfy this scan would falsify the record. The
# rename is documented as a new entry instead.
#
# context/theses is deliberately in scope: the dossiers are the artifacts most
# likely to state a rating as fact, so excluding them exempted exactly the text
# the scan exists to police. Only machine-generated data and append-only
# history remain excluded.
EXCLUDED_PARTS = {
    "data", "runs", "errata", "__pycache__",
}
EXCLUDED_NAMES = {"vuetify.esm.js", "check_experimental_claims.py"}
PATTERNS = {
    "legacy advisor name": re.compile(r"agentic investment advisor|investment advisory system", re.I),
    "institutional-grade capability": re.compile(r"institutional-grade", re.I),
    "actionable plan claim": re.compile(r"actionable investment plans?", re.I),
    "probability claim": re.compile(r"high probability of (?:achieving|generating)", re.I),
    "performance assurance": re.compile(r"(?:will|likely to) achieve.{0,40}20%", re.I),
    "validated or optimal action": re.compile(r"validated (?:action|system)|validated optimal action", re.I),
    "execution guarantee": re.compile(r"guarantee favorable (?:entry|execution|pricing)", re.I),
}


def iter_files():
    for root in SCAN_ROOTS:
        if root.is_file():
            yield root
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            if path.name in EXCLUDED_NAMES:
                continue
            relative_parts = set(path.relative_to(ROOT).parts)
            if relative_parts & EXCLUDED_PARTS:
                continue
            yield path


def main():
    failures = []
    for path in iter_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for label, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                failures.append(f"{path.relative_to(ROOT)}:{line}: {label}: {match.group(0)!r}")
    if failures:
        print("Prohibited non-experimental claims found:")
        print("\n".join(failures))
        return 1
    print("Experimental-claims scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
