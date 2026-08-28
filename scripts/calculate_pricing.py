#!/usr/bin/env python3
"""
scripts/calculate_pricing.py
Deterministic Pricing & Derivatives CLI for the Pricing Agent.

Calculates theoretical option fair value, Black-Scholes Greeks (Delta, Theta,
Gamma, Vega), Annualized Return on Collateral (AROC), and technical limit
order entry/exit bounds for Monday 9:30 AM ET execution.
"""

import argparse
import json
import math
import sys


def norm_cdf(x):
    """Cumulative distribution function for standard normal distribution."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0


def norm_pdf(x):
    """Probability density function for standard normal distribution."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def black_scholes(s, k, t, r, sigma, option_type="put"):
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

    d1 = (math.log(s / k) + (r + 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)

    if option_type.lower() == "call":
        price = s * norm_cdf(d1) - k * math.exp(-r * t) * norm_cdf(d2)
        delta = norm_cdf(d1)
        theta_per_year = -(s * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t)) - r * k * math.exp(-r * t) * norm_cdf(d2)
    else:  # put
        price = k * math.exp(-r * t) * norm_cdf(-d2) - s * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1.0
        theta_per_year = -(s * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t)) + r * k * math.exp(-r * t) * norm_cdf(-d2)

    gamma = norm_pdf(d1) / (s * sigma * math.sqrt(t))
    vega_per_pct = (s * math.sqrt(t) * norm_pdf(d1)) / 100.0
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
    support = support_level if support_level else round(stock_price * 0.96, 2)
    resistance = resistance_level if resistance_level else round(stock_price * 1.05, 2)
    
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
    opt_parser.add_argument("--stock-price", type=float, required=True, help="Current underlying stock price")
    opt_parser.add_argument("--strike", type=float, required=True, help="Option strike price")
    opt_parser.add_argument("--dte", type=int, default=35, help="Days to expiration (default: 35)")
    opt_parser.add_argument("--iv", type=float, default=0.30, help="Implied Volatility decimal (e.g. 0.30 for 30%%)")
    opt_parser.add_argument("--rate", type=float, default=0.045, help="Risk-free rate decimal (default: 0.045)")
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
    limit_parser.add_argument("--support", type=float, default=None, help="Technical support level")
    limit_parser.add_argument("--resistance", type=float, default=None, help="Technical resistance level")
    limit_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # Mode 4: Buy-to-Close (BTC) on Losing Propositions
    btc_parser = subparsers.add_parser("btc", help="Calculate Buy-to-Close order pricing on losing propositions / broken theses")
    btc_parser.add_argument("--symbol", type=str, required=True, help="Stock ticker symbol")
    btc_parser.add_argument("--type", choices=["put", "call"], default="put", help="Option type (put or call)")
    btc_parser.add_argument("--strike", type=float, required=True, help="Option strike price")
    btc_parser.add_argument("--current-mark", type=float, required=True, help="Current option mark/ask price per share")
    btc_parser.add_argument("--contracts", type=int, default=1, help="Number of contracts to close")
    btc_parser.add_argument("--reason", type=str, default="Thesis invalidation / downside avoidance", help="Strategic rationale")
    btc_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "option":
        t_years = args.dte / 365.0
        greeks = black_scholes(args.stock_price, args.strike, t_years, args.rate, args.iv, args.type)
        premium = greeks["price"]
        aroc = calculate_aroc(premium, args.strike, args.dte)
        is_csp_valid = args.type == "put" and (-0.35 <= greeks["delta"] <= -0.12) and aroc >= 12.0
        is_cc_valid = args.type == "call" and (0.15 <= greeks["delta"] <= 0.38)

        output = {
            "symbol": args.symbol.upper(),
            "type": args.type.upper(),
            "stock_price": args.stock_price,
            "strike": args.strike,
            "dte": args.dte,
            "iv": args.iv,
            "theoretical_price": premium,
            "delta": greeks["delta"],
            "theta_daily": greeks["theta_daily"],
            "gamma": greeks["gamma"],
            "vega": greeks["vega"],
            "aroc_pct": aroc,
            "recommended_limit_price": premium,
            "meets_csp_criteria": is_csp_valid if args.type == "put" else False,
            "meets_cc_criteria": is_cc_valid if args.type == "call" else False
        }

        if args.json:
            print(json.dumps(output, indent=2))
            return

        print("=" * 70)
        print(f"PRICING AGENT: {output['symbol']} {output['type']} PRICING MODEL")
        print("=" * 70)
        print(f"Underlying Price:     ${args.stock_price:.2f}")
        print(f"Strike Price:         ${args.strike:.2f} ({args.dte} DTE, IV: {args.iv*100:.1f}%)")
        print(f"Theoretical Premium:  ${premium:.2f} per share (${premium*100:.2f} per contract)")
        print(f"Greeks:               Delta: {greeks['delta']} | Daily Theta: ${greeks['theta_daily']:.3f} | Gamma: {greeks['gamma']}")
        print(f"Annualized ROC (AROC):{aroc:.2f}% (Target: >= 12% - 18%)")
        print(f"Suggested Limit Order:SELL TO OPEN limit @ ${premium:.2f}")
        print("=" * 70)

    elif args.command == "roll":
        net_credit = args.open_credit - args.close_cost
        total_net_credit = net_credit * 100 * args.contracts
        is_valid = net_credit > 0.0

        output = {
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
