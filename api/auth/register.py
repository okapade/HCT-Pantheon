"""
api/auth/register.py — Vercel serverless endpoint
Handles user registration for Pantheon.

Changes from original:
  1. Sets a remember_me cookie when user opts in (30-day session)
  2. Logs new user to HCT-Pantheon Google Sheet (Users tab)
  3. Logs registration event to Activity Log tab

Required env vars (all already set for log-event.py):
  GOOGLE_SERVICE_ACCOUNT_JSON
  APP_BASE_URL
  SESSION_SECRET  (for signing session cookie — add if not present)

The frontend login page should:
  - Include a "Remember me" checkbox
  - Pass remember_me: true/false in the POST body
"""

import json
import os
import datetime
import hashlib
import hmac
import base64
from http.server import BaseHTTPRequestHandler

try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False

# ── Config ───────────────────────────────────────────────────────────────────
SHEET_ID       = '1gpVD1AyRe6UR4o_tU9nFMArczV7YX26ZLQrSWtwU8n0'
SCOPES         = ['https://spreadsheets.google.com/feeds',
                  'https://www.googleapis.com/auth/spreadsheets',
                  'https://www.googleapis.com/auth/drive']
SESSION_SECRET = os.environ.get('SESSION_SECRET', 'pantheon-session-secret-2026')
REMEMBER_DAYS  = 30
SESSION_DAYS   = 1  # Default session if remember_me not set


# ── Token helper ─────────────────────────────────────────────────────────────
def make_session_token(email: str, days: int) -> str:
    exp  = str(int((datetime.datetime.utcnow() +
                    datetime.timedelta(days=days)).timestamp()))
    payload = f"{email}:{exp}"
    sig  = hmac.new(SESSION_SECRET.encode(), payload.encode(),
                    hashlib.sha256).hexdigest()[:32]
    raw  = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip('=')


# ── Sheets helper ─────────────────────────────────────────────────────────────
def _get_credentials():
    raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    if not raw:
        return None
    try:
        return Credentials.from_service_account_info(json.loads(raw), scopes=SCOPES)
    except Exception as e:
        print(f'[register] Creds error: {e}')
        return None


def log_new_user_to_sheet(name: str, email: str, org: str = '', phone: str = ''):
    if not GSPREAD_AVAILABLE:
        print(f'[register] Would log new user: {email}')
        return
    creds = _get_credentials()
    if not creds:
        return
    try:
        gc    = gspread.authorize(creds)
        sheet = gc.open_by_key(SHEET_ID)
        now   = datetime.datetime.utcnow().isoformat()

        # Users tab
        ws = sheet.worksheet('Users')
        row = [name, email, phone, org, '',  # Name, Email, Phone, Org, Access Code
               '',   '',         now,  now,  # Date Invited, Invited By, First Login, Last Login
               '30', '0',        '0',  'Active']  # Days Remaining, Sims/Week, Total Sims, Status
        ws.append_row(row, value_input_option='USER_ENTERED')

        # Activity Log tab
        ws2 = sheet.worksheet('Activity Log')
        ws2.append_row([now, email, 'register', f'New account created — {org or "no org"}'],
                       value_input_option='USER_ENTERED')
    except Exception as e:
        print(f'[register] Sheet error: {e}')


# ── Handler ──────────────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length) or b'{}')
        except Exception:
            self._json(400, {'error': 'Invalid request body'})
            return

        email       = (body.get('email') or '').strip().lower()
        name        = (body.get('name') or '').strip()
        password    = body.get('password') or ''
        org         = (body.get('org') or body.get('organization') or '').strip()
        phone       = (body.get('phone') or '').strip()
        remember_me = bool(body.get('remember_me', False))

        # Basic validation
        if not email or '@' not in email:
            self._json(400, {'error': 'Valid email required'})
            return
        if not password or len(password) < 6:
            self._json(400, {'error': 'Password must be at least 6 characters'})
            return

        # ── Your actual user creation logic goes here ──────────────────────
        # Replace with your DB write / Firebase / Supabase / etc.
        # For now we assume success and proceed.
        # user = create_user_in_db(email, name, password, org)
        # ──────────────────────────────────────────────────────────────────

        # Log to Sheets (fire-and-forget)
        try:
            log_new_user_to_sheet(name, email, org, phone)
        except Exception as e:
            print(f'[register] Sheet log failed (non-fatal): {e}')

        # Issue session token
        days  = REMEMBER_DAYS if remember_me else SESSION_DAYS
        token = make_session_token(email, days)

        # Build Set-Cookie header
        max_age = days * 86400
        cookie  = (
            f'pantheon_session={token}; '
            f'Max-Age={max_age}; '
            f'Path=/; '
            f'HttpOnly; '
            f'SameSite=Lax; '
            + ('Secure; ' if os.environ.get('APP_BASE_URL', '').startswith('https') else '')
        )

        # Return success
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Set-Cookie', cookie)
        body_out = json.dumps({
            'ok': True,
            'email': email,
            'name': name,
            'remember_me': remember_me,
            'redirect': '/onboarding',
        }).encode()
        self.send_header('Content-Length', str(len(body_out)))
        self.end_headers()
        self.wfile.write(body_out)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors()
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args): pass
