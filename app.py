import os, json, io, datetime, secrets, time, threading, hashlib
from flask import Flask, render_template, jsonify, request, Response, stream_with_context, session, redirect, url_for
from functools import wraps

try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError: pass
try:
    from fpdf import FPDF
except ImportError: FPDF = None

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET', 'pantheon-dev-secret-change-in-prod')
app.config['SESSION_COOKIE_SECURE']   = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=30)

ADMIN_PASSWORD     = os.environ.get('ADMIN_PASSWORD', 'pantheon-hct-2025')
ANTHROPIC_KEY      = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_KEY         = os.environ.get('OPENAI_API_KEY', '')
SIM_LIMIT_PER_WEEK = int(os.environ.get('SIM_LIMIT_PER_WEEK', '10'))
TRIAL_DAYS         = int(os.environ.get('TRIAL_DAYS', '90'))
SHEET_ID           = os.environ.get('GOOGLE_SHEET_ID', '')
SHEETS_CREDS       = os.environ.get('GOOGLE_SHEETS_CREDS', '')
SENDGRID_KEY       = os.environ.get('SENDGRID_API_KEY', '')
FROM_EMAIL         = os.environ.get('FROM_EMAIL', 'pantheon@hct-world.com')
TWILIO_SID         = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_TOKEN       = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE       = os.environ.get('TWILIO_PHONE', '')
OTP_ENABLED        = os.environ.get('OTP_ENABLED', 'false').lower() == 'true'

# ── Utilities ──────────────────────────────────────────────────────────────────

def hash_pw(pw): return pw.strip()
def now_str(): return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
def get_device_info():
    ua = request.headers.get('User-Agent', '')
    device  = 'Mobile' if any(m in ua.lower() for m in ['mobile','iphone','android','ipad']) else 'Desktop'
    browser = 'Chrome' if 'Chrome' in ua else 'Safari' if 'Safari' in ua else 'Firefox' if 'Firefox' in ua else 'Other'
    return device, browser

# ── Google Sheets ──────────────────────────────────────────────────────────────

def get_sheets():
    if not SHEET_ID or not SHEETS_CREDS:
        print(f"[SHEETS] Missing config: SHEET_ID={bool(SHEET_ID)} CREDS={bool(SHEETS_CREDS)}")
        return None
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        creds_dict = json.loads(SHEETS_CREDS)
        creds = Credentials.from_service_account_info(creds_dict, scopes=['https://www.googleapis.com/auth/spreadsheets'])
        svc = build('sheets', 'v4', credentials=creds)
        print(f"[SHEETS] Connected OK")
        return svc
    except json.JSONDecodeError as e:
        print(f"[SHEETS] CREDS JSON parse failed: {e}"); return None
    except ImportError as e:
        print(f"[SHEETS] Missing library: {e}"); return None
    except Exception as e:
        print(f"[SHEETS] Error: {type(e).__name__}: {e}"); return None

def sheets_append(tab, values):
    def _do():
        try:
            svc = get_sheets()
            if svc: svc.spreadsheets().values().append(spreadsheetId=SHEET_ID, range=f'{tab}!A:Z', valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS', body={'values': [values]}).execute()
        except Exception as e: print(f"Append error ({tab}): {e}")
    threading.Thread(target=_do, daemon=True).start()

def sheets_append_sync(tab, values):
    try:
        svc = get_sheets()
        if svc: svc.spreadsheets().values().append(spreadsheetId=SHEET_ID, range=f'{tab}!A:Z', valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS', body={'values': [values]}).execute()
    except Exception as e: print(f"Sync append error ({tab}): {e}")

def sheets_read(tab):
    try:
        svc = get_sheets()
        if not svc: return []
        return svc.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=f'{tab}!A:Z').execute().get('values', [])
    except Exception as e: print(f"Read error ({tab}): {e}"); return []

def sheets_update_cell(tab, row, col, value):
    def _do():
        try:
            svc = get_sheets()
            if svc: svc.spreadsheets().values().update(spreadsheetId=SHEET_ID, range=f'{tab}!{chr(64+col)}{row}', valueInputOption='USER_ENTERED', body={'values': [[value]]}).execute()
        except Exception as e: print(f"Update error: {e}")
    threading.Thread(target=_do, daemon=True).start()

def sheets_update_cell_sync(tab, row, col, value):
    try:
        svc = get_sheets()
        if svc: svc.spreadsheets().values().update(spreadsheetId=SHEET_ID, range=f'{tab}!{chr(64+col)}{row}', valueInputOption='USER_ENTERED', body={'values': [[value]]}).execute()
    except Exception as e: print(f"Sync update error: {e}")

# ── User management ────────────────────────────────────────────────────────────
import fcntl

USERS_FILE = '/tmp/pantheon_users.json'

def _load_users():
    try:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"[USERS] Load error: {e}")
    return {}

def _save_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            json.dump(users, f)
            fcntl.flock(f, fcntl.LOCK_UN)
    except Exception as e:
        print(f"[USERS] Save error: {e}")

def find_user(email):
    users = _load_users()
    u = users.get(email.strip().lower())
    if u:
        return [
            u.get('name',''), u.get('email',''), '', u.get('org',''),
            u.get('password',''), u.get('created',''), 'self-registered',
            '', '', '90', '0', '0', 'Active',
            u.get('email_verified','false'), u.get('role',''),
            u.get('facility_type',''), u.get('location',''),
            u.get('onboarding_complete','false'),
            '', ''
        ], email
    return None, -1

def save_user(email, data):
    users = _load_users()
    users[email.strip().lower()] = data
    _save_users(users)
    sheets_append('Users', [
        data.get('name',''), email, '', data.get('org',''),
        data.get('password',''), data.get('created',''), 'self-registered',
        '', '', '90', '0', '0', 'Active',
        data.get('email_verified','false'), data.get('role',''),
        data.get('facility_type',''), data.get('location',''),
        data.get('onboarding_complete','false')
    ])

def update_user(email, key, value):
    users = _load_users()
    em = email.strip().lower()
    if em in users:
        users[em][key] = value
        _save_users(users)

def get_user_profile(email):
    row, _ = find_user(email)
    if not row: return {}
    row = list(row) + [''] * (20 - len(row))
    return {
        'name':               row[0],
        'email':              row[1],
        'org':                row[3],
        'role':               row[14],
        'facility_type':      row[15],
        'location':           row[16],
        'onboarding_complete':row[17],
    }

# ── OTP / Token store ──────────────────────────────────────────────────────────

TOKENS_FILE = '/tmp/pantheon_tokens.json'

def _load_tokens():
    try:
        if os.path.exists(TOKENS_FILE):
            with open(TOKENS_FILE, 'r') as f:
                return json.load(f)
    except: pass
    return {}

def _save_tokens(t):
    try:
        with open(TOKENS_FILE, 'w') as f:
            json.dump(t, f)
    except Exception as e:
        print(f"[TOKENS] Save error: {e}")

def generate_verify_token(email):
    token = secrets.token_urlsafe(32)
    t = _load_tokens()
    t[token] = {'email': email, 'expires': time.time() + 86400}
    _save_tokens(t)
    print(f"[TOKEN] Generated for {email}")
    return token

def consume_verify_token(token):
    t = _load_tokens()
    entry = t.get(token)
    if not entry:
        print(f"[TOKEN] Not found in store (keys={len(t)})")
        return None
    if time.time() > entry['expires']:
        print(f"[TOKEN] Expired")
        del t[token]; _save_tokens(t)
        return None
    email = entry['email']
    del t[token]; _save_tokens(t)
    print(f"[TOKEN] Consumed OK for {email}")
    return email

def generate_otp(email, purpose='verify'): return '000000'
def verify_otp_code(email, code): return False

# ── Email sending ──────────────────────────────────────────────────────────────

def send_verify_link(to_email, token):
    if not SENDGRID_KEY:
        verify_url = f"https://hct-pantheon.vercel.app/verify?token={token}"
        print(f"[DEV] Verify link for {to_email}: {verify_url}")
        return True
    try:
        import httpx
        verify_url = f"https://hct-pantheon.vercel.app/verify?token={token}"
        subject = 'Verify your Pantheon account'
        body = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <img src="https://hct-pantheon.vercel.app/static/assets/PantheonLogoGold.png" width="36" style="margin-bottom:24px">
          <h2 style="font-size:22px;font-weight:700;color:#111110;margin:0 0 10px">Verify your email address</h2>
          <p style="font-size:14px;color:#5A5750;margin:0 0 28px;line-height:1.6">Click the button below to verify your email and complete your Pantheon account setup.</p>
          <a href="{verify_url}" style="display:inline-block;background:#111110;color:#ffffff;text-decoration:none;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;text-transform:uppercase">Verify My Account</a>
          <p style="font-size:12px;color:#9A9288;margin:24px 0 0;line-height:1.6">This link expires in 24 hours. If you did not create a Pantheon account, ignore this email.</p>
          <p style="font-size:11px;color:#C0BCB5;margin:12px 0 0">Or copy: <span style="color:#9A7A28">{verify_url}</span></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:11px">Pantheon Life Safety OS · HCT + Embedded Logix</p>
        </div>
        """
        resp = httpx.post('https://api.sendgrid.com/v3/mail/send',
            headers={'Authorization': f'Bearer {SENDGRID_KEY}', 'Content-Type': 'application/json'},
            json={'personalizations': [{'to': [{'email': to_email}]}], 'from': {'email': FROM_EMAIL, 'name': 'Pantheon'}, 'subject': subject, 'content': [{'type': 'text/html', 'value': body}]},
            timeout=15.0)
        return resp.status_code in (200, 202)
    except Exception as e:
        print(f"SendGrid error: {e}"); return False

def send_sms_otp(phone, code):
    if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE]): return False
    try:
        from twilio.rest import Client
        Client(TWILIO_SID, TWILIO_TOKEN).messages.create(body=f"Your Pantheon code: {code}", from_=TWILIO_PHONE, to=phone)
        return True
    except Exception as e: print(f"Twilio error: {e}"); return False

# ── Session helpers ────────────────────────────────────────────────────────────

def _create_session(email, row, row_num):
    session.permanent = True
    session['user_id']   = email
    session['user_name'] = row[0] if len(row) > 0 else ''
    session['user_org']  = row[3] if len(row) > 3 else ''
    session['user_role'] = row[14] if len(row) > 14 else ''
    session['onboarding_complete'] = (row[17] if len(row) > 17 else '') == 'true'
    now = now_str()
    if len(row) < 8 or not row[7]: sheets_update_cell_sync('Users', row_num, 8, now)
    sheets_update_cell('Users', row_num, 9, now)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'): return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        b = request.get_json(silent=True) or {}
        auth = request.headers.get('X-Admin-Password', '') or b.get('admin_password', '')
        if auth != ADMIN_PASSWORD: return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

# ── Conversation history helpers ───────────────────────────────────────────────

def get_recent_sessions(email, n=3):
    rows = sheets_read('Conversations')
    sessions_map = {}
    for row in rows[1:]:
        if len(row) < 6: continue
        if row[1].strip().lower() != email.strip().lower(): continue
        sid = row[3] if len(row) > 3 else ''
        if sid not in sessions_map: sessions_map[sid] = {'ts': row[0], 'messages': []}
        sessions_map[sid]['messages'].append({'role': row[4], 'content': row[5][:300]})
    sorted_sessions = sorted(sessions_map.values(), key=lambda x: x['ts'], reverse=True)[:n]
    return sorted_sessions

def get_open_actions(email):
    rows = sheets_read('Actions')
    open_actions = []
    for row in rows[1:]:
        if len(row) < 5: continue
        if row[1].strip().lower() != email.strip().lower(): continue
        if row[4].strip().lower() in ('open', 'deferred'): open_actions.append({'action': row[2], 'urgency': row[3], 'status': row[4], 'created': row[0]})
    return open_actions[:5]

def build_user_context(email):
    profile       = get_user_profile(email)
    sessions_data = get_recent_sessions(email, n=2)
    actions       = get_open_actions(email)
    ctx = f"""
USER PROFILE:
- Name: {profile.get('name', 'Unknown')}
- Role: {profile.get('role', 'Not specified')}
- Organisation: {profile.get('org', 'Not specified')}
- Location/Jurisdiction: {profile.get('location', 'Not specified')}
- Facility Type: {profile.get('facility_type', 'Not specified')}
"""
    if actions:
        ctx += "\nOPEN RECOMMENDED ACTIONS (from previous sessions):\n"
        for a in actions: ctx += f"- [{a['urgency']}] {a['action']} (status: {a['status']})\n"
    if sessions_data:
        ctx += "\nRECENT SESSION CONTEXT:\n"
        for i, s in enumerate(sessions_data):
            msgs = s.get('messages', [])
            if msgs: ctx += f"Session -{i+1}: {msgs[0]['content'][:200]}...\n"
    ctx += "\nTailor ALL responses to this user's role, facility type, jurisdiction, and open gaps."
    return ctx

# ── Pages ──────────────────────────────────────────────────────────────────────

@app.route('/login')
def login_page():
    if 'user_id' in session: return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/register')
def register_page():
    if 'user_id' in session: return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/onboarding')
@login_required
def onboarding_page():
    return render_template('onboarding.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/')
@login_required
def index():
    if not session.get('onboarding_complete'):
        return redirect(url_for('onboarding_page'))
    return render_template('dashboard.html')

@app.route('/dashboard')
@login_required
def dashboard_page():
    if not session.get('onboarding_complete'):
        return redirect(url_for('onboarding_page'))
    return render_template('dashboard.html')

# ── Auth API ───────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    b        = request.get_json()
    email    = (b.get('email', '')).strip().lower()
    password = b.get('password', '').strip()
    name     = b.get('name', '').strip()
    org      = b.get('org', '').strip()
    if not email or not password: return jsonify({"error": "Email and password required"}), 400
    if len(password) < 8: return jsonify({"error": "Password must be at least 8 characters"}), 400
    existing, _ = find_user(email)
    if existing: return jsonify({"error": "Account already exists. Sign in instead."}), 409
    save_user(email, {
        'name': name, 'email': email, 'password': password,
        'org': org, 'created': now_str(), 'email_verified': 'false',
        'onboarding_complete': 'false', 'role': '', 'facility_type': '', 'location': ''
    })
    print(f"[REGISTER] Saved user {email}")
    token = generate_verify_token(email)
    send_verify_link(email, token)
    if not SENDGRID_KEY:
        print(f"[DEV] http://localhost:5002/verify?token={token}")
    return jsonify({"ok": True})

@app.route('/verify')
def verify_email_link():
    token = request.args.get('token', '').strip()
    if not token: return redirect(url_for('login_page') + '?msg=missing_token')
    email = consume_verify_token(token)
    if not email: return redirect(url_for('login_page') + '?msg=invalid_token')
    row, row_num = find_user(email)
    if not row: return redirect(url_for('login_page') + '?msg=user_not_found')
    update_user(email, 'email_verified', 'true')
    row, row_num = find_user(email)
    _create_session(email, row, row_num)
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), email, row[0], '', 'Email Verified', '', '', '', '', device, browser])
    return redirect(url_for('onboarding_page'))

@app.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    b        = request.get_json()
    email    = (b.get('email', '') or b.get('identifier', '')).strip().lower()
    password = b.get('password', '').strip()
    if not email or not password: return jsonify({"error": "Email and password required"}), 400
    row, row_num = find_user(email)
    if not row:
        print(f"[LOGIN] No user found for email: {email}")
        return jsonify({"error": "Incorrect email or password"}), 401
    stored_pw   = (row[4] or '').strip()
    incoming_pw = password.strip()
    print(f"[LOGIN] email={email} stored_len={len(stored_pw)} incoming_len={len(incoming_pw)} match={stored_pw == incoming_pw} verified={row[13]!r}")
    if stored_pw != incoming_pw: return jsonify({"error": "Incorrect email or password"}), 401
    email_verified = row[13].strip().lower()
    if email_verified != 'true': return jsonify({"error": "email_not_verified", "email": email}), 403
    if len(row) >= 13 and row[12].strip().lower() == 'revoked': return jsonify({"error": "Access revoked. Contact HCT."}), 403
    days_left = TRIAL_DAYS
    if len(row) >= 6 and row[5]:
        try:
            created = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
            days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
        except: pass
    if days_left <= 0: return jsonify({"error": "Trial expired. Contact HCT to renew."}), 403
    if OTP_ENABLED:
        phone = row[2].strip() if len(row) > 2 else ''
        code = generate_otp(email, purpose='login')
        if phone: send_sms_otp(phone, code)
        session['otp_pending'] = email
        return jsonify({"otp_required": True})
    _create_session(email, row, row_num)
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), email, row[0], row[3] if len(row)>3 else '', 'Logged In', '', '', '', '', device, browser])
    onboarding_done = (row[17] if len(row) > 17 else '') == 'true'
    sims = int(row[10]) if len(row) > 10 and row[10] else 0
    return jsonify({"ok": True, "name": row[0], "onboarding_complete": onboarding_done, "days_left": days_left, "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims)})

@app.route('/api/auth/verify_otp', methods=['POST'])
def auth_verify_otp():
    b     = request.get_json()
    email = session.get('otp_pending', '')
    code  = (b.get('code', '')).strip()
    if not email: return jsonify({"error": "No pending session"}), 400
    if not verify_otp_code(email, code): return jsonify({"error": "Invalid or expired code"}), 401
    session.pop('otp_pending', None)
    row, row_num = find_user(email)
    if not row: return jsonify({"error": "User not found"}), 401
    _create_session(email, row, row_num)
    onboarding_done = (row[17] if len(row) > 17 else '') == 'true'
    return jsonify({"ok": True, "onboarding_complete": onboarding_done})

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    if 'user_id' in session:
        _summarise_session(session['user_id'], session.get('session_id', ''))
        sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), 'Logged Out', '', '', '', '', '', ''])
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/auth/me')
def auth_me():
    if 'user_id' not in session: return jsonify({"authenticated": False}), 401
    profile = get_user_profile(session['user_id'])
    row, _ = find_user(session['user_id'])
    sims = int(row[10]) if row and len(row) > 10 and row[10] else 0
    return jsonify({"authenticated": True, "name": session.get('user_name',''), "org": session.get('user_org',''), "role": session.get('user_role',''), "onboarding_complete": session.get('onboarding_complete', False), "profile": profile, "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims)})

# ── Onboarding API ─────────────────────────────────────────────────────────────

@app.route('/api/onboarding/save', methods=['POST'])
@login_required
def onboarding_save():
    b     = request.get_json()
    email = session['user_id']
    row, row_num = find_user(email)
    if not row: return jsonify({"error": "User not found"}), 404
    sheets_update_cell_sync('Users', row_num, 4,  b.get('org', ''))
    sheets_update_cell_sync('Users', row_num, 15, b.get('role', ''))
    sheets_update_cell_sync('Users', row_num, 16, b.get('facility_type', ''))
    sheets_update_cell_sync('Users', row_num, 17, b.get('location', ''))
    sheets_update_cell_sync('Users', row_num, 18, 'true')
    sheets_append_sync('Profiles', [
        now_str(), email, session.get('user_name',''),
        b.get('org',''), b.get('role',''), b.get('facility_type',''),
        b.get('location',''), b.get('chemistry',''), b.get('suppression',''),
        b.get('detection',''), b.get('modules',''), b.get('jurisdiction',''),
        json.dumps(b.get('extra', {}))
    ])
    session['onboarding_complete'] = True
    session['user_org']  = b.get('org', session.get('user_org',''))
    session['user_role'] = b.get('role', '')
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), email, session.get('user_name',''), b.get('org',''), 'Completed Onboarding', b.get('role',''), b.get('facility_type',''), b.get('location',''), '', device, browser])
    return jsonify({"ok": True})

@app.route('/api/onboarding/profile')
@login_required
def onboarding_profile():
    rows = sheets_read('Profiles')
    user_rows = [r for r in rows[1:] if len(r) > 1 and r[1].strip().lower() == session['user_id']]
    if not user_rows: return jsonify({})
    latest = user_rows[-1]
    keys = ['timestamp','email','name','org','role','facility_type','location','chemistry','suppression','detection','modules','jurisdiction','extra']
    profile = {keys[i]: latest[i] for i in range(min(len(keys), len(latest)))}
    if 'extra' in profile:
        try: profile['extra'] = json.loads(profile['extra'])
        except: pass
    return jsonify(profile)

# ── Actions API ────────────────────────────────────────────────────────────────

@app.route('/api/actions/log', methods=['POST'])
@login_required
def actions_log():
    b = request.get_json()
    actions = b.get('actions', [])
    sid = session.get('session_id', secrets.token_hex(4))
    for a in actions:
        sheets_append('Actions', [now_str(), session['user_id'], a.get('action',''), a.get('urgency','MEDIUM'), 'open', sid, b.get('source','simulation'), ''])
    return jsonify({"ok": True})

@app.route('/api/actions/update', methods=['POST'])
@login_required
def actions_update():
    b      = request.get_json()
    action = b.get('action', '')
    status = b.get('status', '')
    if not action or not status: return jsonify({"error": "action and status required"}), 400
    rows = sheets_read('Actions')
    for i, row in enumerate(rows[1:], start=2):
        if len(row) >= 3 and row[1].strip().lower() == session['user_id'] and row[2].strip() == action and row[4].strip() in ('open','deferred'):
            sheets_update_cell('Actions', i, 5, status)
            if status == 'accepted': sheets_update_cell('Actions', i, 8, now_str())
            if status == 'dismissed':
                sheets_append('Activity Log', [now_str(), session['user_id'], session.get('user_name',''), session.get('user_org',''), 'Action Dismissed', action, '', '', '', '', ''])
            break
    return jsonify({"ok": True})

@app.route('/api/actions/open')
@login_required
def actions_open():
    return jsonify({"actions": get_open_actions(session['user_id'])})

# ── Analytics API ──────────────────────────────────────────────────────────────

@app.route('/api/analytics/footprint')
@login_required
def analytics_footprint():
    email = session['user_id']
    profile_resp = onboarding_profile()
    profile = profile_resp.get_json() if hasattr(profile_resp, 'get_json') else {}
    rows = sheets_read('Simulations')
    week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    sims_week, sims_total = 0, 0
    for row in rows[1:]:
        if len(row) < 2: continue
        if row[1].strip().lower() != email: continue
        sims_total += 1
        try:
            ts = datetime.datetime.strptime(row[0].strip(), '%Y-%m-%d %H:%M:%S')
            if ts > week_ago: sims_week += 1
        except: pass
    action_rows = sheets_read('Actions')
    actions_open_count, actions_completed, actions_deferred, actions_dismissed = 0, 0, 0, 0
    for row in action_rows[1:]:
        if len(row) < 5: continue
        if row[1].strip().lower() != email: continue
        s = row[4].strip().lower()
        if s == 'open': actions_open_count += 1
        elif s == 'accepted': actions_completed += 1
        elif s == 'deferred': actions_deferred += 1
        elif s == 'dismissed': actions_dismissed += 1
    chemistry   = profile.get('chemistry', '')
    suppression = profile.get('suppression', '')
    detection   = profile.get('detection', '')
    gaps = []
    if chemistry in ('NMC','LFP','LCO','NCA') and suppression in ('FM-200','CO2','Halon','Dry Chemical'):
        gaps.append({'gap': f'{suppression} incompatible with {chemistry} thermal runaway', 'severity': 'CRITICAL', 'fix': 'F-500 EA Micelle Mist'})
    if detection in ('None','No',''):
        gaps.append({'gap': 'No off-gas detection installed', 'severity': 'HIGH', 'fix': 'Smart-LX Gateway + VESDA'})
    return jsonify({
        'profile': profile,
        'week': {'simulations': sims_week, 'actions_open': actions_open_count, 'actions_completed': actions_completed, 'actions_deferred': actions_deferred, 'actions_dismissed': actions_dismissed},
        'totals': {'simulations': sims_total},
        'gaps': gaps,
        'suppression_score': 0 if any(g['severity'] == 'CRITICAL' for g in gaps) else (50 if gaps else 100),
        'detection_score':   0 if detection in ('None','No','') else 100,
        'generated_at': now_str()
    })

# ── Admin ──────────────────────────────────────────────────────────────────────

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def admin_users():
    rows = sheets_read('Users')
    users = []
    for row in rows[1:]:
        if len(row) < 5: continue
        days_left = TRIAL_DAYS
        if len(row) >= 6 and row[5]:
            try:
                created = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
                days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
            except: pass
        users.append({"name": row[0], "email": row[1], "org": row[3] if len(row)>3 else '', "role": row[14] if len(row)>14 else '', "facility": row[15] if len(row)>15 else '', "location": row[16] if len(row)>16 else '', "onboarded": (row[17] if len(row)>17 else '') == 'true', "days_left": days_left, "total_sims": int(row[11]) if len(row)>11 and row[11] else 0, "last_login": row[8] if len(row)>8 and row[8] else 'Never', "status": row[12] if len(row)>12 else 'Active'})
    return jsonify({"users": users})

@app.route('/api/admin/revoke', methods=['POST'])
@admin_required
def admin_revoke():
    b = request.get_json()
    email = (b.get('email','')).strip().lower()
    row, row_num = find_user(email)
    if row and row_num > 0:
        sheets_update_cell('Users', row_num, 13, 'Revoked')
        return jsonify({"ok": True})
    return jsonify({"error": "User not found"}), 404

@app.route('/api/admin/reset_password', methods=['POST'])
@admin_required
def admin_reset_password():
    b = request.get_json()
    email = (b.get('email','')).strip().lower()
    new_pw = b.get('password','').strip()
    if not email or not new_pw: return jsonify({"error": "Email and password required"}), 400
    row, row_num = find_user(email)
    if not row: return jsonify({"error": "User not found"}), 404
    sheets_update_cell_sync('Users', row_num, 5, new_pw.strip())
    return jsonify({"ok": True})

# ── Telemetry ──────────────────────────────────────────────────────────────────

@app.route('/api/telemetry/action', methods=['POST'])
@login_required
def api_log_action():
    b = request.get_json()
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), b.get('action',''), b.get('detail1',''), b.get('detail2',''), b.get('detail3',''), b.get('time_spent',''), device, browser])
    return jsonify({"ok": True})

@app.route('/api/telemetry/simulation', methods=['POST'])
@login_required
def api_log_simulation():
    b = request.get_json()
    sheets_append('Simulations', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), b.get('facility_type',''), b.get('chemistry',''), b.get('modules',''), b.get('suppression',''), b.get('mode',''), b.get('acts',''), b.get('pdf_exported','No'), b.get('ai_questions',0), b.get('top_question',''), b.get('recos_viewed','No'), b.get('impact_shown','No')])
    row, row_num = find_user(session.get('user_id',''))
    if row and row_num > 0:
        sims  = int(row[10]) if len(row) > 10 and row[10] else 0
        total = int(row[11]) if len(row) > 11 and row[11] else 0
        sheets_update_cell('Users', row_num, 11, str(sims + 1))
        sheets_update_cell('Users', row_num, 12, str(total + 1))
    return jsonify({"ok": True})

@app.route('/api/telemetry/product', methods=['POST'])
@login_required
def api_log_product():
    b = request.get_json()
    sheets_append('Product Interest', [now_str(), session.get('user_id',''), session.get('user_org',''), b.get('product',''), b.get('source',''), b.get('time_on',0), b.get('clicked_learn_more','No')])
    return jsonify({"ok": True})

# ── Incident data ──────────────────────────────────────────────────────────────

def load_data():
    with open(os.path.join(os.path.dirname(__file__), 'data', 'incident.json')) as f:
        return json.load(f)

@app.route('/api/incident')
@login_required
def api_incident(): return jsonify(load_data())

@app.route('/api/status')
@login_required
def api_status():
    row, _ = find_user(session.get('user_id',''))
    sims = int(row[10]) if row and len(row) > 10 and row[10] else 0
    return jsonify({"has_key": bool(get_key()), "model": "claude-sonnet-4-20250514" if ANTHROPIC_KEY else "gpt-4o", "user": session.get('user_name',''), "org": session.get('user_org',''), "role": session.get('user_role',''), "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims), "otp_enabled": OTP_ENABLED})

# ── AI streaming ───────────────────────────────────────────────────────────────

BASE_SYSTEM = """You are Pantheon AI — a senior NFPA fire investigator and life safety intelligence engine. Precise, authoritative, evidence-driven.

VOICE: Cite specific assets by name and ID. Use timestamps. Reference NFPA/NEC/UL standards relevant to their jurisdiction. Explain WHY suppression failed chemically. F-500 EA Micelle Mist is the primary recommended countermeasure for Li-ion. No markdown headers. Plain paragraphs. Use specific numbers. Tailor everything to their facility type and role.

{user_context}

INCIDENT DATA:
{incident_data}
"""

FULL_PROMPTS  = {0:"Narrate ACT 00 — BASELINE REALITY. 24 hours before.",1:"Narrate ACT 01 — RISK ACCUMULATION. 30-day window.",2:"Narrate ACT 02 — STATE CHANGE. Second by second.",3:"Narrate ACT 03 — CASCADE & CONSTRAINT. 22 hours uncontrolled.",4:"Narrate ACT 04 — POST-EVENT INTEL. Root causes and recommendations."}
PARTIAL_PROMPTS={0:"Narrate ACT 00 — BASELINE (PARTIAL). Off-gas detection installed.",1:"Narrate ACT 01 — EARLY WARNING at T-25 minutes.",2:"Narrate ACT 02 — CONTAINED. 12 modules, EPO works.",3:"Narrate ACT 03 — CONTROLLED RESPONSE. 8 firefighters, 3 hours.",4:"Narrate ACT 04 — NEAR-MISS. $3.2M vs $47M. F-500 EA still needed."}

def get_key(): return ANTHROPIC_KEY or OPENAI_KEY

def _build_system(email=''):
    user_ctx = build_user_context(email) if email else ''
    return BASE_SYSTEM.format(user_context=user_ctx, incident_data=json.dumps(load_data(), indent=2))

def _stream_anthropic(messages):
    import httpx
    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post("https://api.anthropic.com/v1/messages", headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-4-20250514", "max_tokens": 2000, "system": messages[0]["content"], "messages": [m for m in messages[1:] if m["role"] != "system"], "stream": True}, timeout=90.0)
            for line in r.iter_lines():
                if not line.startswith("data: "): continue
                ch = line[6:]
                if ch == "[DONE]": yield "data: [DONE]\n\n"; break
                try:
                    o = json.loads(ch)
                    if o.get("type") == "content_block_delta":
                        d = o.get("delta", {})
                        if "text" in d: yield f"data: {json.dumps({'content': d['text']})}\n\n"
                except: continue
    return Response(stream_with_context(gen()), mimetype='text/event-stream')

def _stream_openai(messages):
    import httpx
    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post("https://api.openai.com/v1/chat/completions", headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
                json={"model": "gpt-4o", "messages": messages, "stream": True, "max_tokens": 2000, "temperature": 0.7}, timeout=90.0)
            for line in r.iter_lines():
                if line.startswith("data: "):
                    ch = line[6:]
                    if ch == "[DONE]": yield "data: [DONE]\n\n"; break
                    try:
                        o = json.loads(ch)
                        d = o["choices"][0].get("delta", {})
                        if "content" in d: yield f"data: {json.dumps({'content': d['content']})}\n\n"
                    except: continue
    return Response(stream_with_context(gen()), mimetype='text/event-stream')

def _stream(messages): return _stream_anthropic(messages) if ANTHROPIC_KEY else _stream_openai(messages)

def _summarise_session(email, session_id):
    if not session_id or not get_key(): return
    try:
        rows = sheets_read('Conversations')
        msgs = [r for r in rows[1:] if len(r) > 4 and r[1].strip().lower() == email and r[3] == session_id]
        if len(msgs) < 2: return
        content = ' | '.join([r[5][:100] for r in msgs[-6:]])
        import httpx
        resp = httpx.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
            json={"model": "claude-haiku-4-5-20251001", "max_tokens": 150,
                  "messages": [{"role": "user", "content": f"Summarise this Pantheon session in 2 sentences: {content}"}]},
            timeout=20.0)
        summary = resp.json().get('content', [{}])[0].get('text', '')
        if summary:
            sheets_append('Conversations', [now_str(), email, '', session_id, 'summary', summary, ''])
    except Exception as e: print(f"Summary error: {e}")

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    b   = request.get_json()
    msg = b.get('message', '')
    sid = session.setdefault('session_id', secrets.token_hex(4))
    sys = _build_system(session['user_id'])
    msgs = [{"role": "system", "content": sys}]
    for h in (b.get('history', []))[-10:]:
        msgs.append({"role": h["role"], "content": h["content"]})
    msgs.append({"role": "user", "content": msg})
    sheets_append('AI Conversations', [now_str(), session.get('user_id',''), session.get('user_org',''), msg[:500], 'home', '', '', '', ''])
    return _stream(msgs)

@app.route('/api/simulate/<mode>/<int:act_id>', methods=['POST'])
@login_required
def api_simulate(mode, act_id):
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    if act_id == 0:
        row, _ = find_user(session.get('user_id',''))
        sims = int(row[10]) if row and len(row) > 10 and row[10] else 0
        if sims >= SIM_LIMIT_PER_WEEK: return jsonify({"error": "Weekly simulation limit reached", "limit": SIM_LIMIT_PER_WEEK}), 429
    prompts = FULL_PROMPTS if mode == 'full' else PARTIAL_PROMPTS
    if act_id not in prompts: return jsonify({"error": "Invalid act"}), 400
    sys = _build_system(session['user_id'])
    if mode == 'partial': sys += "\nIMPORTANT: PARTIAL FAILURE scenario. Early detection limited damage."
    msgs = [{"role": "system", "content": sys}, {"role": "user", "content": prompts[act_id]}]
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), session['user_id'], session.get('user_name',''), session.get('user_org',''), 'Ran Simulation', f'Act {act_id}', mode, '', '', device, browser])
    return _stream(msgs)

# ── PDF report ─────────────────────────────────────────────────────────────────

@app.route('/api/report/pdf', methods=['POST'])
@login_required
def api_report_pdf():
    if FPDF is None: return jsonify({"error": "fpdf2 not installed"}), 500
    b    = request.get_json()
    mode = b.get('mode', 'full')
    acts = b.get('acts', [])
    data = load_data()
    inc  = data['incident']
    sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), 'Exported PDF', mode, f'{len(acts)} acts', '', '', '', ''])
    def safe(t):
        return str(t).replace('\u2014','-').replace('\u2013','-').replace('\u2018',"'").replace('\u2019',"'").replace('\u201c','"').replace('\u201d','"').replace('\u2026','...').replace('\u00b0','deg').replace('\u00ae','(R)').replace('\u2212','-')
    pdf = FPDF(); pdf.set_auto_page_break(auto=True, margin=20); pdf.add_page()
    pdf.set_font('Helvetica', 'B', 18); pdf.cell(0, 10, safe('PANTHEON — Life Safety OS'), ln=True)
    pdf.cell(0, 8, safe('Incident Reconstruction Report'), ln=True)
    pdf.set_font('Helvetica', '', 9); pdf.set_text_color(100,100,100)
    pdf.cell(0, 5, safe(f'{"Full" if mode=="full" else "Partial"} Failure  |  {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}  |  {session.get("user_org","")}'), ln=True)
    pdf.ln(4); pdf.set_draw_color(180,180,180); pdf.line(10, pdf.get_y(), 200, pdf.get_y()); pdf.ln(4)
    pdf.set_text_color(0,0,0); pdf.set_font('Helvetica','B',11); pdf.cell(0, 7, safe(inc.get('title','')), ln=True)
    names = ['Baseline Reality','Risk Accumulation','State Change','Cascade & Constraint','Post-Event Intel']
    for i, text in enumerate(acts[:5]):
        pdf.set_font('Helvetica','B',10); pdf.set_text_color(0,0,0); pdf.cell(0, 7, f'ACT {i:02d} — {names[i]}', ln=True)
        pdf.set_font('Helvetica','',9); pdf.set_text_color(60,60,60)
        clean = safe(text.replace('**','').replace('<strong>','').replace('</strong>','').replace('<br>','\n'))
        for line in clean.split('\n'):
            line = line.strip()
            if line: pdf.multi_cell(0, 4.5, line)
        pdf.ln(3); pdf.set_text_color(0,0,0)
    pdf.ln(4); pdf.set_draw_color(180,180,180); pdf.line(10, pdf.get_y(), 200, pdf.get_y()); pdf.ln(3)
    pdf.set_font('Helvetica','I',8); pdf.set_text_color(120,120,120)
    pdf.multi_cell(0, 4, safe('Generated by Pantheon Life Safety OS — HCT + Embedded Logix. hct-pantheon.vercel.app'))
    buf = io.BytesIO(); pdf.output(buf); buf.seek(0)
    return Response(buf.read(), mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=pantheon-{mode}-{inc.get("id","report")}.pdf'})

@app.route('/api/auth/forgot_password', methods=['POST'])
def auth_forgot_password():
    b = request.get_json()
    email = b.get('email', '').strip().lower()
    if not email: return jsonify({"error": "Email required"}), 400
    row, row_num = find_user(email)
    if row:
        token = generate_verify_token(email + ':reset')
        t = _load_tokens(); t[token] = {'email': email, 'expires': time.time() + 3600, 'purpose': 'reset'}; _save_tokens(t)
        reset_url = f"https://hct-pantheon.vercel.app/reset-password?token={token}"
        if SENDGRID_KEY:
            try:
                import httpx
                body = f'<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px"><h2>Reset your Pantheon password</h2><p>Click below to set a new password. Expires in 1 hour.</p><a href="{reset_url}" style="display:inline-block;background:#111110;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-family:monospace;font-size:12px;text-transform:uppercase">Reset Password</a></div>'
                httpx.post('https://api.sendgrid.com/v3/mail/send',
                    headers={'Authorization': f'Bearer {SENDGRID_KEY}', 'Content-Type': 'application/json'},
                    json={'personalizations': [{'to': [{'email': email}]}], 'from': {'email': FROM_EMAIL, 'name': 'Pantheon'}, 'subject': 'Reset your Pantheon password', 'content': [{'type': 'text/html', 'value': body}]},
                    timeout=15.0)
            except Exception as e: print(f"SendGrid reset error: {e}")
        else:
            print(f"[DEV] Reset link for {email}: {reset_url}")
    return jsonify({"ok": True})

@app.route('/reset-password')
def reset_password_page():
    token = request.args.get('token', '').strip()
    if not token or token not in _load_tokens(): return redirect(url_for('login_page') + '?msg=invalid_token')
    entry = _load_tokens().get(token, {})
    if time.time() > entry.get('expires', 0): return redirect(url_for('login_page') + '?msg=invalid_token')
    return render_template('reset_password.html', token=token)

@app.route('/api/auth/reset_password', methods=['POST'])
def auth_reset_password():
    b = request.get_json()
    token = b.get('token', '').strip()
    new_pw = b.get('password', '').strip()
    if not token or not new_pw: return jsonify({"error": "Token and password required"}), 400
    if len(new_pw) < 8: return jsonify({"error": "Password must be at least 8 characters"}), 400
    t = _load_tokens(); entry = t.get(token)
    if not entry: return jsonify({"error": "Invalid or expired link"}), 401
    if time.time() > entry.get('expires', 0):
        del t[token]; _save_tokens(t); return jsonify({"error": "Link has expired"}), 401
    email = entry['email']
    del t[token]; _save_tokens(t)
    row, row_num = find_user(email)
    if not row: return jsonify({"error": "Account not found"}), 404
    sheets_update_cell_sync('Users', row_num, 5, new_pw.strip())
    sheets_append('Activity Log', [now_str(), email, row[0], '', 'Password Reset', '', '', '', '', '', ''])
    return jsonify({"ok": True})

@app.route('/api/auth/resend_otp', methods=['POST'])
def auth_resend_otp():
    b = request.get_json()
    email = (b.get('email','')).strip().lower()
    if not email: return jsonify({"error": "Email required"}), 400
    row, _ = find_user(email)
    if not row: return jsonify({"error": "User not found"}), 404
    token = generate_verify_token(email)
    sent = send_verify_link(email, token)
    return jsonify({"ok": True, "sent": sent})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
