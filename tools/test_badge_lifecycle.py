import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import User, Notification
from app.main import admin_activity_badges, admin_activity_badges_clear, AdminBadgeClearRequest, add_notification
from sqlmodel import select

with next(get_session()) as session:
    admin = session.exec(select(User).where(User.role == 'admin')).first()
    
    # Add an unread notification for provider_application and custom_request
    n1 = add_notification(session, admin.id, 'provider_application', 'New provider application', 'Test applicant applied', '/admin/locals')
    n2 = add_notification(session, admin.id, 'custom_request', 'New custom request', 'Test custom request created', '/admin/requests')
    
    badges = admin_activity_badges(admin=admin, session=session)
    print('Badges after adding provider & request notifications:', badges)
    
    # Clear only provider applications
    res_clear = admin_activity_badges_clear(payload=AdminBadgeClearRequest(category='locals'), admin=admin, session=session)
    print('Badges after clearing locals:', res_clear)
    
    # Clear request notifications
    res_clear2 = admin_activity_badges_clear(payload=AdminBadgeClearRequest(category='requests'), admin=admin, session=session)
    print('Badges after clearing requests:', res_clear2)
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
