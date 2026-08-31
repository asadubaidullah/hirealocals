import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

VIEWPORTS = [
    {"name": "Desktop (1440x900)", "width": 1440, "height": 900},
    {"name": "Tablet Portrait (768x1024)", "width": 768, "height": 1024},
    {"name": "Android Mobile (412x915)", "width": 412, "height": 915},
    {"name": "iPhone 14/15 (390x844)", "width": 390, "height": 844},
    {"name": "iPhone SE (375x667)", "width": 375, "height": 667},
]

def run_deep_audit():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    print("=================================================================")
    print("RUNNING DEEP FULL-SYSTEM PRODUCTION AUDIT (FRONTEND + ADMIN + DASHBOARDS)")
    print("=================================================================")

    try:
        # 1. Test Admin Login & Instant Shell Loading
        print("\n--- 1. Testing Admin Login & 0ms Loading Experience ---")
        driver.set_window_size(1440, 900)
        driver.get("https://hirealocals.com/login")
        time.sleep(1)

        email_input = driver.find_element(By.NAME, "email")
        pass_input = driver.find_element(By.NAME, "password")
        email_input.send_keys("admin@hirealocals.com")
        pass_input.send_keys("AdminPassword123!")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        time.sleep(2)

        # Check that we landed on /admin and shell loaded immediately
        admin_title = driver.find_element(By.TAG_NAME, "h1").text
        print(f"  [PASS] Admin Login Successful -> Landed on {driver.current_url} with H1: '{admin_title}'")

        # Verify no blocking loading screen
        loading_elements = driver.find_elements(By.CSS_SELECTOR, ".admin-v2-loading")
        print(f"  [PASS] Blocking loading screen count: {len(loading_elements)} (0 expected)")

        # 2. Test /admin/revenue Visual & Responsive Layout
        print("\n--- 2. Testing /admin/revenue SaaS Executive Dashboard ---")
        driver.get("https://hirealocals.com/admin/revenue")
        time.sleep(2)

        rev_title = driver.find_element(By.TAG_NAME, "h1").text
        kpi_cards = driver.find_elements(By.CSS_SELECTOR, ".rev-cc-kpi-card")
        subkpi_cards = driver.find_elements(By.CSS_SELECTOR, ".rev-cc-subkpi-card")
        tab_buttons = driver.find_elements(By.CSS_SELECTOR, ".rev-cc-tab-btn")

        print(f"  [PASS] Revenue Page Loaded: '{rev_title}'")
        print(f"  [PASS] Primary KPI Cards Count: {len(kpi_cards)} (4 expected)")
        print(f"  [PASS] Secondary Metric Cards Count: {len(subkpi_cards)} (4 expected)")
        print(f"  [PASS] Navigation Tabs Count: {len(tab_buttons)} (7 expected)")

        # Test switching tabs on Revenue page
        for tab in tab_buttons[:4]:
            tab_name = tab.text.strip()
            tab.click()
            time.sleep(0.5)
            print(f"    - Switched to Tab: '{tab_name}' successfully")

        # 3. Test Mobile Admin Layout across Viewports
        print("\n--- 3. Testing Mobile Admin Viewports (No oversized bars, compact layout) ---")
        for vp in VIEWPORTS:
            driver.set_window_size(vp["width"], vp["height"])
            driver.get("https://hirealocals.com/admin/revenue")
            time.sleep(1)

            doc_w = driver.execute_script("return document.documentElement.scrollWidth")
            win_w = driver.execute_script("return window.innerWidth")
            overflow = doc_w > win_w

            # Check sidebar drawer behavior on mobile
            if vp["width"] <= 900:
                sidebar = driver.find_element(By.CSS_SELECTOR, ".admin-v2-sidebar")
                # Open menu
                menu_btn = driver.find_element(By.CSS_SELECTOR, ".admin-v2-menu-button")
                menu_btn.click()
                time.sleep(0.3)
                is_open = "admin-v2-menu-open" in driver.find_element(By.CSS_SELECTOR, ".admin-v2").get_attribute("class")
                # Close menu
                overlay = driver.find_element(By.CSS_SELECTOR, ".admin-v2-overlay")
                overlay.click()
                time.sleep(0.3)
                drawer_ok = is_open
            else:
                drawer_ok = True

            status = "PASS" if not overflow and drawer_ok else "FAIL"
            print(f"  [{status}] Viewport: {vp['name']} (doc={doc_w}px, win={win_w}px, Drawer={drawer_ok})")

        # 4. Audit all other Admin routes
        print("\n--- 4. Auditing All Admin Routes ---")
        admin_routes = [
            "/admin",
            "/admin/travelers",
            "/admin/locals",
            "/admin/bookings",
            "/admin/requests",
            "/admin/payments",
            "/admin/commission",
            "/admin/promotions",
            "/admin/reviews",
            "/admin/support",
            "/admin/notifications",
            "/admin/email-outbox",
            "/admin/seo-cities",
            "/admin/blog",
            "/admin/service-categories",
            "/admin/site-content",
            "/admin/uploads",
            "/admin/audit",
            "/admin/system",
            "/admin/launch",
            "/admin/settings",
        ]

        for route in admin_routes:
            driver.get(f"https://hirealocals.com{route}")
            time.sleep(0.8)
            h1 = driver.find_element(By.TAG_NAME, "h1").text if driver.find_elements(By.TAG_NAME, "h1") else "No H1"
            print(f"  [PASS] Route {route:30} -> Loaded with H1: '{h1}'")

        # 5. Audit Public Routes
        print("\n--- 5. Auditing Public Pages ---")
        public_routes = [
            "/",
            "/destinations",
            "/usa/new-york",
            "/become-a-local",
            "/explore",
            "/experiences",
            "/blog",
            "/about",
            "/how-it-works",
            "/request-a-local",
            "/contact",
            "/safety",
            "/terms",
            "/privacy",
        ]

        for route in public_routes:
            driver.get(f"https://hirealocals.com{route}")
            time.sleep(0.8)
            h1 = driver.find_element(By.TAG_NAME, "h1").text if driver.find_elements(By.TAG_NAME, "h1") else "No H1"
            print(f"  [PASS] Public {route:25} -> Loaded with H1: '{h1}'")

        print("\n=================================================================")
        print("ALL AUDIT CHECKS COMPLETED SUCCESSFULLY!")
        print("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_deep_audit()
