"""
Update Company Descriptions
Applies authoritative, concise 1-2 sentence descriptions to the 30 newly onboarded universe equities
in scripts/data/company_meta.json.
"""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
META_FILE = ROOT_DIR / "scripts" / "data" / "company_meta.json"

DESCRIPTIONS = {
    "AAPL": "Designs, manufactures, and markets consumer electronics (iPhone, Mac, iPad, Watch) and high-margin services (App Store, Apple Pay, iCloud).",
    "ABBV": "Global research-based biopharmaceutical company developing advanced therapies in immunology (Skyrizi, Rinvoq), oncology, and neuroscience.",
    "ABT": "Diversified healthcare leader developing medical devices (FreeStyle Libre), diagnostic systems, pediatric and adult nutritionals, and branded generic medicines.",
    "ANET": "Provides high-performance, cognitive cloud and AI networking switches and EOS software for hyperscale data centers and enterprise campuses.",
    "APH": "Designs and manufactures electrical, electronic, and fiber optic connectors, specialty interconnect systems, and coaxial cables across diversified end markets.",
    "BLK": "World's largest asset manager providing institutional and retail investment products (iShares ETFs), risk management, and enterprise technology (Aladdin).",
    "BSX": "Global medical technology manufacturer developing minimally invasive devices for interventional cardiology, electrophysiology (FARAPULSE), and endoscopy.",
    "CAVA": "Category-defining fast-casual Mediterranean restaurant chain serving customizable bowls, pitas, and dips alongside retail packaged goods.",
    "DE": "World's leading manufacturer of agricultural, construction, and forestry equipment, precision ag technologies, and diesel power engines.",
    "DHR": "Global life sciences and diagnostics innovator designing bioprocessing tools, filtration systems, and medical diagnostics instruments.",
    "DUOL": "Leading mobile learning platform and top-grossing education app providing gamified language, math, and literacy learning alongside the Duolingo English Test.",
    "ETN": "Global intelligent power management company providing electrical distribution equipment, grid modernization systems, and aerospace components.",
    "GE": "World-class aerospace propulsion leader designing, manufacturing, and servicing commercial and military jet engines (LEAP, GE9X) and integrated aircraft systems.",
    "LLY": "Global pharmaceutical leader discovering and commercializing breakthrough therapies across cardiometabolic health (Mounjaro, Zepbound), oncology, and immunology.",
    "LMT": "World's largest defense prime contractor specializing in advanced aerospace (F-35 Lightning II), precision missiles, hypersonics, and tactical rotorcraft.",
    "MDB": "Developer-centric general purpose data platform providing MongoDB Atlas, a multi-cloud document database for modern web, mobile, and AI applications.",
    "MS": "Premier global financial services firm providing wealth management, institutional securities trading, investment banking, and asset management.",
    "MSFT": "Global technology leader providing enterprise cloud infrastructure (Azure), productivity software (Microsoft 365, Teams), LinkedIn, and AI copilot services.",
    "NET": "Global cloud connectivity and cybersecurity platform providing CDN, DDoS mitigation, Zero Trust network access, and edge computing (Cloudflare Workers).",
    "ORCL": "Enterprise technology provider offering Oracle Cloud Infrastructure (OCI), Autonomous Database platforms, and cloud ERP/HCM application suites (Fusion, NetSuite).",
    "PANW": "World's leading pure-play cybersecurity provider offering next-generation firewalls (Strata), Prisma Cloud security, and Cortex AI SecOps platforms.",
    "SNOW": "Cloud Data Cloud platform enabling enterprise data warehousing, data lakes, secure data sharing, and AI application development across multi-cloud environments.",
    "SPGI": "Premier financial information provider delivering independent credit ratings, index benchmarks (S&P 500, Dow Jones), and essential market intelligence.",
    "SYK": "Global medical technology leader providing orthopedic joint replacement implants, Mako robotic-arm surgical systems, and surgical equipment.",
    "TMO": "World leader in serving science, supplying analytical instruments, life science reagents, biopharma contract manufacturing (PPD), and specialty diagnostics.",
    "TSM": "World's largest dedicated semiconductor foundry, manufacturing advanced silicon (3nm, 2nm, CoWoS packaging) for leading global chip designers.",
    "TTD": "Independent cloud-based demand-side programmatic advertising platform empowering ad buyers to optimize campaigns across Connected TV, audio, and web.",
    "UBER": "Global mobility and logistics platform connecting consumers with on-demand rides, food and grocery delivery (Uber Eats), and enterprise freight services.",
    "UNP": "North America's premier transcontinental freight railroad operating over 32,000 route miles connecting 23 western US states, Pacific ports, and Mexican gateways.",
    "VRT": "Global leader in critical digital infrastructure, designing power management, precision liquid cooling, and thermal management for AI data centers."
}

def update_descriptions():
    with open(META_FILE, "r", encoding="utf-8") as f:
        meta = json.load(f)

    updated_count = 0
    for sym, desc in DESCRIPTIONS.items():
        if sym in meta:
            meta[sym]["description"] = desc
            updated_count += 1
        else:
            print(f"Warning: {sym} not found in {META_FILE}")

    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Successfully updated descriptions for {updated_count} equities in company_meta.json.")

if __name__ == "__main__":
    update_descriptions()
