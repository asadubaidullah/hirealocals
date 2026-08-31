import subprocess

cmd = """/home/awmnmeeypf/virtualenv/hirealocals-backend/3.13/bin/python -c "
from app.database import get_session
from app.models import Notification
from sqlmodel import select, delete

with next(get_session()) as session:
    # Remove only the 2 test notifications we just added for provider_application and custom_request
    test_notes = session.exec(select(Notification).where(Notification.title.in_(['New provider application', 'New custom request']))).all()
    for n in test_notes:
        session.delete(n)
    session.commit()
    print(f'Cleaned up {len(test_notes)} test notifications.')
" """

res = subprocess.run(["ssh", "hirealocals-prod", "cd /home/awmnmeeypf/hirealocals-backend && " + cmd], capture_output=True, text=True)
print(res.stdout)
