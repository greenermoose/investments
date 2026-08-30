#!/usr/bin/env python3
"""Shared experimental-status, evidence, and readiness rules.

This module contains no investment judgment.  It only describes whether the
inputs required by an experimental output are present and internally
consistent.  All public and private outputs remain experimental permanently.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


EXPERIMENT_STATUS = "EXPERIMENTAL"
RESEARCH_STATUS_PLACEHOLDER = "UNVERIFIED_PLACEHOLDER"
RESEARCH_STATUS_AUTHORED = "AGENT_AUTHORED_EXPERIMENTAL"
RESEARCH_STATUSES = {
    RESEARCH_STATUS_PLACEHOLDER,
    RESEARCH_STATUS_AUTHORED,
}

EXPERIMENT_WARNING = (
    "Experimental research output. Ratings, forecasts, classifications, and "
    "order proposals may be wrong and do not constitute investment advice."
)
EXPERIMENTAL_WARNING = EXPERIMENT_WARNING

CRITICAL_FUNDAMENTAL_FIELDS = (
    "gross_margin_pct",
    "operating_margin_pct",
    "free_cash_flow",
    "debt_to_equity_ratio",
    "roic_pct",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iter_provenance(research: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    for key, value in research.items():
        if key in {
            "symbol", "schema_version", "experiment_status", "research_status",
            "as_of_date", "authoring_model", "prompt_version",
        }:
            continue
        if isinstance(value, dict):
            provenance = value.get("provenance")
            if isinstance(provenance, dict):
                yield provenance


def evidence_summary(research: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    research = research or {}
    counts = Counter()
    for provenance in _iter_provenance(research):
        source_class = provenance.get("source_class")
        authority_tier = provenance.get("authority_tier")
        counts[source_class or authority_tier or "UNSPECIFIED"] += 1

    total = sum(counts.values())
    percentages = {
        key: round((count / total) * 100.0, 1) if total else 0.0
        for key, count in sorted(counts.items())
    }
    model_supplied = sum(
        count for key, count in counts.items()
        if key in {
            "MODEL", "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE",
            "TIER_5_UNVERIFIED_HEURISTIC",
        }
    )
    return {
        "evidence_items": total,
        "counts_by_class": dict(sorted(counts.items())),
        "percentages_by_class": percentages,
        "model_supplied_pct": (
            round((model_supplied / total) * 100.0, 1) if total else 0.0
        ),
    }


def price_warnings(price: Optional[Dict[str, Any]]) -> List[str]:
    price = price or {}
    warnings: List[str] = []
    current = price.get("current_price")
    previous = price.get("previous_close")

    if not isinstance(current, (int, float)) or current <= 0:
        warnings.append("missing or non-positive current price")
    if not isinstance(previous, (int, float)) or previous <= 0:
        warnings.append("missing or non-positive previous close")
    # Integrity is decided once, at collection time, by
    # fetch_market_prices.assess_price_integrity. Re-deriving it here would
    # duplicate the rule and let the two copies drift apart -- which is exactly
    # how the previous version came to compare two fields that had since become
    # aliases for the same value, and so could never disagree.
    integrity = price.get("data_integrity")
    if not integrity:
        warnings.append("market-price record carries no data-integrity verdict")
        return warnings

    if not integrity.get("prior_close_concordant"):
        warnings.append("previous-close series disagree beyond what dividends explain")
    if not integrity.get("adjustment_series_consistent", True):
        warnings.append("dividend-adjusted close series is internally inconsistent")
    if integrity.get("extreme_move") and not integrity.get("extreme_move_corroborated"):
        warnings.append("daily move above 25 percent is not corroborated")
    if integrity.get("quarantined"):
        warnings.append("market-price record is quarantined by data-integrity checks")
    return warnings


def staleness_warnings(research: Dict[str, Any], price: Dict[str, Any]) -> List[str]:
    warnings = []
    now = datetime.now(timezone.utc)
    price_as_of = price.get("as_of_timestamp") or price.get("last_updated")
    if price_as_of:
        try:
            parsed = datetime.fromisoformat(str(price_as_of).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            if (now - parsed.astimezone(timezone.utc)).total_seconds() > 4 * 86400:
                warnings.append("market price is more than four calendar days old")
        except ValueError:
            warnings.append("market price as-of timestamp is invalid")
    else:
        warnings.append("market price as-of timestamp is missing")

    research_as_of = research.get("as_of_date")
    if research_as_of:
        try:
            if (now.date() - date.fromisoformat(str(research_as_of))).days > 120:
                warnings.append("agent-authored research is more than 120 days old")
        except ValueError:
            warnings.append("research as-of date is invalid")
    else:
        warnings.append("research as-of date is missing")
    return warnings


def readiness_report(
    research: Optional[Dict[str, Any]],
    price: Optional[Dict[str, Any]],
    fundamentals: Optional[Dict[str, Any]] = None,
    require_fundamentals: bool = True,
) -> Dict[str, Any]:
    research = research or {}
    fundamentals = fundamentals or {}
    warnings = price_warnings(price)
    stale = staleness_warnings(research, price)
    missing: List[str] = []

    if research.get("experiment_status") != EXPERIMENT_STATUS:
        missing.append("research.experiment_status")
    if research.get("research_status") != RESEARCH_STATUS_AUTHORED:
        missing.append("agent-authored experimental research")
    if not research.get("forecast_scenarios"):
        missing.append("research.forecast_scenarios")
    if require_fundamentals:
        for field in CRITICAL_FUNDAMENTAL_FIELDS:
            if fundamentals.get(field) is None:
                missing.append(f"fundamentals.{field}")

    return {
        "experiment_status": EXPERIMENT_STATUS,
        "trade_ready": not missing and not warnings and not stale,
        "missing_inputs": sorted(set(missing)),
        "stale_inputs": sorted(set(stale)),
        "anomalies": warnings,
        "evidence": evidence_summary(research),
        "warning": EXPERIMENT_WARNING,
    }
