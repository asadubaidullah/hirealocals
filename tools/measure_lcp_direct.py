import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def measure_lcp_live(url):
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(390, 844)

    # Register performance observer before navigation
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            window.__lcpEntries = [];
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    window.__lcpEntries.push({
                        name: entry.name,
                        startTime: entry.startTime,
                        size: entry.size,
                        url: entry.url,
                        id: entry.id,
                        element: entry.element ? entry.element.tagName + '.' + entry.element.className : ''
                    });
                }
            }).observe({type: 'largest-contentful-paint', buffered: true});
        """
    })

    try:
        driver.get(url)
        time.sleep(3)

        lcp_data = driver.execute_script("return window.__lcpEntries || [];")
        paints = driver.execute_script("return performance.getEntriesByType('paint');")
        nav = driver.execute_script("return performance.getEntriesByType('navigation')[0] || {};")

        fcp = 0
        for p in paints:
            if p.get("name") == "first-contentful-paint":
                fcp = p.get("startTime", 0)

        print(f"=== LIVE MOBILE PERFORMANCE RESULTS ({url}) ===")
        print(f"  TTFB (Time to First Byte): {nav.get('responseStart', 0):.1f} ms")
        print(f"  DOM Content Loaded: {nav.get('domContentLoadedEventEnd', 0):.1f} ms")
        print(f"  Page Load Event: {nav.get('loadEventEnd', 0):.1f} ms")
        print(f"  FCP (First Contentful Paint): {fcp:.1f} ms")
        
        if lcp_data:
            last = lcp_data[-1]
            print(f"  LCP (Largest Contentful Paint): {last['startTime']:.1f} ms")
            print(f"  LCP Element: <{last['element']}>")
            print(f"  LCP Resource URL: {last['url']}")
            print(f"  LCP Render Size: {last['size']} px")
        else:
            print("  LCP: No LCP entry recorded")

    finally:
        driver.quit()

if __name__ == "__main__":
    measure_lcp_live("https://hirealocals.com/")
    measure_lcp_live("https://hirealocals.com/become-a-local")
    measure_lcp_live("https://hirealocals.com/usa/new-york")
