#!/usr/bin/env python3
"""
scripts/calculate_pricing.py
Deterministic Pricing & Derivatives CLI for the Pricing Agent.

Calculates theoretical option fair value, Black-Scholes Greeks (Delta, Theta,
Gamma, Vega), Annualized Return on Collateral (AROC), and technical limit
order entry/exit bounds for Monday 9:30 AM ET execution.
"""

import argparse
from datetime import date, datetime
import json
import math
import sys

from experiment_contract import EXPERIMENT_STATUS, EXPERIMENTAL_WARNING


def norm_cdf(x):
    """Cumulative distribution function for standard normal distribution."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0


def norm_pdf(x):
    """Probability density function for standard normal distribution."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def black_scholes(s, k, t, r, sigma, option_type="put", dividend_yield=0.0):
    """
    Computes Black-Scholes option price and Greeks.
    s: Current stock price
    k: Strike price
    t: Time to expiration in years (DTE / 365.0)
    r: Risk-free rate (e.g. 0.045 for 4.5%)
    sigma: Implied volatility (e.g. 0.35 for 35%)
    option_type: 'put' or 'call'
    """
    if t <= 0 or sigma <= 0 or s <= 0 or k <= 0:
        intrinsic = max(0.0, k - s) if option_type == "put" else max(0.0, s - k)
        return {
            "price": intrinsic,
            "delta": -1.0 if option_type == "put" and s < k else (1.0 if option_type == "call" and s > k else 0.0),
            "theta": 0.0,
            "gamma": 0.0,
            "vega": 0.0
        }

    q = dividend_yield
    d1 = (math.log(s / k) + (r - q + 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)

    if option_type.lower() == "call":
        price = s * math.exp(-q * t) * norm_cdf(d1) - k * math.exp(-r * t) * norm_cdf(d2)
        delta = math.exp(-q * t) * norm_cdf(d1)
        theta_per_year = -(s * math.exp(-q * t) * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t)) - r * k * math.exp(-r * t) * norm_cdf(d2) + q * s * math.exp(-q * t) * norm_cdf(d1)
    else:  # put
        price = k * math.exp(-r * t) * norm_cdf(-d2) - s * math.exp(-q * t) * norm_cdf(-d1)
        delta = math.exp(-q * t) * (norm_cdf(d1) - 1.0)
        theta_per_year = -(s * math.exp(-q * t) * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t)) + r * k * math.exp(-r * t) * norm_cdf(-d2) - q * s * math.exp(-q * t) * norm_cdf(-d1)

    gamma = math.exp(-q * t) * norm_pdf(d1) / (s * sigma * math.sqrt(t))
    vega_per_pct = (s * math.exp(-q * t) * math.sqrt(t) * norm_pdf(d1)) / 100.0
    theta_per_day = theta_per_year / 365.0

    return {
        "price": round(max(0.01, price), 2),
        "delta": round(delta, 3),
        "theta_daily": round(theta_per_day, 3),
        "gamma": round(gamma, 4),
        "vega": round(vega_per_pct, 3)
    }


def calculate_aroc(premium, strike, dte):
    """
    Computes Annualized Return on Collateral (AROC).
    Formula: (Premium / Strike) * (365 / DTE) * 100
    """
    if strike <= 0 or dte <= 0:
        return 0.0
    return round((premium / strike) * (365.0 / dte) * 100.0, 2)


def calculate_limit_bounds(stock_price, support_level=None, resistance_level=None):
    """
    Computes conservative limit order prices based on technical bounds.
    """
    if support_level is None or resistance_level is None:
        raise ValueError("observed support and resistance are required; percentage defaults are prohibited")
    support = support_level
    resistance = resistance_level
    
    conservative_buy_limit = round(min(support * 1.01, stock_price * 0.98), 2)
    disciplined_sell_limit = round(max(resistance * 0.99, stock_price * 1.04), 2)

    return {
        "current_price": stock_price,
        "support_level": support,
        "resistance_level": resistance,
        "conservative_buy_limit": conservative_buy_limit,
        "disciplined_sell_limit": disciplined_sell_limit
    }


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Pricing CLI for Pricing Agent (Options & Limit Orders)"
    )
    subparsers = parser.add_subparsers(dest="command", help="Pricing mode")

    # Mode 1: Option Pricing (CSP / CC)
    opt_parser = subparsers.add_parser("option", help="Price an option contract")
    opt_parser.add_argument("--symbol", type=str, default="TICKER", help="Stock ticker symbol")
    opt_parser.add_argument("--chain-snapshot", required=True, help="Archived option-chain snapshot JSON")
    opt_parser.add_argument("--strike", type=float, required=True, help="Option strike price")
    opt_parser.add_argument("--expiration", required=True, help="Observed expiration in YYYY-MM-DD format")
    opt_parser.add_argument("--rate", type=float, help="Observed Treasury rate; otherwise use snapshot rate")
    opt_parser.add_argument("--dividend-yield", type=float, required=True, help="Observed annual dividend yield decimal; explicitly pass 0 when applicable")
    opt_parser.add_argument("--minimum-aroc", type=float, required=True, help="Minimum experimental annualized return on collateral percentage")
    opt_parser.add_argument("--type", choices=["put", "call"], default="put", help="Option type (put or call)")
    opt_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # Mode 2: Roll Economics Check
    roll_parser = subparsers.add_parser("roll", help="Validate net-credit roll economics")
    roll_parser.add_argument("--close-cost", type=float, required=True, help="Cost to buy back open contract per share")
    roll_parser.add_argument("--open-credit", type=float, required=True, help="Credit from selling new contract per share")
    roll_parser.add_argument("--contracts", type=int, default=1, help="Number of contracts")
    roll_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # Mode 3: Limit Order Pricing
    limit_parser = subparsers.add_parser("limit", help="Calculate technical limit order entry/exit prices")
    limit_parser.add_argument("--stock-price", type=float, required=True, help="Current stock price")
    limit_parser.add_argument("--support", type=float, required=True, help="Observed technical support level")
    limit_parser.add_argument("--resistance", type=float, required=True, help="Observed technical resistance level")
    limit_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # Mode 4: Buy-to-Close (BTC) on Losing Propositions
    btc_parser = subparsers.add_parser("btc", help="Calculate Buy-to-Close order pricing on losing propositions / broken theses")
    btc_parser.add_argument("--symbol", type=str, required=True, help="Stock ticker symbol")
    btc_parser.add_argument("--type", choices=["put", "call"], default="put", help="Option type (put or call)")
    btc_parser.add_argument("--strike", type=float, required=True, help="Option strike price")
    btc_parser.add_argument("--current-mark", type=float, required=True, help="Current option mark/ask price per share")
    btc_parser.add_argument("--contracts", type=int, default=1, help="Number of contracts to close")
    btc_parser.add_argument("--reason", type=str, required=True, help="Agent-authored experimental rationale")
    btc_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "option":
        with open(args.chain_snapshot, "r", encoding="utf-8") as handle:
            chain = json.load(handle)
        if chain.get("experiment_status") != EXPERIMENT_STATUS:
            raise ValueError("chain snapshot is not labeled EXPERIMENTAL")
        if chain.get("symbol") != args.symbol.upper():
            raise ValueError("symbol does not match archived chain")
        contract = next((
            item for item in chain.get("contracts", [])
            if item.get("option_type") == args.type.upper()
            and item.get("expiration") == args.expiration
            and abs(float(item.get("strike", -1)) - args.strike) < 1e-9
        ), None)
        if not contract:
            raise ValueError("requested strike and expiration were not observed in the archived chain")
        iv = contract.get("implied_volatility")
        if iv is None or iv <= 0:
            raise ValueError("observed contract has no valid implied volatility")
        rate = args.rate if args.rate is not None else chain.get("risk_free_rate")
        if rate is None:
            raise ValueError("risk-free rate is missing; provide --rate or archive it in the snapshot")
        observed_date = datetime.fromisoformat(chain["observed_at"].replace("Z", "+00:00")).date()
        expiration_date = date.fromisoformat(args.expiration)
        dte = (expiration_date - observed_date).days
        if dte <= 0:
            raise ValueError("expiration must be after the snapshot observation date")
        stock_price = float(chain["underlying_price"])
        t_years = dte / 365.0
        greeks = black_scholes(
            stock_price, args.strike, t_years, rate, iv, args.type,
            dividend_yield=args.dividend_yield,
        )
        premium = greeks["price"]
        collateral_per_share = args.strike if args.type == "put" else stock_price
        minimum_credit = collateral_per_share * (args.minimum_aroc / 100.0) * (dte / 365.0)
        reservation_credit = round(max(premium, minimum_credit), 2)
        aroc = calculate_aroc(reservation_credit, collateral_per_share, dte)
        is_csp_valid = args.type == "put" and (-0.35 <= greeks["delta"] <= -0.12) and aroc >= 12.0
        is_cc_valid = args.type == "call" and (0.15 <= greeks["delta"] <= 0.38)

        output = {
            "experiment_status": EXPERIMENT_STATUS,
            "experimental_warning": EXPERIMENTAL_WARNING,
            "chain_snapshot_id": chain["snapshot_id"],
            "symbol": args.symbol.upper(),
            "type": args.type.upper(),
            "stock_price": stock_price,
            "strike": args.strike,
            "expiration": args.expiration,
            "dte": dte,
            "iv": iv,
            "risk_free_rate": rate,
            "dividend_yield": args.dividend_yield,
            "modeled_reservation_value": premium,
            "minimum_strategy_credit": round(minimum_credit, 2),
            "reservation_credit": reservation_credit,
            "model_delta": greeks["delta"],
            "theta_daily": greeks["theta_daily"],
            "gamma": greeks["gamma"],
            "vega": greeks["vega"],
            "aroc_pct": aroc,
            "experimental_csp_classification": is_csp_valid if args.type == "put" else False,
            "experimental_cc_classification": is_cc_valid if args.type == "call" else False,
            "observed_market": {"bid": contract["bid"], "ask": contract["ask"]},
            "monday_stress_scenarios": [
                {"underlying_change_pct": move, "iv_change_pct": iv_move,
                 "reservation_value": black_scholes(
                     stock_price * (1 + move / 100.0), args.strike, t_years, rate,
                     max(0.0001, iv * (1 + iv_move / 100.0)), args.type,
                     dividend_yield=args.dividend_yield,
                 )["price"]}
                for move, iv_move in ((-5, 20), (0, 0), (5, -20))
            ],
        }

        if args.json:
            print(json.dumps(output, indent=2))
            return

        print("=" * 70)
        print(f"PRICING AGENT: {output['symbol']} {output['type']} PRICING MODEL")
        print("=" * 70)
        print("EXPERIMENTAL OPTION RESERVATION-PRICE MODEL")
        print(EXPERIMENTAL_WARNING)
        print(f"Underlying Price:     ${stock_price:.2f}")
        print(f"Strike Price:         ${args.strike:.2f} ({dte} DTE, IV: {iv*100:.1f}%)")
        print(f"Theoretical Premium:  ${premium:.2f} per share (${premium*100:.2f} per contract)")
        print(f"Greeks:               Delta: {greeks['delta']} | Daily Theta: ${greeks['theta_daily']:.3f} | Gamma: {greeks['gamma']}")
        print(f"Annualized ROC (AROC):{aroc:.2f}% (Target: >= 12% - 18%)")
        print(f"Experimental Limit:  SELL TO OPEN limit @ ${reservation_credit:.2f}")
        print("=" * 70)

    elif args.command == "roll":
        net_credit = args.open_credit - args.close_cost
        total_net_credit = net_credit * 100 * args.contracts
        is_valid = net_credit > 0.0

        output = {
            "experiment_status": EXPERIMENT_STATUS,
            "experimental_warning": EXPERIMENTAL_WARNING,
            "close_cost_per_share": args.close_cost,
            "open_credit_per_share": args.open_credit,
            "net_credit_per_share": round(net_credit, 2),
            "contracts": args.contracts,
            "total_net_cash_impact": round(total_net_credit, 2),
            "is_valid_net_credit": is_valid
        }

        if args.json:
            print(json.dumps(output, indent=2))
            return

        print("=" * 70)
        print("PRICING AGENT: DEFENSIVE OPTION ROLL VERIFICATION")
        print("=" * 70)
        print(f"Close Leg Cost:       ${args.close_cost:.2f} / share")
        print(f"Open Leg Credit:      ${args.open_credit:.2f} / share")
        print(f"Net Premium Impact:   ${net_credit:.2f} / share (${total_net_credit:.2f} total)")
        print(f"Rule Compliance:      {'PASS (Net Credit harvest)' if is_valid else 'FAIL (Net Debit forbidden)'}")
        print("=" * 70)

    elif args.command == "limit":
        bounds = calculate_limit_bounds(args.stock_price, args.support, args.resistance)
        bounds["experiment_status"] = EXPERIMENT_STATUS
        bounds["experimental_warning"] = EXPERIMENTAL_WARNING
        if args.json:
            print(json.dumps(bounds, indent=2))
            return

        print("=" * 70)
        print(f"PRICING AGENT: TECHNICAL LIMIT ORDER BOUNDS")
        print("=" * 70)
        print(f"Stock Current Price:  ${bounds['current_price']:.2f}")
        print(f"Support Level:        ${bounds['support_level']:.2f}")
        print(f"Resistance Level:     ${bounds['resistance_level']:.2f}")
        print(f"Suggested Buy Limit:  ${bounds['conservative_buy_limit']:.2f}")
        print(f"Suggested Sell Limit: ${bounds['disciplined_sell_limit']:.2f}")
        print("=" * 70)

    elif args.command == "btc":
        limit_buy_price = round(args.current_mark * 1.05, 2)
        total_cash_debit = round(limit_buy_price * 100 * args.contracts, 2)
        
        if args.type == "put":
            collateral_unlocked = round(args.strike * 100 * args.contracts, 2)
            shares_unlocked = 0
            mitigation_text = f"Eliminates assignment liability of {args.contracts * 100} shares (${collateral_unlocked:,.2f} cash exposure) on declining stock."
        else:
            collateral_unlocked = 0.0
            shares_unlocked = args.contracts * 100
            mitigation_text = f"Unlocks {shares_unlocked} common shares for immediate Monday market open liquidation (SELL TO CLOSE)."

        output = {
            "experiment_status": EXPERIMENT_STATUS,
            "experimental_warning": EXPERIMENTAL_WARNING,
            "symbol": args.symbol.upper(),
            "type": args.type.upper(),
            "strike": args.strike,
            "contracts": args.contracts,
            "current_mark": args.current_mark,
            "suggested_limit_buy_price": limit_buy_price,
            "total_cash_debit": total_cash_debit,
            "collateral_unlocked_usd": collateral_unlocked,
            "shares_unlocked": shares_unlocked,
            "reason": args.reason,
            "risk_mitigation": mitigation_text,
            "order_instruction": f"BUY TO CLOSE {args.contracts}x {args.symbol.upper()} ${args.strike:.2f} {args.type.capitalize()} (Limit ${limit_buy_price:.2f} debit)"
        }

        if args.json:
            print(json.dumps(output, indent=2))
            return

        print("=" * 70)
        print(f"PRICING AGENT: BUY TO CLOSE (BTC) - LOSING PROPOSITION EXIT")
        print("=" * 70)
        print(f"Symbol:               {output['symbol']}")
        print(f"Contract:             ${args.strike:.2f} {output['type']} ({args.contracts} contract{'s' if args.contracts > 1 else ''})")
        print(f"Current Mark / Ask:   ${args.current_mark:.2f} / share")
        print(f"Suggested Buy Limit:  ${limit_buy_price:.2f} (Single-session fill buffer)")
        print(f"Total Debit Impact:   -${total_cash_debit:,.2f}")
        if args.type == "put":
            print(f"Collateral Unlocked:  +${collateral_unlocked:,.2f} cash back to dry powder")
        else:
            print(f"Shares Unlocked:      +{shares_unlocked} shares liberated for immediate sale")
        print(f"Strategic Rationale:  {args.reason}")
        print(f"Risk Mitigation:      {mitigation_text}")
        print("-" * 70)
        print(f"Order Instruction:    {output['order_instruction']}")
        print("=" * 70)


if __name__ == "__main__":
    main()
