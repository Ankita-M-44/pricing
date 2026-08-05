"""
Scraper for Aral pulse fleet charging pricing.
Target: https://www.aralpulse.com/de/flotte
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
from browser import fetch_text

FALLBACK = TierPrice(None, PricePoint(0.41, 0.68, 0.41), PricePoint(0.49, 0.79, 0.79))
TARGET_URLS = [
    "https://www.aralpulse.com/de/flotte",
    "https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html",
]


def _extract_kwh_prices(text: str) -> list[float]:
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh',
                r'(\d+[,\.]\d+)\s*Euro\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = parse_euro(m.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(round(val, 4))
    return sorted(set(prices))


class AralScraper(BaseScraper):
    provider_id = "aral"
    provider_name = "Aral pulse"

    def scrape(self) -> list[TierPrice]:
        for url in TARGET_URLS:
            try:
                text = fetch_text(url)
                prices = _extract_kwh_prices(text)
                print(f"Aral ({url}): found prices: {prices}")

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
            except Exception as e:
                print(f"Aral ({url}) error: {e}")

        print("Aral pulse: using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = AralScraper()
    print(scraper.scrape())
