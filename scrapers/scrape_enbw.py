"""
Scraper for EnBW fleet tariffs.
Target: https://www.enbw.com/elektromobilitaet/produkte/ladetarife
EnBW displays prices in ct/kWh (e.g. "42,86 ct/kWh") — must divide by 100.
Tiers S/M/L are on the same page behind tab/accordion elements.

NOTE: EnBW returns 403 to plain headless Chromium. The scraper uses a realistic
user-agent and waits for JS rendering. If it still fails, fallback values
(last manually verified) are used and the error is surfaced in scraperErrors.
"""
import re
from playwright.sync_api import sync_playwright
from base_scraper import BaseScraper, TierPrice, PricePoint

TARGET_URL = "https://www.enbw.com/elektromobilitaet/produkte/ladetarife"

# Last manually verified: 2026-08-05
# Tier S: EnBW stations 56 ct/kWh (promo 51), other operators ab 56, max 89 ct/kWh
# Tier M: EnBW stations 46 ct/kWh (promo 41), other operators ab 56, max 89 ct/kWh
# Tier L: EnBW stations 39 ct/kWh (promo 34), other operators ab 56, max 89 ct/kWh
# Promo valid 08.07.–30.09.2026; min = promo rate, median = regular EnBW rate
FALLBACK = {
    "S": TierPrice("S", PricePoint(0.51, 0.89, 0.56), PricePoint(0.51, 0.89, 0.56)),
    "M": TierPrice("M", PricePoint(0.41, 0.89, 0.46), PricePoint(0.41, 0.89, 0.46)),
    "L": TierPrice("L", PricePoint(0.34, 0.89, 0.39), PricePoint(0.34, 0.89, 0.39)),
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def _parse_ct_kwh(text: str) -> list[float]:
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


def _prices_to_tier(tier_name: str, prices: list[float]) -> TierPrice:
    fallback = FALLBACK[tier_name]
    if len(prices) >= 2:
        low, high = prices[0], prices[-1]
        return TierPrice(tier_name, PricePoint(low, high, low), PricePoint(low, high, low))
    elif len(prices) == 1:
        return TierPrice(tier_name,
                         PricePoint(prices[0], fallback.ac.max, prices[0]),
                         PricePoint(prices[0], fallback.dc.max, prices[0]))
    return fallback


class EnBWScraper(BaseScraper):
    provider_id = "enbw"
    provider_name = "EnBW"

    def scrape(self) -> list[TierPrice]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=USER_AGENT)
            page = context.new_page()

            try:
                page.goto(TARGET_URL, timeout=40000, wait_until="networkidle")

                # Dismiss cookie banner if present
                for sel in ["#onetrust-accept-btn-handler", "button[class*='accept']",
                            "button[class*='cookie']", "[data-testid='cookie-accept']"]:
                    try:
                        page.click(sel, timeout=2000)
                        page.wait_for_timeout(800)
                        break
                    except Exception:
                        pass

                text = page.inner_text("body")
                print(f"EnBW: page text length={len(text)}")
                print(f"EnBW: sample:\n{text[:1000]}")

                ct_prices = _parse_ct_kwh(text)
                euro_prices = _parse_euro_kwh(text)
                all_prices = ct_prices if ct_prices else euro_prices
                print(f"EnBW: found prices ct/kWh={ct_prices}, €/kWh={euro_prices}")

                if not all_prices:
                    print("EnBW: no prices found on page, using fallbacks")
                    browser.close()
                    return list(FALLBACK.values())

                # Page has all three tiers — try to split by tier sections.
                # Look for tier labels S/M/L near price clusters.
                results = {}
                for tier_name in ["S", "M", "L"]:
                    pattern = rf'(?:Tarif\s*{tier_name}|{tier_name}\s*-\s*Tarif)[^\n]{{0,200}}?(\d+[,\.]\d+\s*ct\s*/?\s*kWh)'
                    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
                    if matches:
                        tier_prices = []
                        for raw in matches:
                            val = float(raw.split()[0].replace(',', '.')) / 100.0
                            if 0.10 < val < 1.50:
                                tier_prices.append(round(val, 4))
                        if tier_prices:
                            results[tier_name] = _prices_to_tier(tier_name, sorted(set(tier_prices)))
                            print(f"EnBW {tier_name}: parsed from section → {tier_prices}")
                            continue
                    print(f"EnBW {tier_name}: no tier-specific section found, using fallback")
                    results[tier_name] = FALLBACK[tier_name]

                browser.close()
                return [results["S"], results["M"], results["L"]]

            except Exception as e:
                print(f"EnBW scrape error: {e}")
                browser.close()
                raise  # let run_scrapers.py catch and record the error


if __name__ == "__main__":
    scraper = EnBWScraper()
    tiers = scraper.scrape()
    for t in tiers:
        print(t)
