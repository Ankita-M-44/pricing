"""
Scraper for Aral pulse charging tariffs in Germany.
Target: https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html
(aralpulse.com domain is dead/DNS fails as of 2026-08)

The page has a table "Preise im deutschen Aral pulse Netzwerk" with four tariffs
(Ladesäulentarif, Klassik-Tarif, Extra-Tarif, ADAC e-Charge Tarif) and, per tariff,
the price for DC above 50 kW, DC up to 50 kW and AC up to 22 kW, plus the monthly
base fee. Each tariff becomes one tier. DC is the price for chargers above 50 kW;
the price up to 50 kW is kept in the tier packet. The foreign-country and
third-party-operator tables further down the page are ignored.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint
from browser import fetch_text

TARGET_URL = "https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html"

# Used if the table can't be parsed: tariff -> (DC > 50 kW, DC <= 50 kW, AC, monthly fee)
FALLBACK = {
    "Ladesäulentarif": (0.79, 0.69, 0.59, 0.0),
    "Klassik-Tarif": (0.62, 0.52, 0.47, 0.0),
    "Extra-Tarif": (0.54, 0.46, 0.41, 2.99),
    "ADAC e-Charge Tarif": (0.55, 0.55, 0.55, 0.0),
}

_ROWS = {
    "dc_high": re.compile(r'DC-Lades.ule mit .ber 50 kW'),
    "dc_low": re.compile(r'DC-Lades.ule mit 50 kW Ladeleistung oder weniger'),
    "ac": re.compile(r'AC-\s*Lades.ule mit 22 kW'),
    "fee": re.compile(r'Monatliche Grundgeb.hr'),
}


def _cells(line: str) -> list[str]:
    parts = line.split('|') if '|' in line else re.split(r'\t+|\s{2,}', line)
    return [p.strip() for p in parts if p.strip() != '']


def _amount(cell: str) -> float | None:
    m = re.search(r'(\d+[,.]\d+)', cell)
    return round(float(m.group(1).replace(',', '.')), 2) if m else None


def parse_german_table(text: str) -> dict[str, tuple[float, float, float, float]]:
    """Returns {tariff name: (dc_high, dc_low, ac, monthly_fee)} from the German price table."""
    start = text.find("Preise im deutschen Aral pulse")
    if start < 0:
        return {}
    section = text[start:]
    end = re.search(r'\|\s*\*{0,2}Land\*{0,2}\s*\|', section)
    if end:
        section = section[:end.start()]
    lines = section.splitlines()

    names: list[str] = []
    for line in lines:
        if 'Klassik-Tarif' in line and 'Extra-Tarif' in line:
            names = [re.sub(r'[*_]', '', c).strip() for c in _cells(line)]
            break
    if not names:
        return {}

    rows: dict[str, list[str]] = {}
    for line in lines:
        for key, pat in _ROWS.items():
            if key not in rows and pat.search(line):
                rows[key] = _cells(line)[1:]
    if not {"dc_high", "dc_low", "ac"} <= rows.keys():
        return {}

    result = {}
    for i, name in enumerate(names):
        try:
            dc_high, dc_low, ac = (_amount(rows[k][i]) for k in ("dc_high", "dc_low", "ac"))
        except IndexError:
            return {}
        if None in (dc_high, dc_low, ac):
            return {}
        fee_cells = rows.get("fee", [])
        fee = _amount(fee_cells[i]) if i < len(fee_cells) else None
        result[name] = (dc_high, dc_low, ac, fee or 0.0)
    return result


def _fmt(v: float) -> str:
    return f"{v:.2f}".replace('.', ',') + " €/kWh"


class AralScraper(BaseScraper):
    provider_id = "aral"
    provider_name = "Aral pulse"

    def __init__(self):
        self._tariffs = dict(FALLBACK)

    def scrape(self) -> list[TierPrice]:
        try:
            tariffs = parse_german_table(fetch_text(TARGET_URL))
        except Exception as e:
            print(f"Aral: fetch error: {e}")
            tariffs = {}
        print(f"Aral: tariffs parsed: {tariffs}")

        if len(tariffs) >= 3:
            self._tariffs = tariffs
        else:
            print("Aral: could not parse the German tariff table, using fallback tariffs")
            self._tariffs = dict(FALLBACK)

        tiers = []
        for name, (dc_high, dc_low, ac, _fee) in self._tariffs.items():
            packet = [
                {"label": "AC-Ladung", "value": _fmt(ac)},
                {"label": "DC-Ladung", "value": _fmt(dc_high)},
                {"label": "DC-Ladung bis 50 kW", "value": _fmt(dc_low)},
            ]
            tiers.append(TierPrice(name, PricePoint(ac, ac, ac), PricePoint(dc_high, dc_high, dc_high), packet))
        return tiers

    def scrape_base_fees(self) -> list | None:
        return [{"tier": name, "amount": fee} for name, (_h, _l, _a, fee) in self._tariffs.items()]


if __name__ == "__main__":
    scraper = AralScraper()
    for t in scraper.scrape():
        print(t)
