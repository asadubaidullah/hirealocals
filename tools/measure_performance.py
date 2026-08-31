import time
import urllib.request
import ssl
import json

ctx = ssl.create_default_context()

PUBLIC_ROUTES = [
    "https://hirealocals.com/",
    "https://hirealocals.com/destinations",
    "https://hirealocals.com/usa/new-york",
    "https://hirealocals.com/explore",
    "https://hirealocals.com/experiences",
    "https://hirealocals.com/blog",
    "https://hirealocals.com/about",
    "https://hirealocals.com/how-it-works",
    "https://hirealocals.com/request-a-local",
    "https://hirealocals.com/become-a-local",
    "https://hirealocals.com/contact",
    "https://hirealocals.com/login",
    "https://hirealocals.com/register",
    "https://hirealocals.com/terms",
    "https://hirealocals.com/privacy",
    "https://hirealocals.com/safety",
]

API_ROUTES = [
    "https://api.hirealocals.com/healthz",
    "https://api.hirealocals.com/api/content/site",
    "https://api.hirealocals.com/api/content/blog",
    "https://api.hirealocals.com/api/content/service-categories",
    "https://api.hirealocals.com/api/content/seo-cities",
    "https://api.hirealocals.com/api/locals",
]

def benchmark_urls(urls, title):
    print(f"\n=======================================================")
    print(f"BENCHMARKING: {title}")
    print(f"=======================================================")
    results = []
    
    for url in urls:
        times = []
        status = 0
        size = 0
        for _ in range(3):
            t0 = time.time()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                    data = resp.read()
                    status = resp.status
                    size = len(data)
                    times.append((time.time() - t0) * 1000)
            except Exception as e:
                times.append(-1)
                status = str(e)
            time.sleep(0.1)
        
        valid_times = [t for t in times if t > 0]
        avg_time = sum(valid_times) / len(valid_times) if valid_times else -1
        min_time = min(valid_times) if valid_times else -1
        
        # Classification
        if avg_time < 0:
            category = "FAILED"
        elif avg_time < 200:
            category = "<200ms (Fast)"
        elif avg_time < 500:
            category = "200-500ms (Good)"
        elif avg_time < 1000:
            category = "500ms-1s (Moderate)"
        elif avg_time < 3000:
            category = "1s-3s (Slow)"
        else:
            category = ">3s (Critical Bottleneck)"
            
        print(f"[{status}] {url:45} | Avg: {avg_time:6.1f}ms (Min: {min_time:6.1f}ms, Size: {size:6d}B) | {category}")
        results.append({
            "url": url,
            "status": status,
            "avg_ms": avg_time,
            "min_ms": min_time,
            "size_bytes": size,
            "category": category
        })
    return results

if __name__ == "__main__":
    benchmark_urls(API_ROUTES, "Backend API Endpoints")
    benchmark_urls(PUBLIC_ROUTES, "Frontend Public Routes")
