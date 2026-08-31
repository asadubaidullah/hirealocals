import urllib.request
import re
import ssl
import json

ctx = ssl.create_default_context()

print("--- Testing /usa/new-york ---")
req = urllib.request.Request("https://hirealocals.com/usa/new-york", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, context=ctx) as resp:
    html = resp.read().decode("utf-8")

h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
print("H1 count:", len(h1s))
for h in h1s:
    clean_h = re.sub(r'<[^>]+>', '', h).strip()
    print("  H1 text:", clean_h)

schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
print("Schema count:", len(schemas))
for s in schemas:
    try:
        data = json.loads(s)
        if "@graph" in data:
            types = [item.get("@type") for item in data["@graph"]]
            print("  Schema graph types:", types)
    except Exception as e:
        print("  Schema JSON parse error:", e)

print("\n--- Testing /become-a-local ---")
req2 = urllib.request.Request("https://hirealocals.com/become-a-local", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req2, context=ctx) as resp:
    html2 = resp.read().decode("utf-8")

h1s2 = re.findall(r'<h1[^>]*>(.*?)</h1>', html2, re.DOTALL)
print("H1 count:", len(h1s2))
for h in h1s2:
    clean_h = re.sub(r'<[^>]+>', '', h).strip()
    print("  H1 text:", clean_h)

print("Form present:", 'class="bal-form-card"' in html2)
print("Apply ID present:", 'id="apply"' in html2)
