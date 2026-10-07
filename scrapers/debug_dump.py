"""One-off: find where DKV states a maximum price."""
import re
from browser import fetch_text

text = fetch_text("https://www.dkv-mobility.com/de/de/e-mobility/charging-e-vehicles/charging-on-the-road")
print(f"length={len(text)}")
for needle in [r"0,75", r"[Mm]aximal", r"[Mm]ax\.", r"H.chst", r"Obergrenze", r"Preisdeckel", r"Preisobergrenze"]:
    hits = list(re.finditer(needle, text))
    print(f"--- {needle}: {len(hits)} hits")
    for m in hits[:4]:
        print(repr(text[max(0, m.start() - 300): m.end() + 300]))
