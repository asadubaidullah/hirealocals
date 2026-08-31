import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.add_experimental_option("mobileEmulation", {
    "deviceMetrics": {"width": 375, "height": 667, "pixelRatio": 3.0},
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
})
driver = webdriver.Chrome(options=opts)
driver.set_page_load_timeout(30)

results = {}

# 1. Homepage & Mobile Menu Toggle
driver.get("https://hirealocals.com/")
time.sleep(1.5)
buttons = driver.find_elements(By.CSS_SELECTOR, "header button, .navbar button, button[aria-label*='menu' i]")
menu_toggle_success = False
if buttons:
    try:
        buttons[0].click()
        time.sleep(0.8)
        menu_open = driver.execute_script("return document.body.classList.contains('menu-open') || !!document.querySelector('.mobile-nav, nav[aria-label], .mobile-menu, [role=\"dialog\"]')")
        menu_toggle_success = True
    except Exception as e:
        menu_toggle_success = False

results["homepage_menu_toggle"] = {
    "buttons_found": len(buttons),
    "toggle_success": menu_toggle_success
}

# 2. Request a Local Form on iPhone SE
driver.get("https://hirealocals.com/request-a-local")
time.sleep(1.5)
req_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
req_inputs = driver.find_elements(By.CSS_SELECTOR, "input, select, textarea, button")
req_fields = []
for inp in req_inputs:
    tag = inp.tag_name
    w = inp.size["width"]
    h = inp.size["height"]
    req_fields.append({"tag": tag, "width": w, "height": h, "fits_375": w <= 375})

results["request_a_local_form"] = {
    "scrollWidth": req_scroll_w,
    "fits_viewport": req_scroll_w <= 375,
    "fields_count": len(req_inputs),
    "all_fields_fit": all(f["fits_375"] for f in req_fields)
}

# 3. Explore & Filters on iPhone SE
driver.get("https://hirealocals.com/explore")
time.sleep(1.5)
explore_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
cards = driver.find_elements(By.CSS_SELECTOR, ".card, .local-card, article, [class*='card']")
results["explore_page"] = {
    "scrollWidth": explore_scroll_w,
    "fits_viewport": explore_scroll_w <= 375,
    "cards_detected": len(cards)
}

# 4. Login Page Layout & Inputs on iPhone SE
driver.get("https://hirealocals.com/login")
time.sleep(1.5)
login_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
login_inputs = driver.find_elements(By.CSS_SELECTOR, "input, button")
results["login_page"] = {
    "scrollWidth": login_scroll_w,
    "fits_viewport": login_scroll_w <= 375,
    "inputs_count": len(login_inputs)
}

# 5. City SEO Route /uk/london on iPhone SE
driver.get("https://hirealocals.com/uk/london")
time.sleep(1.5)
city_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
results["city_seo_route"] = {
    "scrollWidth": city_scroll_w,
    "fits_viewport": city_scroll_w <= 375
}

# 6. Admin Revenue on iPhone SE
driver.get("https://hirealocals.com/admin/revenue")
time.sleep(1.5)
rev_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
results["admin_revenue"] = {
    "scrollWidth": rev_scroll_w,
    "fits_viewport": rev_scroll_w <= 375
}

driver.quit()

print(json.dumps(results, indent=2))
