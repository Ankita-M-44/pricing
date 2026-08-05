"""
Scraper for EnBW fleet tariffs.
Target: https://www.enbw.com/elektromobilitaet/produkte/ladetarife
EnBW displays prices in ct/kWh (e.g. "42,86 ct/kWh") — must divide by 100.

Last manually verified: 2026-08-05
Tier S: 56 ct/kWh regular (51 promo), other operators ab 56, max 89 ct/kWh
Tier M: 46 ct/kWh regular (41 promo), other operators ab 56, max 89 ct/kWh
Tier L: 39 ct/kWh regular (34 promo), other operators ab 56, max 89 ct/kWh
Promo valid 08.07–30.09.2026.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint
from browser import fetch_text

TARGET_URL = "https://www.enbw.com/elektromobilitaet/produkte/ladetarife"

FALLBACK = {
    "S": TierPrice("S", PricePoint(0.51, 0.89, 0.56), PricePoint(0.51, 0.89, 0.56)),
    "M": TierPrice("M", PricePoint(0.41, 0.89, 0.46), PricePoint(0.41, 0.89, 0.46)),
    "L": TierPrice("L", PricePoint(0.34, 0.89, 0.39), PricePoint(0.34, 0.89, 0.39)),
}


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
        text = fetch_text(TARGET_URL)
        print(f"EnBW: page text length={len(text)}")

        ct_prices = _parse_ct_kwh(text)
        euro_prices = _parse_euro_kwh(text)
        all_prices = ct_prices if ct_prices else euro_prices
        print(f"EnBW: ct/kWh={ct_prices}, €/kWh={euro_prices}")

        if not all_prices:
            print("EnBW: no prices found, using fallbacks")
            return list(FALLBACK.values())

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
                    print(f"EnBW {tier_name}: {tier_prices}")
                    continue
            print(f"EnBW {tier_name}: no tier section found, using fallback")
            results[tier_name] = FALLBACK[tier_name]

        return [results["S"], results["M"], results["L"]]


if __name__ == "__main__":
    scraper = EnBWScraper()
    for t in scraper.scrape():
        print(t)
