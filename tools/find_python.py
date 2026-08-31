import subprocess
res = subprocess.run(["ssh", "hirealocals-prod", "which python3; which python3.13; find /home/awmnmeeypf/virtualenv -maxdepth 3 2>/dev/null"], capture_output=True, text=True)
print(res.stdout)
