"""
Scraper for UTA Edenred fleet EV charging pricing.
Primary: PDF tariff list via Firecrawl (Playwright cannot render PDFs).
Fallback: web page if PDF fetch fails.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint, parse_euro
from browser import fetch_text, fetch_pdf

FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.46), PricePoint(0.46, 0.76, 0.76))
PDF_URL = "https://web.uta.com/hubfs/Documents/Tariff-lists/Tariff-lists-eCharge/UTA_eCharge_ChargingTariff_EN.pdf"
TARGET_URL = "https://web.uta.com/en/charging/ev-charging-card"



def _extract_kwh_prices(text: str) -> list[float]:
    prices = []
    for pat in [r'(\d+[,\.]\d+)\s*€\s*/\s*kWh', r'€\s*(\d+[,\.]\d+)\s*/\s*kWh',
                r'(\d+[,\.]\d+)\s*Euro\s*/\s*kWh']:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = parse_euro(m.group(0))
            if val and 0.10 < val < 1.50:
                prices.append(round(val, 4))
    # ct/kWh format
    for m in re.finditer(r'(\d+[,\.]\d+)\s*ct\s*/?\s*kWh', text, re.IGNORECASE):
        raw = m.group(1).replace(',', '.')
        try:
            val = float(raw) / 100.0
            if 0.10 < val < 1.50:
                prices.append(round(val, 4))
        except ValueError:
            pass
    # UTA PDF format: Firecrawl renders a single markdown table; prices appear
    # either right after the (€/kWh) column header, or as the LAST decimal in
    # each "Operators consist of: …Name0,46 |" cell.
    # The old "before pipe" pattern was too greedy — it matched per-CPO sub-prices
    # further in the document. The targeted "consist of:" pattern extracts only
    # the final (canonical tier) price from each operator-list cell.
    for pat in [
        r'\(€/kWh\)(\d+[,\.]\d+)',
        r'consist\s+of:[^|]*(\d+[,\.]\d+)\s*\|',
    ]:
        for m in re.finditer(pat, text, re.IGNORECASE):
            raw = m.group(1).replace(',', '.')
            try:
                val = float(raw)
                if 0.10 < val < 1.50:
                    prices.append(round(val, 4))
            except ValueError:
                pass
    return sorted(set(prices))


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        # Try the PDF tariff list first (most complete and structured source)
        try:
            text = fetch_pdf(PDF_URL)
            print(f"UTA: fetched PDF ({len(text)} chars)")
        except Exception as e:
            print(f"UTA: PDF fetch failed ({e}), falling back to web page")
            text = fetch_text(TARGET_URL)
        prices = _extract_kwh_prices(text)
        print(f"UTA: found prices: {prices}")

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

        print("UTA: no prices found, using fallback")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
