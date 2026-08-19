#!/usr/bin/env python3
"""
Thesis Validation Script
Validates investment thesis markdown dossiers and JSON files against
the institutional standards defined in context/schemas/investment_thesis_schema.json.

Usage:
    python scripts/validate_thesis.py --file context/theses/EXAMPLE_THESIS.md
    python scripts/validate_thesis.py --all
"""

import argparse
import glob
import os
import re
import sys

REQUIRED_METRICS = [
    "Ticker",
    "Exchange",
    "Benchmark Entry Price",
    "Target Exit Price",
    "Rating",
]

ALLOWED_RATINGS = {"BUY", "HOLD", "SELL", "AVOID"}
REQUIRED_SHARE_HORIZONS = ["13 Weeks", "26 Weeks", "39 Weeks", "52 Weeks", "104 Weeks", "156 Weeks"]
REQUIRED_PRICE_HORIZONS = ["13 Weeks", "52 Weeks", "104 Weeks", "156 Weeks"]


def validate_markdown_thesis(file_path: str) -> tuple[bool, list[str]]:
    errors = []
    if not os.path.exists(file_path):
        return False, [f"File not found: {file_path}"]

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Title Check
    if not re.search(r"^#\s+Investment Thesis Dossier:", content, re.MULTILINE):
        errors.append("Missing required header '# Investment Thesis Dossier: <TICKER> - <COMPANY>'")

    # 2. Key Metrics Check
    for metric in REQUIRED_METRICS:
        pattern = rf"-\s+\*\*{metric}:\*\*\s+(.+)"
        match = re.search(pattern, content)
        if not match:
            errors.append(f"Missing required metric: **{metric}:** in Summary section")
        elif metric == "Rating":
            rating_val = match.group(1).strip().upper()
            if rating_val not in ALLOWED_RATINGS:
                errors.append(f"Invalid Rating '{rating_val}'. Must be one of {ALLOWED_RATINGS}")

    # 3. Business Profile / Core Thesis Section
    if "## Business Profile" not in content and "## Core Investment Thesis" not in content:
        errors.append("Missing section '## Business Profile' (or '## Core Investment Thesis')")

    # 4. Total Addressable Market & Market Share
    if "## Total Addressable Market" not in content:
        errors.append("Missing section '## Total Addressable Market & Market Share'")
    else:
        tam_section = content.split("## Total Addressable Market")[1].split("##")[0].strip()
        if len(tam_section) < 40:
            errors.append("Total Addressable Market & Market Share section is too brief")

    # 5. Competitive Moat Analysis
    if "## Competitive Moat Analysis" not in content and "## Competitive Moat" not in content:
        errors.append("Missing section '## Competitive Moat Analysis'")

    # 6. Anticipated Catalysts & Timeline
    if "## Anticipated Catalysts & Timeline" not in content:
        errors.append("Missing section '## Anticipated Catalysts & Timeline'")

    # 7. Capital Needs & Strategy (or legacy Share Dilution or Buyback)
    if "## Capital Needs & Strategy" not in content and "## Capital Needs and Strategy" not in content and "## Share Dilution or Buyback" not in content:
        errors.append("Missing section '## Capital Needs & Strategy'")
    else:
        if "## Capital Needs & Strategy" in content:
            cap_section = content.split("## Capital Needs & Strategy")[1].split("##")[0].strip()
        elif "## Capital Needs and Strategy" in content:
            cap_section = content.split("## Capital Needs and Strategy")[1].split("##")[0].strip()
        else:
            cap_section = content.split("## Share Dilution or Buyback")[1].split("##")[0].strip()
        if len(cap_section) < 40:
            errors.append("Capital Needs & Strategy section is too brief")

    # 8. Stock-Based Compensation & Lock-Up Dynamics
    if "## Stock-Based Compensation" not in content and "## Stock-Based Compensation & Lock-Up Dynamics" not in content:
        errors.append("Missing section '## Stock-Based Compensation & Lock-Up Dynamics'")
    else:
        sbc_section = content.split("## Stock-Based Compensation")[1].split("##")[0].strip()
        if len(sbc_section) < 40:
            errors.append("Stock-Based Compensation & Lock-Up Dynamics section is too brief")

    # 9. Invalidation Criteria
    if "## Explicit Invalidation Criteria" not in content:
        errors.append("Missing section '## Explicit Invalidation Criteria (Exit Triggers)'")

    # 9. Revenue Drivers Narrative
    if "## Revenue Drivers Narrative" not in content:
        errors.append("Missing section '## Revenue Drivers Narrative'")
    else:
        rev_section = content.split("## Revenue Drivers Narrative")[1].split("##")[0].strip()
        if len(rev_section) < 50:
            errors.append("Revenue Drivers Narrative is too brief (minimum 50 characters required)")

    # 10. Valuation & P/S Multiple Narrative
    if "## Valuation & P/S Multiple Narrative" not in content and "## Valuation &amp; P/S Multiple Narrative" not in content:
        errors.append("Missing section '## Valuation & P/S Multiple Narrative'")
    else:
        val_section = re.split(r"##\s+Valuation\s+(?:&|&amp;)\s+P/S Multiple Narrative", content)[1].split("##")[0].strip()
        if len(val_section) < 50:
            errors.append("Valuation & P/S Multiple Narrative is too brief (minimum 50 characters required)")

    # 11. 13-Quarter Revenue Forecast Matrix
    if "13-Quarter Revenue Forecast Matrix" not in content and "Revenue Forecast Matrix" not in content:
        errors.append("Missing section '## 13-Quarter Revenue Forecast Matrix'")
    else:
        # Count quarterly forecast rows in markdown table
        rev_table_match = re.search(r"##\s+13-Quarter Revenue Forecast Matrix[^\n]*\n([\s\S]*?)(?=\n##|\Z)", content)
        if rev_table_match:
            table_lines = [l.strip() for l in rev_table_match.group(1).strip().split("\n") if l.strip().startswith("|")]
            # subtract header and separator rows
            data_rows = [l for l in table_lines if not re.match(r"^\|\s*:?---", l) and "Projected Revenue" not in l]
            if len(data_rows) != 13:
                errors.append(f"13-Quarter Revenue Forecast Matrix must contain exactly 13 quarter rows (found {len(data_rows)})")
        else:
            errors.append("Could not parse 13-Quarter Revenue Forecast table")

    # 12. Shares Outstanding Projections (6 Horizons)
    if "Shares Outstanding Projections" not in content:
        errors.append("Missing section '## Shares Outstanding Projections (6 Horizons)'")
    else:
        shares_match = re.search(r"##\s+Shares Outstanding Projections[^\n]*\n([\s\S]*?)(?=\n##|\Z)", content)
        if shares_match:
            table_text = shares_match.group(1)
            for horizon in REQUIRED_SHARE_HORIZONS:
                if horizon not in table_text:
                    errors.append(f"Shares Outstanding Projections table missing horizon: '{horizon}'")
        else:
            errors.append("Could not parse Shares Outstanding Projections table")

    # 13. Price Target Ranges (4 Horizons)
    if "Price Target Ranges" not in content:
        errors.append("Missing section '## Price Target Ranges & Valuation Scenarios (4 Horizons)'")
    else:
        price_match = re.search(r"##\s+Price Target Ranges[^\n]*\n([\s\S]*?)(?=\n##|\Z)", content)
        if price_match:
            table_text = price_match.group(1)
            for horizon in REQUIRED_PRICE_HORIZONS:
                if horizon not in table_text:
                    errors.append(f"Price Target Ranges table missing horizon: '{horizon}'")
        else:
            errors.append("Could not parse Price Target Ranges table")

    # 14. Catalyst Timeline Table
    if "## Anticipated Catalyst Timeline" in content:
        cat_match = re.search(r"##\s+Anticipated Catalyst Timeline[^\n]*\n([\s\S]*?)(?=\n##|\Z)", content)
        if cat_match:
            table_lines = [l.strip() for l in cat_match.group(1).strip().split("\n") if l.strip().startswith("|")]
            data_rows = [l for l in table_lines if not re.match(r"^\|\s*:?---", l) and "Target Date" not in l]
            if len(data_rows) < 1:
                errors.append("Anticipated Catalyst Timeline table must contain at least 1 catalyst row")
        else:
            errors.append("Could not parse Anticipated Catalyst Timeline table")

    # 15. Analyst Price Targets & Wall Street Coverage
    if "Analyst Price Targets" in content:
        apt_match = re.search(r"##\s+Analyst Price Targets[^\n]*\n([\s\S]*?)(?=\n##|\Z)", content)
        if apt_match:
            table_lines = [l.strip() for l in apt_match.group(1).strip().split("\n") if l.strip().startswith("|")]
            data_rows = [l for l in table_lines if not re.match(r"^\|\s*:?---", l) and "Analyst Name" not in l]
            if len(data_rows) < 1:
                errors.append("Analyst Price Targets table must contain at least 1 analyst price target row")
        else:
            errors.append("Could not parse Analyst Price Targets table")

    # 16. Data Provenance
    if "## Data Provenance & Verification Metadata" not in content and "## Data Provenance" not in content:
        errors.append("Missing section '## Data Provenance & Verification Metadata'")

    return len(errors) == 0, errors


def main():
    parser = argparse.ArgumentParser(description="Validate Investment Thesis dossiers against institutional schema")
    parser.add_argument("--file", type=str, help="Path to single thesis markdown file")
    parser.add_argument("--all", action="store_true", help="Validate all thesis files in context/theses/")
    args = parser.parse_args()

    files_to_validate = []
    if args.file:
        files_to_validate.append(args.file)
    elif args.all:
        files_to_validate = sorted(glob.glob("context/theses/*.md"))
    else:
        files_to_validate = sorted(glob.glob("context/theses/*.md"))

    if not files_to_validate:
        print("No thesis files found to validate.")
        sys.exit(1)

    all_passed = True
    print(f"Validating {len(files_to_validate)} thesis file(s)...")

    for file_path in files_to_validate:
        is_valid, errors = validate_markdown_thesis(file_path)
        base_name = os.path.basename(file_path)
        if is_valid:
            print(f"  PASS: {base_name}")
        else:
            print(f"  FAIL: {base_name}")
            for err in errors:
                print(f"    - {err}")
            all_passed = False

    if all_passed:
        print("\nAll thesis dossiers validated successfully!")
        sys.exit(0)
    else:
        print("\nValidation failed for one or more files.")
        sys.exit(1)


if __name__ == "__main__":
    main()
