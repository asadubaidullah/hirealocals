"""cPanel / CloudLinux Passenger startup file for HireALocals.

Application entry point configured in Setup Python App: ``application``.
"""

import os

_backend_dir = os.path.dirname(os.path.abspath(__file__))
if "staging" in _backend_dir.lower():
    _staging_db = os.path.abspath(os.path.join(_backend_dir, "hirealocals-staging.db"))
    os.environ["DATABASE_URL"] = f"sqlite:///{_staging_db}"

from app.wsgi_compat import HireALocalsWSGI

application = HireALocalsWSGI()
