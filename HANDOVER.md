# Elli Pricing Dashboard — Session Handover

**Date:** 2026-08-17  
**Repo:** `ankita-m-44/pricing`  
**Branch:** `claude/elli-pricing-signals-dashboard-80xts7`  
**Deployed on Vercel** (auto-deploys from the branch above)

---

## Project Overview

React + Vite + TypeScript dashboard showing Elli fleet charging prices vs. competitors. Data lives in `data/prices.json` (hardlinked to `public/data/prices.json`). A GitHub Actions workflow scrapes competitor sites bi-weekly and commits updated prices.

---

## Current State

### What Works
- **Dashboard UI** — fully functional: price corridor chart, blocking fees tab, base fees tab, language toggle (EN/DE), PDF export, bilingual disclaimer at bottom
- **EnBW** — correct S/M/L tier prices, per-tier hover tooltip packets
- **Aral pulse** — scraper working (`aral.de` backup URL finds 10 prices; `aralpulse.com` domain is dead/DNS fails)
- **playwright-stealth + Firecrawl fallback** — working correctly (`Stealth().use_sync(page)` is the correct v2 API)
- **Scraper merge logic** — `run_scrapers.py` merges scraped data into existing JSON, preserving manually-curated fields (`blockingFees`, `baseFees`, `packet`, `sourceUrl`)

### What Still Needs Work

#### 1. Unpushed commit (PRIORITY: push this first)
There is 1 local commit that could not be pushed due to a transient session 403 error:

```
c272668  debug: log kWh page context for UTA/Shell/EnBW
```

**To push:** run `git push origin claude/elli-pricing-signals-dashboard-80xts7` from `/home/user/pricing`

Then trigger another GitHub Actions run (Actions → "Scrape Competitor Prices" → Run workflow).

#### 2. UTA scraper — finds no prices
- Page loads successfully (stealth bypass works)
- Regex patterns for `€/kWh` find nothing
- Debug logging added in the unpushed commit will show the actual page content + all kWh occurrences
- Likely cause: prices may be in `ct/kWh` format (like EnBW), in a PDF, or in a different text structure

#### 3. Shell scraper — finds no prices
- Same situation as UTA
- Shell fleet page may be a marketing page without actual tariff numbers
- Debug logging added in the unpushed commit will show what's on the page

#### 4. DKV scraper — fully blocked
- Both stealth Playwright AND Firecrawl return bot-detection responses
- Existing `prices.json` data is preserved (merge logic keeps it)
- No fix available without a different data source or API access

#### 5. Base fees unverified
- DKV: €1.50/month (placeholder)
- UTA: €2.00/month (placeholder)
- Shell: €1.75/month (placeholder)
- Aral: €0 (no base fee, likely correct)
- These haven't been confirmed against actual sources

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/PriceCorridorChart.tsx` | Main price chart with hover tooltips |
| `src/components/BlockingFeeChart.tsx` | Blocking fees tab |
| `src/components/BaseFeeChart.tsx` | Base fees tab |
| `src/App.tsx` | Root app, language toggle, tab switcher, disclaimer |
| `src/i18n.ts` | EN/DE translations (has `disclaimer` key) |
| `src/types.ts` | TypeScript interfaces (`PacketRow`, `CompetitorTier` with optional `packet`) |
| `data/prices.json` | Hardlinked = `public/data/prices.json`. Single source of truth. |
| `scrapers/browser.py` | Shared stealth browser + Firecrawl fallback |
| `scrapers/run_scrapers.py` | Orchestrator — merges scraped data, preserves manual fields |
| `scrapers/scrape_enbw.py` | EnBW scraper (ct/kWh parsing, S/M/L tier split) |
| `scrapers/scrape_dkv.py` | DKV scraper (currently always blocked) |
| `scrapers/scrape_uta.py` | UTA scraper (loads page, no prices found yet) |
| `scrapers/scrape_shell.py` | Shell scraper (loads page, no prices found yet) |
| `scrapers/scrape_aral.py` | Aral scraper (working via aral.de backup URL) |
| `.github/workflows/scrape-prices.yml` | Bi-weekly cron (1st + 15th, 06:00 UTC), `FIRECRAWL_API_KEY` secret injected |

---

## Architecture Notes

### Browser / Scraping
```python
# browser.py — correct playwright-stealth v2 API:
from playwright_stealth import Stealth
Stealth().use_sync(page)   # NOT stealth(page) — that was v1
```

Firecrawl fallback triggers when:
- Page length < 500, OR
- Any bot-signal phrase found ("Access denied", "Checking your browser", etc.)

`FIRECRAWL_API_KEY` is a **repository** secret (not environment secret) in GitHub.

### Scraper Merge Logic
`run_scrapers.py` preserves these fields from existing JSON when merging:
```python
PRESERVED_FIELDS = ["blockingFees", "baseFees", "packet", "sourceUrl"]
```

### EnBW Data (manually verified 2026-08-05)
| Tier | AC median | DC median | Max | Min (promo) |
|------|-----------|-----------|-----|-------------|
| S | €0.56/kWh | €0.56/kWh | €0.89 | €0.51 |
| M | €0.46/kWh | €0.46/kWh | €0.89 | €0.41 |
| L | €0.39/kWh | €0.39/kWh | €0.89 | €0.34 |

Promo valid 08.07–30.09.2026. Fallback values hardcoded in `scrape_enbw.py`.

### Chart Constants
```tsx
// PriceCorridorChart.tsx
const CHART_MAX = 0.95;
const ticks = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90];
```

---

## Immediate Next Steps (in order)

1. **Push the pending commit** — `git push origin claude/elli-pricing-signals-dashboard-80xts7`
2. **Trigger GitHub Actions run** — to get debug logs for UTA/Shell
3. **Read the logs** — look for `UTA kWh context:` and `Shell kWh context:` lines. They'll show exactly what text surrounds the kWh occurrences on each page (or confirm there are none)
4. **Fix the price regex** based on what the logs show — likely need to add `ct/kWh` support to UTA/Shell scrapers (same as EnBW already has), or find the right URL that actually has a tariff table
5. **Remove the debug logging** from `scrape_uta.py` and `scrape_shell.py` once extraction is working

---

## GitHub Actions Run History

| Run # | Date | Result | Notes |
|-------|------|--------|-------|
| #7 (32025119090) | 2026-08-17 | ✅ Success | First run with working Stealth v2 fix. UTA/Shell load but no prices. Aral working. DKV blocked. |
| #5 (31010286407) | 2026-08-05 | ✅ Success | All scrapers crashed with `'module' object is not callable` (wrong Stealth API) |
| #3 (29396887450) | 2026-07-15 | ✅ Success | Earlier run |

---

## PR

No open PR exists for this branch yet. Create one when ready to merge to main.
