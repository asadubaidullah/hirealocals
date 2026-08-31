import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import SiteSetting
from sqlmodel import select

with next(get_session()) as session:
    settings = session.exec(select(SiteSetting)).all()
    for s in settings:
        print(s.key, '->', s.value)
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
