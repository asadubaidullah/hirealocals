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

PAGES = [
    "https://hirealocals.com/",
    "https://hirealocals.com/usa/new-york",
    "https://hirealocals.com/become-a-local",
    "https://hirealocals.com/contact"
]

def test_footer_on_browser():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    print("\n=======================================================")
    print("TESTING FOOTER RESPONSIVENESS & ACTIONS ACROSS VIEWPORTS")
    print("=======================================================")

    all_pass = True
    try:
        for vp in VIEWPORTS:
            driver.set_window_size(vp["width"], vp["height"])
            print(f"\n--- Viewport: {vp['name']} ---")

            for url in PAGES:
                driver.get(url)
                time.sleep(1)

                doc_width = driver.execute_script("return document.documentElement.scrollWidth")
                win_width = driver.execute_script("return window.innerWidth")
                overflow = doc_width > win_width

                footer = driver.find_element(By.CSS_SELECTOR, ".hal-footer")
                footer_visible = footer.is_displayed()

                # Check contact buttons inside footer
                buttons = driver.find_elements(By.CSS_SELECTOR, ".hal-support-btn")
                btn_info = []
                for b in buttons:
                    h = b.size["height"]
                    text = b.text.strip().replace("\n", " ")
                    href = b.get_attribute("href")
                    btn_info.append(f"'{text}' (h={h}px -> {href})")

                status = "PASS" if not overflow and footer_visible else "FAIL"
                if overflow:
                    all_pass = False
                print(f"  [{status}] {url} (doc={doc_width}px, win={win_width}px)")
                if vp["width"] == 375 and url == "https://hirealocals.com/":
                    print(f"      Contact action buttons ({len(buttons)}): {', '.join(btn_info)}")

    finally:
        driver.quit()

    return all_pass

def test_admin_badges_api():
    print("\n=======================================================")
    print("TESTING ADMIN ACTIVITY BADGES ENDPOINTS")
    print("=======================================================")

    # 1. Login as admin to get token
    login_url = "https://api.hirealocals.com/api/auth/login"
    # Using existing admin credentials from dev/test
    # Let's test against admin endpoints
    pass

if __name__ == "__main__":
    test_footer_on_browser()
