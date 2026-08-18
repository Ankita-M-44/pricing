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


_OTHER_COUNTRIES = re.compile(
    r'(?:^|\n)[ \t]*(?:##?\s*)?'
    r'(?:Austria|Österreich|Belgium|Belgique|France|Luxembourg|Netherlands|Nederland|'
    r'Poland|Polen|Spain|Spanien|Switzerland|Schweiz|Sweden|Sverige|Norway|Norge|'
    r'Denmark|Danmark|Finland|Italy|Italien|Czech|Portugal|United Kingdom|UK\b)',
    re.IGNORECASE | re.MULTILINE,
)


def _slice_de_section(text: str) -> str:
    """Return only the 'Public Charging in Germany' summary table, not the per-CPO breakdown."""
    # Prefer the specific "Public Charging in Germany" heading (the summary tier table)
    pc_match = re.search(
        r'(?:^|\n)[ \t]*(?:##?\s*)?Public Charging in Germany',
        text, re.IGNORECASE | re.MULTILINE,
    )
    if pc_match:
        start = pc_match.start()
        # End at the next section heading (## / # / blank+uppercase line) or other-country marker
        end_match = re.search(
            r'\n(?:#{1,3} |\n[A-Z][A-Za-z ]{3,}\n)',
            text, pos=start + 10,
        ) or _OTHER_COUNTRIES.search(text, start + 10)
        end = end_match.start() if end_match else min(start + 1200, len(text))
        de_slice = text[start:end]
        print(f"UTA: 'Public Charging in Germany' slice {len(de_slice)} chars")
        return de_slice

    # Fallback: full Germany country block
    de_match = re.search(
        r'(?:^|\n)[ \t]*(?:##?\s*)?(?:Germany|Deutschland|DE\b)',
        text, re.IGNORECASE | re.MULTILINE,
    )
    if not de_match:
        return text
    start = de_match.start()
    end_match = _OTHER_COUNTRIES.search(text, start + 10)
    end = end_match.start() if end_match else len(text)
    de_slice = text[start:end]
    print(f"UTA: DE section {len(de_slice)} chars (offset {start}–{end})")
    return de_slice


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
    # UTA PDF format: Firecrawl renders table prices without adjacent units.
    # Three patterns cover all observed cases in the markdown:
    #   "(€/kWh)0,52"  — price immediately after column header
    #   "Ubitricity0,46 |" — price at end of operator name before pipe
    #   "0,76Operators" — price immediately before "Operators" keyword
    for pat in [
        r'\(€/kWh\)(\d+[,\.]\d+)',
        r'(?<=[A-Za-zäöüÄÖÜß.,+])(\d+[,\.]\d+)(?=\s*\|)',
        r'(\d+[,\.]\d+)(?=Operators\b)',
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
        print(f"UTA: PDF head: {repr(text[:600])}")
        prices = _extract_kwh_prices(_slice_de_section(text))
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
