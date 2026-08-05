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


PRESERVED_FIELDS = ["blockingFees", "baseFees", "packet", "sourceUrl"]


def run():
    print(f"Starting scrape run at {datetime.now(timezone.utc).isoformat()}")

    # Load existing data — we merge into it, never overwrite wholesale
    existing = {}
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            existing = json.load(f)

    existing_by_id = {p["id"]: p for p in existing.get("providers", [])}

    history_snapshot_providers = []
    errors = []

    for scraper in SCRAPERS:
        print(f"\n→ Scraping {scraper.provider_name}...")
        try:
            tiers = scraper.scrape()
            scraped = scraper.to_provider_dict(tiers)

            # Merge: keep all manually-curated fields from existing record
            existing_rec = existing_by_id.get(scraper.provider_id, {})
            for field in PRESERVED_FIELDS:
                if field in existing_rec:
                    scraped[field] = existing_rec[field]

            existing_by_id[scraper.provider_id] = scraped
            history_snapshot_providers.append({"id": scraped["id"], "name": scraped["name"],
                                               "isElli": scraped["isElli"], "tiers": scraped["tiers"]})
            print(f"  ✓ {scraper.provider_name}: {len(tiers)} tier(s)")
        except Exception as e:
            print(f"  ✗ {scraper.provider_name} failed: {e}")
            errors.append(scraper.provider_name)
            if scraper.provider_id in existing_by_id:
                rec = existing_by_id[scraper.provider_id]
                history_snapshot_providers.append({"id": rec["id"], "name": rec["name"],
                                                   "isElli": rec["isElli"], "tiers": rec["tiers"]})
                print(f"  → Keeping existing data for {scraper.provider_name}")

    # Rebuild providers list: competitors in original order, then Elli entries
    competitor_order = [s.provider_id for s in SCRAPERS]
    all_providers = [existing_by_id[pid] for pid in competitor_order if pid in existing_by_id]
    for elli in ELLI_PROVIDERS:
        # Merge Elli too (preserves blockingFees etc. set manually)
        existing_elli = existing_by_id.get(elli["id"], {})
        merged = {**existing_elli, **elli}
        all_providers.append(merged)

    # Build history snapshot (keep only competitor data in history, max 90 entries)
    history = existing.get("history", [])
    snapshot = {
        "date": datetime.now(timezone.utc).isoformat(),
        "providers": history_snapshot_providers,
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
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Wrote {DATA_FILE}")
    if errors:
        print(f"⚠ Errors for: {', '.join(errors)} (existing data preserved)")

    return len(errors) == 0


if __name__ == "__main__":
    run()
    sys.exit(0)  # always exit 0 — fallbacks handle partial failures gracefully
