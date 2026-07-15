"""
Orchestrator: runs all scrapers and updates data/prices.json.
Run via GitHub Actions daily.
"""
import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Add scrapers dir to path
sys.path.insert(0, str(Path(__file__).parent))

from scrape_enbw import EnBWScraper
from scrape_shell import ShellScraper
from scrape_dkv import DKVScraper
from scrape_uta import UTAScraper
from scrape_aral import AralScraper

DATA_FILE = Path(__file__).parent.parent / "data" / "prices.json"

# Elli pricing is hardcoded — it's our own product and we control it
ELLI_PROVIDERS = [
    {
        "id": "elli-control",
        "name": "Elli – Control",
        "isElli": True,
        "monthlyFee": 6.00,
        "tiers": [
            {
                "tier": None,
                "ac": {"price": 0.53},
                "dc": {"general": 0.63, "spn": 0.59, "enbw": 0.67},
            }
        ],
    },
    {
        "id": "elli-performance",
        "name": "Elli – Performance",
        "isElli": True,
        "monthlyFee": 11.00,
        "tiers": [
            {
                "tier": None,
                "ac": {"price": 0.53},
                "dc": {"general": 0.63, "spn": 0.49, "enbw": 0.67},
            }
        ],
    },
]

SCRAPERS = [
    EnBWScraper(),
    DKVScraper(),
    UTAScraper(),
    ShellScraper(),
    AralScraper(),
]


def run():
    print(f"Starting scrape run at {datetime.now(timezone.utc).isoformat()}")

    # Load existing data to preserve history
    existing = {}
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            existing = json.load(f)

    scraped_providers = []
    errors = []

    for scraper in SCRAPERS:
        print(f"\n→ Scraping {scraper.provider_name}...")
        try:
            tiers = scraper.scrape()
            provider_dict = scraper.to_provider_dict(tiers)
            scraped_providers.append(provider_dict)
            print(f"  ✓ {scraper.provider_name}: {len(tiers)} tier(s)")
        except Exception as e:
            print(f"  ✗ {scraper.provider_name} failed: {e}")
            errors.append(scraper.provider_name)
            # Try to preserve last known data
            if existing:
                last_known = next((p for p in existing.get("providers", []) if p["id"] == scraper.provider_id), None)
                if last_known:
                    scraped_providers.append(last_known)
                    print(f"  → Using last known data for {scraper.provider_name}")

    all_providers = scraped_providers + ELLI_PROVIDERS

    # Build history snapshot (keep only competitor data in history, max 90 entries)
    history = existing.get("history", [])
    snapshot = {
        "date": datetime.now(timezone.utc).isoformat(),
        "providers": scraped_providers,
    }
    history.append(snapshot)
    if len(history) > 90:
        history = history[-90:]

    output = {
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "providers": all_providers,
        "history": history,
        "scraperErrors": errors,
    }

    with open(DATA_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Wrote {DATA_FILE}")
    if errors:
        print(f"⚠ Errors for: {', '.join(errors)} (fallback data used)")

    return len(errors) == 0


if __name__ == "__main__":
    run()
    sys.exit(0)  # always exit 0 — fallbacks handle partial failures gracefully
