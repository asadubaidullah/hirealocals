import time
import urllib.request
import ssl
import subprocess

ctx = ssl.create_default_context()

# 1. Measure on-server localhost latency
print("=== ON-SERVER (LOCALHOST) LATENCY ===")
cmd = """python3 -c "
import time, urllib.request

urls = [
    'http://127.0.0.1:8000/healthz',
    'http://127.0.0.1:8000/api/content/site',
    'http://127.0.0.1:8000/api/content/blog',
    'http://127.0.0.1:8000/api/locals',
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3000/destinations',
    'http://127.0.0.1:3000/become-a-local',
    'http://127.0.0.1:3000/login',
]

for u in urls:
    t0 = time.time()
    try:
        with urllib.request.urlopen(u, timeout=5) as r:
            data = r.read()
            ms = (time.time() - t0) * 1000
            print(f'{u:35} -> {r.status} in {ms:6.1f}ms ({len(data)} bytes)')
    except Exception as e:
        print(f'{u:35} -> ERROR: {e}')
" """

res = subprocess.run(["ssh", "hirealocals-prod", cmd], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

# 2. Measure public HTTPS latency
print("\n=== PUBLIC HTTPS LATENCY (EDGE / SSL) ===")
public_urls = [
    "https://api.hirealocals.com/healthz",
    "https://api.hirealocals.com/api/content/site",
    "https://api.hirealocals.com/api/locals",
    "https://hirealocals.com/",
    "https://hirealocals.com/usa/new-york",
    "https://hirealocals.com/become-a-local",
    "https://hirealocals.com/login",
]

for u in public_urls:
    t0 = time.time()
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            data = r.read()
            ms = (time.time() - t0) * 1000
            print(f"{u:42} -> {r.status} in {ms:6.1f}ms ({len(data)} bytes)")
    except Exception as e:
        print(f"{u:42} -> ERROR: {e}")
