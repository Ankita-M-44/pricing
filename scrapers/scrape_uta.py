"""
Scraper for UTA Edenred fleet EV charging pricing.
Target (PDF): https://web.uta.com/hubfs/UTA_eCharge_ChargingTariff_EN_2025.pdf
"Public Charging in Germany" section lists Budget / Standard / High-Price tiers.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
from browser import fetch_pdf

TARGET_URL = "https://web.uta.com/hubfs/UTA_eCharge_ChargingTariff_EN_2025.pdf"

# Public Charging in Germany — Budget/Standard/High-Price tiers
# AC: Budget 0.28, Standard 0.46, High-Price 0.69 €/kWh
# DC: Budget 0.52, Standard 0.66, High-Price 0.76 €/kWh
FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.46), PricePoint(0.52, 0.76, 0.66))


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
        try:
            text = fetch_pdf(TARGET_URL)
        except Exception as e:
            print(f"UTA: PDF fetch error: {e}, using fallback")
            return [FALLBACK]

        prices = _extract_kwh_prices(text)
        print(f"UTA: found prices: {prices}")
        print(f"UTA DEBUG: PDF text length={len(text)}")
        print(f"UTA DEBUG: full text: {text[:3000]!r}")

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

        print("UTA: no prices found in PDF, using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
