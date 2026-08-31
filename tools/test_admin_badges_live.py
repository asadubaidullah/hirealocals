import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User, Notification
from sqlmodel import select

with next(get_session()) as session:
    admin = session.exec(select(User).where(User.role == 'admin')).first()
    print('Admin User:', admin.id, admin.email)
    
    # Check unread notifications
    unread = session.exec(select(Notification).where(Notification.user_id == admin.id, Notification.read_at == None)).all()
    print('Total Unread Notifications Count:', len(unread))
    for u in unread:
        print(f'  - [ID {u.id}] kind={u.kind} title={u.title} link={u.link} read_at={u.read_at}')
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
