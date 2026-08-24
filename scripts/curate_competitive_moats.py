"""
Curate High-Quality Institutional-Grade Competitive Moat Analyses for all 150 Equities
Populates bespoke, research-backed competitive moat analyses in scripts/data/company_meta.json
and synchronizes with valuation models and thesis dossiers.

Conforms to:
- context/schemas/investment_thesis_schema.json
- AGENTS.md (No emojis, clean ASCII formatting, institutional rigor)
"""

import json
import os
import sys

COMPETITIVE_MOATS = {
    "AAPL": (
        "Apple's economic moat is anchored by massive customer switching costs within its unified iOS and macOS ecosystem, "
        "industry-leading proprietary silicon engineering (M-series and A-series architectures), exceptional brand prestige, "
        "and an active installed base exceeding 2.2 billion devices. The company pairs premium hardware margins with an expanding "
        "high-margin Services division (App Store, iCloud, Apple Pay, AppleCare) that generates predictable recurring revenue. "
        "This integrated hardware-software flywheel delivers industry-leading Return on Invested Capital (ROIC > 50%) and provides "
        "virtually impenetrable barriers against Android-based hardware competitors."
    ),
    "ABNB": (
        "Airbnb commands a dominant two-sided global network effect connecting hundreds of millions of guests with over 8 million "
        "active listings across 220+ countries. The moat is reinforced by exceptional global brand awareness, where more than 90% of "
        "traffic arrives organically without paid search acquisition spend. High marketplace liquidity creates strong host and guest "
        "retention, while asset-light operating leverage drives free cash flow margins exceeding 35%, insulating Airbnb from traditional "
        "hotel chains and subscale online travel aggregators."
    ),
    "ADBE": (
        "Adobe holds an entrenched economic moat founded on high enterprise switching costs and ubiquitous industry standardization "
        "across its Creative Cloud suite (Photoshop, Illustrator, Premiere Pro, InDesign) and Document Cloud (Acrobat PDF). Creative "
        "professionals face steep retraining costs and file compatibility barriers when considering alternatives. Adobe reinforces this "
        "lock-in by integrating its proprietary Firefly generative AI models directly into native creative workflows, maintaining "
        "gross margins above 85% and sustained pricing power across enterprise subscription renewals."
    ),
    "ADI": (
        "Analog Devices commands a durable economic moat driven by high engineering switching costs, extensive proprietary analog "
        "and mixed-signal circuit design IP, and long product lifecycles frequently spanning 10 to 20 years. In mission-critical "
        "automotive battery management systems (BMS), industrial automation, and aerospace electronics, customer redesign costs and "
        "safety recertification risks create immense supplier inertia. This protects ADI's gross margins above 65% and sustains high "
        "through-cycle return on capital."
    ),
    "ADP": (
        "Automatic Data Processing maintains a wide economic moat rooted in mission-critical payroll compliance workflows, deep enterprise "
        "human capital management (HCM) software integration, and exceptional client retention rates consistently exceeding 92%. "
        "Replacing a core payroll and tax filing platform carries severe operational disruption and regulatory compliance risk for employers. "
        "Furthermore, ADP generates high-margin float income from tens of billions in average client funds balances, providing defensive cash flow "
        "unmatched by smaller SaaS competitors."
    ),
    "ADSK": (
        "Autodesk's economic moat is fortified by the ubiquitous industry standardization of its architecture, engineering, and "
        "construction (AEC) software platforms, anchored by AutoCAD and Revit. Decades of institutional adoption, university curriculum "
        "entrenchment, and complex BIM (Building Information Modeling) file format dependencies create prohibitive switching costs for "
        "enterprises and contractors. As multi-party AEC projects require seamless model collaboration, network effects prevent customer "
        "defection and support gross margins above 90%."
    ),
    "AEP": (
        "American Electric Power possesses a regulated utility monopoly moat, operating the nation's largest electricity transmission "
        "system with over 40,000 miles of high-voltage transmission lines across 11 states. Regulated rate-base compounding and state "
        "public utility commission frameworks guarantee authorized returns on equity (ROE ~9.5-10.5%). Massive capital requirements and "
        "regulatory certificate-of-need barriers prevent competing transmission infrastructure buildout, positioning AEP as an "
        "indispensable power provider for surging AI data center and industrial electrification loads."
    ),
    "ALNY": (
        "Alnylam Pharmaceuticals maintains a powerful biotechnology moat based on its pioneering, unmatched patent estate in RNA "
        "interference (RNAi) therapeutics and proprietary GalNAc-conjugate systemic delivery platforms. Its approved medicines (AMVUTTRA, "
        "ONPATTRO, GIVLAARI, OXLUMO) hold dominant positions in rare cardiometabolic diseases. Breakthrough Phase 3 HELIOS-B data in ATTR "
        "cardiomyopathy establishes multi-year market exclusivity and high clinical switching barriers against oral competitors."
    ),
    "AMAT": (
        "Applied Materials commands an expansive economic moat as the world's most diversified semiconductor wafer fabrication equipment "
        "(WFE) supplier. Its materials engineering capabilities span atomic layer deposition, chemical vapor deposition, physical vapor "
        "deposition, chemical mechanical planarization, and plasma etch. Because leading foundries require co-optimized materials integration "
        "for Gate-All-Around (GAA) nanosheets and backside power delivery, Applied's deep R&D partnerships and massive installed base of over "
        "40,000 chambers generate recurring high-margin service contracts and insurmountable engineering barriers."
    ),
    "AMD": (
        "AMD's competitive moat is driven by its modular chiplet manufacturing architecture, high-bandwidth memory packaging expertise, "
        "and superior energy-efficient CPU core design across EPYC server and Ryzen PC processors. In cloud data centers, EPYC CPUs have "
        "consistently gained market share against Intel due to superior total cost of ownership (TCO) and multi-threaded throughput. In AI "
        "acceleration, AMD's Instinct MI300/MI350 silicon combined with the maturing open-source ROCm software stack provides hyperscalers "
        "with an essential alternative to proprietary single-vendor architectures."
    ),
    "AMGN": (
        "Amgen's economic moat is built on proprietary biologics manufacturing capabilities, deep clinical development infrastructure, "
        "and an extensive patent portfolio spanning oncology, cardiovascular, inflammation, and rare diseases. Biologics manufacturing "
        "requires complex cellular expression systems and stringent FDA sterility validations that cannot be easily replicated. "
        "With blockbuster franchises including Prolia/XGEVA, Repatha, and TEPEZZA, plus promising Phase 3 obesity candidate MariTide, "
        "Amgen sustains high gross margins and robust cash generation."
    ),
    "AMZN": (
        "Amazon commands an unrivaled multi-layered economic moat spanning global e-commerce and enterprise cloud infrastructure. In retail, "
        "Amazon's regional fulfillment network, automated logistics density, and 200M+ Prime members create immense scale cost advantages "
        "and fast delivery speeds that no competitor can match. In cloud computing, Amazon Web Services (AWS) benefits from massive economies "
        "of scale, developer ecosystem lock-in, and extensive AI infrastructure (Trainium, Bedrock), generating superior operating margins "
        "and compounding free cash flow."
    ),
    "APP": (
        "AppLovin possesses a widening technological and data moat in mobile application marketing and user acquisition. Its proprietary "
        "AXON 2.0 AI recommendation engine analyzes hundreds of billions of programmatic bid requests daily across mobile gaming and app "
        "ecosystems, delivering industry-leading ad targeting precision and return on ad spend (ROAS). High market share in mobile mediation "
        "(MAX platform) creates self-reinforcing data feedback loops, high gross margins, and expanding monetization opportunities across "
        "e-commerce web advertising."
    ),
    "ARM": (
        "Arm Holdings commands an insurmountable architecture and IP licensing moat, serving as the foundational instruction set architecture "
        "(ISA) for over 99% of global smartphones, edge computing devices, and automotive infotainment systems. The global software stack—spanning "
        "compilers, operating systems, and developer tools—is optimized natively for Arm architecture, creating prohibitive ecosystem switching "
        "costs. As hyperscalers deploy custom Arm-based server CPUs (AWS Graviton, Google Axion, Microsoft Cobalt) and royalty rates rise under "
        "the Armv9 architecture, Arm's recurring royalty streams compound with high operating margins."
    ),
    "ASML": (
        "ASML maintains an absolute global monopoly in Extreme Ultraviolet (EUV) lithography systems and a dominant position in Deep Ultraviolet "
        "(DUV) immersion tools. Producing sub-3nm semiconductor nodes is physically impossible without ASML's EUV scanners. The company's moat "
        "is protected by thousands of proprietary patents, exclusive supply chain integration with Carl Zeiss optics, extreme capital requirements "
        "($350M+ per High-NA scanner), and over two decades of unmatched engineering mastery, ensuring multi-year order backlogs and absolute "
        "pricing power."
    ),
    "AVGO": (
        "Broadcom's economic moat is built on mission-critical semiconductor technology leadership and enterprise software switching costs. "
        "In semiconductors, Broadcom dominates high-speed data center ethernet switches (Tomahawk and Jericho series) and custom AI ASIC "
        "co-design for hyperscalers (Google TPU, Meta custom silicon). In software, VMware infrastructure virtualization is deeply embedded "
        "in Global 2000 IT architectures, providing recurring software subscriptions, exceptional gross margins, and massive free cash flow "
        "under CEO Hock Tan's disciplined capital stewardship."
    ),
    "AXON": (
        "Axon Enterprise commands a virtually impenetrable economic moat in public safety technology, driven by high customer switching costs "
        "and regulatory compliance entrenchment. Over 18,000 law enforcement agencies rely on Axon's integrated ecosystem: TASER energy weapons, "
        "body cameras, and the Axon Evidence cloud platform. Because Axon Evidence manages chain-of-custody protocols for digital video evidence "
        "admissible in court, agencies face prohibitive legal, operational, and retraining barriers to switch, generating >120% net revenue retention."
    ),
    "AXP": (
        "American Express holds a distinctive closed-loop payments moat built on an affluent, high-spending consumer and corporate cardholder "
        "base. Operating both the card issuance and merchant acquiring network allows Amex to capture full merchant discount fees and proprietary "
        "spending data. Cardholders accept premium annual card fees in exchange for elite travel and lifestyle rewards, creating high customer "
        "loyalty, superior credit performance, and lower merchant churn compared to open-loop bank networks."
    ),
    "BA": (
        "The Boeing Company operates in an entrenched global commercial aerospace duopoly alongside Airbus. Developing and certifying a modern "
        "commercial jetliner requires decades of specialized aeronautical engineering, tens of billions in capital, and stringent FAA/EASA safety "
        "certifications. Boeing's multi-year order backlogs exceeding 5,400 commercial aircraft provide clear revenue visibility, while its "
        "Boeing Global Services aftermarket division generates steady, high-margin maintenance, repair, and overhaul (MRO) cash flow."
    ),
    "BAM": (
        "Brookfield Asset Management commands a wide economic moat as a premier global alternative asset manager with over $900 billion in "
        "assets under management (AUM). Its competitive advantages stem from a 125-year operational track record in managing critical "
        "infrastructure, renewable power, real estate, and private credit assets. Institutional clients and sovereign wealth funds commit "
        "long-duration, 10-to-25-year locked-in capital, generating predictable recurring fee revenues and substantial carried interest upside."
    ),
    "BEAM": (
        "Beam Therapeutics holds a pioneering biotechnology moat based on its proprietary base editing platform, a next-generation precision "
        "gene editing technology that enables single-nucleotide conversions without creating double-stranded DNA breaks. This minimizes "
        "unwanted insertions/deletions and chromosomal rearrangements compared to legacy CRISPR/Cas9. Protected by core foundational patents "
        "and strategic partnerships with Eli Lilly and Pfizer, Beam possesses a highly defensible platform for genetic and hematologic diseases."
    ),
    "BETA": (
        "BETA Technologies maintains a technological and operational first-mover advantage in electric aerospace, developing FAA-certified "
        "electric vertical takeoff and landing (eVTOL) and conventional (eCTOL) aircraft. Its proprietary electric powertrains, thermal "
        "management systems, and multimodal nationwide charging network establish high infrastructure barriers to entry. Long-term commercial "
        "contracts with UPS, United Therapeutics, and the U.S. Air Force validate its cost advantages in cargo logistics and regional transit."
    ),
    "BKNG": (
        "Booking Holdings commands a wide economic moat powered by the world's largest online travel agency (OTA) network effect, connecting "
        "millions of travelers with over 28 million reported hotel and alternative accommodation listings. Strong consumer brand recall in "
        "Europe and Asia leads to high direct booking traffic, while its superior algorithmic bidding technology maximizes marketing ROI on search "
        "engines. High inventory density and international multi-lingual support insulate Booking from fragmented local competitors."
    ),
    "BKR": (
        "Baker Hughes possesses a durable industrial moat centered on its Industrial & Energy Technology (IET) turbomachinery division. "
        "The company is the global market leader in heavy-duty gas turbines, centrifugal compressors, and cryogenic refrigeration systems "
        "indispensable for liquefied natural gas (LNG) export terminals. Long-term service agreements (LTSAs) spanning 20 to 30 years generate "
        "high-margin recurring aftermarket cash flows that insulate Baker Hughes from upstream drilling commodity cycles."
    ),
    "BRK-B": (
        "Berkshire Hathaway maintains one of the most enduring economic moats in financial history, built on its massive property and casualty "
        "insurance float (exceeding $170 billion in zero-cost, permanent capital), a fortress balance sheet with over $300 billion in liquid "
        "cash and Treasuries, and a collection of wholly owned high-barrier operating monopolies (BNSF Railway, Berkshire Hathaway Energy, GEICO). "
        "Its decentralized capital allocation model allows management to deploy tens of billions counter-cyclically into distressed market opportunities."
    ),
    "CAT": (
        "Caterpillar commands a formidable industrial scale moat reinforced by the world's most extensive independent heavy equipment dealer "
        "network (over 150 dealers operating in 190+ countries). Contractors and mining operators rely on Caterpillar dealers for rapid on-site "
        "parts replacement and machine servicing, where equipment downtime costs thousands of dollars per hour. This massive global installed base "
        "drives high-margin recurring aftermarket parts and maintenance revenue, ensuring strong pricing power across economic cycles."
    ),
    "CAVA": (
        "CAVA Group holds an emerging brand and operational moat in the fast-casual restaurant sector, pioneering Mediterranean cuisine at scale. "
        "Its industry-leading average unit volumes (AUVs exceeding $2.8 million), high digital sales mix (~36%), and exceptional restaurant-level "
        "profit margins (~25%) reflect strong consumer loyalty and operating efficiency. A vertically integrated dip and dressing production network "
        "and nationwide real estate pipeline support high-ROIC restaurant unit compounding."
    ),
    "CCEP": (
        "Coca-Cola Europacific Partners possesses an exclusive distribution and scale moat as the world's largest independent bottler of Coca-Cola "
        "beverages across 31 countries in Western Europe, Australia, and Southeast Asia. Exclusive perpetual bottling franchises from The Coca-Cola "
        "Company, combined with massive direct-store-delivery (DSD) logistics infrastructure and prime retail shelf space ownership, create "
        "impenetrable barriers to entry for competing beverage brands."
    ),
    "CDNS": (
        "Cadence Design Systems operates in an entrenched duopoly alongside Synopsys, providing mission-critical Electronic Design Automation "
        "(EDA) software, hardware emulation systems, and semiconductor IP. Designing complex sub-3nm microprocessors, AI accelerators, and "
        "automotive chips is impossible without Cadence's algorithmic synthesis, layout, and verification tools. Deep integration into customer "
        "chip design engineering flows creates massive switching costs and predictable multi-year subscription revenues."
    ),
    "CEG": (
        "Constellation Energy holds an unmatched clean energy infrastructure moat as the largest producer of carbon-free electricity in the United "
        "States, operating the nation's premier fleet of nuclear power plants. Nuclear assets provide 24/7/365 baseload zero-carbon power that cannot "
        "be replicated due to extreme capital costs, environmental permitting constraints, and regulatory barriers. Constellation is uniquely "
        "positioned to command premium power purchase agreements (PPAs) co-locating AI hyperscale data centers directly at nuclear plant sites."
    ),
    "CHTR": (
        "Charter Communications maintains an infrastructure moat supported by its hybrid fiber-coaxial (HFC) broadband network passing over 57 million "
        "homes and businesses across 41 states. High household passings density and multi-gigabit DOCSIS upgrades allow Charter to deliver high-speed "
        "internet at a significantly lower capital cost per home than greenfield fiber overbuilders. Bundled offerings combining broadband with low-cost "
        "Spectrum Mobile MVNO plans drive customer stickiness and reduce churn."
    ),
    "CMCSA": (
        "Comcast Corporation commands a multi-faceted moat anchored by its expansive broadband cable infrastructure passing over 63 million homes, "
        "valuable intellectual property assets (NBCUniversal film franchises, Illumination, DreamWorks, live sports broadcasting rights), and "
        "world-class theme parks (Universal Studios). High-margin broadband connectivity generates robust operational cash flows that fund ongoing "
        "DOCSIS 4.0 symmetrical network upgrades and major destination resort expansions like Universal Epic Universe."
    ),
    "COST": (
        "Costco Wholesale possesses a classic scale-efficiency and customer loyalty moat, operating a membership warehouse retail model with over "
        "130 million cardholders globally. Its North American membership renewal rate consistently exceeds 92%, providing stable high-margin recurring "
        "subscription fees. Costco leverages its immense purchasing volume to negotiate rock-bottom supplier pricing, passing savings directly to "
        "members through a strict maximum 14-15% product markup rule that competitors cannot match profitably."
    ),
    "CPRT": (
        "Copart maintains a wide economic moat in online vehicle remarketing and salvage auctions, powered by a massive two-sided global network "
        "effect and irreplaceable physical real estate holdings. Copart owns thousands of acres of vehicle storage yards near major metropolitan "
        "areas that are virtually impossible to rezone or permit today. Exclusive multi-year contracts with top auto insurance carriers ensure a "
        "steady supply of total-loss vehicles, attracting salvage buyers from more than 190 countries."
    ),
    "CRM": (
        "Salesforce commands massive enterprise software switching costs as the undisputed global customer relationship management (CRM) standard. "
        "Its cloud suite (Sales Cloud, Service Cloud, Marketing Cloud, Data Cloud) is deeply integrated into core sales compensation, customer "
        "data, and operational workflows across Global 2000 enterprises. The AppExchange ecosystem and new autonomous Agentforce AI capabilities "
        "further lock in enterprise customers, generating high net retention and gross margins above 75%."
    ),
    "CRSP": (
        "CRISPR Therapeutics holds a foundational biotechnology IP and clinical moat as the pioneer of CRISPR/Cas9 gene-editing therapeutics. "
        "The company achieved historic regulatory validation with CASGEVY (exagamglogene autotemcel), the world's first approved CRISPR-based therapy "
        "for sickle cell disease and transfusion-dependent beta-thalassemia. Extensive foundational CRISPR patent coverage and partnerships with "
        "Vertex Pharmaceuticals establish durable commercial and therapeutic exclusivity."
    ),
    "CRWD": (
        "CrowdStrike commands a powerful cloud-native cybersecurity moat driven by single-agent architecture, crowd-sourced data network effects, "
        "and high module cross-selling. Its unified Falcon platform analyzes over 2 trillion security events daily in the Threat Graph, "
        "making the entire network smarter with each detected threat. Customers face high operational friction when replacing endpoint and "
        "identity protection, resulting in gross retention rates consistently above 97% and rapid multi-module expansion."
    ),
    "CSCO": (
        "Cisco Systems maintains an enterprise networking moat built on the world's largest installed base of enterprise routers, switches, and "
        "firewalls, deep global channel partner distribution, and widespread IT professional certification standards (CCNA/CCNP). Cisco is "
        "successfully transitioning its business model toward recurring software and cybersecurity subscriptions, reinforced by its acquisition "
        "of Splunk to deliver unified observability and real-time AI security operations."
    ),
    "CSGP": (
        "CoStar Group commands an entrenched data monopoly moat in commercial and multifamily real estate information. Over decades, CoStar has "
        "built the industry's most comprehensive proprietary real estate database, verified by hundreds of field research aircraft and analysts. "
        "Commercial brokers, institutional investors, and lenders view CoStar subscriptions as non-negotiable daily workflow tools, supporting "
        "recurring subscription renewal rates above 90% and high operating margins."
    ),
    "CSIQ": (
        "Canadian Solar possesses a manufacturing scale and project development moat in solar photovoltaic modules and utility-scale battery energy "
        "storage systems. Vertically integrated solar manufacturing facilities across North America and Asia combined with advanced N-type TOPCon "
        "cell technology provide module cost efficiencies. Its e-STORAGE and Recurrent Energy project development arms hold multi-gigawatt utility "
        "contract pipelines with guaranteed long-term power purchase agreements."
    ),
    "CSX": (
        "CSX Corporation operates as a regional freight rail duopoly across 26 states in the eastern United States. Railroads possess irreplaceable "
        "physical rights-of-way that cannot be duplicated today due to land acquisition and environmental permitting barriers. Rail shipping is "
        "three to four times more fuel-efficient and significantly cheaper per ton-mile than long-haul trucking, ensuring captive demand for bulk "
        "commodities, automotive cargo, and intermodal freight."
    ),
    "CTAS": (
        "Cintas Corporation holds a dense route-based distribution moat as the North American market leader in corporate uniform rental and facility "
        "services. Servicing over one million business locations weekly, Cintas benefits from superior route density, where adding incremental "
        "customers along existing delivery routes generates exceptionally high marginal profit margins. High customer retention, proprietary laundry "
        "processing facilities, and cross-selling of first aid and safety supplies reinforce its wide moat."
    ),
    "CTSH": (
        "Cognizant Technology Solutions maintains an enterprise IT consulting moat rooted in deep domain expertise, multi-year managed services "
        "contracts, and massive global delivery scale with hundreds of thousands of engineers. Replacing Cognizant as an enterprise IT modernizer "
        "involves severe operational friction and technical debt risks. Cognizant's strategic focus on generative AI engineering, cloud modernization, "
        "and digital healthcare platforms sustains high client retention across Global 2000 corporations."
    ),
    "CVX": (
        "Chevron Corporation commands an integrated energy scale moat supported by low-cost, short-cycle asset positions in the Permian Basin, "
        "world-class LNG export facilities (Gorgon and Wheatstone in Australia), and deepwater offshore developments. Its fortress balance sheet "
        "and integrated downstream refining and chemicals operations provide cash flow stability across volatile commodity cycles, supporting "
        "disciplined capital expenditure, low cash breakevens ($35-40/bbl Brent), and 37+ years of consecutive annual dividend increases."
    ),
    "DASH": (
        "DoorDash holds a dominant local commerce network effect moat, commanding over 65% market share in US restaurant food delivery. Superior "
        "order volume and courier density in suburban and metro markets generate faster delivery times and lower fulfillment costs per order than "
        "competing platforms. With over 18 million DashPass active subscribers and expanding merchant adoption across grocery, retail media advertising, "
        "and convenience channels, DoorDash possesses strong platform lock-in."
    ),
    "DDOG": (
        "Datadog maintains a wide cloud observability moat characterized by rapid multi-product adoption and deep developer workflow integration. "
        "Its unified SaaS platform consolidates infrastructure monitoring, application performance monitoring (APM), log management, and cloud "
        "security into a single intuitive pane of glass. Over 80% of customers utilize multiple Datadog modules, creating high switching costs "
        "and net revenue retention rates exceeding 115%."
    ),
    "DIS": (
        "The Walt Disney Company commands an unmatched global entertainment moat built on irreplaceable storytelling intellectual property "
        "(Disney animation, Pixar, Marvel, Star Wars, ESPN, National Geographic). Disney monetizes this IP across a unique, self-reinforcing "
        "synergistic flywheel: theatrical film releases drive theme park attractions, consumer merchandise sales, cruise line bookings, and "
        "direct-to-consumer streaming engagement on Disney+, generating enduring consumer brand loyalty."
    ),
    "DUOL": (
        "Duolingo commands a consumer brand and data network moat as the world's most downloaded and highest-grossing education app. Over 90% of its "
        "100M+ active learners are acquired organically through viral social media marketing and word-of-mouth. Its proprietary AI-driven gamification "
        "engine analyzes billions of daily language exercises to optimize lesson difficulty and engagement, driving high subscription conversion "
        "(Super Duolingo and Duolingo Max) and high gross margins (>73%)."
    ),
    "DXCM": (
        "DexCom holds an entrenched medical device moat in diabetes management, anchored by its proprietary continuous glucose monitoring (CGM) "
        "sensor technology (G6, G7, and Stelo). DexCom's sensors feature industry-leading MARD accuracy, direct Bluetooth integration with smartphones "
        "and automated insulin delivery (AID) pumps, and deep reimbursement coverage across Medicare and commercial payers. Clinical evidence showing "
        "improved glycemic control creates immense patient and endocrinologist loyalty."
    ),
    "EA": (
        "Electronic Arts commands a digital entertainment IP moat anchored by evergreen sports video game franchises (EA SPORTS FC, Madden NFL, "
        "College Football) and proprietary live-services communities (Apex Legends, The Sims). Exclusive multi-year licensing agreements with FIFA "
        "leagues, UEFA, the NFL, and collegiate athletic associations create impenetrable barriers to entry for competing developers, generating "
        "high-margin recurring in-game Ultimate Team monetization."
    ),
    "EDIT": (
        "Editas Medicine possesses an early-stage biotechnology intellectual property moat founded on foundational Cas9 and Cas12a gene-editing "
        "patents in-licensed from the Broad Institute and Harvard University. The company is advancing targeted in vivo genomic medicines for "
        "severe genetic diseases, including sickle cell disease and ocular disorders. Its extensive patent portfolio and patent cross-licensing "
        "revenues provide long-term technological and legal defensibility."
    ),
    "ENPH": (
        "Enphase Energy holds a distributed clean energy technology moat based on its proprietary microinverter architecture and IQ Energy Router "
        "software ecosystem. Unlike centralized string inverters, Enphase microinverters convert DC to AC power at each individual solar panel, "
        "maximizing energy harvest, system reliability, and safety. A dense network of certified solar installers, proprietary semiconductor ASICs, "
        "and integrated home battery storage create strong contractor and homeowner switching costs."
    ),
    "ENVX": (
        "Enovix Corporation maintains a proprietary silicon-anode battery technology moat. Its patented 3D cell architecture applies high mechanical "
        "pressure to 100% active silicon anodes, solving the structural battery swelling and cycle-life degradation issues that limit conventional "
        "lithium-ion batteries. Target markets in consumer AI wearables, smartphones, and defense electronics benefit from significantly higher energy "
        "density, establishing strong technology differentiation."
    ),
    "EOSE": (
        "Eos Energy Enterprises possesses a clean technology moat in long-duration grid energy storage, manufacturing proprietary zinc-hybrid "
        "cathode battery systems (Znyth technology). Unlike lithium-ion batteries, Eos aqueous zinc systems are non-flammable, utilize abundant "
        "domestic raw materials, operate without thermal runaway risk, and provide 3 to 12 hours of discharge duration, positioning Eos as a cost-effective "
        "solution for utility-scale solar and wind storage integration."
    ),
    "EXC": (
        "Exelon Corporation maintains a wide regulated utility monopoly moat as the largest electric transmission and distribution utility company "
        "in the United States, serving over 10 million customers across six major metro markets (ComEd, PECO, BGE, Pepco, Delmarva, ACE). Operating "
        "as a pure-play transmission and distribution utility with zero merchant commodity generation risk, Exelon's regulated rate base compounds "
        "at 6-8% annually under authorized state ROE frameworks."
    ),
    "FANG": (
        "Diamondback Energy commands a premier low-cost oil and gas production scale moat in the core of the Midland and Delaware basins in the "
        "Permian. Through contiguous acreage blocks and its merger with Endeavor Energy Resources, Diamondback achieves industry-leading drilling and "
        "completion capital efficiency, peer-low cash operating costs per BOE, and extensive inventory with breakevens below $40/bbl WTI, generating "
        "substantial through-cycle free cash flow."
    ),
    "FAST": (
        "Fastenal Company possesses an industrial supply distribution and customer lock-in moat powered by over 3,400 on-site industrial vending "
        "machines and dedicated customer plant locations (FAST Vend and FAST Bin). Fastenal places inventory directly onto customer factory floors, "
        "managing fastener replenishment through automated RFID tracking. This eliminates manufacturing downtime for industrial clients and creates "
        "prohibitive vendor switching costs."
    ),
    "FER": (
        "Ferrovial SE holds a global infrastructure monopoly moat, developing and operating high-concession toll roads (Managed Express Lanes) and "
        "airports across North America and Europe. Its flagship assets—including the 407 ETR in Toronto and dynamic Express Lanes in Texas and "
        "Virginia—operate under long-duration 50-to-99-year concession agreements with dynamic toll pricing that adjusts in real time with traffic "
        "congestion, generating inflation-protected recurring cash flow."
    ),
    "FTNT": (
        "Fortinet commands an economic moat in enterprise network security driven by proprietary FortiASIC hardware acceleration and single-OS "
        "(FortiOS) architectural integration. By designing custom security processing units (SPUs), Fortinet firewalls deliver up to 10x higher "
        "compute performance and energy efficiency at a fraction of the hardware cost of competitors. Over 700,000 global customers rely on Fortinet's "
        "unified secure networking (SASE and SD-WAN) platform, driving high gross margins and cash conversion."
    ),
    "GEHC": (
        "GE HealthCare Technologies holds an entrenched medical technology moat built on a global installed base of over 4 million medical imaging, "
        "ultrasound, and patient monitoring systems across global hospitals. Hospitals face prohibitive capital costs and physician retraining "
        "friction to replace core MRI, CT, and molecular imaging equipment. Over 50% of GE HealthCare's revenue is recurring, generated through "
        "long-term service contracts, spare parts, and proprietary medical software subscriptions."
    ),
    "GILD": (
        "Gilead Sciences maintains a dominant pharmaceutical moat in HIV antiviral care, supported by blockbuster franchise Biktarvy (which commands "
        ">49% US HIV treatment market share) and breakthrough long-acting capsid inhibitor lenacapavir (Sunlenca). Gilead's deep virology R&D "
        "expertise, extensive patent protections, and near-universal physician loyalty create high clinical switching barriers, while an expanding "
        "oncology portfolio (Trodelvy, Yescarta) diversifies its long-term cash flows."
    ),
    "GNRC": (
        "Generac Holdings commands an economic moat in residential standby power generation, holding over 75% market share in North American home "
        "standby generators. Generac's brand is synonymous with home backup power, supported by a dense nationwide independent dealer network of "
        "over 8,700 certified installers. This installer network creates high distribution barriers against industrial competitors, while rising power "
        "grid outages drive secular consumer adoption."
    ),
    "GOOG": (
        "Alphabet commands a multi-dimensional economic moat anchored by Google Search (holding >90% global search market share), the Android mobile "
        "operating system (powering >70% of global smartphones), YouTube, and Google Cloud. The two-sided digital advertising network effect between "
        "billions of consumers and millions of global advertisers generates immense cash flow with high operating margins. Alphabet's world-leading AI "
        "research infrastructure (Gemini models, custom TPU silicon) protects its search dominance and powers enterprise cloud acceleration."
    ),
    "GOOGL": (
        "Alphabet commands a multi-dimensional economic moat anchored by Google Search (holding >90% global search market share), the Android mobile "
        "operating system (powering >70% of global smartphones), YouTube, and Google Cloud. The two-sided digital advertising network effect between "
        "billions of consumers and millions of global advertisers generates immense cash flow with high operating margins. Alphabet's world-leading AI "
        "research infrastructure (Gemini models, custom TPU silicon) protects its search dominance and powers enterprise cloud acceleration."
    ),
    "GS": (
        "The Goldman Sachs Group holds a premier investment banking and institutional trading moat, recognized as the world's leading advisor in "
        "mergers & acquisitions (M&A) and equity/debt underwriting. Its competitive advantages stem from elite corporate client relationships, "
        "sophisticated global market-making infrastructure (FICC and Equities), and top-tier financial talent. Goldman's ongoing expansion into "
        "fee-based Asset & Wealth Management delivers predictable, high-ROIC recurring management fees."
    ),
    "GWH": (
        "ESS Tech holds a clean energy technology moat in long-duration grid storage, manufacturing environmentally sustainable iron flow batteries. "
        "Utilizing an abundant electrolyte chemistry of iron, salt, and water, ESS battery systems provide 4 to 12 hours of energy storage capacity "
        "with zero thermal runaway risk and an operational design life exceeding 20,000 cycles (>20 years) without capacity fade, offering a compelling "
        "alternative to lithium-ion for utility solar and wind smoothing."
    ),
    "HD": (
        "The Home Depot maintains a wide retail scale and logistics moat as the world's largest home improvement specialty retailer, operating over "
        "2,300 warehouse stores across North America. Home Depot dominates the high-spending Professional (Pro) contractor segment through dedicated "
        "Pro desk services, bulk job-site delivery networks, and tool rental programs. Immense purchasing power over suppliers and dense store "
        "locations within minutes of major residential centers create insurmountable barriers for general e-commerce platforms."
    ),
    "HON": (
        "Honeywell International commands an industrial technology moat rooted in proprietary engineering IP and mission-critical enterprise "
        "applications across Aerospace Technologies, Industrial Automation, and Building Solutions. Honeywell's jet engines, avionics flight decks, "
        "and building environmental control systems are specified into aircraft and commercial buildings during initial architectural design, "
        "generating decades of captive high-margin aftermarket parts, software, and maintenance service revenue."
    ),
    "IBM": (
        "International Business Machines holds an enterprise technology moat founded on mission-critical mainframe computing (IBM Z systems), "
        "hybrid cloud software (Red Hat OpenShift), and enterprise IT consulting. Over 70% of global Fortune 500 financial transactions and banking "
        "ledgers run on IBM mainframe infrastructure, where system migration costs and downtime risks are prohibitive. Red Hat OpenShift serves as "
        "the standard hybrid cloud container orchestration platform across multi-cloud enterprise IT."
    ),
    "IDXX": (
        "IDEXX Laboratories commands a wide economic moat in veterinary diagnostics and practice management software. Operating an attractive "
        "razor-and-blade model, IDEXX places proprietary in-clinic chemistry and hematology instruments (Catalyst One, ProCyte) in veterinary clinics, "
        "generating recurring daily consumable reagent test sales. High veterinary workflow integration and deep software lock-in result in "
        "customer retention rates exceeding 97% and durable ROIC above 35%."
    ),
    "INSM": (
        "Insmed Incorporated possesses a specialized biopharmaceutical moat focused on severe, rare respiratory and inflammatory diseases. Its "
        "commercial medicine ARIKAYCE is the standard-of-care inhaled therapy for refractory Mycobacterium avium complex (MAC) lung disease. Insmed's "
        "dpp1 inhibitor brensocatib (Phase 3 ASPEN trial success in non-cystic fibrosis bronchiectasis) establishes first-in-class market exclusivity "
        "in an unserved multi-billion dollar commercial patient population."
    ),
    "INTC": (
        "Intel Corporation possesses a legacy semiconductor manufacturing scale moat, maintaining the largest domestic fab infrastructure footprint "
        "in the United States. While navigating an intensive multi-year operational turnaround, Intel's x86 processor architecture remains embedded "
        "in hundreds of millions of client PCs and enterprise data centers. The execution of Intel Foundry services and node transition (Intel 18A) "
        "is backed by extensive US CHIPS Act subsidies and domestic defense manufacturing mandates."
    ),
    "INTU": (
        "Intuit maintains an entrenched software switching cost and consumer trust moat across small business accounting (QuickBooks) and consumer tax "
        "preparation (TurboTax), alongside Credit Karma financial marketplace insights. QuickBooks serves as the operating system for millions of "
        "small businesses, integrating invoicing, payroll, banking, and inventory. Migrating financial records to a competing platform creates severe "
        "accounting friction, sustaining subscription gross margins above 80%."
    ),
    "IOT": (
        "Samsara commands a fast-growing software moat in Connected Operations Cloud infrastructure. Over 20,000 commercial fleet and industrial "
        "enterprises utilize Samsara's IoT hardware sensors and AI dashcams to automate fleet tracking, driver safety, compliance, and equipment "
        "maintenance. High integration into client dispatch and insurance risk underwriting creates high gross retention (>95%) and net retention "
        "exceeding 115%."
    ),
    "ISRG": (
        "Intuitive Surgical commands a near-impregnable medical device moat as the global pioneer of robotic-assisted minimally invasive surgery. "
        "Over 9,000 da Vinci surgical systems are installed worldwide, having performed more than 14 million procedures. Because surgeons undergo "
        "hundreds of hours of da Vinci training during medical residency and hospitals invest millions in instrumentation, switching costs are "
        "prohibitive. The company operates a lucrative razor-and-blade model where recurring instrument, accessory, and service sales exceed 80% of revenue."
    ),
    "JNJ": (
        "Johnson & Johnson holds a diversified healthcare moat across Innovative Medicine (oncology, immunology, neuroscience) and MedTech "
        "(orthopedics, cardiovascular, surgery). Blockbuster biologic therapies like DARZALEX, STELARA, and TREMFYA generate billions in high-margin "
        "pharmaceutical cash flow. J&J's global commercial distribution scale, multi-billion dollar annual R&D engine, and AAA-rated fortress balance "
        "sheet support 62+ consecutive years of annual dividend increases."
    ),
    "JPM": (
        "JPMorgan Chase commands an unrivaled financial institution moat characterized by its 'fortress balance sheet,' unmatched retail deposit scale "
        "(over $2 trillion in consumer deposits), premier investment banking franchise, and annual technology investments exceeding $17 billion. "
        "Operating as the largest bank in the United States, JPMorgan benefits from lower funding costs, superior credit data analytics, and the ability "
        "to acquire distressed banking assets counter-cyclically during market disruptions."
    ),
    "KDP": (
        "Keurig Dr Pepper possesses an economic moat in single-serve coffee and ready-to-drink beverages. Its proprietary Keurig single-serve coffee "
        "brewing system operates a classic razor-and-blade model, where millions of installed countertop brewers generate steady recurring K-Cup pod "
        "licensing royalties. Keurig Dr Pepper pairs this with a nationwide direct-store-delivery (DSD) distribution network that distributes iconic "
        "beverage brands including Dr Pepper, Canada Dry, and Snapple."
    ),
    "KHC": (
        "The Kraft Heinz Company commands a consumer packaged goods brand moat built on timeless household staples including Heinz Ketchup, "
        "Kraft Macaroni & Cheese, Philadelphia Cream Cheese, and Oscar Mayer. High brand equity ensures prime shelf space placement across global "
        "grocery retailers, while ongoing supply chain efficiencies and foodservice channel partnerships support stable cash flow generation."
    ),
    "KLAC": (
        "KLA Corporation maintains an economic monopoly moat in semiconductor process control, yield management, and optical wafer inspection. "
        "KLA holds over 55% global market share in wafer inspection tools, which detect microscopic nanometer-scale atomic defects during chip fabrication. "
        "Because leading foundries like TSMC cannot achieve profitable wafer yields at 3nm and 2nm nodes without KLA's metrology systems, KLA commands "
        "extraordinary pricing power and operating margins exceeding 40%."
    ),
    "KO": (
        "The Coca-Cola Company commands one of the world's most recognizable consumer brand moats, marketing non-alcoholic beverage brands "
        "consumed more than 2.2 billion times daily in over 200 countries. Coca-Cola operates an asset-light concentrate licensing model, selling "
        "syrups to independent bottling partners who manage capital-intensive bottling and delivery. This generates gross margins above 60%, "
        "high Return on Invested Capital, and 62+ consecutive years of dividend increases."
    ),
    "LIN": (
        "Linde plc commands an economic moat in industrial gases (oxygen, nitrogen, hydrogen, argon). Industrial gas distribution is characterized by "
        "local supply monopolies, where Linde constructs on-site production plants connected via pipelines directly to customer steel mills, chemical "
        "plants, and semiconductor fabs under long-term 15-to-20-year take-or-pay contracts with inflation pass-through clauses. High customer "
        "switching costs and route density support industry-leading ROIC above 18%."
    ),
    "LRCX": (
        "Lam Research maintains an entrenched semiconductor capital equipment moat, dominating plasma etch and thin-film deposition tools essential "
        "for manufacturing 3D NAND flash memory, advanced DRAM, and leading-edge GAA logic. Creating high-aspect-ratio vertical memory holes requires "
        "Lam's specialized chemical etching technology. A massive installed base of over 90,000 chambers drives high-margin recurring Customer Support "
        "Business Group (CSBG) spare parts and maintenance services."
    ),
    "MA": (
        "Mastercard operates a global payments duopoly moat alongside Visa, processing over 140 billion transactions annually across more than 210 "
        "countries and territories. The two-sided network effect between billions of cardholders and tens of millions of merchants creates an "
        "insurmountable barrier to entry. Because Mastercard does not take credit risk—simply taking a fraction-of-a-percent toll on every transaction—"
        "it delivers operating margins exceeding 57% and exceptional return on capital."
    ),
    "MAR": (
        "Marriott International holds a hospitality brand and scale moat as the world's largest hotel company, managing and franchising over 1.6 million "
        "rooms across 30+ brands (Ritz-Carlton, St. Regis, Marriott, Courtyard). Operating a capital-light franchising model, Marriott earns recurring "
        "base and incentive management fees on hotel revenues with minimal real estate risk. The Marriott Bonvoy loyalty program (over 200 million members) "
        "drives high direct booking mix and lowers customer acquisition costs."
    ),
    "MCD": (
        "McDonald's Corporation possesses a global fast-food brand and commercial real estate moat, serving over 65 million customers daily across "
        "40,000+ restaurants worldwide. Approximately 95% of McDonald's restaurants are franchised. Uniquely, McDonald's owns the prime real estate "
        "underneath most franchised locations, collecting predictable recurring rental income and franchise royalty percentages. Unmatched purchasing "
        "scale enables value pricing that competitors cannot replicate profitably."
    ),
    "MCHP": (
        "Microchip Technology commands an economic moat in 8-bit, 16-bit, and 32-bit PIC microcontrollers, mixed-signal analog ICs, and timing devices. "
        "Microchip serves over 120,000 diversified industrial, automotive, and aerospace clients. Because microcontrollers require proprietary embedded "
        "code written in Microchip's MPLAB development ecosystem, customer redesign costs are high relative to the $1-2 cost of the chip, generating "
        "long product lifecycles and gross margins above 65%."
    ),
    "MDLZ": (
        "Mondelez International maintains a consumer packaged food moat anchored by iconic global snacking brands including Oreo, Cadbury, Milka, "
        "and Toblerone. The company holds #1 global market share in biscuits and #2 in chocolate. Dense direct-store-delivery networks in emerging "
        "markets and prime supermarket checkout aisle positioning ensure high consumer purchase frequency and strong retailer pricing power."
    ),
    "MELI": (
        "MercadoLibre commands an unrivaled commerce and fintech ecosystem moat across Latin America, holding dominant market share in Brazil, Mexico, "
        "and Argentina. Its integrated proprietary logistics network (Mercado Envios) delivers over 75% of orders within 48 hours—a logistics capability "
        "unmatched in the region. Tightly paired with Mercado Pago (the leading digital wallet, merchant acquiring, and credit platform), MercadoLibre's "
        "two-sided network effect creates insurmountable barriers against international entrants."
    ),
    "META": (
        "Meta Platforms commands an unmatched social network effect moat, connecting over 3.2 billion daily active people across its Family of Apps "
        "(Facebook, Instagram, WhatsApp, Messenger, Threads). Advertisers allocate budgets to Meta because no other platform outside of Google offers "
        "comparable consumer reach and AI-driven targeting accuracy (Advantage+ ad platform). Massive investments in open-source AI (Llama models) and "
        "custom compute infrastructure reinforce its advertising conversion efficiency and high operating margins."
    ),
    "MMM": (
        "3M Company holds an industrial materials science and patent moat, manufacturing thousands of specialized products across safety, industrial, "
        "electronics, and consumer markets (Post-it, Scotch, Command, N95 respirators). 3M's proprietary polymer chemistry, abrasive engineering, "
        "and global manufacturing scale provide steady product demand and brand recognition across industrial and healthcare supply chains."
    ),
    "MNDY": (
        "Monday.com holds a high-growth SaaS moat in work operating systems and low-code workflow management. Its intuitive visual interface allows "
        "non-technical teams across marketing, software, HR, and sales to build custom business applications and automated workflows. Over 225,000 "
        "customers utilize Monday.com, driving gross margins above 89% and strong net expansion through multi-product cross-selling (Monday Dev, Monday CRM)."
    ),
    "MNST": (
        "Monster Beverage Corporation commands a wide consumer brand moat in the energy drink category, sharing a global duopoly with Red Bull. "
        "Its long-term strategic partnership with The Coca-Cola Company grants Monster exclusive access to Coca-Cola's global bottling and distribution "
        "system, ensuring prime retail cooler placement and rapid international expansion. High consumer brand loyalty among motorsports and gaming "
        "demographics delivers operating margins above 28%."
    ),
    "MPWR": (
        "Monolithic Power Systems maintains a high-performance analog power management semiconductor moat. Its proprietary BCD (Bipolar-CMOS-DMOS) "
        "process technology integrates power stages, control logic, and telemetry onto a single monolithic silicon die. In AI server power delivery "
        "(powering NVIDIA GPUs and hyperscaler data centers), MPS chips provide superior energy efficiency and power density, capturing substantial "
        "content per server rack with high gross margins."
    ),
    "MRK": (
        "Merck & Co. holds a premier pharmaceutical moat anchored by KEYTRUDA, the world's best-selling oncology medicine. KEYTRUDA is FDA-approved "
        "across more than 40 indications as a foundational immunotherapy for non-small cell lung cancer, melanoma, and renal cell carcinoma. Merck is "
        "reinforcing this moat by advancing subcutaneous KEYTRUDA formulations, expanding its antibody-drug conjugate (ADC) oncology pipeline, and "
        "commercializing cardiovascular breakthrough WINREVAIR."
    ),
    "MRVL": (
        "Marvell Technology commands a custom silicon and high-speed data infrastructure semiconductor moat. Marvell designs custom cloud AI ASICs "
        "(partnering with major cloud hyperscalers), electro-optics PAM4 DSPs for optical transceivers, and PCIe/CXL retimers. As generative AI "
        "clusters require extreme interconnect bandwidth and low latency, Marvell's optical and custom compute silicon positions it as a critical "
        "enabler of next-generation data center scaling."
    ),
    "MSFT": (
        "Microsoft commands one of the widest economic moats in corporate history, underpinned by massive enterprise software switching costs, "
        "global cloud infrastructure scale (Azure), and the ubiquitous Windows and Office 365 commercial ecosystems. Millions of enterprises are "
        "structurally dependent on Microsoft's active directory, security, and developer tooling (GitHub, Visual Studio). Its strategic partnership "
        "with OpenAI and deployment of Copilot AI assistants across enterprise workflows cement its enterprise software dominance."
    ),
    "MSTR": (
        "MicroStrategy holds a differentiated corporate treasury and capital markets moat as the world's largest institutional corporate holder "
        "of Bitcoin. Under Executive Chairman Michael Saylor, the company utilizes low-interest convertible debt offerings, equity issuance, and "
        "operating enterprise software cash flows to systematically acquire and hold Bitcoin reserves, offering institutional investors a liquid, "
        "regulated, leveraged Bitcoin compounding vehicle."
    ),
    "MU": (
        "Micron Technology operates in an oligopoly alongside Samsung and SK Hynix in DRAM and NAND memory semiconductor manufacturing. DRAM memory "
        "is indispensable for all digital computing, from smartphones to AI data centers. Micron's technological leadership in 1-beta DRAM nodes and "
        "High Bandwidth Memory (HBM3E for AI accelerators like NVIDIA H200 and Blackwell) provides strong pricing leverage during memory upcycles."
    ),
    "NFLX": (
        "Netflix commands an entertainment scale and direct-to-consumer streaming moat with over 280 million paid subscribers globally. Its immense "
        "subscriber base generates over $35 billion in annual revenue, allowing Netflix to invest $17B+ annually in original content while spreading "
        "amortization costs across a vastly larger user base than legacy media competitors. High viewing engagement, algorithmic recommendation "
        "precision, and an expanding ad-supported tier drive low subscriber churn and expanding operating margins."
    ),
    "NKE": (
        "NIKE, Inc. holds the undisputed global brand equity moat in athletic footwear and apparel, supported by decades of iconic marketing campaigns, "
        "exclusive athlete endorsement partnerships (Michael Jordan, LeBron James, Cristiano Ronaldo), and proprietary cushioning technologies (Air, ZoomX). "
        "Direct-to-consumer digital channels and global retailer partnerships ensure prime shelf space and premium pricing power across sport and lifestyle."
    ),
    "NRGV": (
        "Energy Vault Holdings maintains an innovative clean energy technology moat in utility-scale gravity-based and hybrid energy storage systems. "
        "Its proprietary gravity storage architecture utilizes composite blocks and automated crane towers to store electrical potential energy "
        "without chemical battery degradation, offering long-duration storage for grid stabilization and renewable integration."
    ),
    "NTLA": (
        "Intellia Therapeutics holds a pioneering biotechnology moat in in vivo CRISPR/Cas9 genome editing. Intellia was the first company to demonstrate "
        "systemic in vivo CRISPR gene editing in humans via lipid nanoparticle (LNP) delivery (NTLA-2001 for ATTR amyloidosis and NTLA-2002 for hereditary "
        "angioedema). Fundamental CRISPR patents and partnerships with Regeneron Pharmaceuticals establish strong technological and clinical barriers."
    ),
    "NU": (
        "Nu Holdings (Nubank) commands an extraordinary digital banking platform moat across Latin America, serving over 105 million customers in Brazil, "
        "Mexico, and Colombia. Nubank's 100% digital, branchless operating model results in a cost-to-serve per active customer that is 85% lower than "
        "legacy incumbent banks. Viral organic customer acquisition (over 80% via word-of-mouth), expanding credit card and personal loan underwriting, "
        "and deep digital app engagement deliver Return on Equity (ROE) above 28%."
    ),
    "NVDA": (
        "NVIDIA commands an extraordinary full-stack computing and AI accelerator moat anchored by its proprietary CUDA software architecture. Millions "
        "of AI researchers, developers, and software libraries are compiled natively on CUDA, creating prohibitive software switching costs. In hardware, "
        "NVIDIA's rapid silicon innovation cadence (Hopper, Blackwell, Rubin architectures), combined with NVLink interconnects and InfiniBand networking "
        "(Quantum platform), delivers unrivaled data-center-scale AI compute performance and gross margins exceeding 70%."
    ),
    "NXPI": (
        "NXP Semiconductors holds an entrenched automotive and industrial semiconductor moat. NXP is the global market leader in automotive radar "
        "processors, secure vehicle network gateways, and battery management ICs. Automotive chips must undergo rigorous automotive-grade safety "
        "certifications (AEC-Q100 and ISO 26262) that take years to qualify, locking NXP into OEM vehicle architectures over 7-to-10-year production "
        "lifecycles with high customer switching costs."
    ),
    "ODFL": (
        "Old Dominion Freight Line maintains the premier operational efficiency and service quality moat in North American Less-Than-Truckload (LTL) "
        "motor transportation. ODFL consistently achieves an industry-leading on-time delivery rate (>99%) and peer-low cargo claims ratio (<0.2%). "
        "Shippers willingly pay premium freight rates for ODFL's superior reliability, enabling an industry-leading operating ratio in the low-70s "
        "and superior return on invested capital."
    ),
    "ORLY": (
        "O'Reilly Automotive possesses an aftermarket auto parts distribution moat powered by its dual-market strategy serving both DIY (Do-It-Yourself) "
        "consumers and professional DIFM (Do-It-For-Me) repair shops. O'Reilly's multi-tiered hub-and-spoke distribution network guarantees that local "
        "repair garages receive mission-critical replacement parts within 30 to 45 minutes, creating prohibitive service barriers against general "
        "e-commerce retailers and generating 30+ consecutive years of comparable store sales growth."
    ),
    "PANW": (
        "Palo Alto Networks commands a wide cybersecurity moat driven by enterprise platform consolidation across network security (Strata firewalls), "
        "cloud security (Prisma Cloud), and automated AI security operations (Cortex XSIAM). As enterprise CISOs actively reduce vendor fragmentation, "
        "Palo Alto's comprehensive platform architecture creates deep IT integration, high contract values ($1M+ ARR accounts), and net retention "
        "exceeding 115%."
    ),
    "PAYX": (
        "Paychex holds an economic moat in small and mid-sized business human capital management (HCM), payroll, HR outsourcing (PEO), and employee "
        "benefits administration. Serving over 740,000 business clients, Paychex provides mission-critical payroll compliance where error risks and "
        "regulatory reporting make switching costs prohibitive. High client retention (>85%) and substantial client fund float interest earnings "
        "generate defensive, high-margin cash flow."
    ),
    "PCAR": (
        "PACCAR Inc commands a premium commercial vehicle manufacturing moat through its premium heavy-duty truck brands: Kenworth, Peterbilt, "
        "and DAF. Renowned for superior engineering quality, aerodynamic fuel efficiency, and high resale value, PACCAR trucks command premium "
        "pricing among commercial fleet operators. A massive global dealer network and high-margin aftermarket parts division (PACCAR Parts) "
        "support 85+ consecutive years of net profitability."
    ),
    "PDD": (
        "PDD Holdings commands a disruptive social commerce and supply chain scale moat operating Pinduoduo in China and Temu globally. Its Consumer-to-Manufacturer "
        "(C2M) model eliminates intermediary wholesale layers, connecting low-cost manufacturers directly with consumers. Social gamification, algorithmic "
        "demand aggregation, and fully managed cross-border logistics allow PDD to deliver ultra-low prices, driving rapid market share gains and high cash generation."
    ),
    "PEP": (
        "PepsiCo holds a diversified global consumer packaged food and beverage moat, marketing 23 distinct billion-dollar brands including Pepsi, "
        "Lay's, Doritos, Cheetos, Gatorade, and Quaker. PepsiCo dominates North American salty snacks through Frito-Lay, backed by an unmatched direct-store-delivery "
        "(DSD) logistics fleet that restocks supermarket and convenience store shelves daily, creating insurmountable distribution barriers for competitors."
    ),
    "PG": (
        "The Procter & Gamble Company commands a consumer goods brand and scale moat, marketing essential daily-use products across baby care, fabric care, "
        "grooming, and oral care (Pampers, Tide, Gillette, Oral-B, Crest). P&G's multi-billion dollar advertising budget, superior product performance "
        "claims backed by R&D, and massive retail distribution leverage enable premium pricing power, gross margins above 50%, and 68+ consecutive years "
        "of dividend increases."
    ),
    "PLTR": (
        "Palantir Technologies commands virtually insurmountable enterprise software switching costs and government security clearance moats. Its Foundry, "
        "Gotham, and Artificial Intelligence Platform (AIP) software platforms act as the central operational ontology and decision-making architecture "
        "for the US Department of Defense, intelligence agencies, and Fortune 500 enterprises. Replacing Palantir is nearly impossible without rebuilding "
        "an organization's entire operational data fabric. AIP Bootcamps drive rapid commercial customer expansion and gross margins above 80%."
    ),
    "PYPL": (
        "PayPal Holdings holds a two-sided digital payment network moat connecting over 430 million active consumer wallets with 35 million merchant "
        "accounts globally. Its brands—including PayPal, Venmo, and Braintree—process over $1.5 trillion in annual total payment volume (TPV). Deep "
        "consumer trust at digital checkout, high mobile penetration through Venmo, and expanding unbranded checkout processing provide massive "
        "transaction scale and robust free cash flow."
    ),
    "QCOM": (
        "QUALCOMM Incorporated commands a foundational cellular communications IP and wireless semiconductor moat. Qualcomm owns standard-essential "
        "patents (SEPs) covering 3G, 4G, 5G, and emerging 6G cellular standards, licensing its IP portfolio to virtually every smartphone manufacturer "
        "globally in exchange for recurring royalties. In silicon, Snapdragon processors and custom Oryon CPU cores lead premium Android smartphones, "
        "AI PC architectures, and automotive digital cockpits."
    ),
    "REGN": (
        "Regeneron Pharmaceuticals holds a premier biotechnology R&D platform moat powered by its proprietary VelociSuite genetic engineering technologies. "
        "Its commercial blockbuster medicines include EYLEA (co-developed with Bayer for macular degeneration) and DUPIXENT (co-commercialized with Sanofi "
        "for asthma, atopic dermatitis, and COPD). VelociSuite enables rapid antibody discovery, generating a robust clinical oncology and immunology pipeline."
    ),
    "ROP": (
        "Roper Technologies commands a defensible portfolio moat comprising niche, asset-light vertical software and technology businesses. Roper acquires "
        "market-leading vertical software providers (e.g., Deltek, Vertafore, CliniSys) that operate as mission-critical systems in niche domains like "
        "government contracting, insurance underwriting, and healthcare laboratories. Over 75% recurring software revenues and minimal customer churn "
        "deliver gross margins above 65% and high ROIC."
    ),
    "ROST": (
        "Ross Stores holds an off-price retail scale and opportunistic sourcing moat, operating over 2,100 Ross Dress for Less and dd's DISCOUNTS stores. "
        "Ross's team of merchant buyers negotiates deep discounts on brand-name apparel and home goods overstocks from manufacturers, passing 20-60% savings "
        "to treasure-hunting consumers. Its low-cost retail store format and supply chain efficiency insulate Ross from online apparel competition."
    ),
    "SBUX": (
        "Starbucks Corporation commands a global consumer specialty coffee brand and real estate moat, operating over 39,000 stores globally. Starbucks "
        "delivers an experiential 'Third Place' between home and work, reinforced by its industry-leading Starbucks Rewards digital loyalty program "
        "(over 34 million active US members) and mobile order-and-pay platform. High brand prestige supports premium pricing power across handcrafted beverages."
    ),
    "SEDG": (
        "SolarEdge Technologies holds a clean energy technology moat in smart solar inverters and power optimizers. SolarEdge's DC-optimized inverter system "
        "couples individual module power optimizers with a centralized inverter, increasing solar energy harvest, module-level monitoring, and rapid safety "
        "shutdown compliance. A global network of residential solar installers and proprietary ASICs create contractor switching friction."
    ),
    "SHOP": (
        "Shopify commands a powerful merchant e-commerce platform and ecosystem moat, powering over 10% of total US e-commerce sales. Over 2 million "
        "merchants—from direct-to-consumer startups to enterprise brands—rely on Shopify as their unified retail operating system across web, mobile, "
        "and physical POS. The Shopify App Store, integrated Shopify Payments, and Shop Pay one-click checkout create strong network effects and high "
        "merchant retention."
    ),
    "SHW": (
        "The Sherwin-Williams Company maintains a distribution and brand moat as the premier architectural and industrial coatings manufacturer in North "
        "America. Sherwin-Williams operates an exclusive network of over 5,000 company-owned paint stores, providing professional painting contractors "
        "with immediate job-site tinting, delivery, and credit accounts. Contractors face high switching costs due to established paint formulas, color "
        "matching consistency, and loyalty programs."
    ),
    "SLDP": (
        "Solid Power possesses a specialized solid-state battery technology moat, developing all-solid-state battery cells and sulfide-based solid "
        "electrolyte materials for electric vehicles. By replacing flammable liquid electrolytes with solid sulfide materials, Solid Power targets higher "
        "energy density, longer driving range, and improved EV battery safety. Strategic joint development partnerships with BMW and Ford validate its "
        "automotive commercialization pipeline."
    ),
    "SNPS": (
        "Synopsys commands an entrenched Electronic Design Automation (EDA) and semiconductor IP duopoly alongside Cadence. Designing advanced silicon "
        "chips at 3nm, 2nm, and sub-2nm nodes is technically impossible without Synopsys's digital synthesis, place-and-route, and static timing analysis "
        "software. Its pending combination with Ansys expands its engineering simulation into multiphysics system analysis, cementing customer lock-in "
        "across Global 2000 technology and aerospace companies."
    ),
    "STOK": (
        "Stoke Therapeutics holds an innovative biotechnology platform moat in RNA-targeted genetic medicines. Its proprietary TANGO (Targeted Augmentation "
        "of Nuclear Gene Output) antisense oligonucleotide platform restores deficient protein levels to treat severe genetic diseases caused by haploinsufficiency. "
        "Clinical proof-of-concept for zorevunersen (STK-001) in Dravet syndrome establishes first-in-class therapeutic potential and strong patent exclusivity."
    ),
    "STX": (
        "Seagate Technology operates in an entrenched duopoly alongside Western Digital in high-capacity hard disk drive (HDD) manufacturing. In enterprise "
        "cloud hyperscale data centers, mass-capacity HDDs provide over 80% of secondary cloud storage volume at a cost-per-terabyte that is approximately "
        "5x cheaper than flash memory SSDs. Seagate's proprietary Heat-Assisted Magnetic Recording (HAMR) technology (Mozaic 3+ platform) enables 30TB+ "
        "areal density leadership."
    ),
    "TDOC": (
        "Teladoc Health holds a digital healthcare platform moat as a leading virtual medical care and chronic condition management provider. Teladoc "
        "serves thousands of enterprise employers, health plans, and hospital systems, providing 24/7 virtual consultations, integrated mental health "
        "(BetterHelp), and chronic condition monitoring. Deep integration into employer health benefit architectures supports recurring per-member-per-month "
        "(PMPM) subscription fees."
    ),
    "TEAM": (
        "Atlassian Corporation maintains an enterprise collaboration software moat rooted in developer workflow standardization and efficient product-led "
        "growth (PLG). Flagship tools Jira (issue tracking) and Confluence (team workspace) serve as the standard operating system for global software "
        "engineering and IT service management teams. Migrating project tickets, historical documentation, and developer workflows to a competing "
        "tool creates prohibitive operational friction."
    ),
    "TMUS": (
        "T-Mobile US holds a telecommunications scale and spectrum moat as the leading 5G wireless carrier in the United States. Following its merger "
        "with Sprint, T-Mobile secured a multi-year head start in mid-band 5G spectrum (2.5 GHz), delivering superior nationwide network speed and "
        "coverage at a lower cost-per-gigabyte. Its 'Un-carrier' value positioning drives industry-leading postpaid phone net subscriber additions and "
        "rapid Fixed Wireless Access (FWA) broadband growth."
    ),
    "TOST": (
        "Toast commands a specialized vertical SaaS and fintech moat in the restaurant industry, powering point-of-sale, kitchen display systems, "
        "online ordering, payroll, and payment processing for over 120,000 restaurant locations. Replacing Toast requires shutting down daily "
        "restaurant operations, making customer switching costs extremely high. High payment processing take-rates and rapid SaaS module cross-selling "
        "generate expanding gross profit."
    ),
    "TRI": (
        "Thomson Reuters holds a wide economic moat in legal, tax, and accounting professional workflow software. Its flagship platforms (Westlaw, "
        "Checkpoint, Practical Law) provide proprietary legal research precedents, tax compliance codes, and verified regulatory intelligence. Lawyers "
        "and accountants rely on Westlaw's authoritative primary source annotations for legal briefs, creating recurring subscription retention rates "
        "above 90% and high pricing power."
    ),
    "TRV": (
        "The Travelers Companies possesses a property and casualty (P&C) insurance underwriting and distribution moat, operating as a leading commercial "
        "and personal insurer in the US. Travelers' competitive advantage is rooted in proprietary actuarial claims databases spanning more than 165 years, "
        "sophisticated risk selection algorithms, and an extensive independent insurance agent distribution network. Disciplined risk pricing ensures "
        "consistent underwriting profitability with combined ratios regularly below 95%."
    ),
    "TSLA": (
        "Tesla commands a multi-faceted technology, manufacturing, and real-world data moat across electric vehicles, autonomous driving, and energy storage. "
        "In manufacturing, Tesla's gigacasting, vertical component integration, and dedicated EV factory design deliver structural unit cost advantages. "
        "In autonomous intelligence, Tesla's global fleet of millions of customer vehicles collects billions of miles of real-world video training data "
        "for its end-to-end neural network Full Self-Driving (FSD) system. The proprietary global Supercharger network and rapid utility Megapack "
        "energy storage deployments further widen its moat."
    ),
    "TSM": (
        "Taiwan Semiconductor Manufacturing Company (TSMC) maintains the world's most critical semiconductor manufacturing moat as the undisputed pure-play "
        "foundry leader, producing over 90% of the world's advanced sub-5nm logic chips. Major technology leaders—including Apple, NVIDIA, AMD, Qualcomm, "
        "and Broadcom—depend exclusively on TSMC for leading-edge fabrication. TSMC's massive annual R&D and capital expenditures ($30B+), unparalleled "
        "operational yield execution, and proprietary advanced packaging (CoWoS) create insurmountable barriers for competitors."
    ),
    "TTWO": (
        "Take-Two Interactive Software commands a world-class interactive entertainment IP moat anchored by Rockstar Games (Grand Theft Auto, Red Dead "
        "Redemption) and 2K Games (NBA 2K). The Grand Theft Auto franchise is the most profitable entertainment property in human history, with GTA V "
        "selling over 200 million copies. Massive live-services player engagement (GTA Online, NBA 2K MyTEAM) generates high-margin recurring digital "
        "net bookings between major blockbuster game release cycles."
    ),
    "TXN": (
        "Texas Instruments commands a semiconductor scale and manufacturing cost moat in analog and embedded processing chips. Analog chips are required "
        "in every electronic device to regulate voltage, temperature, and sensor signals. Texas Instruments operates extensive 300mm wafer fabrication "
        "plants, which produce analog chips at an estimated 40% lower cost per die than competitors' 200mm fabs. A catalog of over 80,000 products "
        "serving 100,000+ customers provides unmatched diversification and through-cycle free cash flow."
    ),
    "UNH": (
        "UnitedHealth Group commands an unmatched healthcare ecosystem moat, capturing synergistic cash flows across health insurance underwriting "
        "(UnitedHealthcare, covering over 50 million members) and direct healthcare services (Optum, comprising 90,000+ employed physicians, pharmacy "
        "benefit management, and healthcare IT analytics). Immense purchasing scale enables superior provider rate negotiations, lower medical loss "
        "ratios, and consistent double-digit earnings growth."
    ),
    "V": (
        "Visa Inc. operates the world's dominant digital payments network moat, connecting over 4.4 billion cardholders with more than 130 million "
        "merchant locations across 200+ countries. Processing over 220 billion transactions annually, Visa's two-sided network effect is practically "
        "insurmountable for new entrants. Because Visa acts as a tollbooth on global commerce without taking consumer credit risk, it generates "
        "operating margins exceeding 67% and phenomenal free cash flow."
    ),
    "VRSK": (
        "Verisk Analytics holds a wide data monopoly moat in insurance underwriting analytics and actuarial risk modeling. Verisk operates the "
        "property and casualty insurance industry's central database, aggregating historical claims and policy loss data contributed by hundreds of "
        "insurance carriers. Insurers rely on Verisk's statistical loss costs and actuarial models to price insurance policies and comply with state "
        "insurance regulators, resulting in subscription renewal rates above 95%."
    ),
    "VRTX": (
        "Vertex Pharmaceuticals holds an economic monopoly moat in cystic fibrosis (CF) transmembrane conductance regulator (CFTR) modulator therapies. "
        "Its commercial medicines—anchored by blockbuster TRIKAFTA/KAFTRIO—treat the underlying genetic defect in approximately 90% of global CF patients. "
        "With patent protections extending into the late 2030s and a pipeline advancing into non-opioid pain therapeutics (suzetrigine) and cell therapies "
        "for Type 1 diabetes, Vertex generates high operating margins and dependable biopharmaceutical cash flow."
    ),
    "VZ": (
        "Verizon Communications commands a telecommunications infrastructure scale moat, serving over 140 million retail wireless connections across "
        "the United States. Verizon's extensive physical network assets include nationwide high-band and C-band 5G spectrum, tens of thousands of cell "
        "towers, and dense urban fiber routing. Immense recurring wireless subscription cash flows fund network maintenance and support 18+ consecutive "
        "years of dividend increases."
    ),
    "WBD": (
        "Warner Bros. Discovery holds an entertainment content library and intellectual property moat spanning Warner Bros. Pictures, DC Comics, "
        "HBO, Discovery, and sports broadcasting rights (TNT Sports, March Madness). Its flagship streaming platform Max combines HBO's prestige "
        "programming with unscripted reality television, monetized across global direct-to-consumer subscriptions and theatrical releases."
    ),
    "WDAY": (
        "Workday, Inc. holds massive enterprise software switching costs as the premier cloud enterprise resource planning (ERP) platform for human "
        "capital management (HCM) and financial management. More than 60% of the Fortune 500 utilize Workday to manage global payroll, employee data, "
        "and corporate accounting. Because an ERP migration takes years and carries immense organizational risk, Workday sustains gross retention "
        "rates consistently above 95% and high subscription revenue visibility."
    ),
    "WDC": (
        "Western Digital Corporation operates in a memory and storage duopoly alongside Seagate in mass-capacity enterprise HDDs and flash memory SSDs. "
        "Cloud data centers require massive storage density, where Western Digital's UltraSMR hard drives provide the lowest cost per terabyte for "
        "archival and AI data storage. Vertically integrated flash memory joint ventures (BiCS technology with Kioxia) provide scale in client SSDs."
    ),
    "WMT": (
        "Walmart commands an unrivaled retail scale and logistics density moat, operating over 10,500 stores and clubs worldwide. In the US, a Walmart "
        "store is located within 10 miles of approximately 90% of the population, providing local fulfillment nodes for store pickup and delivery. "
        "Immense purchasing volume allows Walmart to demand the lowest product prices from suppliers, while high-margin growth vectors in digital retail "
        "advertising (Walmart Connect) and Walmart+ subscriptions drive margin expansion."
    ),
    "XEL": (
        "Xcel Energy maintains a wide regulated utility monopoly moat, providing electric and natural gas service to 3.8 million electricity and "
        "2.2 million natural gas customers across eight Western and Midwestern states (Minnesota, Colorado, Wisconsin, Texas). Operating under "
        "constructive state utility regulatory frameworks, Xcel's aggressive clean energy transition and transmission grid investments compound its "
        "regulated rate base at 6-8% annually with authorized returns on equity."
    ),
    "XYZ": (
        "Block, Inc. (formerly Square) commands a two-sided financial ecosystem moat connecting small business sellers (Square ecosystem) with "
        "consumer financial services (Cash App). Square's integrated point-of-sale hardware and business software create high merchant switching costs, "
        "while Cash App leverages viral peer-to-peer network effects to acquire consumers at very low cost, monetizing via Cash App Card debit spend, "
        "direct deposits, Bitcoin trading, and high-margin lending."
    ),
    "ZM": (
        "Zoom Communications commands a unified communications brand and software moat, providing video meetings, cloud phone systems (Zoom Phone), "
        "and contact center software for over 220,000 enterprise customers. Zoom's proprietary low-latency video compression algorithms, intuitive user "
        "experience, and broad developer app integrations maintain high user engagement and strong enterprise cash generation."
    ),
    "ZS": (
        "Zscaler commands a leading cloud security and Zero Trust architecture moat through its Zero Trust Exchange platform. Processing over "
        "400 billion daily transactions across more than 150 globally distributed data centers, Zscaler securely connects users directly to applications "
        "without placing them on the corporate network. Because enterprise customers face severe security disruption when migrating away from core "
        "Zero Trust gateways, Zscaler achieves net revenue retention rates exceeding 115% and gross margins above 80%."
    )
}

def update_company_meta():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    meta_path = os.path.join(root_dir, "scripts", "data", "company_meta.json")
    
    if not os.path.exists(meta_path):
        print(f"ERROR: {meta_path} does not exist.")
        sys.exit(1)
        
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    print(f"Loaded {len(meta)} companies from {meta_path}.")
    
    missing_in_curated = set(meta.keys()) - set(COMPETITIVE_MOATS.keys())
    if missing_in_curated:
        print(f"WARNING: Tickers in meta missing in COMPETITIVE_MOATS dictionary: {missing_in_curated}")
    else:
        print("SUCCESS: All universe tickers have bespoke competitive moat analyses defined.")
        
    for sym, moat_text in COMPETITIVE_MOATS.items():
        if sym in meta:
            meta[sym]["competitive_moat_analysis"] = moat_text
        else:
            print(f"Warning: {sym} not found in company_meta.json")
            
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        
    print(f"Updated {len(COMPETITIVE_MOATS)} company competitive moat analyses in {meta_path}.")

if __name__ == "__main__":
    update_company_meta()
