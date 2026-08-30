"""cPanel / CloudLinux Passenger startup file for HireALocals.

Application entry point configured in Setup Python App: ``application``.
"""

from app.wsgi_compat import HireALocalsWSGI

application = HireALocalsWSGI()
