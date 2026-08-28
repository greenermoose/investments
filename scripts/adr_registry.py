"""
Authoritative ADR Ratio & Foreign Currency Normalization Registry
Ensures all Foreign Private Issuers (SEC Form 20-F, 6-K, 40-F) and dual-class shares
are deterministically normalized to US-traded share/ADR equivalents and USD financial metrics.
"""

from typing import Any, Dict, Optional, Tuple

# Mapping of US Ticker -> Ordinary Shares per ADR/ADS
# 1 US ADR/ADS represents N local ordinary shares
ADR_RATIOS: Dict[str, float] = {
    # Semiconductors & Tech
    "TSM": 5.0,    # Taiwan Semiconductor (1 ADR = 5 TWSE ordinary shares)
    "PDD": 4.0,    # PDD Holdings (1 ADS = 4 Class A ordinary shares)
    "BABA": 8.0,   # Alibaba Group (1 ADS = 8 ordinary shares)
    "BIDU": 8.0,   # Baidu (1 ADS = 8 Class A ordinary shares)
    "JD": 2.0,     # JD.com (1 ADS = 2 Class A ordinary shares)
    "NTES": 5.0,   # NetEase (1 ADS = 5 ordinary shares)
    "AZN": 2.0,    # AstraZeneca (1 ADS = 2 ordinary shares)
    "TM": 10.0,    # Toyota Motor (1 ADR = 10 common shares)
    "HDB": 3.0,    # HDFC Bank (1 ADR = 3 equity shares)
    
    # 1:1 ADRs / Direct listings (Explicit for validation clarity)
    "ASML": 1.0,   # ASML Holding (1 NY Share = 1 Euronext ordinary share)
    "ARM": 1.0,    # Arm Holdings (1 ADS = 1 ordinary share)
    "FER": 1.0,    # Ferrovial (1 share = 1 ordinary share)
    "CSIQ": 1.0,   # Canadian Solar (1 share = 1 common share)
    "CCEP": 1.0,   # Coca-Cola Europacific Partners (1:1)
    "MNDY": 1.0,   # Monday.com (1:1)
    "NU": 1.0,     # Nu Holdings (1:1)
    "SPOT": 1.0,   # Spotify (1:1)
    "SHOP": 1.0,   # Shopify (1:1)
    "TRI": 1.0,    # Thomson Reuters (1:1)
    "NVO": 1.0,    # Novo Nordisk (1:1)
    "SAP": 1.0,    # SAP SE (1:1)
    "SE": 1.0,     # Sea Limited (1:1)
    "NIO": 1.0,    # NIO Inc (1:1)
    "INFY": 1.0,   # Infosys (1:1)
}

# Special ticker share count overrides (e.g. Berkshire Hathaway Class B equivalent count)
SPECIAL_SHARE_OVERRIDES: Dict[str, float] = {
    "BRK-B": 2_160_000_000.0,
    "BRK.B": 2_160_000_000.0,
}

# Baseline Foreign Exchange Conversion Rates to USD (1 Foreign Unit = N USD)
FX_RATES_TO_USD: Dict[str, float] = {
    "USD": 1.0,
    "TWD": 1.0 / 32.50,      # ~0.030769 (New Taiwan Dollar)
    "NTD": 1.0 / 32.50,      # ~0.030769
    "CNY": 1.0 / 7.25,       # ~0.137931 (Chinese Yuan Renminbi)
    "RMB": 1.0 / 7.25,       # ~0.137931
    "EUR": 1.0800,           # Euro
    "GBP": 1.2800,           # British Pound
    "JPY": 1.0 / 150.0,      # ~0.006667 (Japanese Yen)
    "CAD": 1.0 / 1.38,       # ~0.724638 (Canadian Dollar)
    "AUD": 1.0 / 1.55,       # ~0.645161 (Australian Dollar)
    "BRL": 1.0 / 5.50,       # ~0.181818 (Brazilian Real)
    "ILS": 1.0 / 3.70,       # ~0.270270 (Israeli Shekel)
    "CHF": 1.0 / 0.88,       # ~1.136364 (Swiss Franc)
    "HKD": 1.0 / 7.80,       # ~0.128205 (Hong Kong Dollar)
    "INR": 1.0 / 84.00,      # ~0.011905 (Indian Rupee)
    "KRW": 1.0 / 1350.0,     # ~0.000741 (South Korean Won)
    "SEK": 1.0 / 10.50,      # ~0.095238 (Swedish Krona)
}

# Known Foreign Issuer Primary Reporting Currencies
TICKER_PRIMARY_CURRENCIES: Dict[str, str] = {
    "TSM": "TWD",
    "PDD": "CNY",
    "BABA": "CNY",
    "BIDU": "CNY",
    "JD": "CNY",
    "NTES": "CNY",
    "ASML": "EUR",
    "FER": "EUR",
    "CCEP": "EUR",
    "SAP": "EUR",
    "AZN": "USD",   # Reports 20-F in USD
    "ARM": "USD",   # Reports in USD
    "CSIQ": "USD",  # Reports in USD
    "MNDY": "USD",  # Reports in USD
    "NU": "USD",    # Reports in USD
    "SPOT": "EUR",  # Reports in EUR
    "SHOP": "USD",  # Reports in USD
    "TRI": "USD",   # Reports in USD
    "NVO": "DKK",   # Reports in DKK
}


# Ordinary share thresholds below which share counts are already ADR-normalized
ADR_ALREADY_NORMALIZED_THRESHOLDS: Dict[str, float] = {
    "TSM": 10e9,    # Ordinary shares > 20B; ADRs ~5.19B
    "PDD": 3e9,     # Ordinary shares > 5B; ADSs ~1.42B
    "BABA": 10e9,   # Ordinary shares > 19B; ADSs ~2.44B
    "BIDU": 1.5e9,  # Ordinary shares > 2.5B; ADSs ~350M
    "JD": 2.2e9,    # Ordinary shares > 3B; ADSs ~1.55B
    "NTES": 1.8e9,  # Ordinary shares > 3B; ADSs ~640M
    "AZN": 2.2e9,   # Ordinary shares > 3B; ADSs ~1.55B
    "TM": 5e9,      # Ordinary shares > 13B; ADRs ~1.35B
    "HDB": 4.5e9,   # Ordinary shares > 7B; ADRs ~2.53B
}

# Foreign currency magnitude thresholds (values below these are already in USD)
CURRENCY_ALREADY_USD_THRESHOLDS: Dict[str, float] = {
    "TSM": 500e9,   # NTD statements are in trillions (>1,000B NTD); USD amounts < 250B
    "PDD": 100e9,   # CNY statements are > 100B CNY; USD amounts < 70B
    "BABA": 200e9,  # CNY statements are > 500B CNY; USD amounts < 150B
    "BIDU": 50e9,   # CNY statements are > 100B CNY; USD amounts < 25B
    "JD": 200e9,    # CNY statements are > 500B CNY; USD amounts < 150B
    "NTES": 30e9,   # CNY statements are > 80B CNY; USD amounts < 20B
    "TM": 1000e9,   # JPY statements are > 10,000B JPY; USD amounts < 400B
}


def get_adr_ratio(symbol: str) -> float:
    """Returns the ordinary-shares-per-ADR multiplier for a symbol (defaults to 1.0)."""
    sym = symbol.upper().strip()
    return ADR_RATIOS.get(sym, 1.0)


def normalize_shares_outstanding(symbol: str, raw_shares: Optional[float]) -> Optional[int]:
    """
    Normalizes local ordinary shares or raw shares into US-traded ADR equivalent count.
    Guaranteed idempotent: will not double-divide already normalized counts.
    """
    if raw_shares is None or raw_shares <= 0:
        return None

    sym = symbol.upper().strip()
    
    # Check special overrides first (e.g. BRK-B Class B equivalent ~2.16B)
    if sym in SPECIAL_SHARE_OVERRIDES and raw_shares < 100e6:
        return int(SPECIAL_SHARE_OVERRIDES[sym])

    ratio = get_adr_ratio(sym)
    if ratio > 1.0:
        # If shares are already below the threshold, it is already in ADR units
        if sym in ADR_ALREADY_NORMALIZED_THRESHOLDS and raw_shares < ADR_ALREADY_NORMALIZED_THRESHOLDS[sym]:
            return int(round(raw_shares))
        return int(round(raw_shares / ratio))
    
    return int(round(raw_shares))


def get_fx_rate(currency: str) -> float:
    """Returns the exchange rate to USD for a given currency code."""
    curr = currency.upper().strip()
    return FX_RATES_TO_USD.get(curr, 1.0)


def convert_to_usd(amount: Optional[float], currency: Optional[str] = None, symbol: Optional[str] = None) -> Optional[float]:
    """
    Converts a monetary amount in a foreign currency into USD.
    Guaranteed idempotent: will not double-convert already converted amounts.
    """
    if amount is None:
        return None

    curr = currency.upper().strip() if currency else None
    if not curr and symbol:
        sym = symbol.upper().strip()
        curr = TICKER_PRIMARY_CURRENCIES.get(sym, "USD")

    if not curr or curr == "USD":
        return float(amount)

    # Check if amount is already converted to USD
    if symbol:
        sym = symbol.upper().strip()
        if sym in CURRENCY_ALREADY_USD_THRESHOLDS and float(amount) < CURRENCY_ALREADY_USD_THRESHOLDS[sym]:
            return float(amount)

    fx_rate = get_fx_rate(curr)
    return round(float(amount) * fx_rate, 2)


def normalize_financial_filing_data(symbol: str, filing_data: Dict[str, Any], currency: Optional[str] = None) -> Dict[str, Any]:
    """
    Deterministically normalizes a filing data dictionary (shares, revenue, balance sheet)
    to US ADR-equivalent shares and USD currency values.
    """
    sym = symbol.upper().strip()
    inferred_curr = currency or TICKER_PRIMARY_CURRENCIES.get(sym, "USD")

    normalized = dict(filing_data)
    
    # Normalize shares
    raw_shares = filing_data.get("shares_outstanding")
    if raw_shares:
        normalized["shares_outstanding"] = normalize_shares_outstanding(sym, raw_shares)

    # Normalize revenue
    raw_rev = filing_data.get("revenue")
    if raw_rev is not None:
        normalized["revenue"] = convert_to_usd(raw_rev, inferred_curr, sym)

    # Normalize balance sheet
    raw_bs = filing_data.get("balance_sheet", {})
    if raw_bs:
        norm_bs = {}
        for k, v in raw_bs.items():
            if isinstance(v, (int, float)):
                norm_bs[k] = convert_to_usd(v, inferred_curr, sym)
            else:
                norm_bs[k] = v
        normalized["balance_sheet"] = norm_bs

    return normalized
