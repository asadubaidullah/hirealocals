"""Small no-dependency smoke test for a running API.

Run: python scripts/smoke_test.py --base http://127.0.0.1:8000
"""
from __future__ import annotations
import argparse, json, sys
from urllib.request import urlopen
from urllib.error import HTTPError, URLError


def get(base:str,path:str):
    with urlopen(base.rstrip('/')+path,timeout=8) as r:
        return r.status,json.loads(r.read().decode())

def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:8000');args=ap.parse_args()
    checks=[('/api/health','health'),('/api/health/ready','readiness'),('/api/marketplace/config','marketplace config'),('/api/payments/config','payment config'),('/api/content/cities','city content'),('/api/content/service-categories','service categories'),('/api/search/locals?page=1&page_size=3','paginated local search')]
    failed=0
    for path,label in checks:
        try:
            code,data=get(args.base,path)
            if code==200: print(f'[ OK ] {label}')
            else: print(f'[FAIL] {label}: HTTP {code}');failed+=1
        except (HTTPError,URLError,TimeoutError,ValueError) as exc:
            print(f'[FAIL] {label}: {exc}');failed+=1
    print('Result:', 'PASS' if not failed else f'FAIL ({failed})')
    return 0 if not failed else 1
if __name__=='__main__':raise SystemExit(main())
