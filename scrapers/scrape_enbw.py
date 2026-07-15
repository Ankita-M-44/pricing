"""
Scraper for EnBW mobility+ fleet tariffs.
Target: https://www.enbw.com/elektromobilitaet/fuer-unternehmen/flottenloesungen/
EnBW publishes tiered S/M/L pricing for fleet cards.
"""
import re
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro


TIER_PAGES = {
    "S": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-s/",
    "M": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-m/",
    "L": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-l/",
}

# Fallback values from last known good data (updated manually when site structure changes)
FALLBACK = {
    "S": TierPrice("S", PricePoint(0.47, 0.74, 0.60), PricePoint(0.47, 0.74, 0.62)),
    "M": TierPrice("M", PricePoint(0.38, 0.74, 0.55), PricePoint(0.38, 0.74, 0.57)),
    "L": TierPrice("L", PricePoint(0.32, 0.74, 0.48), PricePoint(0.32, 0.74, 0.50)),
}


class EnBWScraper(BaseScraper):
    provider_id = "enbw"
    provider_name = "EnBW"

    def scrape(self) -> list[TierPrice]:
        results = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for tier_name, url in TIER_PAGES.items():
                try:
                    page.goto(url, timeout=40000, wait_until="networkidle")
                    for sel in ["#onetrust-accept-btn-handler", "button[class*='accept']",
                                "button[class*='cookie']"]:
                        try:
                            page.click(sel, timeout=2000)
                            page.wait_for_timeout(800)
                            break
                        except Exception:
                            pass

                    text = page.inner_text("body")
                    print(f"EnBW {tier_name}: page text sample:\n{text[:600]}")

                    ac_price = self._extract_price(text, "AC")
                    dc_price = self._extract_price(text, "DC")
                    print(f"EnBW {tier_name}: AC={ac_price}, DC={dc_price}")

                    if ac_price and dc_price:
                        results.append(TierPrice(
                            tier=tier_name,
                            ac=PricePoint(FALLBACK[tier_name].ac.min, FALLBACK[tier_name].ac.max, ac_price),
                            dc=PricePoint(FALLBACK[tier_name].dc.min, FALLBACK[tier_name].dc.max, dc_price),
                        ))
                    else:
                        print(f"EnBW {tier_name}: could not parse prices, using fallback")
                        results.append(FALLBACK[tier_name])
                except Exception as e:
                    print(f"EnBW {tier_name} error: {e}, using fallback")
                    results.append(FALLBACK[tier_name])

            browser.close()
        return results

    def _extract_price(self, text: str, charge_type: str) -> float | None:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if charge_type in line:
                context = ' '.join(lines[max(0, i-2):i+3])
                for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh']:
                    for m in re.finditer(pat, context, re.IGNORECASE):
                        price = parse_euro(m.group(0))
                        if price and 0.10 < price < 1.50:
                            return price
        # Fallback: find all kWh prices on the page
        prices = []
        for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh']:
            for m in re.finditer(pat, text, re.IGNORECASE):
                val = parse_euro(m.group(0))
                if val and 0.10 < val < 1.50:
                    prices.append(val)
        if prices:
            prices = sorted(set(prices))
            return prices[0] if charge_type == "AC" else prices[-1]
        return None


if __name__ == "__main__":
    scraper = EnBWScraper()
    tiers = scraper.scrape()
    for t in tiers:
        print(t)
