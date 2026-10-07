# Elli Pricing Dashboard — Project Handover

**Date:** 2026-10-07
**Repo:** `ankita-m-44/pricing` (GitHub)
**Active branch:** `claude/epic-einstein-o57hcy`
**Also present:** `claude/elli-pricing-signals-dashboard-80xts7` (earlier branch, superseded — see "Branch cleanup" below)
**Deployed on Vercel**, auto-deploying from the active branch / main

This document is written for whoever is taking over ownership of this project —
engineering, product, or whoever inherits the "competitor pricing" tool. It
covers what the project is, how it is built, what is still open, and — because
this tool scrapes competitor websites and republishes their prices — the
things that need a sign-off from people other than engineering before this
goes further (Legal, Sales) or in front of any customer.

---

## 1. What this project is

A small internal dashboard that shows Elli's EV-fleet-charging tariffs
side-by-side with five competitors' public tariffs (price per kWh, blocking
fees, monthly/card base fees). It's a React/Vite single-page app reading a
static JSON file, plus a Python scraper pipeline that refreshes that JSON
on a schedule via GitHub Actions.

**Audience as currently built:** internal (pricing/sales enablement). There
is no auth on the Vercel deployment — anything in it is effectively public
if the URL leaks. See §4.

---

## 2. How the current version is set up

### Frontend
- **Stack:** React 19 + TypeScript + Vite 8, Tailwind v4, Recharts for charts, `lucide-react` for icons.
- **Entry point:** `src/App.tsx` — language toggle (EN/DE), tab switcher (price corridor / blocking fees / base fees), bilingual disclaimer footer, PDF export button.
- **Key components:**
  | File | Purpose |
  |---|---|
  | `src/components/TariffDotChart.tsx` | Main per-tier price comparison chart |
  | `src/components/ElliPricingCard.tsx` | Elli's own tariff summary card |
  | `src/components/PriceChangeAlert.tsx` | Flags week-over-week price moves (reads `history` in the JSON) |
  | `src/components/PdfReport.tsx` | A4-landscape PDF export, one view per page, includes the disclaimer on every page |
  | `src/components/Header.tsx` | Top bar, logo, language switch |
  | `src/i18n.ts` | All EN/DE copy, including the legal disclaimer text (§5) |
  | `src/tariffModel.ts` / `src/types.ts` | Data shape / domain types shared by UI and (conceptually) the scrapers |
- **Data source:** `data/prices.json`, hard-linked to `public/data/prices.json` so Vite serves it statically. **This file is the single source of truth** — the UI never calls a live API.
- **Build/lint:** `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run dev`, `npm run preview`.

### Elli's own pricing
Elli's two tariffs ("Control", "Performance") are **hardcoded** in
`scrapers/run_scrapers.py` (`ELLI_PROVIDERS`), not scraped — reasonable since
it's our own product, but it means **whoever owns pricing changes to Elli's
tariffs must remember to update this file by hand**, or the dashboard will
silently show stale Elli prices next to freshly-scraped competitor prices.

### Scraper pipeline
- **Location:** `scrapers/`.
- **Orchestrator:** `scrapers/run_scrapers.py` — runs all 5 competitor scrapers, merges results into the existing `data/prices.json` (never overwrites wholesale), appends a dated snapshot to a `history` array (capped at 90 entries, used for the "price changed" alert), and writes `scraperErrors` for anything that failed that run.
- **Fetch layer:** `scrapers/browser.py` — tries, in order: **Tavily Extract API** → **stealth Playwright** (`playwright-stealth` v2, `Stealth().use_sync(page)`) → **Firecrawl API**. Falls back down the chain if a response looks bot-blocked (short body, or phrases like "Checking your browser", "Just a moment", etc.). Also has `ocr_image_url()` which screenshots an image/SVG and runs Tesseract OCR on it — used where a competitor publishes prices as an illustration rather than text (EnBW).
- **Per-provider scrapers:** `scrape_enbw.py`, `scrape_dkv.py`, `scrape_uta.py`, `scrape_shell.py`, `scrape_aral.py`, all subclassing `base_scraper.BaseScraper`.
- **Fields preserved across runs** (not overwritten by a scrape, must be curated by hand in `data/prices.json` if they need to change): `blockingFees`, `packet`, `sourceUrl` — see `PRESERVED_FIELDS` in `run_scrapers.py`. Base fees (`baseFees`) *are* now scraped per-provider where published, and only fall back to the previously-stored value if the scrape fails.
- **Schedule:** GitHub Actions workflow `.github/workflows/scrape-prices.yml` — cron `0 6 1,15 * *` (1st and 15th of each month, 06:00 UTC), plus manual `workflow_dispatch`. Installs Playwright + Tesseract (German+English language pack), runs `run_scrapers.py`, commits `data/prices.json` if it changed, using a bot identity (`elli-pricing-bot`). The job **always exits 0** — a failed scraper for one provider does not fail the whole run; it just keeps that provider's last-known-good data and records the failure in `scraperErrors`.
- **Secrets required (GitHub repo secrets, not environment secrets):** `TAVILY_API_KEY`, `FIRECRAWL_API_KEY`. Without them the pipeline still works via stealth Playwright alone, but is more likely to get blocked on harder-to-scrape sites (historically DKV).
- **Current state (as of this handover, 2026-10-07):** all five scrapers are running successfully with zero `scraperErrors` and `lastUpdated` current. This is a meaningful improvement over the mid-August state (see `git log`), where UTA/Shell found no prices and DKV was fully bot-blocked — those have since been fixed (UTA/Shell now parse `ct/kWh`-style text; DKV works via the fetch fallback chain).

### Deployment
- Vercel, auto-deploy from the branch. No separate backend/server — it's a static build. The scraper pipeline runs independently in GitHub Actions and commits data; Vercel then rebuilds on the new commit.

---

## 3. Websites being scraped

These are the exact public pages/documents the scrapers read from. **Each one's terms of use/robots policy has not been legally reviewed** — see §4.

| Competitor | URL(s) scraped | What's pulled |
|---|---|---|
| **EnBW** | `https://www.enbw.com/elektromobilitaet/geschaeftskunden/enbw-mobilityplus-business/professional` | AC/DC per-kWh tariffs by tier (S/M/L), via text parsing + OCR of a tariff illustration image |
| **DKV** | `https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road` + `https://www.dkv-mobility.com/content/dam/dkv/assets/documents/footer/service-fee-shop/servicefeelist-fleet-webshop-de-de-de.pdf` (fee list PDF) | Per-tier charging prices + monthly card fee |
| **UTA** | `https://web.uta.com/hubfs/UTA_eCharge_ChargingTariff_EN_2025.pdf` (tariff PDF) + `https://web.uta.com/de/hilfe/wie-viel-kostet-uta-tankkarte-welche-gebühren` | Charging tariffs + card fee |
| **Shell** | `https://www.shell.de/laden/ladetarife-fuer-ihr-elektroauto.html` | Fleet charging tariff |
| **Aral** | `https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html` (the `aralpulse.com` domain referenced as `sourceUrl` for the Aral record is dead/DNS-fails and was replaced by this `aral.de` URL as the working source) | Four tariffs (Ladesäulentarif, Klassik-Tarif, Extra-Tarif, ADAC e-Charge Tarif) + card fees |

Note: `data/prices.json`'s stored `sourceUrl` field is shown to the dashboard's end users as the attribution/"verify here" link, and for Aral it currently still points at the dead `aralpulse.com` URL even though the scraper itself has moved to `aral.de` — **this is a bug worth fixing before handover is complete**: the user-facing source link should match the URL actually being scraped.

---

## 4. What needs further clarification before this goes further

This is the part that matters most for a clean handover — these are not
implementation details, they're sign-offs this project needs from people
outside engineering.

### Legal
- **Scraping competitors' public pricing pages and republishing the numbers.** No one has confirmed whether DKV's, UTA's, Shell's, Aral's, or EnBW's terms of use permit automated scraping of their sites, or whether any of them explicitly prohibit it (several bot-detection walls had to be bypassed with stealth Playwright/Firecrawl — that in itself is a signal some of these sites don't want to be scraped). Legal should confirm whether this is acceptable, and under what framing (market research / price benchmarking is usually fine, but it should be an explicit call, not an assumption).
- **The disclaimer text** already in the product (`src/i18n.ts`, shown on every PDF page and in the footer) — Legal should review and approve the actual wording, not just confirm one exists. Current EN text: *"Disclaimer: Competitor pricing data is collected from publicly available sources and updated bi-weekly. Prices shown are indicative and may not reflect current tariffs, promotional rates, or regional variations. Always verify pricing directly with the respective provider before making purchasing decisions. Elli assumes no liability for the accuracy or completeness of third-party pricing information."* (German equivalent also present.)
- **Using competitor names, logos-adjacent styling, and pricing in anything that leaves the building** (a sales deck, a customer-facing comparison) is a different risk level than an internal dashboard — using a competitor's trademarked name in comparative advertising has specific legal rules in Germany/EU that differ from informal internal use. This needs an explicit "internal only" boundary from Legal, or sign-off for any external use.
- **No auth on the Vercel deployment.** If this is meant to stay internal-only, someone (Legal/IT/Security) should confirm whether an unauthenticated public URL showing competitor-pricing comparisons is acceptable, or whether it needs to be gated (Vercel password protection / SSO).
- **Data accuracy and liability**: this is scraped data via multiple fallback layers (Tavily/Playwright/Firecrawl/OCR) that can silently go stale if a provider's page changes layout — see "base fees unverified" history below. Decide who is accountable if a stale/wrong number from this tool is quoted externally.

### Sales
- **Get feedback from the sales team before this is shown to or used with customers.** Nothing here has been validated with sales colleagues yet:
  - Is the competitor set (EnBW, DKV, UTA, Shell, Aral) the right one, or are there other competitors sales actually gets asked about?
  - Is price-per-kWh plus blocking/base fees the comparison sales actually needs, or do deals hinge on other terms (contract length, hardware bundling, support SLAs) this tool doesn't capture?
  - Would sales ever want to *send* this (or a PDF export of it) to a customer? If yes, that changes the Legal posture above substantially — right now the PDF export feature exists but no one has confirmed it's meant to leave Elli internally.
  - Is bi-weekly refresh frequency good enough, or do deals move faster than that?

### Anything else worth flagging
- **Elli's own tariffs are hardcoded** (§2) — whoever owns this needs a process (not just "remember") for updating `ELLI_PROVIDERS` in `run_scrapers.py` whenever Elli's pricing changes, or the dashboard will quietly compare against stale Elli numbers.
- **Base fees were historically placeholders** (DKV €1.50, UTA €2.00, Shell €1.75 — see git history from August) and have since been replaced by actually-scraped values for most providers, but Shell's base fee is currently empty (`[]`) in `data/prices.json` — worth confirming whether Shell simply has no published card fee, or whether the scraper still isn't finding it.
- **Aral `sourceUrl` bug** — see §3, the citation link shown to users points at a dead domain.
- **No tests.** There's no automated test coverage on either the React app or the scrapers; any change is validated by eyeballing the dashboard/JSON. Worth deciding whether that's acceptable long-term given this feeds sales-facing numbers.
- **Branch cleanup:** `claude/elli-pricing-signals-dashboard-80xts7` is an older branch this project used to live on; `claude/epic-einstein-o57hcy` is the current one. Confirm which one Vercel is actually tracking for production, and delete/archive the other to avoid confusion for the next person.
- **Secrets custody:** `TAVILY_API_KEY` and `FIRECRAWL_API_KEY` are GitHub repo secrets under whoever currently administers this repo — the new owner needs access to rotate/renew these (both are paid third-party APIs with their own billing).

---

## 5. Quick-start for whoever inherits this

1. Get added as a collaborator on `ankita-m-44/pricing` and get the Vercel project transferred/shared.
2. `npm install && npm run dev` to run the dashboard locally against the existing `data/prices.json`.
3. `pip install -r scrapers/requirements.txt && playwright install chromium --with-deps` (plus `tesseract-ocr` + `tesseract-ocr-deu` system packages) to run scrapers locally: `cd scrapers && python run_scrapers.py`.
4. Check GitHub Actions → "Scrape Competitor Prices" run history to see the live cadence and whether recent runs are clean.
5. Work through §4 before treating any output of this tool as customer-ready.
