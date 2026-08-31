import subprocess

cmd = "python3 -c \"import sqlite3; conn = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db'); print([(u[0], u[1], u[3]) for u in conn.execute('SELECT id, email, full_name, role FROM user WHERE role=\\'admin\\'').fetchall()])\""
res = subprocess.run(["ssh", "hirealocals-prod", cmd], capture_output=True, text=True)
print("Admin users:", res.stdout)
