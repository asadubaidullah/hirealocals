import re

with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
    css = f.read()

print("Original CSS size:", len(css.encode('utf-8')) / 1024, "KB")

# Let's inspect the sections in globals.css
lines = css.splitlines()
print(f"Total lines: {len(lines)}")
