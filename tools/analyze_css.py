import re

with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print(f"Total characters: {len(text)}")
print(f"Total size: {len(text.encode('utf-8')) / 1024:.1f} KB")

# Find repeated blocks or large sections
sections = re.findall(r'/\*[\s\*=]*([A-Z0-9\s\-_–—]+)[\s\*=]*\*/', text)
print(f"Total comment section banners found: {len(sections)}")
for s in sections[:30]:
    s_clean = s.strip().replace('\n', ' ')
    if len(s_clean) > 3:
        print(f"  - {s_clean[:60]}")
