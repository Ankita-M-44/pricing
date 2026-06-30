"""
Scraper for UTA fleet charging pricing.
Target: https://www.uta.com/de-de/loesungen/elektromobilitaet
"""
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
import re

FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.42), PricePoint(0.52, 0.76, 0.62))
TARGET_URL = "https://www.uta.com/de-de/loesungen/elektromobilitaet"


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(TARGET_URL, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_timeout(3000)

                try:
                    page.click("button[id*='cookie'], button[class*='accept']", timeout=3000)
                    page.wait_for_timeout(1000)
                except Exception:
                    pass

                content = page.content()
                ac, dc = self._parse_prices(content)
                if ac and dc:
                    return [TierPrice(None,
                        PricePoint(FALLBACK.ac.min, FALLBACK.ac.max, ac),
                        PricePoint(FALLBACK.dc.min, FALLBACK.dc.max, dc),
                    )]
            except Exception as e:
                print(f"UTA scrape error: {e}")
            finally:
                browser.close()

        print("UTA: using fallback")
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
    scraper = UTAScraper()
    print(scraper.scrape())
