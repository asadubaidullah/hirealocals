import subprocess

cmd = "cat /home/awmnmeeypf/hirealocals-backend/.env /home/awmnmeeypf/hirealocals-frontend/.env* 2>/dev/null | grep -iE 'phone|support|contact|whatsapp'"
res = subprocess.run(["ssh", "hirealocals-prod", cmd], capture_output=True, text=True)
print("Remote env search output:")
print(res.stdout)
