import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

VIEWPORTS = [
    {"name": "Desktop (1440x900)", "width": 1440, "height": 900},
    {"name": "Tablet Portrait (768x1024)", "width": 768, "height": 1024},
    {"name": "Android Mobile (412x915)", "width": 412, "height": 915},
    {"name": "iPhone 14/15 (390x844)", "width": 390, "height": 844},
    {"name": "iPhone SE (375x667)", "width": 375, "height": 667},
]

ROUTES = [
    "https://hirealocals.com/usa/new-york",
    "https://hirealocals.com/become-a-local"
]

def main():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    print("=== LIVE PRODUCTION MOBILE & RESPONSIVE QA AUDIT ===")

    all_passed = True

    try:
        for vp in VIEWPORTS:
            driver.set_window_size(vp["width"], vp["height"])
            print(f"\n--- Testing Viewport: {vp['name']} ({vp['width']}x{vp['height']}) ---")

            for route in ROUTES:
                driver.get(route)
                time.sleep(1.5)

                # Check horizontal overflow
                doc_width = driver.execute_script("return document.documentElement.scrollWidth")
                inner_width = driver.execute_script("return window.innerWidth")
                has_overflow = doc_width > inner_width

                # Check title
                title = driver.title

                # Check if elements are visible
                if "new-york" in route:
                    h1_elem = driver.find_element("tag name", "h1")
                    h1_visible = h1_elem.is_displayed()
                    status_str = f"H1: '{h1_elem.text}' (Visible: {h1_visible})"
                else:
                    form_elem = driver.find_element("css selector", ".bal-form-card")
                    form_visible = form_elem.is_displayed()
                    status_str = f"Provider Form Visible: {form_visible}"

                result = "PASS" if not has_overflow else f"FAIL (Overflow: doc={doc_width}px vs win={inner_width}px)"
                if has_overflow:
                    all_passed = False

                print(f"  [{result}] {route}")
                print(f"      -> {status_str}, Page Title: '{title}'")

    finally:
        driver.quit()

    print("\n" + "="*50)
    if all_passed:
        print("ALL RESPONSIVE & MOBILE QA CHECKS PASSED PERFECTLY (0 Overflow across all devices)!")
    else:
        print("SOME OVERFLOW CHECKS FAILED!")

if __name__ == "__main__":
    main()
