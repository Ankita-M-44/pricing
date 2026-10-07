"""
Scraper for EnBW fleet tariffs.
Target: https://www.enbw.com/elektromobilitaet/geschaeftskunden/enbw-mobilityplus-business/professional
EnBW renders the Business Ladetarif S/M/L prices as SVG illustrations
(rasterized, not vector text) — the page itself only has alt text like
"Illustration des Business Ladetarif S; Stand: 01.10.2026" plus a linked
.svg image URL. We screenshot each tier's SVG and run Tesseract OCR on it
to read the ct/kWh value off the image.

Last manually verified: 2026-08-05 (S/M/L figures below, used as fallback)
Tier S: 56 ct/kWh regular (51 promo), other operators ab 56, max 89 ct/kWh
Tier M: 46 ct/kWh regular (41 promo), other operators ab 56, max 89 ct/kWh
Tier L: 39 ct/kWh regular (34 promo), other operators ab 56, max 89 ct/kWh
Promo valid 08.07–30.09.2026.
"""
import re
from base_scraper import BaseScraper, TierPrice, PricePoint
from browser import fetch_text, ocr_image_url

TARGET_URL = "https://www.enbw.com/elektromobilitaet/geschaeftskunden/enbw-mobilityplus-business/professional"

FALLBACK = {
    "S": TierPrice("S", PricePoint(0.51, 0.89, 0.56), PricePoint(0.51, 0.89, 0.56)),
    "M": TierPrice("M", PricePoint(0.41, 0.89, 0.46), PricePoint(0.41, 0.89, 0.46)),
    "L": TierPrice("L", PricePoint(0.34, 0.89, 0.39), PricePoint(0.34, 0.89, 0.39)),
}


def _find_tier_svg_urls(text: str) -> dict[str, str]:
    """Map tier letter -> SVG image URL, from the 'Illustration des Business Ladetarif X' alt text."""
    urls = {}
    for tier_name in ["S", "M", "L"]:
        pattern = rf'Illustration des Business Ladetarif {tier_name};[^\]]*\]\((https://[^\s)]+\.svg)\)'
        m = re.search(pattern, text)
        if m:
            urls[tier_name] = m.group(1)
    return urls


def _parse_ct_kwh_from_ocr(ocr_text: str) -> list[float]:
    prices = []
    for m in re.finditer(r'(\d+[,\.]\d+)\s*ct\s*/?\s*kWh', ocr_text, re.IGNORECASE):
        raw = m.group(1).replace(',', '.')
        try:
            val = float(raw) / 100.0
            if 0.10 < val < 1.50:
                prices.append(round(val, 4))
        except ValueError:
            pass
    return sorted(set(prices))


def _parse_monthly_fee(ocr_text: str) -> float | None:
    """'zzgl. 6,71 € monatliche Grundgebühr je Nutzer*in' -> 6.71 (OCR may garble 'zzgl.')."""
    m = re.search(r'(\d+[,.]\d+)\s*€\s*monatliche\s+Grundgeb', ocr_text)
    return round(float(m.group(1).replace(',', '.')), 2) if m else None


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

    def __init__(self):
        self._fees: dict[str, float] = {}

    def scrape_base_fees(self) -> list | None:
        if len(self._fees) < 3:
            print(f"EnBW: monthly fees read for {sorted(self._fees)} only, keeping existing values")
            return None
        return [{"tier": name, "amount": self._fees[name]} for name in ["S", "M", "L"]]

    def scrape(self) -> list[TierPrice]:
        self._fees = {}
        text = fetch_text(TARGET_URL)
        print(f"EnBW: page text length={len(text)}")

        svg_urls = _find_tier_svg_urls(text)
        print(f"EnBW: found tier SVG URLs: {svg_urls}")

        results = {}
        for tier_name in ["S", "M", "L"]:
            url = svg_urls.get(tier_name)
            if not url:
                print(f"EnBW {tier_name}: no SVG URL found, using fallback")
                results[tier_name] = FALLBACK[tier_name]
                continue
            try:
                ocr_text = ocr_image_url(url)
                print(f"EnBW {tier_name}: OCR text={ocr_text!r}")
                prices = _parse_ct_kwh_from_ocr(ocr_text)
                fee = _parse_monthly_fee(ocr_text)
                if fee is not None:
                    self._fees[tier_name] = fee
                print(f"EnBW {tier_name}: monthly fee={fee}")
                print(f"EnBW {tier_name}: OCR prices={prices}")
                results[tier_name] = _prices_to_tier(tier_name, prices) if prices else FALLBACK[tier_name]
            except Exception as e:
                print(f"EnBW {tier_name}: OCR error: {e}, using fallback")
                results[tier_name] = FALLBACK[tier_name]

        return [results["S"], results["M"], results["L"]]


if __name__ == "__main__":
    scraper = EnBWScraper()
    for t in scraper.scrape():
        print(t)
