import subprocess

def run_remote_python(script):
    full_script = "import sys\nsys.path.insert(0, '/home/awmnmeeypf/hirealocals-backend')\n" + script
    res = subprocess.run(
        ['ssh', 'hirealocals-prod', '/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python'],
        input=full_script,
        text=True,
        capture_output=True,
        timeout=30
    )
    return res.stdout, res.stderr

def run_ssh(cmd):
    res = subprocess.run(
        ['ssh', 'hirealocals-prod', cmd],
        text=True,
        capture_output=True,
        timeout=30
    )
    return res.stdout, res.stderr

print('=== 5. VERIFY PRODUCTION DB ROW COUNTS ===')
row_script = """
import sqlite3
c = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db').cursor()
for t in ['user', 'booking', 'review', 'paymentrecord', 'localprofile', 'service']:
    cnt = c.execute('SELECT count(1) FROM ' + t).fetchone()[0]
    print(t + ': ' + str(cnt))
"""
out, err = run_remote_python(row_script)
print(out)

print('=== 6. VERIFY SQLITE INTEGRITY CHECK ===')
integ_script = """
import sqlite3
c = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db').cursor()
res = c.execute('PRAGMA integrity_check').fetchall()
print('Integrity Check:', res)
"""
out, err = run_remote_python(integ_script)
print(out)

print('=== 7. VERIFY UPLOADS & PRIVATE_UPLOADS COUNT ===')
out, err = run_ssh('find ~/hirealocals-backend/uploads/ -type f | wc -l; find ~/hirealocals-backend/private_uploads/ -type f | wc -l')
lines = out.strip().splitlines()
print('uploads count:', lines[0] if len(lines) > 0 else 'N/A')
print('private_uploads count:', lines[1] if len(lines) > 1 else 'N/A')

print('=== 8 & 9. VERIFY ENVIRONMENT VARIABLES ===')
env_script = """
import os
from app.config import settings

safe_vars = {
    'APP_ENV': settings.app_env,
    'DATABASE_URL_SCHEME': settings.database_url.split('://')[0],
    'DATABASE_URL_PATH': settings.database_url.split(':////')[-1] if ':////' in settings.database_url else settings.database_url.split(':///')[-1],
    'PAYMENT_MODE': settings.payment_mode,
    'SAFEPAY_ENV': getattr(settings, 'safepay_env', 'sandbox'),
    'API_DOCS_ENABLED': settings.api_docs_enabled,
    'RATE_LIMIT_ENABLED': settings.rate_limit_enabled,
    'STRICT_PRODUCTION_CHECKS': settings.strict_production_checks,
    'SEED_DEMO_DATA': settings.seed_demo_data,
    'CORS_ORIGINS': settings.cors_origins,
}
for k, v in sorted(safe_vars.items()):
    print(k + ': ' + str(v))
"""
out, err = run_remote_python(env_script)
print(out)

print('=== 10. CHECK .HTACCESS MALFORMED SETENV ENTRIES ===')
out, err = run_ssh('grep "SetEnv" /home/awmnmeeypf/api.hirealocals.com/.htaccess')
print('api .htaccess SetEnv lines:')
print(out)
out2, err2 = run_ssh('grep "SetEnv" /home/awmnmeeypf/hirealocals.com/.htaccess')
print('hirealocals.com .htaccess SetEnv lines:')
print(out2)

print('=== 11. CHECK FRESH ERROR LOGS AFTER DEPLOYMENT ===')
out_be, err_be = run_ssh('tail -n 25 /home/awmnmeeypf/hirealocals-backend/stderr.log')
print('Backend stderr.log (last 25 lines):')
print(out_be if out_be.strip() else '(empty)')

out_fe, err_fe = run_ssh('tail -n 25 /home/awmnmeeypf/hirealocals-frontend/stderr.log')
print('Frontend stderr.log (last 25 lines):')
print(out_fe if out_fe.strip() else '(empty)')

print('=== 12. TEST PRODUCTION STATIC ROUTES ===')
routes = ['', 'destinations', 'experiences', 'about', 'how-it-works', 'request-a-local', 'explore', 'login', 'admin', 'terms', 'privacy', 'safety']
for r in routes:
    out, err = run_ssh('curl -s -o /dev/null -w "%{http_code}" https://hirealocals.com/' + r)
    print('/' + r + ': ' + out.strip())

print('=== 13. TEST DYNAMIC ROUTES ===')
dyn_script = """
import sqlite3, subprocess
c = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db').cursor()
city = c.execute('SELECT country_slug, slug FROM seocity WHERE published = 1 LIMIT 1').fetchone()
local = c.execute('SELECT slug FROM localprofile WHERE slug IS NOT NULL AND slug != "" LIMIT 1').fetchone()

if city:
    url_city = f'https://hirealocals.com/{city[0]}/{city[1]}'
    res = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url_city], capture_output=True, text=True)
    print(f'Dynamic City ({url_city}): {res.stdout.strip()}')

if local:
    url_local = f'https://hirealocals.com/locals/{local[0]}'
    res = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url_local], capture_output=True, text=True)
    print(f'Dynamic Local ({url_local}): {res.stdout.strip()}')
"""
out_dyn, err_dyn = run_remote_python(dyn_script)
print(out_dyn)

print('=== 14. TEST API HEALTH ENDPOINTS ===')
out_h, err_h = run_ssh('curl -s https://api.hirealocals.com/api/health')
print('/api/health:', out_h.strip())
out_hr, err_hr = run_ssh('curl -s https://api.hirealocals.com/api/health/ready')
print('/api/health/ready:', out_hr.strip())

print('=== 16. VERIFY BACKUP DIRECTORY ===')
out_bk, err_bk = run_ssh('ls -la /home/awmnmeeypf/backups/pre-b75c2cd-deploy-20260831/')
print(out_bk)
