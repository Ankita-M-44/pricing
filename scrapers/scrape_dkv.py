"""
Scraper for DKV Mobility fleet charging pricing.
Target: https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road
(Tarifübersicht für Deutschland section)
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
from browser import fetch_text

FALLBACK = TierPrice(None, PricePoint(0.28, 0.65, 0.38), PricePoint(0.52, 0.69, 0.58))
TARGET_URL = "https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road"


def _extract_kwh_prices(text: str) -> list[float]:
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh',
                r'(\d+[,\.]\d+)\s*Euro\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = parse_euro(m.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(round(val, 4))
    # Also handle ct/kWh format
    for m in re.finditer(r'(\d+[,\.]\d+)\s*ct\s*/?\s*kWh', text, re.IGNORECASE):
        raw = m.group(1).replace(',', '.')
        try:
            val = float(raw) / 100.0
            if 0.10 < val < 1.50:
                prices.append(round(val, 4))
        except ValueError:
            pass
    return sorted(set(prices))


class DKVScraper(BaseScraper):
    provider_id = "dkv"
    provider_name = "DKV"

    def scrape(self) -> list[TierPrice]:
        text = fetch_text(TARGET_URL)
        prices = _extract_kwh_prices(text)
        print(f"DKV: found prices: {prices}")

        if len(prices) >= 2:
            ac, dc = prices[0], prices[-1]
            return [TierPrice(None,
                PricePoint(min(ac, FALLBACK.ac.min), max(ac, FALLBACK.ac.max), ac),
                PricePoint(min(dc, FALLBACK.dc.min), max(dc, FALLBACK.dc.max), dc),
            )]
        elif len(prices) == 1:
            v = prices[0]
            return [TierPrice(None,
                PricePoint(FALLBACK.ac.min, FALLBACK.ac.max, v),
                PricePoint(FALLBACK.dc.min, FALLBACK.dc.max, v),
            )]

        print("DKV: no prices found, using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = DKVScraper()
    print(scraper.scrape())
