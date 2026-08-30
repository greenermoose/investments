#!/usr/bin/env python3
"""Run sector batch: child RUN, render theses, validate, QC, audit memo, end-run."""

import argparse
import json
import os
import subprocess
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "scripts")
META_PATH = os.path.join(SCRIPTS, "data", "company_meta.json")
AUDITS = os.path.join(ROOT, "context", "research", "audits")


def run(cmd, check=False):
    print(">>>", " ".join(cmd))
    res = subprocess.run(cmd, cwd=ROOT)
    if check and res.returncode != 0:
        sys.exit(res.returncode)
    return res.returncode


def symbols_for_sector(sector_key, company_meta):
    aliases = {
        "Health Care": ["Health Care", "Healthcare"],
        "Healthcare": ["Health Care", "Healthcare"],
        "Consumer Discretionary + Communication Services": [
            "Consumer Discretionary",
            "Communication Services",
        ],
        "Energy + Staples + Utilities + Real Estate": [
            "Energy",
            "Consumer Staples",
            "Utilities",
            "Real Estate",
        ],
        "Industrials": ["Industrials", "Materials"],
    }
    sectors = aliases.get(sector_key, [sector_key])
    out = []
    for sym, meta in company_meta.items():
        if meta.get("sector") in sectors:
            out.append(sym)
    return sorted(out)


def slug(sector_key):
    return sector_key.lower().replace(" ", "-").replace("+", "").replace("--", "-")


def main():
    parser = argparse.ArgumentParser(description="Sector batch refresh gate")
    parser.add_argument("--sector", required=True, help="Sector label or batch alias")
    parser.add_argument("--signature", default="", help="Runtime context signature for child run")
    parser.add_argument("--attach-active", action="store_true",
                        help="Log sector gate under the active master run instead of opening a child run")
    args = parser.parse_args()

    with open(META_PATH, "r", encoding="utf-8") as f:
        company_meta = json.load(f)

    symbols = symbols_for_sector(args.sector, company_meta)
    if not symbols:
        print(f"No symbols for sector batch: {args.sector}", file=sys.stderr)
        return 1

    today = date.today().isoformat()
    sig = args.signature or (
        f"System clock {today}; sector batch {args.sector}; RUN-2026-08-28-004 child"
    )
    sector_slug = slug(args.sector)
    audit_path = os.path.join(AUDITS, f"{today}-sector-{sector_slug}-refresh.md")

    if args.attach_active:
        active_path = os.path.join(ROOT, "context", "research", "runs", ".active_run")
        if not os.path.exists(active_path):
            print("ERROR: no active run for --attach-active", file=sys.stderr)
            return 1
        with open(active_path, "r", encoding="utf-8") as f:
            run_id = f.read().strip()
        print(f"Attached to active run: {run_id}")
    else:
        run_id_out = subprocess.check_output(
            [
                sys.executable,
                os.path.join(SCRIPTS, "activity_ledger.py"),
                "start-run",
                "--cadence",
                "event_driven",
                "--trigger",
                "research_refresh",
                "--agents",
                "Equity Research Agent,Investment Thesis Agent,Memory Agent",
                "--prompt",
                "context/prompts/research_refresh.md",
                "--signature",
                sig,
            ],
            cwd=ROOT,
            text=True,
        ).strip()
        run_id = run_id_out.splitlines()[-1]
        print(f"Child run: {run_id}")

    sym_args = ["--symbols"] + symbols
    run([sys.executable, os.path.join(SCRIPTS, "render_thesis.py")] + sym_args)
    for sym in symbols:
        thesis = os.path.join(ROOT, "context", "theses", f"{sym}.md")
        if os.path.exists(thesis):
            run([sys.executable, os.path.join(SCRIPTS, "validate_thesis.py"), "--file", thesis])
    qc_code = run([sys.executable, os.path.join(SCRIPTS, "quality_control.py"), "--audit"])
    gaps_code = run(
        [sys.executable, os.path.join(SCRIPTS, "research_gaps.py"), "--symbol"]
        + symbols
        + ["--summary"]
    )

    os.makedirs(AUDITS, exist_ok=True)
    with open(audit_path, "w", encoding="utf-8") as f:
        f.write(f"# Sector Refresh: {args.sector}\n\n")
        f.write(f"Date: {today}\n\n")
        f.write(f"Parent/child run: {run_id}\n\n")
        f.write(f"Tickers ({len(symbols)}): {', '.join(symbols)}\n\n")
        f.write(f"QC audit exit code: {qc_code}\n\n")
        f.write(f"Research gaps exit code: {gaps_code}\n\n")
        f.write(
            "Research blocks are agent-authored into the research store; no script "
            "synthesizes them. A ticker whose research is unauthored renders a NOT "
            "MODELLED dossier naming its blocking gaps, and carries no rating. Tier 1 "
            "filing URLs are preserved in provenance.source_locator where present.\n"
        )

    run(
        [
            sys.executable,
            os.path.join(SCRIPTS, "activity_ledger.py"),
            "log-event",
            "--type",
            "QC_AUDIT_COMPLETED",
            "--agent",
            "Memory Agent",
            "--subject",
            f"Sector {args.sector} QC gate",
            "--target-path",
            audit_path,
        ]
    )
    if not args.attach_active:
        run(
            [
                sys.executable,
                os.path.join(SCRIPTS, "activity_ledger.py"),
                "end-run",
                "--summary",
                f"Sector {args.sector}: {len(symbols)} tickers rendered and QC gated.",
                "--deliverable",
                audit_path,
            ]
        )
    else:
        run_path = os.path.join(ROOT, "context", "research", "runs", f"{run_id}.json")
        with open(run_path, "r", encoding="utf-8") as f:
            run_doc = json.load(f)
        rel_audit = audit_path.replace("\\", "/")
        if rel_audit.startswith(ROOT.replace("\\", "/")):
            rel_audit = rel_audit[len(ROOT.replace("\\", "/")) + 1:]
        run_doc.setdefault("deliverables", [])
        if rel_audit not in run_doc["deliverables"]:
            run_doc["deliverables"].append(rel_audit)
        with open(run_path, "w", encoding="utf-8") as f:
            json.dump(run_doc, f, indent=2)
    return 0 if gaps_code == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
