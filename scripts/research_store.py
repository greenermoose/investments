#!/usr/bin/env python3
"""
scripts/research_store.py
Accessor for the agent-authored research store.

The research store is the system of record for every qualitative judgment and
every forward-looking parameter in this repository. It lives per-ticker at
context/data/equities/<TICKER>.json under the "research" key and conforms to
context/schemas/equity_research_schema.json.

Deterministic scripts read this store. They never author its content and never
substitute a default for a field an agent has not written. When a required
field is absent, callers receive a Gap record and skip the ticker: see
scripts/research_gaps.py for the reporting front end.

No third-party dependencies: validation is hand-rolled against the schema in
the same style as scripts/validate_thesis.py and scripts/quality_control.py.
"""

import json
import os
import re
import time
from collections import namedtuple
from datetime import datetime, timezone

from experiment_contract import (
    EXPERIMENT_STATUS,
    RESEARCH_STATUS_AUTHORED,
    RESEARCH_STATUS_PLACEHOLDER,
    RESEARCH_STATUSES,
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EQUITIES_DIR = os.path.join(ROOT_DIR, "context", "data", "equities")
SCHEMA_PATH = os.path.join(ROOT_DIR, "context", "schemas", "equity_research_schema.json")

SCHEMA_VERSION = "2.0"

AUTHORITY_TIERS = {
    "TIER_1_PRIMARY_REGULATORY",
    "TIER_2_FINANCIAL_AGGREGATOR",
    "TIER_3_CONSENSUS_ESTIMATES",
    "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE",
    "TIER_5_UNVERIFIED_HEURISTIC",
}

CAPITAL_ALLOCATION_PHILOSOPHIES = {
    "AGGRESSIVE_SHAREHOLDER_RETURN",
    "BALANCED_CAPITAL_RETURN",
    "REINVESTMENT_FOR_GROWTH",
    "SBC_DILUTIVE",
    "EXTERNAL_CAPITAL_DEPENDENT",
}

DIVIDEND_STATUSES = {"PAYING", "NONE", "SUSPENDED"}

OVERHANG_RATINGS = {"MINIMAL", "LOW", "MODERATE", "ELEVATED", "HIGH", "SEVERE"}

CATALYST_STATUSES = {"PENDING", "ACHIEVED", "FAILED", "DELAYED"}

VALUATION_METHODS = {
    "EARNINGS", "FCF", "REVENUE_WITH_MARGIN_BRIDGE", "BANK_PTB_ROE",
    "INSURER_PTB_ROE", "REIT_AFFO", "PRE_REVENUE_BIOTECH_RNPV",
}

# Field registry. "kind" selects the structural validator; "owner" names the
# agent role responsible for authoring it, which drives grouping in the gap
# report; "renders" lists the artifacts that cannot be produced without it.
FieldSpec = namedtuple("FieldSpec", ["kind", "owner", "renders"])

FIELD_REGISTRY = {
    "description": FieldSpec(
        "authored_string", "Equity Research Agent", ["universe.json", "grid card"]),
    "business_profile": FieldSpec(
        "authored_string", "Equity Research Agent", ["thesis dossier"]),
    "competitive_moat_analysis": FieldSpec(
        "authored_string", "Equity Research Agent", ["thesis dossier"]),
    "moat_summary": FieldSpec(
        "authored_string", "Equity Research Agent", ["universe.json"]),
    "tam_and_market_share": FieldSpec(
        "tam", "Investment Thesis Agent", ["thesis dossier"]),
    "valuation_parameters": FieldSpec(
        "valuation_parameters", "Investment Thesis Agent",
        ["valuation model", "ROI", "rating"]),
    "forecast_scenarios": FieldSpec(
        "forecast_scenarios", "Investment Thesis Agent",
        ["valuation model", "ROI", "rating", "forecast snapshot"]),
    "dividend_profile": FieldSpec(
        "dividend_profile", "Investment Thesis Agent", ["return engine"]),
    "capital_strategy": FieldSpec(
        "capital_strategy", "Investment Thesis Agent", ["thesis dossier"]),
    "stock_based_compensation": FieldSpec(
        "stock_based_compensation", "Investment Thesis Agent", ["thesis dossier"]),
    "off_balance_sheet_and_contingent_liabilities": FieldSpec(
        "off_balance_sheet", "Investment Thesis Agent", ["thesis dossier"]),
    "latest_catalyst": FieldSpec(
        "authored_string", "Equity Research Agent", ["universe.json"]),
    "catalyst_timeline": FieldSpec(
        "item_list", "Investment Thesis Agent", ["thesis dossier"]),
    "invalidation_criteria": FieldSpec(
        "item_list", "Investment Thesis Agent", ["thesis dossier", "memory audit"]),
    "revenue_drivers_narrative": FieldSpec(
        "authored_string", "Investment Thesis Agent", ["thesis dossier"]),
    "valuation_ps_multiple_narrative": FieldSpec(
        "authored_string", "Investment Thesis Agent", ["thesis dossier"]),
}

# Fields a ticker must carry before render_thesis.py will emit a dossier.
THESIS_REQUIRED_FIELDS = [
    "description",
    "business_profile",
    "competitive_moat_analysis",
    "tam_and_market_share",
    "valuation_parameters",
    "forecast_scenarios",
    "capital_strategy",
    "stock_based_compensation",
    "catalyst_timeline",
    "invalidation_criteria",
    "revenue_drivers_narrative",
    "valuation_ps_multiple_narrative",
]

# Fields required before a ticker can carry a published rating or ROI.
VALUATION_REQUIRED_FIELDS = ["valuation_parameters", "forecast_scenarios"]


Gap = namedtuple("Gap", ["symbol", "field", "reason", "owner", "renders"])


def equity_file_path(symbol):
    return os.path.join(EQUITIES_DIR, f"{symbol.upper()}.json")


def load_equity_record(symbol):
    """Loads the full per-ticker record. Returns {} when the file is absent."""
    path = equity_file_path(symbol)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def load_research(symbol):
    """Returns the agent-authored research block, or {} when unauthored.

    Never fabricates. An empty return means no agent has written research for
    this ticker, which callers must surface as a gap rather than paper over.
    """
    return load_equity_record(symbol).get("research", {}) or {}


def get_text(research, field):
    """Extracts the prose from an authored_string field, or None when absent."""
    entry = research.get(field)
    if isinstance(entry, dict):
        text = entry.get("text")
        return text if isinstance(text, str) and text.strip() else None
    return None


def _provenance_errors(prefix, prov):
    errors = []
    if not isinstance(prov, dict):
        return [f"{prefix}.provenance is missing or not an object"]
    for key in ("authored_by", "authored_date", "authority_tier"):
        if not prov.get(key):
            errors.append(f"{prefix}.provenance.{key} is required")
    tier = prov.get("authority_tier")
    if tier and tier not in AUTHORITY_TIERS:
        errors.append(f"{prefix}.provenance.authority_tier '{tier}' is not a recognized tier")
    date = prov.get("authored_date")
    if date and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(date)):
        errors.append(f"{prefix}.provenance.authored_date '{date}' must be YYYY-MM-DD")
    if tier == "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE" and not prov.get("runtime_context_signature"):
        errors.append(
            f"{prefix}.provenance requires runtime_context_signature for "
            "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE content (AGENTS.md section 6)"
        )
    for key in ("source_class", "retrieved_at", "verification_status"):
        if not prov.get(key):
            errors.append(f"{prefix}.provenance.{key} is required")
    raw_hash = prov.get("raw_content_hash")
    if raw_hash and not re.match(r"^[a-f0-9]{64}$", str(raw_hash)):
        errors.append(f"{prefix}.provenance.raw_content_hash must be a SHA-256 hex digest")
    if not raw_hash:
        errors.append(f"{prefix}.provenance.raw_content_hash is required")
    return errors


def _narrative_errors(prefix, value, min_length):
    if not isinstance(value, str) or not value.strip():
        return [f"{prefix} is missing or empty"]
    if len(value.strip()) < min_length:
        return [f"{prefix} is {len(value.strip())} chars; minimum {min_length}"]
    return []


def _number_errors(prefix, value, low, high):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return [f"{prefix} must be a number, got {type(value).__name__}"]
    if not (low <= float(value) <= high):
        return [f"{prefix} value {value} is outside the allowed range [{low}, {high}]"]
    return []


def _validate_field(field, value):
    """Returns a list of structural errors for one authored field."""
    spec = FIELD_REGISTRY.get(field)
    if spec is None:
        return [f"'{field}' is not a field defined in equity_research_schema.json"]
    if not isinstance(value, dict):
        return [f"{field} must be an object"]

    errors = []
    kind = spec.kind

    if kind == "authored_string":
        errors += _narrative_errors(f"{field}.text", value.get("text"), 40)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "tam":
        errors += _number_errors(
            f"{field}.tam_estimate_usd_b", value.get("tam_estimate_usd_b"), 0.1, 1e6)
        errors += _narrative_errors(f"{field}.narrative", value.get("narrative"), 120)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "valuation_parameters":
        method = value.get("valuation_method")
        if method not in VALUATION_METHODS:
            errors.append(f"{field}.valuation_method '{method}' must be one of {sorted(VALUATION_METHODS)}")
        inputs = value.get("valuation_inputs")
        if not isinstance(inputs, dict):
            errors.append(f"{field}.valuation_inputs must be an object")
            inputs = {}
        if method == "PRE_REVENUE_BIOTECH_RNPV":
            errors += _number_errors(
                f"{field}.valuation_inputs.risk_adjusted_enterprise_value_usd",
                inputs.get("risk_adjusted_enterprise_value_usd"), 0.0, 1e15)
            errors += _number_errors(
                f"{field}.valuation_inputs.net_cash_usd",
                inputs.get("net_cash_usd"), -1e15, 1e15)
        elif method in VALUATION_METHODS:
            errors += _number_errors(
                f"{field}.valuation_inputs.current_metric_per_share",
                inputs.get("current_metric_per_share"), -1e9, 1e9)
            errors += _number_errors(
                f"{field}.valuation_inputs.annual_metric_growth",
                inputs.get("annual_metric_growth"), -0.9, 3.0)
            errors += _number_errors(
                f"{field}.valuation_inputs.target_multiple",
                inputs.get("target_multiple"), 0.01, 1e6)
            if method == "REVENUE_WITH_MARGIN_BRIDGE":
                errors += _number_errors(
                    f"{field}.valuation_inputs.target_margin_pct",
                    inputs.get("target_margin_pct"), -100.0, 100.0)
        errors += _number_errors(
            f"{field}.annual_share_dilution_rate",
            value.get("annual_share_dilution_rate"), -0.2, 0.5)
        errors += _number_errors(
            f"{field}.conviction_score", value.get("conviction_score"), 0.0, 10.0)
        errors += _number_errors(
            f"{field}.opportunity_cost_annualized",
            value.get("opportunity_cost_annualized"), -1.0, 3.0)
        errors += _number_errors(
            f"{field}.uncertainty_score", value.get("uncertainty_score"), 0.0, 1.0)
        errors += _number_errors(
            f"{field}.horizon_years", value.get("horizon_years"), 0.01, 20.0)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "forecast_scenarios":
        scenarios = []
        for name in ("bear", "base", "bull"):
            scenario = value.get(name)
            if not isinstance(scenario, dict):
                errors.append(f"{field}.{name} must be an object")
                continue
            scenarios.append(scenario)
            errors += _number_errors(
                f"{field}.{name}.probability", scenario.get("probability"), 0.0, 1.0)
            for optional_field, low, high in (
                ("annual_revenue_growth", -0.9, 3.0),
                ("target_ps_multiple_multiplier", 0.1, 3.0),
                ("annual_share_dilution_rate", -0.2, 0.5),
            ):
                if scenario.get(optional_field) is not None:
                    errors += _number_errors(
                        f"{field}.{name}.{optional_field}",
                        scenario.get(optional_field), low, high)
            errors += _number_errors(
                f"{field}.{name}.price_target", scenario.get("price_target"), 0.01, 1e9)
            errors += _narrative_errors(
                f"{field}.{name}.rationale", scenario.get("rationale"), 40)
        if len(scenarios) == 3:
            probability_sum = sum(float(s["probability"]) for s in scenarios)
            if abs(probability_sum - 1.0) > 1e-6:
                errors.append(
                    f"{field} scenario probabilities sum to {probability_sum:.6f}; must sum to 1.0"
                )
        errors += _narrative_errors(
            f"{field}.uncertainty", value.get("uncertainty"), 40)
        refs = value.get("evidence_refs")
        if not isinstance(refs, list) or not refs or any(not str(x).strip() for x in refs):
            errors.append(f"{field}.evidence_refs must be a non-empty array")
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "dividend_profile":
        status = value.get("status")
        if status not in DIVIDEND_STATUSES:
            errors.append(f"{field}.status '{status}' must be one of {sorted(DIVIDEND_STATUSES)}")
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "capital_strategy":
        phil = value.get("capital_allocation_philosophy")
        if phil not in CAPITAL_ALLOCATION_PHILOSOPHIES:
            errors.append(
                f"{field}.capital_allocation_philosophy '{phil}' must be one of "
                f"{sorted(CAPITAL_ALLOCATION_PHILOSOPHIES)}"
            )
        errors += _narrative_errors(f"{field}.narrative", value.get("narrative"), 120)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "stock_based_compensation":
        errors += _number_errors(
            f"{field}.sbc_pct_of_revenue", value.get("sbc_pct_of_revenue"), 0.0, 100.0)
        if not value.get("vesting_schedule_structure"):
            errors.append(f"{field}.vesting_schedule_structure is required")
        errors += _narrative_errors(f"{field}.narrative", value.get("narrative"), 120)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "off_balance_sheet":
        rating = value.get("overall_liability_overhang_rating")
        if rating not in OVERHANG_RATINGS:
            errors.append(
                f"{field}.overall_liability_overhang_rating '{rating}' must be one of "
                f"{sorted(OVERHANG_RATINGS)}"
            )
        errors += _narrative_errors(f"{field}.narrative", value.get("narrative"), 120)
        errors += _provenance_errors(field, value.get("provenance"))

    elif kind == "item_list":
        items = value.get("items")
        if not isinstance(items, list) or not items:
            errors.append(f"{field}.items must be a non-empty array")
        elif field == "invalidation_criteria":
            for idx, item in enumerate(items):
                if not isinstance(item, str) or len(item.strip()) < 30:
                    errors.append(
                        f"{field}.items[{idx}] must be a string of at least 30 characters"
                    )
        elif field == "catalyst_timeline":
            required = [
                "target_window", "product_or_service_name", "expected_revenue_impact_b",
                "revenue_quarter_inflection", "expected_outcome", "status",
            ]
            for idx, item in enumerate(items):
                if not isinstance(item, dict):
                    errors.append(f"{field}.items[{idx}] must be an object")
                    continue
                for key in required:
                    if key not in item:
                        errors.append(f"{field}.items[{idx}] is missing '{key}'")
                if item.get("status") not in CATALYST_STATUSES:
                    errors.append(
                        f"{field}.items[{idx}].status '{item.get('status')}' must be one of "
                        f"{sorted(CATALYST_STATUSES)}"
                    )
        errors += _provenance_errors(field, value.get("provenance"))

    return errors


def validate_research(symbol, research):
    """Structural validation of a research block. Returns a list of errors."""
    errors = []
    if not isinstance(research, dict):
        return [f"[{symbol}] research block must be an object"]

    stored_symbol = research.get("symbol")
    if stored_symbol and stored_symbol.upper() != symbol.upper():
        errors.append(
            f"[{symbol}] research.symbol is '{stored_symbol}'; must match the file name"
        )
    version = research.get("schema_version")
    if version and version != SCHEMA_VERSION:
        errors.append(
            f"[{symbol}] research.schema_version '{version}' is not the supported version "
            f"'{SCHEMA_VERSION}'"
        )

    if research.get("experiment_status") != EXPERIMENT_STATUS:
        errors.append(f"[{symbol}] research.experiment_status must be '{EXPERIMENT_STATUS}'")
    status = research.get("research_status")
    if status not in RESEARCH_STATUSES:
        errors.append(
            f"[{symbol}] research.research_status '{status}' must be one of "
            f"{sorted(RESEARCH_STATUSES)}"
        )
    for key in ("as_of_date", "authoring_model", "prompt_version"):
        if not research.get(key):
            errors.append(f"[{symbol}] research.{key} is required")

    # Placeholder content is retained only as audit history.  Its legacy fields
    # are deliberately not treated as valid authored research and therefore do
    # not need to satisfy the v2 claim-level evidence contract.
    if status == RESEARCH_STATUS_PLACEHOLDER:
        return errors

    for field, value in research.items():
        if field in (
            "symbol", "schema_version", "experiment_status", "research_status",
            "as_of_date", "authoring_model", "prompt_version",
        ):
            continue
        for err in _validate_field(field, value):
            errors.append(f"[{symbol}] {err}")

    return errors


def require_fields(symbol, fields, research=None):
    """Reports which of the requested fields this ticker cannot supply.

    Returns a list of Gap records rather than raising, so batch callers can
    process every ticker they can and report the rest in one pass.
    """
    if research is None:
        research = load_research(symbol)

    gaps = []
    if research.get("research_status") != RESEARCH_STATUS_AUTHORED:
        return [Gap(
            symbol,
            "research_status",
            "research is unverified placeholder content and cannot drive modeled outputs",
            "Investment Thesis Agent",
            ["valuation model", "ROI", "rating", "order proposal"],
        )]
    for field in fields:
        spec = FIELD_REGISTRY.get(field)
        owner = spec.owner if spec else "Unassigned"
        renders = list(spec.renders) if spec else []

        value = research.get(field)
        if value is None:
            gaps.append(Gap(symbol, field, "unauthored", owner, renders))
            continue

        errors = _validate_field(field, value)
        if errors:
            gaps.append(Gap(symbol, field, "; ".join(errors), owner, renders))

    return gaps


def write_research(symbol, research):
    """Validates and persists a research block into the per-ticker record.

    Raises ValueError on any structural error: a malformed block is never
    written, so a downstream reader can trust whatever it finds on disk.
    """
    symbol = symbol.upper()
    research = dict(research)
    research.setdefault("symbol", symbol)
    research.setdefault("schema_version", SCHEMA_VERSION)

    errors = validate_research(symbol, research)
    if errors:
        raise ValueError(
            f"Refusing to write invalid research block for {symbol}:\n  "
            + "\n  ".join(errors)
        )

    record = load_equity_record(symbol)
    if not record:
        record = {"symbol": symbol}
    old_research = record.get("research") or {}
    record["research"] = research
    record["research_last_updated"] = datetime.now(timezone.utc).isoformat()

    os.makedirs(EQUITIES_DIR, exist_ok=True)
    path = equity_file_path(symbol)
    last_error = None
    for attempt in range(5):
        tmp_path = f"{path}.{os.getpid()}.{attempt}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(record, f, indent=2)
            os.replace(tmp_path, path)
            break
        except OSError as error:
            last_error = error
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass
            time.sleep(0.2 * (attempt + 1))
    else:
        raise last_error

    try:
        import activity_ledger
        activity_ledger.log_research_diff(symbol, old_research, research)
    except Exception:
        pass

    return path


def store_symbols():
    """All tickers with a per-ticker record on disk, authored or not."""
    if not os.path.isdir(EQUITIES_DIR):
        return []
    return sorted(
        os.path.splitext(name)[0]
        for name in os.listdir(EQUITIES_DIR)
        if name.endswith(".json")
    )


def load_all_research():
    """Maps every ticker in the store to its research block."""
    return {sym: load_research(sym) for sym in store_symbols()}
