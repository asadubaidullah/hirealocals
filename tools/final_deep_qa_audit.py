import time
import json
import urllib.request
import ssl
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ctx = ssl.create_default_context()

VIEWPORTS = [
    {"name": "Desktop (1440x900)", "width": 1440, "height": 900},
    {"name": "Tablet Portrait (768x1024)", "width": 768, "height": 1024},
    {"name": "Android Mobile (412x915)", "width": 412, "height": 915},
    {"name": "iPhone 14/15 (390x844)", "width": 390, "height": 844},
    {"name": "iPhone SE (375x667)", "width": 375, "height": 667},
]

def audit_ny_page(driver):
    print("\n=======================================================")
    print("AUDITING: https://hirealocals.com/usa/new-york")
    print("=======================================================")
    
    driver.get("https://hirealocals.com/usa/new-york")
    time.sleep(2)
    
    # 1. Heading Hierarchy
    h1s = driver.find_elements(By.TAG_NAME, "h1")
    h2s = driver.find_elements(By.TAG_NAME, "h2")
    h3s = driver.find_elements(By.TAG_NAME, "h3")
    print(f"Heading Tree: H1={len(h1s)}, H2={len(h2s)}, H3={len(h3s)}")
    for i, h in enumerate(h1s):
        print(f"  H1[{i+1}]: {h.text}")
    for i, h in enumerate(h2s):
        print(f"  H2[{i+1}]: {h.text}")
        
    # 2. CTA Duplication Check
    buttons = driver.find_elements(By.CSS_SELECTOR, "a.btn, button.btn")
    print(f"\nCTAs found on page: {len(buttons)}")
    button_details = []
    for b in buttons:
        txt = b.text.strip().replace("\n", " ")
        href = b.get_attribute("href")
        button_details.append((txt, href))
        print(f"  CTA: '{txt}' -> {href}")

    # 3. Breadcrumbs
    breadcrumbs = driver.find_elements(By.CSS_SELECTOR, ".dest-breadcrumbs a, .dest-breadcrumbs span")
    bc_text = " > ".join([b.text for b in breadcrumbs if b.text])
    print(f"\nBreadcrumbs: {bc_text}")

    # 4. FAQs Rendering
    faqs = driver.find_elements(By.CSS_SELECTOR, ".dest-faq-item")
    print(f"\nFAQ Accordion count: {len(faqs)}")
    for i, f in enumerate(faqs):
        q = f.find_element(By.CSS_SELECTOR, "summary").text
        a = f.find_element(By.CSS_SELECTOR, ".dest-faq-a").text
        is_open = f.get_attribute("open") is not None
        print(f"  FAQ[{i+1}] (open={is_open}): Q: {q[:50]}... | A: {a[:60]}...")

    # 5. Structured Data Schema
    scripts = driver.find_elements(By.XPATH, "//script[@type='application/ld+json']")
    print(f"\nStructured Data Schema count: {len(scripts)}")
    for s in scripts:
        try:
            content = s.get_attribute("innerHTML")
            data = json.loads(content)
            if "@graph" in data:
                print("  @graph types:", [item.get("@type") for item in data["@graph"]])
            else:
                print("  Type:", data.get("@type"))
        except Exception as e:
            print("  JSON parse error:", e)

    # 6. Internal Links Check
    links = driver.find_elements(By.TAG_NAME, "a")
    hrefs = set()
    for l in links:
        h = l.get_attribute("href")
        if h and "hirealocals.com" in h:
            hrefs.add(h)
    print(f"\nInternal links to test: {len(hrefs)}")
    broken_links = []
    for h in hrefs:
        try:
            req = urllib.request.Request(h, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
                if r.status >= 400:
                    broken_links.append((h, r.status))
        except Exception as ex:
            broken_links.append((h, str(ex)))
    print(f"  Broken internal links count: {len(broken_links)}")
    if broken_links:
        for b in broken_links:
            print(f"    BROKEN: {b}")

    # 7. Locals rendered (inventory check)
    local_cards = driver.find_elements(By.CSS_SELECTOR, ".card")
    print(f"\nLocals / Guide cards rendered: {len(local_cards)}")
    for c in local_cards:
        try:
            h3 = c.find_element(By.TAG_NAME, "h3").text
            print(f"  Card: {h3}")
        except:
            pass


def audit_become_a_local_page(driver):
    print("\n=======================================================")
    print("AUDITING: https://hirealocals.com/become-a-local")
    print("=======================================================")
    
    driver.get("https://hirealocals.com/become-a-local")
    time.sleep(2)

    # 1. Heading Hierarchy
    h1s = driver.find_elements(By.TAG_NAME, "h1")
    h2s = driver.find_elements(By.TAG_NAME, "h2")
    h3s = driver.find_elements(By.TAG_NAME, "h3")
    print(f"Heading Tree: H1={len(h1s)}, H2={len(h2s)}, H3={len(h3s)}")
    for i, h in enumerate(h1s):
        print(f"  H1[{i+1}]: {h.text}")
    for i, h in enumerate(h2s):
        print(f"  H2[{i+1}]: {h.text}")

    # 2. Hero and Form Positioning
    hero = driver.find_element(By.CSS_SELECTOR, ".bal-hero-v2")
    form = driver.find_element(By.CSS_SELECTOR, ".bal-form-card")
    print(f"\nHero section location: {hero.location}, size: {hero.size}")
    print(f"Form section location: {form.location}, size: {form.size}")

    # 3. Form Controls
    inputs = driver.find_elements(By.CSS_SELECTOR, ".bal-form-card input, .bal-form-card select, .bal-form-card textarea, .bal-form-card button")
    print(f"\nForm controls count: {len(inputs)}")
    for inp in inputs:
        tag = inp.tag_name
        name = inp.get_attribute("name") or inp.get_attribute("type") or inp.text.strip()
        req = inp.get_attribute("required") is not None
        print(f"  Control: <{tag}> name='{name}' required={req}")

    # 4. Service Category Pills
    pills = driver.find_elements(By.CSS_SELECTOR, ".bal-cat-pill")
    print(f"\nCategory pills count: {len(pills)}")
    selected_pills = [p.text for p in pills if "selected" in p.get_attribute("class")]
    print(f"  Initially selected pills: {selected_pills}")

    # 5. Host FAQs
    faqs = driver.find_elements(By.CSS_SELECTOR, ".bal-faq-item")
    print(f"\nHost FAQ count: {len(faqs)}")
    for i, f in enumerate(faqs):
        q = f.find_element(By.CSS_SELECTOR, "summary").text
        a = f.find_element(By.CSS_SELECTOR, ".bal-faq-answer").text
        print(f"  FAQ[{i+1}]: Q: {q[:50]}... | A: {a[:60]}...")


def audit_viewport_overflow(driver):
    print("\n=======================================================")
    print("VIEWPORT OVERFLOW & LAYOUT INTEGRITY AUDIT")
    print("=======================================================")
    
    routes = [
        "https://hirealocals.com/usa/new-york",
        "https://hirealocals.com/become-a-local"
    ]
    
    for vp in VIEWPORTS:
        driver.set_window_size(vp["width"], vp["height"])
        print(f"\n--- Testing Viewport: {vp['name']} ({vp['width']}x{vp['height']}) ---")
        
        for r in routes:
            driver.get(r)
            time.sleep(1)
            
            doc_width = driver.execute_script("return document.documentElement.scrollWidth")
            inner_width = driver.execute_script("return window.innerWidth")
            overflow = doc_width > inner_width
            
            # Check for overlapping elements (form vs sidebar)
            if "become-a-local" in r and vp["width"] > 992:
                sidebar = driver.find_element(By.CSS_SELECTOR, ".bal-apply-sidebar")
                form = driver.find_element(By.CSS_SELECTOR, ".bal-apply-form-wrapper")
                side_rect = sidebar.rect
                form_rect = form.rect
                overlap = (side_rect['x'] + side_rect['width']) > form_rect['x']
            else:
                overlap = False

            status = "PASS" if not overflow and not overlap else "FAIL"
            print(f"  [{status}] {r} -> docWidth={doc_width}, winWidth={inner_width}, overlap={overlap}")

def main():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.set_window_size(1440, 900)
        audit_ny_page(driver)
        audit_become_a_local_page(driver)
        audit_viewport_overflow(driver)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
