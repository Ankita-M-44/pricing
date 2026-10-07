"""
Scraper for DKV Mobility fleet charging pricing.
Target: https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road

The page has one tariff table per country (Deutschland, Österreich, Schweiz).
Only the German table is read. It lists price Levels 1-5 for AC and Levels 1-4
for DC, plus which operators belong to each level. Each level becomes one tier
with a per-tier packet (prices + example operators).
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint
from browser import fetch_text, fetch_pdf

TARGET_URL = "https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road"
SERVICE_FEE_PDF = "https://www.dkv-mobility.com/content/dam/dkv/assets/documents/footer/service-fee-shop/servicefeelist-fleet-webshop-de-de-de.pdf"

# Maximum price per kWh DKV charges (AC and DC), as given by the product team.
# It is not stated on the German tariff table, so it is kept here as a constant.
MAX_PRICE = 0.75

# Tarife (exkl. MwSt.) gültig ab 14.02.2026 — used if the page can't be parsed
FALLBACK_LEVELS = {1: (0.28, 0.52), 2: (0.36, 0.58), 3: (0.45, 0.64), 4: (0.55, 0.69), 5: (0.65, None)}
FALLBACK_OPS = {
    "AC": {
        1: "Sachsenenergie, Techem, 50five",
        2: "Vattenfall, Chargepoint, eflux",
        3: "eze Network, Stadtwerke Düsseldorf und Berlin",
        4: "Mennekes, Fric & Co, Stadtwerke Stuttgart",
        5: "Vaylens, reev, Solid",
    },
    "DC": {
        1: "Kaufland, Lidl, Sachsenenergie",
        2: "Vattenfall, Hamburger Energiewerke, Edeka, Tesla",
        3: "Aral, Shell, Allego",
        4: "EnBW, Eon, Fastned, Mer, Ionity",
    },
}

_PRICE = r'(\d+[,.]\d+)\s*€\s*/\s*kWh'
_LEVEL_ROW = re.compile(rf'Level\s*(\d)[\s+|*\-]*{_PRICE}(?:[\s+|*\-]*{_PRICE})?')
_OPERATOR_ROW = re.compile(r'Level\s*(\d):\s*u\.a\.\s*([^\n]+)')


def _germany_section(text: str) -> str | None:
    start = text.find("Tarifübersicht für Deutschland")
    if start < 0:
        return None
    end = re.search(r'Österreich', text[start:])
    return text[start:start + end.start()] if end else text[start:]


def _num(raw: str) -> float:
    return round(float(raw.replace(',', '.')), 2)


def _parse_levels(section: str) -> dict[int, tuple[float, float | None]]:
    levels: dict[int, tuple[float, float | None]] = {}
    for m in _LEVEL_ROW.finditer(section):
        n = int(m.group(1))
        if n in levels:
            continue
        ac = _num(m.group(2))
        dc = _num(m.group(3)) if m.group(3) else None
        if 0.10 < ac < 1.50 and (dc is None or 0.10 < dc < 1.50):
            levels[n] = (ac, dc)
    return levels


def _parse_operators(section: str, kind: str) -> dict[int, str]:
    block = re.search(rf'Zuordnung der {kind}-Preiskategorien in Deutschland:?(.*?)(?=Zuordnung der|margin-top|$)',
                      section, re.DOTALL)
    if not block:
        return {}
    ops = {}
    for n, names in _OPERATOR_ROW.findall(block.group(1)):
        ops[int(n)] = re.sub(r'\s+', ' ', names.replace('\xa0', ' ')).strip(' *#')
    return ops


def _fmt(v: float) -> str:
    return f"{v:.2f}".replace('.', ',') + " €/kWh"


def _build_tiers(levels, ops_ac, ops_dc) -> list[TierPrice]:
    tiers = []
    for n in sorted(levels):
        ac, dc = levels[n]
        packet = [
            {"label": "AC-Ladung", "value": _fmt(ac)},
            {"label": "DC-Ladung", "value": _fmt(dc) if dc is not None else "nicht verfügbar"},
        ]
        if n in ops_ac:
            packet.append({"label": "Beispiel-Betreiber AC", "value": ops_ac[n]})
        if n in ops_dc:
            packet.append({"label": "Beispiel-Betreiber DC", "value": ops_dc[n]})
        tiers.append(TierPrice(
            f"Level {n}",
            PricePoint(ac, MAX_PRICE, ac),
            PricePoint(dc, MAX_PRICE, dc) if dc is not None else None,
            packet,
        ))
    return tiers


class DKVScraper(BaseScraper):
    provider_id = "dkv"
    provider_name = "DKV"

    def scrape(self) -> list[TierPrice]:
        text = fetch_text(TARGET_URL)
        section = _germany_section(text)
        levels = _parse_levels(section) if section else {}
        print(f"DKV: Germany section {'found' if section else 'NOT found'}, levels parsed: {levels}")

        if len(levels) >= 3:
            return _build_tiers(levels, _parse_operators(section, "AC"), _parse_operators(section, "DC"))

        print("DKV: could not parse the German level table, using fallback levels")
        return _build_tiers(FALLBACK_LEVELS, FALLBACK_OPS["AC"], FALLBACK_OPS["DC"])


    def scrape_base_fees(self) -> list | None:
        """DKV Card +Charge monthly fee, from the fleet service fee list (PDF)."""
        text = fetch_pdf(SERVICE_FEE_PDF)
        m = re.search(r'DKV Card\s*\+\s*Charge\s+pro\s+Monat\s*\|\s*(\d+[,.]\d+)\s*€', text)
        if not m:
            print("DKV: card fee not found in the service fee list, keeping existing value")
            return None
        amount = _num(m.group(1))
        print(f"DKV: card fee {amount} €/month")
        return [{"tier": None, "amount": amount}]


if __name__ == "__main__":
    scraper = DKVScraper()
    for t in scraper.scrape():
        print(t)
