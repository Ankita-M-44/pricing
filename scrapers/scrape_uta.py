"""
Scraper for UTA Edenred fleet EV charging pricing.
Target (PDF): https://web.uta.com/hubfs/UTA_eCharge_ChargingTariff_EN_2025.pdf
Parses the "Public Charging in Germany" table (Budget / Standard / High-Price tiers).
The PDF renders as markdown table cells like "0,28 Operators include: ..." —
prices are comma-decimal numbers at the start of a table cell, not suffixed with €/kWh.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint
from browser import fetch_pdf

TARGET_URL = "https://web.uta.com/hubfs/UTA_eCharge_ChargingTariff_EN_2025.pdf"

# Public Charging in Germany — Budget/Standard/High-Price tiers
# AC: Budget 0.28, Standard 0.46, High-Price 0.69 €/kWh
# DC: Budget 0.52, Standard 0.66, High-Price 0.76 €/kWh
TIER_NAMES = ["Budget", "Standard", "High-Price"]
FALLBACK_AC = [0.28, 0.46, 0.69]
FALLBACK_DC = [0.52, 0.66, 0.76]

# Example operators per tier, from the same PDF table. The PDF text mixes operator
# names into the price cells, so these are kept as reference data.
OPERATORS = {
    "Budget": {
        "AC": "HamburgerEnergiewerke, EDEKA, Lidl, Kaufland",
        "DC": "Kaufland, EDEKA, Hamburger Energiewerke, Autostrom.plus, Vattenfall",
    },
    "Standard": {
        "AC": "E.ON Drive infrastructure, reev GmbH, ALDI Süd",
        "DC": "Mer Germany, E.ON Drive, Fastned",
    },
    "High-Price": {
        "AC": "Volkswagen Group Charging / Elli, vaylens, E.ON Solution, Virta Germany, Chargepoint / has.to.be, Wirelane",
        "DC": "CITYWATT, Vaylens, Virta Germany, MOON POWER, EWE Go GmbH, Pfalzwerke",
    },
}


def _extract_germany_table_prices(text: str) -> tuple[list[float], list[float]]:
    """
    Returns (ac_prices, dc_prices) for the Budget/Standard/High-Price rows
    in the "Public Charging in Germany" table only (stops at "Premium Partner").
    """
    start = text.find("Public Charging in Germany")
    if start < 0:
        return [], []
    end = text.find("Premium Partner", start)
    section = text[start:end if end > 0 else start + 2000]

    ac_prices, dc_prices = [], []
    for label in ["Budget rate tier", "Standard rate tier", "High-Price rate tier"]:
        row_start = section.find(label)
        if row_start < 0:
            continue
        row_end = section.find("\n", row_start)
        row = section[row_start:row_end] if row_end > 0 else section[row_start:row_start + 300]
        # First two comma-decimal numbers in the row are AC, DC
        nums = re.findall(r'(\d+,\d+)', row)
        if len(nums) >= 1:
            ac_prices.append(float(nums[0].replace(',', '.')))
        if len(nums) >= 2:
            dc_prices.append(float(nums[1].replace(',', '.')))

    return ac_prices, dc_prices


def _fmt(v: float) -> str:
    return f"{v:.2f}".replace('.', ',') + " €/kWh"


def _build_tiers(ac_prices: list[float], dc_prices: list[float]) -> list[TierPrice]:
    tiers = []
    for name, ac, dc in zip(TIER_NAMES, ac_prices, dc_prices):
        packet = [
            {"label": "AC-Ladung", "value": _fmt(ac)},
            {"label": "DC-Ladung", "value": _fmt(dc)},
            {"label": "Beispiel-Betreiber AC", "value": OPERATORS[name]["AC"]},
            {"label": "Beispiel-Betreiber DC", "value": OPERATORS[name]["DC"]},
        ]
        tiers.append(TierPrice(name, PricePoint(ac, ac, ac), PricePoint(dc, dc, dc), packet))
    return tiers


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        try:
            text = fetch_pdf(TARGET_URL)
        except Exception as e:
            print(f"UTA: PDF fetch error: {e}, using fallback")
            return _build_tiers(FALLBACK_AC, FALLBACK_DC)

        ac_prices, dc_prices = _extract_germany_table_prices(text)
        print(f"UTA: AC prices={ac_prices}, DC prices={dc_prices}")

        if len(ac_prices) == 3 and len(dc_prices) == 3:
            return _build_tiers(ac_prices, dc_prices)

        print("UTA: could not parse Germany tariff table, using fallback")
        return _build_tiers(FALLBACK_AC, FALLBACK_DC)


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
