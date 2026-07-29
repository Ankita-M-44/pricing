"""
Scraper for Aral pulse fleet charging pricing.
Target: https://www.aralpulse.com/de/fuer-unternehmen/
Aral pulse (bp) is particularly important as it's also featured in Elli's tariff highlights.
"""
import re
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro

FALLBACK = TierPrice(None, PricePoint(0.43, 0.68, 0.52), PricePoint(0.49, 0.72, 0.57))
TARGET_URLS = [
    "https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html",
    "https://www.aralpulse.com/de/fuer-unternehmen/",
    "https://www.aralpulse.com/de/tarife/",
    "https://www.aralpulse.com/de/",
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
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for url in TARGET_URLS:
                try:
                    page.goto(url, timeout=40000, wait_until="networkidle")
                    for sel in ["button[id*='cookie']", "[data-testid*='accept']",
                                "button[class*='accept']", "#onetrust-accept-btn-handler"]:
                        try:
                            page.click(sel, timeout=2000)
                            page.wait_for_timeout(800)
                            break
                        except Exception:
                            pass

                    text = page.inner_text("body")
                    prices = _extract_kwh_prices(text)
                    print(f"Aral ({url}): found prices: {prices}")
                    print(f"Aral: page text sample:\n{text[:600]}")

                    if len(prices) >= 2:
                        ac, dc = prices[0], prices[-1]
                        browser.close()
                        return [TierPrice(None,
                            PricePoint(min(ac, FALLBACK.ac.min), max(ac, FALLBACK.ac.max), ac),
                            PricePoint(min(dc, FALLBACK.dc.min), max(dc, FALLBACK.dc.max), dc),
                        )]
                    elif len(prices) == 1:
                        v = prices[0]
                        browser.close()
                        return [TierPrice(None,
                            PricePoint(FALLBACK.ac.min, FALLBACK.ac.max, v),
                            PricePoint(FALLBACK.dc.min, FALLBACK.dc.max, v),
                        )]
                except Exception as e:
                    print(f"Aral ({url}) error: {e}")

            browser.close()

        print("Aral pulse: using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = AralScraper()
    print(scraper.scrape())
