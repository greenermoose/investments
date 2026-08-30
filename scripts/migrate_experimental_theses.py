#!/usr/bin/env python3
"""RETIRED. This one-shot migration has run and must not run again.

On 2026-08-29 it prepended a fixed `UNVERIFIED PLACEHOLDER` banner to every
legacy dossier in context/theses/, at a point when render_thesis.py skipped any
company it could not model and so left the previous rendering on disk.

render_thesis.py now writes that header itself, from the live research status
and the live readiness verdict, every time it renders. This script recognises
only its own legacy banner, so running it against a regenerated dossier
prepends a second, stale header above the correct one -- reasserting a snapshot
ID of LEGACY-PRE-PROSPECTIVE-SNAPSHOT and an authoring model of
LEGACY-MODEL-NOT-RELIABLY-RECORDED over a dossier that records both accurately.

To label dossiers, render them:

    python scripts/render_thesis.py
"""

import sys


RETIREMENT_MESSAGE = (
    "RETIRED: migrate_experimental_theses.py has already run, and re-running it "
    "double-stamps regenerated dossiers with a stale legacy banner. "
    "Run 'python scripts/render_thesis.py' instead; it writes the experimental "
    "header from the live research status and readiness verdict."
)


def main() -> int:
    print(RETIREMENT_MESSAGE, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
