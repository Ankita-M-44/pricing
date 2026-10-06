"""
Shared page-fetching layer for scrapers.
Tries Tavily Extract first (no browser needed, handles most bot walls).
Falls back to stealth Playwright, then Firecrawl, if earlier methods
look blocked or TAVILY_API_KEY isn't set.
"""
import os
import re
import requests as _requests
from contextlib import contextmanager
from playwright.sync_api import sync_playwright, Page
from playwright_stealth import Stealth


TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
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
    Fetch page text, trying each method in order until one looks unblocked:
      1. Tavily Extract (if TAVILY_API_KEY set)
      2. Stealth Playwright
      3. Firecrawl (if FIRECRAWL_API_KEY set)
    Raises RuntimeError if all available methods fail.
    """
    attempts = []

    if TAVILY_API_KEY:
        text = _tavily_fetch(url)
        if not _looks_blocked(text):
            return text
        attempts.append(f"Tavily (len={len(text)})")
        print(f"  ⚠ Tavily fetch looks blocked for {url} (len={len(text)})")

    text = _playwright_fetch(url, wait_selector=wait_selector, timeout=timeout)
    if not _looks_blocked(text):
        return text
    attempts.append(f"Stealth Playwright (len={len(text)})")
    print(f"  ⚠ Stealth fetch looks blocked for {url} (len={len(text)})")

    if FIRECRAWL_API_KEY:
        print("  → Retrying via Firecrawl...")
        text = _firecrawl_fetch(url)
        if not _looks_blocked(text):
            return text
        attempts.append(f"Firecrawl (len={len(text)})")

    raise RuntimeError(
        f"All fetch methods blocked for {url}: {', '.join(attempts)}. "
        "Set TAVILY_API_KEY and/or FIRECRAWL_API_KEY secrets to enable more fallbacks."
    )


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
        Stealth().use_sync(page)

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


def fetch_pdf(url: str) -> str:
    """
    Fetch text from a PDF URL via Firecrawl (Playwright cannot render PDFs).
    Raises RuntimeError if FIRECRAWL_API_KEY is not set.
    """
    if not FIRECRAWL_API_KEY:
        raise RuntimeError(
            f"PDF fetch requires FIRECRAWL_API_KEY to be set: {url}"
        )
    text = _firecrawl_fetch(url)
    if not text:
        raise RuntimeError(f"Firecrawl returned empty content for PDF: {url}")
    return text


def _tavily_fetch(url: str) -> str:
    resp = _requests.post(
        "https://api.tavily.com/extract",
        headers={"Authorization": f"Bearer {TAVILY_API_KEY}", "Content-Type": "application/json"},
        json={"urls": [url]},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])
    if not results:
        return ""
    return results[0].get("raw_content", "") or ""


def ocr_image_url(url: str, timeout: int = 20000) -> str:
    """
    Screenshot an image/SVG URL with Playwright and run Tesseract OCR on it.
    Used for content that's rendered as a graphic rather than page text
    (e.g. tariff illustrations). Returns the raw OCR'd text, or "" on failure.
    """
    import pytesseract
    from PIL import Image
    import io

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 800, "height": 800})
        try:
            page.goto(url, timeout=timeout, wait_until="networkidle")
            png_bytes = page.screenshot(full_page=True)
        finally:
            browser.close()

    image = Image.open(io.BytesIO(png_bytes))
    return pytesseract.image_to_string(image, lang="deu+eng")


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
