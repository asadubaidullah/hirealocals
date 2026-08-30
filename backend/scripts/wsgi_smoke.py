"""Run from cPanel 'Execute python script' before starting Passenger.

Expected output includes:
  STATUS: 200 OK
  BODY: {"status":"ok",...}
"""

import io
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

from hirealocals_wsgi import application

captured = {}


def start_response(status, headers):
    captured["status"] = status
    captured["headers"] = headers


environ = {
    "REQUEST_METHOD": "GET",
    "PATH_INFO": "/api/health",
    "QUERY_STRING": "",
    "SERVER_NAME": "api.hirealocals.com",
    "SERVER_PORT": "443",
    "SERVER_PROTOCOL": "HTTP/1.1",
    "REMOTE_ADDR": "127.0.0.1",
    "REMOTE_PORT": "12345",
    "HTTP_HOST": "api.hirealocals.com",
    "wsgi.url_scheme": "https",
    "wsgi.input": io.BytesIO(b""),
}

chunks = application(environ, start_response)
body = b"".join(chunks).decode("utf-8", errors="replace")
print("STATUS:", captured.get("status"))
print("BODY:", body)
