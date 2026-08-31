import re

with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
    css = f.read()

classes = set(re.findall(r'\.([a-zA-Z0-9_\-]+)', css))
print(f"Total unique CSS classes in globals.css: {len(classes)}")

sample_classes = [c for c in sorted(classes) if 'hero' in c or 'card' in c or 'nav' in c or 'header' in c or 'footer' in c]
print("Sample matching classes:")
for c in sample_classes[:50]:
    print("  .", c)
