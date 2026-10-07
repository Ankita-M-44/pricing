"""One-off: dump parts of the DKV, UTA and Aral source pages so their parsers can be written."""
import re
from browser import fetch_text, fetch_pdf

SOURCES = {
    "DKV service fees (PDF)": ("pdf", "https://www.dkv-mobility.com/content/dam/dkv/assets/documents/footer/service-fee-shop/servicefeelist-fleet-webshop-de-de-de.pdf"),
    "UTA fees page": ("text", "https://web.uta.com/de/hilfe/wie-viel-kostet-uta-tankkarte-welche-geb%C3%BChren"),
    "Aral tariffs page": ("text", "https://www.aral.de/de/global/retail/pulse/tarife-bezahlmethoden.html"),
}


def windows(text, needle, before, after, limit):
    out = []
    for m in list(re.finditer(needle, text))[:limit]:
        out.append(text[max(0, m.start() - before): m.end() + after])
    return out


for name, (kind, url) in SOURCES.items():
    print(f"\n===== {name} =====")
    try:
        text = fetch_pdf(url) if kind == "pdf" else fetch_text(url)
    except Exception as e:
        print(f"FETCH ERROR: {e}")
        continue
    print(f"length={len(text)}")
    if name.startswith("DKV"):
        print(f"HEAD: {text[:2500]!r}")
        for i, w in enumerate(windows(text, r"Charge", 300, 700, 6)):
            print(f"CHARGE[{i}]: {w!r}")
    elif name.startswith("UTA"):
        for i, w in enumerate(windows(text, r"eCharge", 500, 900, 6)):
            print(f"ECHARGE[{i}]: {w!r}")
    else:
        i = text.find("Ladesäulentarif")
        print(f"first Ladesäulentarif at {i}")
        print(f"ARAL: {text[max(0, i - 400): i + 7000]!r}")
