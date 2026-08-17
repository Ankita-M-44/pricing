"""
Scraper for UTA fleet charging pricing.
Target: https://www.uta.com/de/produkte/elektromobilitaet
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
from browser import fetch_text

FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.42), PricePoint(0.52, 0.76, 0.62))
TARGET_URL = "https://www.uta.com/de/produkte/elektromobilitaet"


def _extract_kwh_prices(text: str) -> list[float]:
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh',
                r'(\d+[,\.]\d+)\s*Euro\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = parse_euro(m.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(round(val, 4))
    return sorted(set(prices))


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        text = fetch_text(TARGET_URL)
        prices = _extract_kwh_prices(text)
        # Debug: show a sample of the page so we can tune extraction
        print(f"UTA page length: {len(text)}")
        kwh_idx = text.lower().find('kwh')
        if kwh_idx >= 0:
            print(f"UTA kWh context: ...{text[max(0,kwh_idx-100):kwh_idx+100]}...")
        else:
            print(f"UTA sample: {text[:500]}")
        print(f"UTA: found prices: {prices}")

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

        print("UTA: no prices found, using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
