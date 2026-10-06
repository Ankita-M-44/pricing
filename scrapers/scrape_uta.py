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
FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.46), PricePoint(0.52, 0.76, 0.66))


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


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        try:
            text = fetch_pdf(TARGET_URL)
        except Exception as e:
            print(f"UTA: PDF fetch error: {e}, using fallback")
            return [FALLBACK]

        ac_prices, dc_prices = _extract_germany_table_prices(text)
        print(f"UTA: AC prices={ac_prices}, DC prices={dc_prices}")

        if ac_prices and dc_prices:
            ac_min, ac_max = min(ac_prices), max(ac_prices)
            dc_min, dc_max = min(dc_prices), max(dc_prices)
            return [TierPrice(None,
                PricePoint(ac_min, ac_max, ac_prices[1] if len(ac_prices) > 1 else ac_prices[0]),
                PricePoint(dc_min, dc_max, dc_prices[1] if len(dc_prices) > 1 else dc_prices[0]),
            )]

        print("UTA: could not parse Germany tariff table, using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
