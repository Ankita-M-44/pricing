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
                    page.goto(url, timeout=30000, wait_until="domcontentloaded")
                    page.wait_for_timeout(2000)

                    content = page.content()
                    ac_price = self._extract_price(content, "AC")
                    dc_price = self._extract_price(content, "DC")

                    if ac_price and dc_price:
                        results.append(TierPrice(
                            tier=tier_name,
                            ac=PricePoint(
                                min=FALLBACK[tier_name].ac.min,
                                max=FALLBACK[tier_name].ac.max,
                                current=ac_price,
                            ),
                            dc=PricePoint(
                                min=FALLBACK[tier_name].dc.min,
                                max=FALLBACK[tier_name].dc.max,
                                current=dc_price,
                            ),
                        ))
                    else:
                        print(f"EnBW {tier_name}: could not parse prices, using fallback")
                        results.append(FALLBACK[tier_name])
                except Exception as e:
                    print(f"EnBW {tier_name} error: {e}, using fallback")
                    results.append(FALLBACK[tier_name])

            browser.close()
        return results

    def _extract_price(self, html: str, charge_type: str) -> float | None:
        # Look for patterns like "0,59 €/kWh" near AC/DC labels
        # EnBW pages typically have a pricing table
        lines = html.split('\n')
        for i, line in enumerate(lines):
            if charge_type in line:
                # Check surrounding lines for a price
                context = ' '.join(lines[max(0, i-2):i+3])
                price = parse_euro(context)
                if price and 0.10 < price < 1.50:
                    return price
        return None


if __name__ == "__main__":
    scraper = EnBWScraper()
    tiers = scraper.scrape()
    for t in tiers:
        print(t)
