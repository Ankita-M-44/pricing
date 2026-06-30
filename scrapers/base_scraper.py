"""Base scraper class with shared utilities."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import re


@dataclass
class PricePoint:
    min: float
    max: float
    current: float
    spn: Optional[float] = None
    enbw: Optional[float] = None

    def to_dict(self):
        d = {"min": self.min, "max": self.max, "current": self.current}
        if self.spn is not None:
            d["spn"] = self.spn
        if self.enbw is not None:
            d["enbw"] = self.enbw
        return d


@dataclass
class TierPrice:
    tier: Optional[str]
    ac: PricePoint
    dc: PricePoint

    def to_dict(self):
        return {"tier": self.tier, "ac": self.ac.to_dict(), "dc": self.dc.to_dict()}


def parse_euro(text: str) -> Optional[float]:
    """Extract a euro price from text like '0,59 €/kWh' or '€0.59'."""
    if not text:
        return None
    # Normalise comma decimals
    text = text.replace(',', '.')
    match = re.search(r'(\d+\.\d+)', text)
    if match:
        return float(match.group(1))
    return None


class BaseScraper(ABC):
    provider_id: str
    provider_name: str
    is_elli: bool = False

    @abstractmethod
    def scrape(self) -> list[TierPrice]:
        """Return a list of TierPrice objects for this provider."""
        ...

    def to_provider_dict(self, tiers: list[TierPrice]) -> dict:
        return {
            "id": self.provider_id,
            "name": self.provider_name,
            "isElli": self.is_elli,
            "tiers": [t.to_dict() for t in tiers],
        }
