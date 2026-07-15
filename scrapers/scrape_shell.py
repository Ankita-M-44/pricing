"""
Scraper for Shell Recharge fleet pricing.
Target: https://www.shell.de/motoristen/shell-recharge/fuer-unternehmen.html
"""
import re
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro

FALLBACK = TierPrice(None, PricePoint(0.59, 0.65, 0.62), PricePoint(0.59, 0.65, 0.61))
TARGET_URL = "https://www.shell.de/motoristen/shell-recharge/fuer-unternehmen.html"


def _extract_kwh_prices(text: str) -> list[float]:
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh',
                r'(\d+[,\.]\d+)\s*Euro\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = parse_euro(m.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(round(val, 4))
    return sorted(set(prices))


class ShellScraper(BaseScraper):
    provider_id = "shell"
    provider_name = "Shell"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(TARGET_URL, timeout=40000, wait_until="networkidle")
                for sel in ["button[data-testid='cookie-accept']", "#onetrust-accept-btn-handler",
                            "button[class*='accept']", "button[class*='cookie']"]:
                    try:
                        page.click(sel, timeout=2000)
                        page.wait_for_timeout(800)
                        break
                    except Exception:
                        pass

                text = page.inner_text("body")
                prices = _extract_kwh_prices(text)
                print(f"Shell: found prices on page: {prices}")
                print(f"Shell: page text sample:\n{text[:600]}")

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
                print(f"Shell scrape error: {e}")
            finally:
                browser.close()

        print("Shell: using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = ShellScraper()
    print(scraper.scrape())
