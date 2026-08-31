import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User, Notification
from app.main import admin_activity_badges, admin_activity_badges_clear, AdminBadgeClearRequest
from sqlmodel import select

with next(get_session()) as session:
    admin = session.exec(select(User).where(User.role == 'admin')).first()
    print('Testing admin_activity_badges handler:')
    badges = admin_activity_badges(admin=admin, session=session)
    print('  Badge counts:', badges)
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
