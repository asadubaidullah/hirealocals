import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

VIEWPORTS = [
    {"name": "iPhone SE", "width": 375, "height": 667, "ua": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"},
    {"name": "iPhone 14/15", "width": 390, "height": 844, "ua": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"},
    {"name": "Android", "width": 412, "height": 915, "ua": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"},
    {"name": "Tablet Portrait", "width": 768, "height": 1024, "ua": "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"}
]

ROUTES = [
    # Core
    "/",
    "/destinations",
    "/experiences",
    "/about",
    "/how-it-works",
    "/request-a-local",
    "/explore",
    "/login",
    "/terms",
    "/privacy",
    "/safety",
    # Dynamic
    "/uk/london",
    "/locals/daniel-brooks-miami",
    # Dashboard / Admin
    "/admin",
    "/admin/revenue",
    "/dashboard/requests",
    "/dashboard/reviews",
    "/admin/requests",
    "/admin/reviews"
]

BASE_URL = "https://hirealocals.com"

def get_driver(vp):
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1200,900")
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    opts.add_experimental_option("mobileEmulation", {
        "deviceMetrics": {"width": vp["width"], "height": vp["height"], "pixelRatio": 3.0},
        "userAgent": vp["ua"]
    })
    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(35)
    return driver

def run_qa():
    os.makedirs("artifacts/mobile_qa", exist_ok=True)
    all_results = []
    
    for vp in VIEWPORTS:
        print(f"\n==========================================")
        print(f"Testing Viewport: {vp['name']} ({vp['width']}x{vp['height']})")
        print(f"==========================================")
        
        driver = get_driver(vp)
        
        for route in ROUTES:
            url = f"{BASE_URL}{route}"
            item_res = {
                "viewport": vp["name"],
                "width": vp["width"],
                "height": vp["height"],
                "route": route,
                "url": url,
                "status": "PASS",
                "issues": [],
                "console_errors": [],
                "details": {}
            }
            
            # Retry loop for network stability
            loaded = False
            for attempt in range(3):
                try:
                    driver.get(url)
                    time.sleep(1.0)
                    loaded = True
                    break
                except Exception as ex:
                    print(f"  Attempt {attempt+1} failed for {route}: {ex}. Retrying...")
                    time.sleep(2.0)
                    try:
                        driver.quit()
                    except:
                        pass
                    driver = get_driver(vp)
            
            if not loaded:
                item_res["status"] = "FAIL"
                item_res["issues"].append({
                    "type": "NETWORK_LOAD_FAILURE",
                    "severity": "P0",
                    "desc": f"Failed to load {url} after 3 attempts."
                })
                all_results.append(item_res)
                continue
            
            try:
                # 1. Check document dimensions & horizontal overflow
                doc_scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
                inner_w = driver.execute_script("return window.innerWidth")
                
                item_res["details"]["innerWidth"] = inner_w
                item_res["details"]["scrollWidth"] = doc_scroll_w
                
                if doc_scroll_w > inner_w + 1:
                    item_res["status"] = "FAIL"
                    item_res["issues"].append({
                        "type": "HORIZONTAL_OVERFLOW",
                        "severity": "P1",
                        "desc": f"Document scrollWidth ({doc_scroll_w}px) exceeds innerWidth ({inner_w}px) by {doc_scroll_w - inner_w}px"
                    })
                
                # 2. Check for overflowing DOM elements
                overflow_script = """
                var elements = document.querySelectorAll('*');
                var overflowing = [];
                for (var i = 0; i < elements.length; i++) {
                    var el = elements[i];
                    var rect = el.getBoundingClientRect();
                    if (rect.right > window.innerWidth + 2 && rect.width > 0 && rect.height > 0) {
                        var style = window.getComputedStyle(el);
                        if (style.overflow !== 'hidden' && style.display !== 'none') {
                            overflowing.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className ? el.className.toString() : '',
                                right: Math.round(rect.right),
                                width: Math.round(rect.width)
                            });
                        }
                    }
                }
                return overflowing.slice(0, 5);
                """
                overflowing_elements = driver.execute_script(overflow_script)
                if overflowing_elements and doc_scroll_w > inner_w + 1:
                    item_res["details"]["overflowing_elements"] = overflowing_elements
                
                # 3. Check for broken images
                img_script = """
                var imgs = document.querySelectorAll('img');
                var broken = [];
                for (var i = 0; i < imgs.length; i++) {
                    var img = imgs[i];
                    if (!img.complete || img.naturalWidth === 0) {
                        broken.push(img.src);
                    }
                }
                return broken;
                """
                broken_images = driver.execute_script(img_script)
                if broken_images:
                    item_res["details"]["broken_images"] = broken_images
                
                # 4. Check Navigation & Header
                nav_check = driver.execute_script("""
                var header = document.querySelector('header') || document.querySelector('nav') || document.querySelector('.market-header') || document.querySelector('.site-header');
                var logo = document.querySelector('a[href="/"]') || document.querySelector('.logo');
                return {
                    hasHeader: !!header,
                    hasLogo: !!logo,
                    logoWidth: logo ? Math.round(logo.getBoundingClientRect().width) : 0,
                    logoHeight: logo ? Math.round(logo.getBoundingClientRect().height) : 0
                };
                """)
                item_res["details"]["nav"] = nav_check
                
                # 5. Check Console Errors
                logs = driver.get_log("browser")
                for entry in logs:
                    level = entry.get("level", "")
                    msg = entry.get("message", "")
                    if level in ["SEVERE", "ERROR"]:
                        if "favicon" not in msg:
                            item_res["console_errors"].append(f"[{level}] {msg}")
                
                if item_res["console_errors"]:
                    for err in item_res["console_errors"]:
                        if "Hydration" in err or "Uncaught" in err:
                            item_res["status"] = "FAIL"
                            item_res["issues"].append({
                                "type": "CONSOLE_EXCEPTION",
                                "severity": "P1",
                                "desc": err
                            })
                
                # 6. Form control width check on forms
                inputs = driver.find_elements(By.CSS_SELECTOR, "input, select, textarea, button")
                item_res["details"]["interactive_controls_count"] = len(inputs)
                for inp in inputs:
                    try:
                        w = inp.size.get("width", 0)
                        if w > vp["width"] + 2:
                            item_res["status"] = "FAIL"
                            item_res["issues"].append({
                                "type": "ELEMENT_OVERFLOW",
                                "severity": "P1",
                                "desc": f"Interactive control exceeds viewport ({w}px > {vp['width']}px)"
                            })
                            break
                    except:
                        pass
                
            except Exception as ex:
                item_res["status"] = "FAIL"
                item_res["issues"].append({
                    "type": "EVAL_EXCEPTION",
                    "severity": "P0",
                    "desc": str(ex)
                })
            
            status_symbol = "PASS" if item_res["status"] == "PASS" else "FAIL"
            print(f"[{status_symbol}] {route:25} -> scrollWidth: {item_res['details'].get('scrollWidth', 'N/A')}/{vp['width']} | Issues: {len(item_res['issues'])} | Console Errors: {len(item_res['console_errors'])}")
            all_results.append(item_res)
        
        try:
            driver.quit()
        except:
            pass
    
    with open("tools/mobile_qa_results.json", "w") as f:
        json.dump(all_results, f, indent=2)
    
    print("\nMobile QA complete. Results stored in tools/mobile_qa_results.json")

if __name__ == "__main__":
    run_qa()
