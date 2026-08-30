#!/usr/bin/env python3
"""Retired research migration entry point.

This command previously filled missing research with sector heuristics and
generic prose. That behavior violated the research-store boundary: a
deterministic script must never author a TAM, catalyst, dividend policy, SBC
rate, growth assumption, valuation multiple, dilution rate, conviction score,
or narrative. The file remains as an explicit compatibility tombstone so an
old command fails loudly instead of silently manufacturing research.
"""

import sys


RETIREMENT_MESSAGE = (
    "RETIRED: sync_research_from_meta.py cannot author or fill research. "
    "Use scripts/research_gaps.py to identify missing fields and have the "
    "responsible generative agent write evidence-backed experimental research "
    "through scripts/research_store.py."
)


def main() -> int:
    print(RETIREMENT_MESSAGE, file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
