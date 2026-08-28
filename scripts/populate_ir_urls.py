import json
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
scripts_data_dir = os.path.join(root_dir, "scripts", "data")
http_data_dir = os.path.join(root_dir, "http", "data")
context_equities_dir = os.path.join(root_dir, "context", "data", "equities")

# Authoritative IR URLs for Universe Tickers
IR_URLS = {
    "AAPL": "https://investor.apple.com/",
    "ABNB": "https://investors.airbnb.com/",
    "ADBE": "https://www.adobe.com/investor-relations.html",
    "ADI": "https://investor.analog.com/",
    "ADP": "https://investors.adp.com/",
    "ADSK": "https://investors.autodesk.com/",
    "AEP": "https://www.aep.com/investors/",
    "ALNY": "https://investors.alnylam.com/",
    "AMAT": "https://ir.appliedmaterials.com/",
    "AMD": "https://ir.amd.com/",
    "AMGN": "https://investors.amgen.com/",
    "AMZN": "https://ir.aboutamazon.com/",
    "APP": "https://investors.applovin.com/",
    "ARM": "https://investors.arm.com/",
    "ASML": "https://www.asml.com/en/investors",
    "AVGO": "https://investors.broadcom.com/",
    "AXON": "https://investor.axon.com/",
    "AXP": "https://ir.americanexpress.com/",
    "BA": "https://investors.boeing.com/",
    "BAM": "https://bam.brookfield.com/investor-relations",
    "BEAM": "https://investors.beamtx.com/",
    "BETA": "https://investors.beta.team/",
    "BKNG": "https://ir.bookingholdings.com/",
    "BKR": "https://investors.bakerhughes.com/",
    "BRK-B": "https://www.berkshirehathaway.com/",
    "CAT": "https://investors.caterpillar.com/",
    "CCEP": "https://www.cocacolaep.com/investors/",
    "CDNS": "https://investor.cadence.com/",
    "CEG": "https://investors.constellationenergy.com/",
    "CHTR": "https://ir.charter.com/",
    "CMCSA": "https://www.cmcsa.com/",
    "COST": "https://investor.costco.com/",
    "CPRT": "https://www.copart.com/investorrelations/",
    "CRM": "https://investor.salesforce.com/",
    "CRSP": "https://crisprtx.gcs-web.com/",
    "CRWD": "https://ir.crowdstrike.com/",
    "CSCO": "https://investor.cisco.com/",
    "CSGP": "https://investors.costargroup.com/",
    "CSIQ": "https://investors.canadiansolar.com/",
    "CSX": "https://investors.csx.com/",
    "CTAS": "https://www.cintas.com/investors/",
    "CTSH": "https://investors.cognizant.com/",
    "CVX": "https://www.chevron.com/investors",
    "DASH": "https://ir.doordash.com/",
    "DDOG": "https://investors.datadoghq.com/",
    "DIS": "https://thewaltdisneycompany.com/investor-relations/",
    "DXCM": "https://investors.dexcom.com/",
    "EA": "https://ir.ea.com/",
    "EDIT": "https://ir.editasmedicine.com/",
    "ENPH": "https://investor.enphase.com/",
    "ENVX": "https://ir.enovix.com/",
    "EOSE": "https://investors.eose.com/",
    "EXC": "https://investors.exeloncorp.com/",
    "FANG": "https://ir.diamondbackenergy.com/",
    "FAST": "https://investor.fastenal.com/",
    "FER": "https://www.ferrovial.com/en/ir/",
    "FTNT": "https://investor.fortinet.com/",
    "GEHC": "https://investor.gehealthcare.com/",
    "GILD": "https://investors.gilead.com/",
    "GNRC": "https://investors.generac.com/",
    "GOOG": "https://abc.xyz/investor/",
    "GOOGL": "https://abc.xyz/investor/",
    "GS": "https://www.goldmansachs.com/investor-relations/",
    "GWH": "https://investors.essinc.com/",
    "HD": "https://ir.homedepot.com/",
    "HON": "https://investor.honeywell.com/",
    "IBM": "https://www.ibm.com/investor",
    "IDXX": "https://ir.idexx.com/",
    "INSM": "https://investor.insmed.com/",
    "INTC": "https://www.intc.com/",
    "INTU": "https://investors.intuit.com/",
    "ISRG": "https://isrg.intuitive.com/",
    "JNJ": "https://investor.jnj.com/",
    "JPM": "https://www.jpmorganchase.com/ir",
    "KDP": "https://investors.keurigdrpepper.com/",
    "KHC": "https://ir.kraftheinzcompany.com/",
    "KLAC": "https://ir.kla.com/",
    "KO": "https://investors.coca-colacompany.com/",
    "LIN": "https://www.linde.com/investors",
    "LRCX": "https://investor.lamresearch.com/",
    "MA": "https://investor.mastercard.com/",
    "MAR": "https://marriott.gcs-web.com/",
    "MCD": "https://corporate.mcdonalds.com/corpmcd/investors.html",
    "MCHP": "https://ir.microchip.com/",
    "MDLZ": "https://ir.mondelezinternational.com/",
    "MELI": "https://investor.mercadolibre.com/",
    "META": "https://investor.atmeta.com/",
    "MMM": "https://investors.3m.com/",
    "MNST": "https://investors.monsterbevcorp.com/",
    "MPWR": "https://ir.monolithicpower.com/",
    "MRK": "https://www.merck.com/investor-relations/",
    "MRVL": "https://investor.marvell.com/",
    "MSFT": "https://www.microsoft.com/en-us/investor",
    "MSTR": "https://www.microstrategy.com/investor-relations",
    "MU": "https://investors.micron.com/",
    "NFLX": "https://ir.netflix.net/",
    "NKE": "https://investors.nike.com/",
    "NRGV": "https://investors.energyvault.com/",
    "NTLA": "https://ir.intelliatx.com/",
    "NVDA": "https://investor.nvidia.com/",
    "NXPI": "https://investors.nxp.com/",
    "ODFL": "https://ir.odfl.com/",
    "ORLY": "https://corporate.oreillyauto.com/investor-relations",
    "PANW": "https://investors.paloaltonetworks.com/",
    "PAYX": "https://investor.paychex.com/",
    "PCAR": "https://www.paccar.com/investors/",
    "PDD": "https://investor.pddholdings.com/",
    "PEP": "https://investors.pepsico.com/",
    "PG": "https://www.pginvestor.com/",
    "PLTR": "https://investors.palantir.com/",
    "PYPL": "https://investor.pypl.com/",
    "QCOM": "https://investor.qualcomm.com/",
    "REGN": "https://investor.regeneron.com/",
    "ROP": "https://investors.ropertech.com/",
    "ROST": "https://investors.rossstores.com/",
    "SBUX": "https://investor.starbucks.com/",
    "SEDG": "https://investors.solaredge.com/",
    "SHOP": "https://investors.shopify.com/",
    "SHW": "https://investors.sherwin-williams.com/",
    "SLDP": "https://ir.solidpowerbattery.com/",
    "SNPS": "https://investor.synopsys.com/",
    "STOK": "https://investor.stoketherapeutics.com/",
    "STX": "https://investors.seagate.com/",
    "TDOC": "https://ir.teladochealth.com/",
    "TEAM": "https://investors.atlassian.com/",
    "TMUS": "https://investor.t-mobile.com/",
    "TRI": "https://ir.thomsonreuters.com/",
    "TRV": "https://investor.travelers.com/",
    "TSLA": "https://ir.tesla.com/",
    "TTWO": "https://www.take2games.com/ir",
    "TXN": "https://investor.ti.com/",
    "UNH": "https://www.unitedhealthgroup.com/investors.html",
    "V": "https://investor.visa.com/",
    "VRSK": "https://investor.verisk.com/",
    "VRTX": "https://investors.vrtx.com/",
    "VZ": "https://www.verizon.com/about/investors",
    "WBD": "https://ir.wbd.com/",
    "WDAY": "https://investor.workday.com/",
    "WDC": "https://investor.wdc.com/",
    "WMT": "https://stock.walmart.com/",
    "XEL": "https://investors.xcelenergy.com/",
    "ZM": "https://investors.zoom.us/",
    "ZS": "https://ir.zscaler.com/",
    "LLY": "https://investor.lilly.com/",
    "TSM": "https://investor.tsmc.com/",
    "ORCL": "https://investor.oracle.com/",
    "UBER": "https://investor.uber.com/",
    "ANET": "https://investors.arista.com/",
    "GE": "https://www.geaerospace.com/investor-relations",
    "ETN": "https://www.eaton.com/us/en-us/company/investor-relations.html",
    "APH": "https://investors.amphenol.com/",
    "TTD": "https://investors.thetradedesk.com/",
    "NET": "https://cloudflare.net/",
    "MDB": "https://investors.mongodb.com/",
    "SNOW": "https://investors.snowflake.com/",
    "VRT": "https://investors.vertiv.com/",
    "BSX": "https://investors.bostonscientific.com/",
    "SYK": "https://investors.stryker.com/",
    "DHR": "https://investors.danaher.com/",
    "TMO": "https://ir.thermofisher.com/",
    "ABT": "https://www.abbottinvestor.com/",
    "ABBV": "https://investors.abbvie.com/",
    "SPGI": "https://investor.spglobal.com/",
    "BLK": "https://ir.blackrock.com/",
    "MS": "https://www.morganstanley.com/about-us-ir",
    "DE": "https://investor.deere.com/",
    "UNP": "https://www.up.com/investor",
    "LMT": "https://investors.lockheedmartin.com/",
    "NOW": "https://investor.servicenow.com/",
    "VEEV": "https://ir.veeva.com/",
    "HUBS": "https://ir.hubspot.com/",
    "DT": "https://ir.dynatrace.com/",
    "GWRE": "https://ir.guidewire.com/",
    "MANH": "https://ir.manh.com/",
    "GTLB": "https://ir.gitlab.com/",
    "TYL": "https://investors.tylertech.com/",
    "ONTO": "https://investors.ontoinnovation.com/",
    "PODD": "https://investor.insulet.com/",
    "RMD": "https://investor.resmed.com/",
    "EW": "https://ir.edwards.com/",
    "ALGN": "https://investor.aligntech.com/",
    "CME": "https://investor.cmegroup.com/",
    "ICE": "https://ir.theice.com/",
    "MCO": "https://ir.moodys.com/",
    "FICO": "https://investors.fico.com/",
    "ACN": "https://investor.accenture.com/",
    "GEV": "https://www.gevernova.com/investors",
    "TDG": "https://www.transdigm.com/investor-relations",
    "HEI": "https://www.heico.com/investor-relations/",
    "PWR": "https://investors.quantaservices.com/",
    "EME": "https://www.emcorgroup.com/investors",
    "URI": "https://investor.unitedrentals.com/",
    "VRSN": "https://investor.verisign.com/"
}

# 1. Update scripts/data/company_meta.json
meta_path = os.path.join(scripts_data_dir, "company_meta.json")
if os.path.exists(meta_path):
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    for sym, url in IR_URLS.items():
        if sym in meta:
            meta[sym]["investor_relations_url"] = url
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("Updated scripts/data/company_meta.json with investor_relations_url")

# 2. Update http/data/<TICKER>.json
for sym, url in IR_URLS.items():
    http_comp_file = os.path.join(http_data_dir, f"{sym}.json")
    if os.path.exists(http_comp_file):
        with open(http_comp_file, "r", encoding="utf-8") as f:
            cdata = json.load(f)
        cdata["investor_relations_url"] = url
        with open(http_comp_file, "w", encoding="utf-8") as f:
            json.dump(cdata, f, indent=2)

print("Updated http/data/<TICKER>.json files")

# 3. Update context/data/equities/<TICKER>.json
if os.path.exists(context_equities_dir):
    for sym, url in IR_URLS.items():
        ctx_comp_file = os.path.join(context_equities_dir, f"{sym}.json")
        if os.path.exists(ctx_comp_file):
            with open(ctx_comp_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            cdata["investor_relations_url"] = url
            with open(ctx_comp_file, "w", encoding="utf-8") as f:
                json.dump(cdata, f, indent=2)
    print("Updated context/data/equities/<TICKER>.json files")
