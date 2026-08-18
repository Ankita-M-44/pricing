"""
Scraper for UTA Edenred fleet EV charging pricing.
Prices are hardcoded from the UTA eCharge® Charging Tariff PDF,
"Public Charging in Germany" section (Budget / Standard / High-Price tiers).
"""
from base_scraper import BaseScraper, TierPrice, PricePoint

# Public Charging in Germany — Budget/Standard/High-Price tiers
# AC: Budget 0.28, Standard 0.46, High-Price 0.69 €/kWh
# DC: Budget 0.52, Standard 0.66, High-Price 0.76 €/kWh
FALLBACK = TierPrice(None, PricePoint(0.28, 0.69, 0.46), PricePoint(0.52, 0.76, 0.66))


class UTAScraper(BaseScraper):
    provider_id = "uta"
    provider_name = "UTA"

    def scrape(self) -> list[TierPrice]:
        print("UTA: using hardcoded DE tariff (PDF: Public Charging in Germany)")
        return [FALLBACK]


if __name__ == "__main__":
    scraper = UTAScraper()
    print(scraper.scrape())
