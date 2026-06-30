"""
Scraper for DKV Mobility fleet charging pricing.
Target: https://www.dkv-mobility.com/de/produkte-services/laden/
DKV fleet card pricing for public charging.
"""
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
import re

FALLBACK = TierPrice(None, PricePoint(0.28, 0.65, 0.38), PricePoint(0.52, 0.69, 0.58))
TARGET_URL = "https://www.dkv-mobility.com/de/produkte-services/laden/"


class DKVScraper(BaseScraper):
    provider_id = "dkv"
    provider_name = "DKV"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(TARGET_URL, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_timeout(3000)

                try:
                    page.click("#onetrust-accept-btn-handler", timeout=3000)
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
                print(f"DKV scrape error: {e}")
            finally:
                browser.close()

        print("DKV: using fallback")
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
    scraper = DKVScraper()
    print(scraper.scrape())
