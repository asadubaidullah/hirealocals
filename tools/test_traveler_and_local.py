import time
import subprocess
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def get_role_tokens():
    cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User
from app.security import create_access_token
from sqlmodel import select

with next(get_session()) as session:
    users = session.exec(select(User)).all()
    out = {}
    for u in users:
        if u.role not in out:
            out[u.role] = {'token': create_access_token(u), 'name': u.full_name, 'role': u.role, 'email': u.email}
    import json
    print(json.dumps(out))
" """
    res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True, check=True)
    return json.loads(res.stdout)

TRAVELER_PAGES = [
    "/dashboard",
    "/dashboard/bookings",
    "/dashboard/messages",
    "/dashboard/profile",
    "/dashboard/requests",
    "/dashboard/reviews",
    "/dashboard/saved",
    "/dashboard/referrals",
    "/dashboard/notifications",
]

LOCAL_PAGES = [
    "/local-dashboard",
    "/local-dashboard/profile",
    "/local-dashboard/services",
    "/local-dashboard/availability",
    "/local-dashboard/bookings",
    "/local-dashboard/earnings",
    "/local-dashboard/messages",
    "/local-dashboard/opportunities",
    "/local-dashboard/reviews",
    "/local-dashboard/notifications",
]

def run_role_audits():
    tokens = get_role_tokens()
    print("Available Role Accounts:", list(tokens.keys()))

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=chrome_options)
    print("\n=======================================================")
    print("TESTING TRAVELER & LOCAL DASHBOARD AUTHENTICATED AUDIT")
    print("=======================================================")

    try:
        # 1. Test Traveler
        if "tourist" in tokens:
            t = tokens["tourist"]
            print(f"\n--- Testing Traveler Account ({t['email']}) ---")
            driver.get("https://hirealocals.com/")
            driver.execute_script(f"""
                localStorage.setItem('hal_token', '{t['token']}');
                localStorage.setItem('hal_role', '{t['role']}');
                localStorage.setItem('hal_name', '{t['name']}');
            """)
            time.sleep(0.5)

            for page in TRAVELER_PAGES:
                driver.get(f"https://hirealocals.com{page}")
                time.sleep(1)
                headings = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3")
                title_text = headings[0].text if headings else "No Title"
                doc_w = driver.execute_script("return document.documentElement.scrollWidth")
                win_w = driver.execute_script("return window.innerWidth")
                overflow = doc_w > win_w
                status = "PASS" if not overflow and len(headings) > 0 else "FAIL"
                print(f"  [{status}] Traveler: {page:26} | Title: '{title_text}' (overflow={overflow})")

        # 2. Test Local Host
        if "local" in tokens:
            l = tokens["local"]
            print(f"\n--- Testing Local Host Account ({l['email']}) ---")
            driver.get("https://hirealocals.com/")
            driver.execute_script(f"""
                localStorage.setItem('hal_token', '{l['token']}');
                localStorage.setItem('hal_role', '{l['role']}');
                localStorage.setItem('hal_name', '{l['name']}');
            """)
            time.sleep(0.5)

            for page in LOCAL_PAGES:
                driver.get(f"https://hirealocals.com{page}")
                time.sleep(1)
                headings = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3")
                title_text = headings[0].text if headings else "No Title"
                doc_w = driver.execute_script("return document.documentElement.scrollWidth")
                win_w = driver.execute_script("return window.innerWidth")
                overflow = doc_w > win_w
                status = "PASS" if not overflow and len(headings) > 0 else "FAIL"
                print(f"  [{status}] Host:     {page:26} | Title: '{title_text}' (overflow={overflow})")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_role_audits()
