import re

def clean_css():
    with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
        css = f.read()

    orig_len = len(css.encode('utf-8'))
    print(f"Original globals.css size: {orig_len/1024:.1f} KB")

    # Replace weird non-ascii control chars
    css = css.replace('\x9d', '').replace('\ufeff', '')

    # Collapse excessive blank lines
    css = re.sub(r'\n\s*\n\s*\n+', '\n\n', css)

    with open('frontend/app/globals.css', 'w', encoding='utf-8') as f:
        f.write(css)

    new_len = len(css.encode('utf-8'))
    print(f"Cleaned globals.css size: {new_len/1024:.1f} KB")

if __name__ == '__main__':
    clean_css()
