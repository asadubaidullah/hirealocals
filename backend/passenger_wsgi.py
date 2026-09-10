import importlib.machinery
import importlib.util
import os
import sys


_backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _backend_dir)

if "staging" in _backend_dir.lower():
    _staging_db = os.path.abspath(os.path.join(_backend_dir, "hirealocals-staging.db"))
    os.environ["DATABASE_URL"] = f"sqlite:///{_staging_db}"

def load_source(modname, filename):
    loader = importlib.machinery.SourceFileLoader(modname, filename)
    spec = importlib.util.spec_from_file_location(modname, filename, loader=loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module

wsgi = load_source('wsgi', 'hirealocals_wsgi.py')
application = wsgi.application
