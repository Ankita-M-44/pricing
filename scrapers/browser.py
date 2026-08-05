"""
Shared stealth browser factory.
Uses playwright-stealth to avoid bot detection (403s from Cloudflare etc).
Falls back to Firecrawl API if FIRECRAWL_API_KEY env var is set and the
page still returns a bot-detection response.
"""
import os
import re
import requests as _requests
from contextlib import contextmanager
from playwright.sync_api import sync_playwright, Page
from playwright_stealth import stealth


FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY", "")

# Phrases that indicate a bot-detection wall rather than real content
_BOT_SIGNALS = [
    "Access denied", "Enable JavaScript", "Checking your browser",
    "DDoS protection", "Just a moment", "Verifying you are human",
    "cf-browser-verification", "challenge-platform",
]


def _looks_blocked(text: str) -> bool:
    return len(text) < 500 or any(sig.lower() in text.lower() for sig in _BOT_SIGNALS)


def fetch_text(url: str, wait_selector: str | None = None, timeout: int = 40000) -> str:
    """
    Fetch page text with stealth Playwright.
    If the result looks blocked and FIRECRAWL_API_KEY is set, retries via Firecrawl.
    Raises RuntimeError if both methods fail.
    """
    text = _playwright_fetch(url, wait_selector=wait_selector, timeout=timeout)

    if _looks_blocked(text):
        print(f"  ⚠ Stealth fetch looks blocked for {url} (len={len(text)})")
        if FIRECRAWL_API_KEY:
            print("  → Retrying via Firecrawl...")
            text = _firecrawl_fetch(url)
            if _looks_blocked(text):
                raise RuntimeError(f"Both stealth and Firecrawl blocked for {url}")
        else:
            raise RuntimeError(
                f"Stealth fetch blocked for {url} and FIRECRAWL_API_KEY not set. "
                "Set the secret in GitHub Actions to enable Firecrawl fallback."
            )

    return text


def _playwright_fetch(url: str, wait_selector: str | None, timeout: int) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="de-DE",
        )
        page: Page = context.new_page()
        stealth(page)

        try:
            page.goto(url, timeout=timeout, wait_until="networkidle")
            _dismiss_cookies(page)
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=5000)
                except Exception:
                    pass
            text = page.inner_text("body")
        finally:
            browser.close()

    return text


def _dismiss_cookies(page: Page) -> None:
    for sel in [
        "#onetrust-accept-btn-handler",
        "button[data-testid='cookie-accept']",
        "button[class*='accept']",
        "button[class*='cookie']",
        "[aria-label*='Accept']",
        "[aria-label*='Akzeptieren']",
    ]:
        try:
            page.click(sel, timeout=2000)
            page.wait_for_timeout(600)
            return
        except Exception:
            pass


def _firecrawl_fetch(url: str) -> str:
    resp = _requests.post(
        "https://api.firecrawl.dev/v1/scrape",
        headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}", "Content-Type": "application/json"},
        json={"url": url, "formats": ["markdown"]},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", {}).get("markdown", "") or ""
