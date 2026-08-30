HireALocals V3.3.1 — Shared Hosting Passenger WSGI Compatibility Patch
=====================================================================

Purpose
-------
This patch keeps the existing FastAPI business logic, SQLModel database, auth,
bookings, admin, uploads and payment routes, but serves the route endpoint
functions through a native WSGI dispatcher for cPanel/CloudLinux Passenger.
It does not use a2wsgi and does not require Flask or a VPS.

Files in this patch
-------------------
app/wsgi_compat.py      Native WSGI compatibility runtime
hirealocals_wsgi.py     cPanel Python Application startup file
scripts/wsgi_smoke.py   Server-side health smoke test

It does NOT overwrite
---------------------
hirealocals.db
uploads/
private_uploads/
.env / cPanel environment variables
passenger_wsgi.py generated/managed by cPanel

Deploy
------
1. STOP the Python app in cPanel Setup Python App.
2. Extract this ZIP into:
   /home/awmnmeeypf/hirealocals-backend
   Allow overwrite for hirealocals_wsgi.py if asked.
3. Keep Python App settings:
   Application root: hirealocals-backend
   Application URL: api.hirealocals.com
   Startup file: hirealocals_wsgi.py
   Entry point: application
4. No new pip package is required. Do NOT run NPM.
5. In "Execute python script" run:
   scripts/wsgi_smoke.py
   Expected:
     STATUS: 200 OK
     BODY: {"status":"ok",...}
6. If smoke test passes, START/RESTART the Python app.
7. Test:
   https://api.hirealocals.com/api/health

Rollback
--------
If needed, restore the previous hirealocals_wsgi.py only. This patch does not
modify the database or user uploads.
