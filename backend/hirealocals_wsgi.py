"""cPanel / CloudLinux Passenger startup file for HireALocals.

Application entry point configured in Setup Python App: ``application``.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

from app.wsgi_compat import HireALocalsWSGI

application = HireALocalsWSGI()
