import subprocess

cmd = "python3 -c \"import sqlite3; conn = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db'); print('Admin Notifications:', conn.execute('SELECT id, kind, title, link, read_at FROM notification WHERE user_id=1').fetchall())\""
res = subprocess.run(["ssh", "hirealocals-prod", cmd], capture_output=True, text=True)
print(res.stdout)
