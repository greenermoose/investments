"""
Return Engine
Core mathematical calculation engine for investment thesis returns, options income harvesting,
and annualized Return on Investment (CAGR / Annualized ROI).

Parameters:
1. Purchase Strategy: SELL_CSP (Sell Cash-Secured Put) vs LIMIT_BUY (Direct Limit Buy Order)
2. Sale Strategy: SELL_COVERED_CALLS (Covered Call Income) vs LIMIT_SELL (Direct Limit Sell Order)
3. Benchmark Entry Price ($)
4. Target Exit Price ($)
5. Entry Date and Target Exit Date (YYYY-MM-DD)
6. Options Proceeds: CSP Premium Proceeds ($) and Covered Call Premium Proceeds ($)

Conforms to context/schemas/return_engine_schema.json and repository guidelines (AGENTS.md).
"""

import argparse
from dataclasses import dataclass, asdict
from datetime import datetime, date, timedelta
import json
import math
import os
import sys
from typing import Dict, Any, Optional, Tuple, Union


@dataclass
class ReturnEngineInput:
    symbol: str
    benchmark_entry_price: float
    target_exit_price: float
    entry_strategy: str = "LIMIT_BUY"         # "SELL_CSP" | "LIMIT_BUY"
    exit_strategy: str = "LIMIT_SELL"         # "SELL_COVERED_CALLS" | "LIMIT_SELL"
    entry_date: str = "2026-08-17"
    target_exit_date: Optional[str] = None
    holding_period_years: Optional[float] = None
    csp_proceeds: float = 0.0                 # Put premium per share ($)
    cc_proceeds: float = 0.0                  # Cumulative call premium per share ($)
    dividend_proceeds: float = 0.0            # Cumulative dividends per share ($)
    company_name: Optional[str] = None


@dataclass
class ReturnEngineResult:
    symbol: str
    company_name: str
    entry_strategy: str
    exit_strategy: str
    benchmark_entry_price: float
    target_exit_price: float
    entry_date: str
    target_exit_date: str
    csp_proceeds: float
    cc_proceeds: float
    dividend_proceeds: float
    initial_capital_outlay: float
    total_proceeds: float
    net_profit: float
    holding_period_days: int
    holding_period_years: float
    capital_gain_pct: float
    options_yield_pct: float
    total_roi_pct: float
    annualized_roi_pct: float
    target_roi_str: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def parse_iso_date(d: Union[str, date, datetime]) -> date:
    """Parse ISO date string or date object safely."""
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        # Strip any time component
        clean_str = d.strip().split("T")[0]
        return datetime.strptime(clean_str, "%Y-%m-%d").date()
    raise ValueError(f"Unsupported date format: {d}")


def calculate_annualized_roi(
    benchmark_entry_price: float,
    target_exit_price: float,
    entry_strategy: str = "LIMIT_BUY",
    exit_strategy: str = "LIMIT_SELL",
    entry_date: Union[str, date] = "2026-08-17",
    target_exit_date: Optional[Union[str, date]] = None,
    holding_period_years: Optional[float] = None,
    csp_proceeds: float = 0.0,
    cc_proceeds: float = 0.0,
    dividend_proceeds: float = 0.0,
    symbol: str = "BENCHMARK",
    company_name: Optional[str] = None
) -> ReturnEngineResult:
    """
    Core return engine function calculating total and compound annualized return on investment (CAGR).
    
    Formulas:
    - Initial Outlay (C0):
        If SELL_CSP: C0 = max(benchmark_entry_price - csp_proceeds, 0.01)
        If LIMIT_BUY: C0 = benchmark_entry_price
    - Terminal Inflows (IT):
        IT = target_exit_price + cc_proceeds + dividend_proceeds
    - Net Profit (Pi):
        Pi = IT - C0
    - Total ROI (%):
        Total ROI = (Pi / C0) * 100
    - Holding Period (T_years):
        T_years = (Exit Date - Entry Date) / 365.25
    - Annualized ROI (% CAGR):
        Annualized ROI = ((1 + Total ROI / 100) ^ (1 / T_years) - 1) * 100
    """
    # 1. Normalize and validate strategies
    entry_strat = str(entry_strategy).strip().upper()
    if entry_strat not in ["SELL_CSP", "LIMIT_BUY"]:
        entry_strat = "LIMIT_BUY"

    exit_strat = str(exit_strategy).strip().upper()
    if exit_strat not in ["SELL_COVERED_CALLS", "LIMIT_SELL"]:
        exit_strat = "LIMIT_SELL"

    entry_px = round(float(benchmark_entry_price), 2)
    exit_px = round(float(target_exit_price), 2)
    if entry_px <= 0:
        raise ValueError(f"Benchmark entry price must be positive, got {entry_px}")
    if exit_px <= 0:
        raise ValueError(f"Target exit price must be positive, got {exit_px}")

    csp_cash = round(max(float(csp_proceeds or 0.0), 0.0), 2)
    cc_cash = round(max(float(cc_proceeds or 0.0), 0.0), 2)
    div_cash = round(max(float(dividend_proceeds or 0.0), 0.0), 2)

    # 2. Compute date range and holding horizon
    start_d = parse_iso_date(entry_date)
    if target_exit_date is not None:
        end_d = parse_iso_date(target_exit_date)
        delta_days = (end_d - start_d).days
        if delta_days <= 0:
            delta_days = 1
            end_d = start_d + timedelta(days=1)
        t_years = round(delta_days / 365.25, 4)
    elif holding_period_years is not None and holding_period_years > 0:
        t_years = round(float(holding_period_years), 4)
        delta_days = max(int(round(t_years * 365.25)), 1)
        end_d = start_d + timedelta(days=delta_days)
    else:
        # Default 3.0-year investment horizon
        t_years = 3.0
        delta_days = int(round(3.0 * 365.25))
        end_d = start_d + timedelta(days=delta_days)

    # 3. Capital Outlay and Inflows
    if entry_strat == "SELL_CSP":
        initial_outlay = round(max(entry_px - csp_cash, 0.01), 2)
    else:
        initial_outlay = entry_px

    total_inflows = round(exit_px + cc_cash + div_cash, 2)
    net_profit = round(total_inflows - initial_outlay, 2)

    # 4. Percentage Return Metrics
    capital_gain_pct = round(((exit_px - entry_px) / entry_px) * 100.0, 2)
    options_yield_pct = round(((csp_cash + cc_cash) / entry_px) * 100.0, 2)
    total_roi_pct = round((net_profit / initial_outlay) * 100.0, 2)

    # 5. Compound Annualized Growth Rate (CAGR)
    gross_multiple = 1.0 + (total_roi_pct / 100.0)
    if gross_multiple > 0 and t_years > 0:
        annualized_roi_pct = round(((gross_multiple ** (1.0 / t_years)) - 1.0) * 100.0, 2)
    else:
        annualized_roi_pct = -100.0

    # 6. Formatted Human Display String (Annualized single percentage)
    if annualized_roi_pct.is_integer():
        target_roi_str = f"{annualized_roi_pct:.0f}%"
    else:
        target_roi_str = f"{annualized_roi_pct:.1f}%"

    return ReturnEngineResult(
        symbol=symbol,
        company_name=company_name or symbol,
        entry_strategy=entry_strat,
        exit_strategy=exit_strat,
        benchmark_entry_price=entry_px,
        target_exit_price=exit_px,
        entry_date=start_d.isoformat(),
        target_exit_date=end_d.isoformat(),
        csp_proceeds=csp_cash,
        cc_proceeds=cc_cash,
        dividend_proceeds=div_cash,
        initial_capital_outlay=initial_outlay,
        total_proceeds=total_inflows,
        net_profit=net_profit,
        holding_period_days=delta_days,
        holding_period_years=t_years,
        capital_gain_pct=capital_gain_pct,
        options_yield_pct=options_yield_pct,
        total_roi_pct=total_roi_pct,
        annualized_roi_pct=annualized_roi_pct,
        target_roi_str=target_roi_str
    )


def derive_company_thesis_parameters(
    symbol: str,
    current_price: float,
    thesis_status: str = "HOLD",
    conviction_score: float = 8.0,
    holding_period: str = "3 to 5 Years",
    company_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Derives grounded investment thesis strategy parameters conforming to the core 20%+ target rule.
    - BUY: High conviction capital compounder (Limit Buy / Sell CSP on pullback, target 20-22% CAGR)
    - HOLD: Core compounder with Covered Call yield harvesting (Limit Buy / Hold + CC harvesting, target 20% CAGR)
    - SELL/AVOID: Capital preservation / liquidation at benchmark
    """
    status = thesis_status.upper()
    entry_px = round(float(current_price), 2)
    entry_date = "2026-08-17"

    # Derive holding years from period descriptor
    if "5" in holding_period or "4 to 6" in holding_period:
        holding_years = 4.0
    elif "2 to 4" in holding_period:
        holding_years = 3.0
    elif "1 to 2" in holding_period:
        holding_years = 2.0
    else:
        holding_years = 3.0

    target_exit_date = (parse_iso_date(entry_date) + timedelta(days=int(holding_years * 365.25))).isoformat()

    if status == "BUY":
        # Buy Strategy:
        # If conviction >= 9.0: Direct Limit Buy with 22.0% CAGR capital growth target
        # If conviction < 9.0: Sell CSP entry on pullback (discount) + Limit Sell
        if conviction_score >= 9.0:
            entry_strategy = "LIMIT_BUY"
            exit_strategy = "LIMIT_SELL"
            annual_cagr = 0.22
            csp_proceeds = 0.0
            cc_proceeds = 0.0
            target_exit_price = round(entry_px * ((1.0 + annual_cagr) ** holding_years), 2)
        else:
            entry_strategy = "SELL_CSP"
            exit_strategy = "LIMIT_SELL"
            annual_cagr = 0.20
            # 0.20 Delta CSP modeled premium ~3.5% discount
            csp_proceeds = round(entry_px * 0.035, 2)
            cc_proceeds = 0.0
            target_multiple = (1.0 + annual_cagr) ** holding_years
            target_exit_price = round((entry_px - csp_proceeds) * target_multiple, 2)

    elif status == "HOLD":
        # Hold Strategy:
        # Covered Call Income Harvesting to achieve 20.0% annualized return
        # Target ~8% annual capital appreciation + ~12% to 17% annual CC harvest yield
        entry_strategy = "LIMIT_BUY"
        exit_strategy = "SELL_COVERED_CALLS"
        csp_proceeds = 0.0
        annual_cagr = 0.20
        total_target_multiple = (1.0 + annual_cagr) ** holding_years
        total_target_inflows = entry_px * total_target_multiple

        # Capital growth portion (~8% per year)
        cap_gain_multiple = (1.08 ** holding_years)
        target_exit_price = round(entry_px * cap_gain_multiple, 2)

        # Covered call harvest proceeds balance
        cc_proceeds = round(max(total_target_inflows - target_exit_price, 0.0), 2)

    else:  # SELL or AVOID
        entry_strategy = "LIMIT_BUY"
        exit_strategy = "LIMIT_SELL"
        csp_proceeds = 0.0
        cc_proceeds = 0.0
        target_exit_price = entry_px

    res = calculate_annualized_roi(
        benchmark_entry_price=entry_px,
        target_exit_price=target_exit_price,
        entry_strategy=entry_strategy,
        exit_strategy=exit_strategy,
        entry_date=entry_date,
        target_exit_date=target_exit_date,
        holding_period_years=holding_years,
        csp_proceeds=csp_proceeds,
        cc_proceeds=cc_proceeds,
        symbol=symbol,
        company_name=company_name
    )

    return res.to_dict()


def run_self_tests():
    """Run comprehensive unit tests across multiple investment strategy scenarios."""
    print("Running Return Engine Unit Tests...")

    # Test Case 1: Pure Limit Buy + Limit Sell (e.g. 20% CAGR over 3 years)
    # Entry: $100, Exit: $172.80, 3 Years. Multiple = 1.728 -> CAGR = (1.728)^(1/3) - 1 = 0.200 (20.0%)
    t1 = calculate_annualized_roi(
        benchmark_entry_price=100.0,
        target_exit_price=172.80,
        entry_strategy="LIMIT_BUY",
        exit_strategy="LIMIT_SELL",
        entry_date="2026-08-17",
        target_exit_date="2029-08-16",
        symbol="TEST_BUY"
    )
    assert abs(t1.annualized_roi_pct - 20.0) < 0.1, f"Test 1 failed: CAGR {t1.annualized_roi_pct} != 20.0%"
    assert t1.initial_capital_outlay == 100.0
    assert t1.total_proceeds == 172.80
    assert t1.capital_gain_pct == 72.8
    print("Test Case 1 (Limit Buy & Limit Sell): PASS")

    # Test Case 2: Sell CSP Entry + Limit Sell Exit
    # Entry: $100, CSP Premium: $5.00 -> Net Outlay: $95.00. Exit: $164.16 over 3 years -> 164.16 / 95 = 1.728 -> 20.0% CAGR
    t2 = calculate_annualized_roi(
        benchmark_entry_price=100.0,
        target_exit_price=164.16,
        entry_strategy="SELL_CSP",
        exit_strategy="LIMIT_SELL",
        csp_proceeds=5.0,
        entry_date="2026-08-17",
        holding_period_years=3.0,
        symbol="TEST_CSP"
    )
    assert t2.initial_capital_outlay == 95.0
    assert abs(t2.annualized_roi_pct - 20.0) < 0.1, f"Test 2 failed: CAGR {t2.annualized_roi_pct} != 20.0%"
    print("Test Case 2 (Sell CSP Entry & Limit Sell Exit): PASS")

    # Test Case 3: Limit Buy + Covered Call Yield Harvesting
    # Entry: $100, Exit: $130.00 (30% capital gain), CC Yield: $42.80 over 3 years -> Total Proceeds: $172.80 -> 20.0% CAGR
    t3 = calculate_annualized_roi(
        benchmark_entry_price=100.0,
        target_exit_price=130.00,
        entry_strategy="LIMIT_BUY",
        exit_strategy="SELL_COVERED_CALLS",
        cc_proceeds=42.80,
        entry_date="2026-08-17",
        holding_period_years=3.0,
        symbol="TEST_CC"
    )
    assert t3.total_proceeds == 172.80
    assert abs(t3.annualized_roi_pct - 20.0) < 0.1, f"Test 3 failed: CAGR {t3.annualized_roi_pct} != 20.0%"
    assert t3.options_yield_pct == 42.8
    print("Test Case 3 (Limit Buy & Covered Call Harvesting): PASS")

    # Test Case 4: Sell CSP Entry + Covered Call Harvesting Exit
    # Entry: $100, CSP Premium: $4.00 (Net Outlay: $96), Exit: $130, CC Yield: $35.89 -> Total: $165.89 -> 165.89/96 = 1.728 -> 20.0% CAGR
    t4 = calculate_annualized_roi(
        benchmark_entry_price=100.0,
        target_exit_price=130.00,
        entry_strategy="SELL_CSP",
        exit_strategy="SELL_COVERED_CALLS",
        csp_proceeds=4.00,
        cc_proceeds=35.89,
        entry_date="2026-08-17",
        holding_period_years=3.0,
        symbol="TEST_COMBO"
    )
    assert t4.initial_capital_outlay == 96.00
    assert abs(t4.annualized_roi_pct - 20.0) < 0.1, f"Test 4 failed: CAGR {t4.annualized_roi_pct} != 20.0%"
    print("Test Case 4 (Sell CSP Entry & Covered Call Harvesting Exit): PASS")

    print("All Return Engine unit tests PASSED successfully!")


def main():
    parser = argparse.ArgumentParser(description="Deterministic Investment Return Engine CLI")
    parser.add_argument("--test", action="store_true", help="Run automated test suite")
    parser.add_argument("--symbol", type=str, help="Calculate return for a specific symbol")
    parser.add_argument("--entry", type=float, help="Benchmark entry price ($)")
    parser.add_argument("--exit", type=float, help="Target exit price ($)")
    parser.add_argument("--entry-strat", choices=["SELL_CSP", "LIMIT_BUY"], default="LIMIT_BUY", help="Entry strategy")
    parser.add_argument("--exit-strat", choices=["SELL_COVERED_CALLS", "LIMIT_SELL"], default="LIMIT_SELL", help="Exit strategy")
    parser.add_argument("--csp", type=float, default=0.0, help="CSP proceeds ($/share)")
    parser.add_argument("--cc", type=float, default=0.0, help="Covered call proceeds ($/share)")
    parser.add_argument("--years", type=float, default=3.0, help="Holding period in years")

    args = parser.parse_args()

    if args.test:
        run_self_tests()
        return

    if args.entry and args.exit:
        result = calculate_annualized_roi(
            benchmark_entry_price=args.entry,
            target_exit_price=args.exit,
            entry_strategy=args.entry_strat,
            exit_strategy=args.exit_strat,
            csp_proceeds=args.csp,
            cc_proceeds=args.cc,
            holding_period_years=args.years,
            symbol=args.symbol or "EQUITY"
        )
        print(json.dumps(result.to_dict(), indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
