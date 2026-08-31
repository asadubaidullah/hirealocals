import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User
from app.security import create_access_token
from sqlmodel import select

with next(get_session()) as session:
    admin = session.exec(select(User).where(User.role == 'admin')).first()
    token = create_access_token(admin)
    print('TOKEN:', token)
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
