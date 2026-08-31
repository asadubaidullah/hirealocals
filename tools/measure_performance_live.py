import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def measure_page(url, width, height, device_name):
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(width, height)

    try:
        t0 = time.time()
        driver.get(url)
        time.sleep(2.5) # Allow full paint and observers to settle

        # Extract Performance Metrics via PerformanceObserver
        perf_data = driver.execute_script("""
            const metrics = {
                fcp: 0,
                lcp: 0,
                lcpElement: '',
                lcpSize: 0,
                lcpUrl: '',
                resources: [],
                nav: performance.getEntriesByType('navigation')[0] || {}
            };

            const paints = performance.getEntriesByType('paint');
            paints.forEach(p => {
                if (p.name === 'first-contentful-paint') {
                    metrics.fcp = p.startTime;
                }
            });

            // Check if LCP entry exists in performance entries
            const lcps = performance.getEntriesByType('largest-contentful-paint');
            if (lcps.length > 0) {
                const lastLcp = lcps[lcps.length - 1];
                metrics.lcp = lastLcp.startTime;
                metrics.lcpSize = lastLcp.size;
                metrics.lcpUrl = lastLcp.url;
                metrics.lcpElement = lastLcp.element ? (lastLcp.element.tagName + '.' + lastLcp.element.className) : '';
            }

            const res = performance.getEntriesByType('resource');
            res.forEach(r => {
                if (r.initiatorType === 'img' || r.initiatorType === 'css' || r.initiatorType === 'script') {
                    metrics.resources.push({
                        name: r.name.split('/').pop().split('?')[0],
                        type: r.initiatorType,
                        duration: r.duration,
                        transferSize: r.transferSize
                    });
                }
            });

            return metrics;
        """)

        doc_w = driver.execute_script("return document.documentElement.scrollWidth")
        win_w = driver.execute_script("return window.innerWidth")

        return {
            "device": device_name,
            "width": width,
            "height": height,
            "fcp_ms": perf_data.get("fcp", 0),
            "lcp_ms": perf_data.get("lcp", 0),
            "lcpElement": perf_data.get("lcpElement", ""),
            "lcpUrl": perf_data.get("lcpUrl", ""),
            "overflow": doc_w > win_w,
            "resources": perf_data.get("resources", [])
        }

    finally:
        driver.quit()

def run_performance_audit():
    print("=================================================================")
    print("MEASURING LIVE PRODUCTION PERFORMANCE METRICS (https://hirealocals.com)")
    print("=================================================================")

    tests = [
        {"name": "Mobile iPhone SE", "w": 375, "h": 667},
        {"name": "Mobile iPhone 14/15", "w": 390, "h": 844},
        {"name": "Mobile Android", "w": 412, "h": 915},
        {"name": "Tablet Portrait", "w": 768, "h": 1024},
        {"name": "Desktop High-Res", "w": 1440, "h": 900},
    ]

    for t in tests:
        res = measure_page("https://hirealocals.com/", t["w"], t["h"], t["name"])
        print(f"\nDevice: {res['device']} ({res['width']}x{res['height']})")
        print(f"  FCP (First Contentful Paint): {res['fcp_ms']:.1f} ms")
        print(f"  LCP (Largest Contentful Paint): {res['lcp_ms']:.1f} ms")
        print(f"  LCP Element: '{res['lcpElement']}'")
        print(f"  LCP Resource URL: '{res['lcpUrl']}'")
        print(f"  Horizontal Overflow: {res['overflow']}")
        
        print("  Key Resources Loaded:")
        for r in res["resources"][:8]:
            print(f"    - {r['type']:6}: {r['name']:35} ({r['transferSize']/1024:6.1f} KB, {r['duration']:5.1f} ms)")

if __name__ == "__main__":
    run_performance_audit()
