"""Small dependency-free release smoke test for a running local/staging stack.

Usage:
    python scripts/final_qa.py
Optional environment variables:
    API_URL=http://127.0.0.1:8000
    FRONTEND_URL=http://localhost:3000
"""
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
import json, os, sys

API=os.getenv("API_URL","http://127.0.0.1:8000").rstrip("/")
WEB=os.getenv("FRONTEND_URL","http://localhost:3000").rstrip("/")
failures=[]

def check_json(name,url,expect_status=200):
    try:
        with urlopen(url,timeout=8) as r:
            data=json.loads(r.read().decode("utf-8"))
            ok=r.status==expect_status
            print(("PASS" if ok else "FAIL"),name,"->",r.status,data)
            if not ok: failures.append(name)
            return data
    except Exception as e:
        print("FAIL",name,"->",e);failures.append(name);return {}

def check_page(name,url):
    try:
        with urlopen(url,timeout=8) as r:
            body=r.read(150000).decode("utf-8","ignore")
            ok=r.status==200 and "HireA" in body
            print(("PASS" if ok else "FAIL"),name,"->",r.status)
            if not ok: failures.append(name)
    except Exception as e:
        print("FAIL",name,"->",e);failures.append(name)

check_json("API liveness",f"{API}/api/health")
check_json("API readiness",f"{API}/api/health/ready")
cfg=check_json("Marketplace config",f"{API}/api/marketplace/config")
for page,path in [("Homepage","/"),("Explore","/explore"),("Terms","/terms"),("Privacy","/privacy"),("Safety","/safety")]:
    check_page(page,WEB+path)

print("\nMarketplace mode:",cfg.get("marketplace_mode","unknown"),"| Payment mode:",cfg.get("payment_mode","unknown"))
print("Policy versions:",cfg.get("terms_version"),cfg.get("privacy_version"),cfg.get("booking_policy_version"))
if failures:
    print("\nQA FAILED:",", ".join(failures));sys.exit(1)
print("\nQA PASSED: core public stack is responding.")
