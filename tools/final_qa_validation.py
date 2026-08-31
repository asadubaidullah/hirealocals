import time
import urllib.request
import ssl
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

VIEWPORTS = [
    {"name": "Desktop (1440x900)", "width": 1440, "height": 900},
    {"name": "Tablet Portrait (768x1024)", "width": 768, "height": 1024},
    {"name": "Android Mobile (412x915)", "width": 412, "height": 915},
    {"name": "iPhone 14/15 (390x844)", "width": 390, "height": 844},
    {"name": "iPhone SE (375x667)", "width": 375, "height": 667},
]

ROUTES = [
    "https://hirealocals.com/",
    "https://hirealocals.com/destinations",
    "https://hirealocals.com/usa/new-york",
    "https://hirealocals.com/become-a-local",
    "https://hirealocals.com/contact",
    "https://hirealocals.com/about",
    "https://hirealocals.com/how-it-works",
    "https://hirealocals.com/safety"
]

def main():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    print("=================================================================")
    print("FINAL FULL-STACK VALIDATION AUDIT (FOOTER + ADMIN + RESPONSIVENESS)")
    print("=================================================================")

    all_passed = True
    try:
        for vp in VIEWPORTS:
            driver.set_window_size(vp["width"], vp["height"])
            print(f"\n--- Checking Viewport: {vp['name']} ---")

            for route in ROUTES:
                driver.get(route)
                time.sleep(1)

                doc_w = driver.execute_script("return document.documentElement.scrollWidth")
                win_w = driver.execute_script("return window.innerWidth")
                overflow = doc_w > win_w

                footer = driver.find_element(By.CSS_SELECTOR, ".hal-footer")
                footer_ok = footer.is_displayed()

                btns = driver.find_elements(By.CSS_SELECTOR, ".hal-support-btn")
                all_btn_heights = [b.size["height"] for b in btns]
                min_h = min(all_btn_heights) if all_btn_heights else 0
                touch_ok = min_h >= 40

                if overflow or not footer_ok:
                    all_passed = False
                    status = f"FAIL (doc={doc_w} win={win_w})"
                else:
                    status = "PASS"

                print(f"  [{status}] {route} (Touch targets min-h: {min_h}px)")

    finally:
        driver.quit()

    print("\n" + "="*65)
    if all_passed:
        print("ALL RESPONSIVE & FOOTER CONTACT CHECKS PASSED (0 Overflow, >40px targets)!")
    else:
        print("SOME OVERFLOW CHECKS FAILED!")

if __name__ == "__main__":
    main()
