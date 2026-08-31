import subprocess

cmd = "python3 -c \"import sqlite3; conn = sqlite3.connect('/home/awmnmeeypf/hirealocals-backend/hirealocals.db'); print(conn.execute('SELECT * FROM sitesetting').fetchall())\""
res = subprocess.run(["ssh", "hirealocals-prod", cmd], capture_output=True, text=True)
print("Return code:", res.returncode)
print("Output:", res.stdout)
print("Error:", res.stderr)
