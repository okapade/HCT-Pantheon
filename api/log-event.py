"""
api/log-event.py — Vercel serverless endpoint
Receives structured events from the Pantheon frontend and writes them
to the HCT-Pantheon Google Sheet.

Sheet ID: 1gpVD1AyRe6UR4o_tU9nFMArczV7YX26ZLQrSWtwU8n0
Tabs: Users | Activity Log | Simulations | AI Conversations | Product Interest

Setup:
  1. Add to requirements.txt:  gspread>=6.0.0  google-auth>=2.0.0
  2. Add to Vercel env vars:
       GOOGLE_SERVICE_ACCOUNT_JSON = <paste entire service account JSON as one line>
     OR (safer) store each field separately — see _get_credentials() below.
  3. Deploy — Vercel auto-wires this to /api/log-event

Usage (called from dashboard.js sheetsLogger):
  POST /api/log-event
  Body: { "tab": "Activity Log", "data": { ...row fields }, "ts": "ISO timestamp" }

Tab → column mapping:
  Users:            Name | Email | Phone | Organization | Access Code |
                    Date Invited | Invited By | First Login | Last Login |
                    Days Remaining | Simulations This Week | Total Simulations | Status
  Activity Log:     Timestamp | User | Action | Detail
  Simulations:      Timestamp | User | Org | Scenario | Facility |
                    Battery | Suppression | Status | Result
  AI Conversations: Timestamp | User | View | Message | Response
  Product Interest: Timestamp | User | Org | Product | Action
"""

import json
import os
import datetime
from http.server import BaseHTTPRequestHandler

# ── Dependency: gspread + google-auth ───────────────────────────────────────
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False

# ── Config ───────────────────────────────────────────────────────────────────
SHEET_ID   = '1gpVD1AyRe6UR4o_tU9nFMArczV7YX26ZLQrSWtwU8n0'
SCOPES     = ['https://spreadsheets.google.com/feeds',
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive']

# Column orders per tab (must match sheet headers exactly)
TAB_COLUMNS = {
    'Users': [
        'name', 'email', 'phone', 'org', 'access_code',
        'date_invited', 'invited_by', 'first_login', 'last_login',
        'days_remaining', 'simulations_this_week', 'total_simulations', 'status',
    ],
    'Activity Log': ['timestamp', 'user', 'action', 'detail'],
    'Simulations':  ['timestamp', 'user', 'org', 'scenario', 'facility',
                     'battery', 'suppression', 'status', 'result'],
    'AI Conversations': ['timestamp', 'user', 'view', 'message', 'response'],
    'Product Interest': ['timestamp', 'user', 'org', 'product', 'action'],
}


# ── Auth: load service account from env var ──────────────────────────────────
def _get_credentials():
    raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    if not raw:
        return None
    try:
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except Exception as e:
        print(f'[log-event] Credentials error: {e}')
        return None


# ── Sheet writer ─────────────────────────────────────────────────────────────
def write_to_sheet(tab: str, data: dict) -> bool:
    if not GSPREAD_AVAILABLE:
        print(f'[log-event] gspread not installed — would write to {tab}: {data}')
        return False

    creds = _get_credentials()
    if not creds:
        print('[log-event] No credentials — check GOOGLE_SERVICE_ACCOUNT_JSON env var')
        return False

    try:
        gc      = gspread.authorize(creds)
        sheet   = gc.open_by_key(SHEET_ID)
        ws      = sheet.worksheet(tab)
        columns = TAB_COLUMNS.get(tab, [])

        if tab == 'Users' and data.get('action') == 'last_login_update':
            # Update existing row instead of appending
            _update_user_login(ws, data)
            return True

        if columns:
            row = [str(data.get(col, '')) for col in columns]
        else:
            row = list(data.values())

        ws.append_row(row, value_input_option='USER_ENTERED')
        return True

    except Exception as e:
        print(f'[log-event] Sheet write error: {e}')
        return False


def _update_user_login(ws, data: dict):
    """Find user row by email, update Last Login and update status."""
    email = data.get('email', '')
    if not email:
        return
    try:
        cell = ws.find(email)
        if cell:
            # Col I = Last Login (index 9, 1-based)
            ws.update_cell(cell.row, 9, data.get('last_login', ''))
        else:
            # User not found — create row for new user
            now = datetime.datetime.utcnow().isoformat()
            row = [
                data.get('name', ''),  # Name
                email,                 # Email
                '',                    # Phone
                '',                    # Organization
                '',                    # Access Code
                '',                    # Date Invited
                '',                    # Invited By
                now,                   # First Login
                now,                   # Last Login
                '',                    # Days Remaining
                '',                    # Simulations This Week
                '0',                   # Total Simulations
                'Active',              # Status
            ]
            ws.append_row(row, value_input_option='USER_ENTERED')
    except Exception as e:
        print(f'[log-event] User update error: {e}')


# ── Vercel handler ────────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length) or b'{}')
            tab    = body.get('tab', 'Activity Log')
            data   = body.get('data', {})
            ts     = body.get('ts', datetime.datetime.utcnow().isoformat())
        except Exception:
            self._json(400, {'error': 'Invalid body'})
            return

        # Inject timestamp if missing
        if 'timestamp' not in data:
            data['timestamp'] = ts

        # Validate tab
        allowed_tabs = set(TAB_COLUMNS.keys())
        if tab not in allowed_tabs:
            self._json(400, {'error': f'Unknown tab: {tab}'})
            return

        ok = write_to_sheet(tab, data)
        self._json(200, {'ok': True, 'written': ok, 'tab': tab})

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
