"""
Scraper for Aral pulse fleet charging pricing.
Target: https://www.aralpulse.com/de/fuer-unternehmen/
Aral pulse (bp) is particularly important as it's also featured in Elli's tariff highlights.
"""
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
import re

FALLBACK = TierPrice(None, PricePoint(0.43, 0.68, 0.52), PricePoint(0.49, 0.72, 0.57))
TARGET_URLS = [
    "https://www.aralpulse.com/de/fuer-unternehmen/",
    "https://www.aralpulse.com/de/tarife/",
    "https://www.aralpulse.com/de/",
]


class AralScraper(BaseScraper):
    provider_id = "aral"
    provider_name = "Aral pulse"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for url in TARGET_URLS:
                try:
                    page.goto(url, timeout=30000, wait_until="domcontentloaded")
                    page.wait_for_timeout(2000)

                    try:
                        page.click("button[id*='cookie'], [data-testid*='accept']", timeout=2000)
                        page.wait_for_timeout(500)
                    except Exception:
                        pass

                    content = page.content()
                    ac, dc = self._parse_prices(content)
                    if ac and dc:
                        browser.close()
                        return [TierPrice(None,
                            PricePoint(FALLBACK.ac.min, FALLBACK.ac.max, ac),
                            PricePoint(FALLBACK.dc.min, FALLBACK.dc.max, dc),
                        )]
                except Exception as e:
                    print(f"Aral ({url}) error: {e}")

            browser.close()

        print("Aral pulse: using fallback")
        return [FALLBACK]

    def _parse_prices(self, html: str):
        prices = []
        for match in re.finditer(r'(\d+[,\.]\d+)\s*€?\s*/?\s*kWh', html, re.IGNORECASE):
            val = parse_euro(match.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(val)
        prices = sorted(set(prices))
        if len(prices) >= 2:
            return prices[0], prices[-1]
        return None, None


if __name__ == "__main__":
    scraper = AralScraper()
    print(scraper.scrape())
