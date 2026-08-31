import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User, Notification
from app.main import admin_activity_badges, admin_activity_badges_clear, AdminBadgeClearRequest
from sqlmodel import select

with next(get_session()) as session:
    admin = session.exec(select(User).where(User.role == 'admin')).first()
    print('Initial badges:', admin_activity_badges(admin=admin, session=session))
    
    # Test clearing support category
    res = admin_activity_badges_clear(payload=AdminBadgeClearRequest(category='support'), admin=admin, session=session)
    print('Result after clearing support:', res)
    
    # Verify underlying notifications still exist in full history
    all_notifs = session.exec(select(Notification).where(Notification.user_id == admin.id)).all()
    print('Total notification records in database (must be 5):', len(all_notifs))
    for n in all_notifs:
        print(f'  - ID {n.id}: read_at={n.read_at}')
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
