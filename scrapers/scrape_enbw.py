"""
Scraper for EnBW mobility+ fleet tariffs.
Target: https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-s/ (and tarif-m, tarif-l)
EnBW displays prices in ct/kWh (e.g. "42,86 ct/kWh") — must divide by 100.
Tiers S/M/L each have an EnBW-station price and an "Andere Betreiber" (other operators) range.
"""
import re
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint


TIER_PAGES = {
    "S": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-s/",
    "M": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-m/",
    "L": "https://www.enbw.com/elektromobilitaet/produkte/mobilityplus/tarif-l/",
}

# Fallback values — verified against EnBW site 2026-07-15
# EnBW stations regular price = AC price; other operators range 47.06–74.79 ct/kWh
FALLBACK = {
    "S": TierPrice("S", PricePoint(0.4286, 0.7479, 0.4706), PricePoint(0.4286, 0.7479, 0.4706)),
    "M": TierPrice("M", PricePoint(0.3446, 0.7479, 0.3866), PricePoint(0.3446, 0.7479, 0.3866)),
    "L": TierPrice("L", PricePoint(0.2857, 0.7479, 0.3277), PricePoint(0.2857, 0.7479, 0.3277)),
}


def _parse_ct_kwh(text: str) -> list[float]:
    """Extract prices in ct/kWh and return as €/kWh (divided by 100)."""
    prices = []
    for m in re.finditer(r'(\d+[,\.]\d+)\s*ct\s*/?\s*kWh', text, re.IGNORECASE):
        raw = m.group(1).replace(',', '.')
        try:
            val = float(raw) / 100.0
            if 0.10 < val < 1.50:
                prices.append(round(val, 4))
        except ValueError:
            pass
    return sorted(set(prices))


def _parse_euro_kwh(text: str) -> list[float]:
    """Extract prices already in €/kWh."""
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            raw = m.group(1).replace(',', '.')
            try:
                val = float(raw)
                if 0.10 < val < 1.50:
                    prices.append(round(val, 4))
            except ValueError:
                pass
    return sorted(set(prices))


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
                    print(f"EnBW {tier_name}: page text sample:\n{text[:800]}")

                    # Try ct/kWh first (EnBW's format), then fall back to €/kWh
                    ct_prices = _parse_ct_kwh(text)
                    euro_prices = _parse_euro_kwh(text)
                    all_prices = ct_prices if ct_prices else euro_prices

                    print(f"EnBW {tier_name}: ct/kWh found={ct_prices}, €/kWh found={euro_prices}")

                    if len(all_prices) >= 2:
                        # EnBW station price (lowest) = regular tariff; max = other operators ceiling
                        enbw_price = all_prices[0]
                        other_max = all_prices[-1]
                        fallback = FALLBACK[tier_name]
                        result = TierPrice(
                            tier=tier_name,
                            ac=PricePoint(enbw_price, other_max, enbw_price),
                            dc=PricePoint(enbw_price, other_max, enbw_price),
                        )
                        results.append(result)
                        print(f"EnBW {tier_name}: scraped → ac/dc enbw={enbw_price}, max={other_max}")
                    elif len(all_prices) == 1:
                        fallback = FALLBACK[tier_name]
                        result = TierPrice(
                            tier=tier_name,
                            ac=PricePoint(all_prices[0], fallback.ac.max, all_prices[0]),
                            dc=PricePoint(all_prices[0], fallback.dc.max, all_prices[0]),
                        )
                        results.append(result)
                        print(f"EnBW {tier_name}: single price found={all_prices[0]}, using fallback max")
                    else:
                        print(f"EnBW {tier_name}: no prices found, using fallback")
                        results.append(FALLBACK[tier_name])

                except Exception as e:
                    print(f"EnBW {tier_name} error: {e}, using fallback")
                    results.append(FALLBACK[tier_name])

            browser.close()
        return results


if __name__ == "__main__":
    scraper = EnBWScraper()
    tiers = scraper.scrape()
    for t in tiers:
        print(t)
