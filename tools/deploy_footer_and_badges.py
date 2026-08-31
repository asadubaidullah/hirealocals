import subprocess
import tarfile
import os

print("1. Creating clean frontend deploy package...")
def filter_tar(tarinfo):
    if "cache" in tarinfo.name or "node_modules" in tarinfo.name:
        return None
    return tarinfo

with tarfile.open("deploy_frontend.tar.gz", "w:gz") as tar:
    for folder in ["app", "components", "lib", "public"]:
        p = os.path.join("frontend", folder)
        if os.path.exists(p):
            tar.add(p, arcname=folder, filter=filter_tar)
    tar.add("frontend/.next", arcname=".next", filter=filter_tar)

size_mb = os.path.getsize("deploy_frontend.tar.gz") / (1024*1024)
print(f"   Frontend archive created: {size_mb:.2f} MB")

print("2. Uploading backend main.py to production...")
subprocess.run(["scp", "backend/app/main.py", "hirealocals-prod:/home/awmnmeeypf/hirealocals-backend/app/main.py"], check=True)

print("3. Uploading frontend archive to production...")
subprocess.run(["scp", "deploy_frontend.tar.gz", "hirealocals-prod:/home/awmnmeeypf/deploy_frontend.tar.gz"], check=True)

print("4. Extracting frontend and triggering app restarts...")
remote_cmd = """
cd /home/awmnmeeypf/hirealocals-frontend
tar -xzf /home/awmnmeeypf/deploy_frontend.tar.gz
mkdir -p tmp
touch tmp/restart.txt
rm -f /home/awmnmeeypf/deploy_frontend.tar.gz

cd /home/awmnmeeypf/hirealocals-backend
mkdir -p tmp
touch tmp/restart.txt
echo "Backend and Frontend successfully updated and restarted."
"""
res = subprocess.run(["ssh", "hirealocals-prod", remote_cmd], capture_output=True, text=True, check=True)
print(res.stdout)

# Clean up local archive
if os.path.exists("deploy_frontend.tar.gz"):
    os.remove("deploy_frontend.tar.gz")
print("Deployment completed successfully!")
