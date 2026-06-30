"""
Scraper for Shell Recharge fleet pricing.
Target: https://www.shell.de/motoristen/shell-recharge/fuer-unternehmen.html
"""
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro

FALLBACK = TierPrice(None, PricePoint(0.59, 0.65, 0.62), PricePoint(0.59, 0.65, 0.61))
TARGET_URL = "https://www.shell.de/motoristen/shell-recharge/fuer-unternehmen.html"


class ShellScraper(BaseScraper):
    provider_id = "shell"
    provider_name = "Shell"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(TARGET_URL, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_timeout(2000)

                # Accept cookie banner if present
                try:
                    page.click("button[data-testid='cookie-accept']", timeout=3000)
                except Exception:
                    pass

                content = page.content()
                ac, dc = self._parse_prices(content)
                if ac and dc:
                    return [TierPrice(None,
                        PricePoint(min(ac, FALLBACK.ac.min), max(ac, FALLBACK.ac.max), ac),
                        PricePoint(min(dc, FALLBACK.dc.min), max(dc, FALLBACK.dc.max), dc),
                    )]
            except Exception as e:
                print(f"Shell scrape error: {e}")
            finally:
                browser.close()

        print("Shell: using fallback")
        return [FALLBACK]

    def _parse_prices(self, html: str):
        import re
        # Shell typically shows kWh prices in a pricing table
        prices = []
        for match in re.finditer(r'(\d+[,\.]\d+)\s*€?\s*/?\s*kWh', html, re.IGNORECASE):
            val = parse_euro(match.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(val)

        if len(prices) >= 2:
            prices.sort()
            return prices[0], prices[-1]
        return None, None


if __name__ == "__main__":
    scraper = ShellScraper()
    print(scraper.scrape())
