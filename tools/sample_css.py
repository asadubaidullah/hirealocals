with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Sample lines every 2000 lines
for idx in range(0, len(lines), 2500):
    sample = lines[idx:idx+3]
    print(f"\n--- Line {idx+1} ---")
    for s in sample:
        print("  ", s.strip()[:100])
