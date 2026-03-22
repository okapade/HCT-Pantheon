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
app.config['SESSION_COOKIE_HTTPONLY'] = True
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

def hash_pw(pw): return pw.strip()  # plain compare — no hash complexity
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
        print(f"[SHEETS] CREDS JSON parse failed: {e}")
        return None
    except ImportError as e:
        print(f"[SHEETS] Missing library: {e}")
        return None
    except Exception as e:
        print(f"[SHEETS] Error: {type(e).__name__}: {e}")
        return None

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
# Users sheet cols: 1=name 2=email 3=phone 4=org 5=pw_hash 6=created 7=invited_by
# 8=first_login 9=last_login 10=trial_days 11=sims_week 12=sims_total 13=status
# 14=email_verified 15=role 16=facility_type 17=location 18=onboarding_complete

# ── Simple JSON user store — no Sheets dependency for auth ────────────────────
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
        # Return as padded row for compatibility, and index=-1 (unused)
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
    # Also log to Sheets async — non-blocking, auth doesn't depend on it
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
        'name':               row[0]  if len(row) > 0  else '',
        'email':              row[1]  if len(row) > 1  else '',
        'org':                row[3]  if len(row) > 3  else '',
        'role':               row[14] if len(row) > 14 else '',
        'facility_type':      row[15] if len(row) > 15 else '',
        'location':           row[16] if len(row) > 16 else '',
        'onboarding_complete':row[17] if len(row) > 17 else 'false',
    }

# ── OTP store ──────────────────────────────────────────────────────────────────

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

def generate_otp(email, purpose='verify'):
    return '000000'  # OTP disabled

def verify_otp_code(email, code):
    return False  # OTP disabled


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
# Conversations sheet: timestamp, email, org, session_id, role(user/assistant), message, act_context

def get_recent_sessions(email, n=3):
    """Return last n session summaries for context injection."""
    rows = sheets_read('Conversations')
    sessions = {}
    for row in rows[1:]:
        if len(row) < 6: continue
        if row[1].strip().lower() != email.strip().lower(): continue
        sid = row[3] if len(row) > 3 else ''
        if sid not in sessions: sessions[sid] = {'ts': row[0], 'messages': []}
        sessions[sid]['messages'].append({'role': row[4], 'content': row[5][:300]})
    sorted_sessions = sorted(sessions.values(), key=lambda x: x['ts'], reverse=True)[:n]
    return sorted_sessions

def get_open_actions(email):
    """Return open recommended actions for this user."""
    rows = sheets_read('Actions')
    open_actions = []
    for row in rows[1:]:
        if len(row) < 5: continue
        if row[1].strip().lower() != email.strip().lower(): continue
        if row[4].strip().lower() in ('open', 'deferred'): open_actions.append({'action': row[2], 'urgency': row[3], 'status': row[4], 'created': row[0]})
    return open_actions[:5]

def build_user_context(email):
    """Build the USER_CONTEXT block injected into every AI system prompt."""
    profile  = get_user_profile(email)
    sessions = get_recent_sessions(email, n=2)
    actions  = get_open_actions(email)
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
    if sessions:
        ctx += "\nRECENT SESSION CONTEXT:\n"
        for i, s in enumerate(sessions):
            msgs = s.get('messages', [])
            if msgs: ctx += f"Session -{i+1}: {msgs[0]['content'][:200]}...\n"
    ctx += "\nTailor ALL responses to this user's role, facility type, jurisdiction, and open gaps. Reference their specific context — not generic examples."
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

@app.route('/api/onboarding/save', methods=['POST'])
@login_required
def api_onboarding_save():
    b = request.get_json() or {}
    session['onboarding_complete'] = True
    u = session.get('user_id', '')
    if u:
        try:
            rows = sheets_read('Users')
            for i, row in enumerate(rows):
                if row and row[0].strip().lower() == u.strip().lower():
                    sheets_update_cell_sync('Users', i+1, 18, 'true')
                    break
        except: pass
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

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
    if not email or not password: return jsonify({"error": "Email and password required"}), 400
    if len(password) < 8: return jsonify({"error": "Password must be at least 8 characters"}), 400
    existing, _ = find_user(email)
    if existing: return jsonify({"error": "Account already exists. Sign in instead."}), 409
    pw_clean = password.strip()
    if not pw_clean: return jsonify({"error": "Password required"}), 400
    # Save to local JSON store — instant, no network
    save_user(email, {
        'name': name, 'email': email, 'password': pw_clean,
        'created': now_str(), 'email_verified': 'false',
        'onboarding_complete': 'false', 'role': '', 'facility_type': '',
        'location': '', 'org': ''
    })
    print(f"[REGISTER] Saved user {email}")
    # Send verification link
    token = generate_verify_token(email)
    send_verify_link(email, token)
    if not SENDGRID_KEY:
        print(f"[DEV] http://localhost:5002/verify?token={token}")
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/verify')
def verify_email_link():
    token = request.args.get('token', '').strip()
    if not token:
        return redirect(url_for('login_page') + '?msg=missing_token')
    email = consume_verify_token(token)
    if not email:
        return redirect(url_for('login_page') + '?msg=invalid_token')
    row, row_num = find_user(email)
    if not row:
        return redirect(url_for('login_page') + '?msg=user_not_found')
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
    stored_pw = (row[4] or '').strip()
    incoming_pw = password.strip()
    print(f"[LOGIN] email={email} stored_len={len(stored_pw)} incoming_len={len(incoming_pw)} match={stored_pw == incoming_pw} verified={row[13]!r}")
    if stored_pw != incoming_pw:
        return jsonify({"error": "Incorrect email or password"}), 401
    # Check email verified
    email_verified = row[13].strip().lower()
    if email_verified != 'true':
        return jsonify({"error": "email_not_verified", "email": email}), 403
    if len(row) >= 13 and row[12].strip().lower() == 'revoked': return jsonify({"error": "Access revoked. Contact HCT."}), 403
    # email_verified check removed — direct credential login
    # Check trial
    days_left = TRIAL_DAYS
    if len(row) >= 6 and row[5]:
        try:
            created = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
            days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
        except: pass
    if days_left <= 0: return jsonify({"error": "Trial expired. Contact HCT to renew."}), 403
    # OTP MFA if enabled
    if OTP_ENABLED:
        phone = row[2].strip() if len(row) > 2 else ''
        code = generate_otp(email, purpose='login')
        if phone: send_sms_otp(phone, code)
        else: send_email_otp(email, code, purpose='login')
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
        # Summarise session before logout
        _summarise_session(session['user_id'], session.get('session_id', ''))
        sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), 'Logged Out', '', '', '', '', '', ''])
    session.clear()
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

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
    b    = request.get_json()
    email = session['user_id']
    row, row_num = find_user(email)
    if not row: return jsonify({"error": "User not found"}), 404

    # Save profile fields to Users sheet
    # Col 4=org, 15=role, 16=facility_type, 17=location, 18=onboarding_complete
    # Plus new profile tab for full detail
    sheets_update_cell_sync('Users', row_num, 4,  b.get('org', ''))
    sheets_update_cell_sync('Users', row_num, 15, b.get('role', ''))
    sheets_update_cell_sync('Users', row_num, 16, b.get('facility_type', ''))
    sheets_update_cell_sync('Users', row_num, 17, b.get('location', ''))
    sheets_update_cell_sync('Users', row_num, 18, 'true')

    # Save full profile to Profiles tab
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
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/onboarding/profile')
@login_required
def onboarding_profile():
    """Return the user's full profile for the dashboard context."""
    # Get from Profiles tab (most recent row for this user)
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
# Actions sheet: timestamp, email, action, urgency, status, session_id, source, resolved_at

@app.route('/api/actions/log', methods=['POST'])
@login_required
def actions_log():
    b = request.get_json()
    actions = b.get('actions', [])
    sid = session.get('session_id', secrets.token_hex(4))
    for a in actions:
        sheets_append('Actions', [now_str(), session['user_id'], a.get('action',''), a.get('urgency','MEDIUM'), 'open', sid, b.get('source','simulation'), ''])
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/actions/update', methods=['POST'])
@login_required
def actions_update():
    b      = request.get_json()
    action = b.get('action', '')
    status = b.get('status', '')  # accepted / deferred / dismissed
    if not action or not status: return jsonify({"error": "action and status required"}), 400
    rows = sheets_read('Actions')
    for i, row in enumerate(rows[1:], start=2):
        if len(row) >= 3 and row[1].strip().lower() == session['user_id'] and row[2].strip() == action and row[4].strip() in ('open','deferred'):
            sheets_update_cell('Actions', i, 5, status)
            if status == 'accepted': sheets_update_cell('Actions', i, 8, now_str())
            # Silent gap log for HCT — dismissed actions are product intelligence
            if status == 'dismissed':
                sheets_append('Activity Log', [now_str(), session['user_id'], session.get('user_name',''), session.get('user_org',''), 'Action Dismissed', action, '', '', '', '', ''])
            break
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/actions/open')
@login_required
def actions_open():
    return jsonify({"actions": get_open_actions(session['user_id'])})

# ── Analytics API ──────────────────────────────────────────────────────────────

@app.route('/api/analytics/footprint')
@login_required
def analytics_footprint():
    """Weekly suppression + detection footprint for the current user."""
    email = session['user_id']
    # Get profile
    profile_resp = onboarding_profile()
    profile = profile_resp.get_json() if hasattr(profile_resp, 'get_json') else {}

    # Simulations this week
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

    # Actions this week
    action_rows = sheets_read('Actions')
    actions_open_count, actions_completed, actions_deferred, actions_dismissed = 0, 0, 0, 0
    for row in action_rows[1:]:
        if len(row) < 5: continue
        if row[1].strip().lower() != email: continue
        s = row[4].strip().lower()
        if s == 'open':      actions_open_count += 1
        elif s == 'accepted': actions_completed += 1
        elif s == 'deferred': actions_deferred += 1
        elif s == 'dismissed':actions_dismissed += 1

    # Conversations this week
    conv_rows = sheets_read('Conversations')
    convs_week = 0
    for row in conv_rows[1:]:
        if len(row) < 2: continue
        if row[1].strip().lower() != email: continue
        try:
            ts = datetime.datetime.strptime(row[0].strip(), '%Y-%m-%d %H:%M:%S')
            if ts > week_ago: convs_week += 1
        except: pass

    # Derive gap status from profile
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
        'week': {
            'simulations':        sims_week,
            'ai_conversations':   convs_week,
            'actions_open':       actions_open_count,
            'actions_completed':  actions_completed,
            'actions_deferred':   actions_deferred,
            'actions_dismissed':  actions_dismissed,
        },
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
        return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})
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
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

# ── Telemetry ──────────────────────────────────────────────────────────────────

@app.route('/api/telemetry/action', methods=['POST'])
@login_required
def api_log_action():
    b = request.get_json()
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), b.get('action',''), b.get('detail1',''), b.get('detail2',''), b.get('detail3',''), b.get('time_spent',''), device, browser])
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

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
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/telemetry/product', methods=['POST'])
@login_required
def api_log_product():
    b = request.get_json()
    sheets_append('Product Interest', [now_str(), session.get('user_id',''), session.get('user_org',''), b.get('product',''), b.get('source',''), b.get('time_on',0), b.get('clicked_learn_more','No')])
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

# ── Incident data ──────────────────────────────────────────────────────────────

def load_data():
    with open(os.path.join(os.path.dirname(__file__), 'data', 'incident.json')) as f:
        return json.load(f)

@app.route('/api/incident')
@login_required
def api_incident(): return jsonify(load_data())

@app.route('/api/user/state', methods=['GET'])
@login_required
def api_user_state():
    u = session.get('user_id', '')
    return jsonify({"ok": True, "email": u, "onboarding_complete": session.get('onboarding_complete', False)})

@app.route('/api/log-event', methods=['POST'])
def api_log_event():
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/status')
def api_status():
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

# ── AI streaming ───────────────────────────────────────────────────────────────

@app.route('/api/monitor/alerts', methods=['GET'])
def api_monitor_alerts():
    return jsonify({"alerts": [], "count": 0})

@app.route('/api/compliance/check', methods=['POST'])
def api_compliance_check():
    return jsonify({"ok": True, "gaps": []})

@app.route('/api/telemetry/act', methods=['POST'])
def api_telemetry_act():
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/api/user/state', methods=['GET', 'POST'])
def api_user_state_post():
    if request.method == 'POST':
        return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})
    u = session.get('user_id', '')
    return jsonify({"ok": True, "email": u, "onboarding_complete": session.get('onboarding_complete', False)})

@app.route('/api/chat/home', methods=['POST'])
def api_chat_home():
    return api_chat()



# ── Suppression Standards Matrix ───────────────────────────────────────────────
# Technology → NFPA standard → VdS equivalent → compatibility
SUPPRESSION_STANDARDS = {
    "sprinkler":    {"nfpa":"NFPA 13 / 25","vds":"VdS CEA 4001","en":"EN 12845","li_ion_ok":False},
    "water_mist":   {"nfpa":"NFPA 750",    "vds":"VdS 3188",    "en":"EN 14972","li_ion_ok":True},
    "clean_agent":  {"nfpa":"NFPA 2001",   "vds":"VdS 2093",    "en":"EN 15004","li_ion_ok":False,"note":"FM-200/Novec chemically incompatible with Li-ion thermal runaway"},
    "co2":          {"nfpa":"NFPA 12",     "vds":"VdS 2093",    "en":"EN 15004","li_ion_ok":False},
    "foam":         {"nfpa":"NFPA 11/16",  "vds":"VdS foam",    "en":"EN 13565","li_ion_ok":False},
    "dry_chemical": {"nfpa":"NFPA 17",     "vds":"VdS 2093",    "en":"EN 615",  "li_ion_ok":False},
    "wet_chemical": {"nfpa":"NFPA 17A",    "vds":"VdS 2093",    "en":"EN 615",  "li_ion_ok":False},
    "f500_ea":      {"nfpa":"NFPA 855 compatible","vds":"FM/UL listed","en":"N/A","li_ion_ok":True,"note":"Only agent validated for Li-ion thermal runaway arrest"},
    "none":         {"nfpa":"N/A",         "vds":"N/A",         "en":"N/A",     "li_ion_ok":False,"note":"No suppression — unacceptable risk for energised hazards"},
}

# VdS ↔ UL ↔ NFPA equivalency map
CERT_TIERS = {
    "VdS":          {"rank":1,"covers":["CE","EN","UL (via 2021 MDA)","NFPA equivalency (Clause 1.5)"],"note":"VdS is a CE Notified Body. 2021 UL–VdS Mutual Data Acceptance Agreement covers EN54 and suppression system certification."},
    "UL":           {"rank":2,"covers":["NFPA referenced","North America","select international"],"note":"UL evaluates products against NFPA standards. 90%+ of NFPA Annex A product standards are UL-based."},
    "FM Global":    {"rank":2,"covers":["FM Approvals","HPR insurance","global industrial"],"note":"FM Approvals is the HPR insurance certification standard — often required by large commercial insurers."},
    "LPCB":         {"rank":2,"covers":["UK","Middle East","Asia-Pacific"],"note":"LPCB cooperates with VdS under EFSG for mutual test acceptance."},
    "CE":           {"rank":3,"covers":["EU market mandatory"],"note":"CE is minimum EU market entry — VdS exceeds CE requirements."},
    "NFPA only":    {"rank":4,"covers":["US jurisdictions"],"note":"NFPA compliance without third-party listing — acceptable under AHJ discretion only."},
    "Uncertified":  {"rank":5,"covers":[],"note":"No third-party certification. Elevated PFD. Insurance and AHJ risk."},
}

# ISO 31000 risk domain weights
RISK_DOMAINS = {
    "suppression_gap":   {"weight":25,"desc":"Installed suppression vs actual hazard chemistry compatibility"},
    "detection_gap":     {"weight":20,"desc":"Off-gas / early warning detection vs hazard type"},
    "training_gap":      {"weight":15,"desc":"Workforce training and ERP readiness"},
    "compliance_gap":    {"weight":15,"desc":"Standards compliance and certification status"},
    "insurance_gap":     {"weight":10,"desc":"Insurance posture and business continuity coverage"},
    "architecture_gap":  {"weight":10,"desc":"Backup, EPO, isolation, redundancy"},
    "contingency_gap":   {"weight":5, "desc":"Contingency plans for large loss or service interruption"},
}

# ALARP zone thresholds (0–100 risk score, higher = worse)
ALARP_ZONES = {
    "unacceptable": {"min":70,"label":"UNACCEPTABLE","color":"#A83030","action":"Must act immediately. Risk cannot be justified. Regulatory and insurance exposure."},
    "alarp":        {"min":30,"label":"ALARP","color":"#B87020","action":"Must reduce risk until cost of further reduction is grossly disproportionate to benefit. Document all decisions."},
    "acceptable":   {"min":0, "label":"BROADLY ACCEPTABLE","color":"#2A6A2A","action":"Risk is negligible. Monitor, document, periodic review. Maintain certification status."},
}

# SIL targets by risk score
def score_to_sil(score):
    if score >= 70: return {"sil":"SIL 3","pfd_target":"0.001–0.0001","desc":"High demand — continuous process safety systems"}
    if score >= 50: return {"sil":"SIL 2","pfd_target":"0.01–0.001", "desc":"Significant hazard — safety instrumented systems required"}
    if score >= 30: return {"sil":"SIL 1","pfd_target":"0.1–0.01",   "desc":"Moderate hazard — basic safety functions"}
    return           {"sil":"No SIL","pfd_target":">0.1",            "desc":"Low residual risk — standard measures adequate"}

# PFD contributors per installed system type
PFD_TABLE = {
    "FM-200 (HFC-227ea)":  {"base_pfd":0.05,"li_ion_pfd":1.0, "note":"PFD=1.0 against Li-ion — chemically cannot arrest thermal runaway"},
    "FM-200":              {"base_pfd":0.05,"li_ion_pfd":1.0, "note":"PFD=1.0 against Li-ion thermal runaway"},
    "CO₂":                 {"base_pfd":0.06,"li_ion_pfd":0.9, "note":"Insufficient against sustained Li-ion exothermic reaction"},
    "Novec 1230":          {"base_pfd":0.04,"li_ion_pfd":0.95,"note":"Clean agent — not validated for Li-ion thermal runaway"},
    "Water Mist":          {"base_pfd":0.04,"li_ion_pfd":0.35,"note":"Provides cooling but does not arrest runaway chemistry"},
    "F-500 EA":            {"base_pfd":0.03,"li_ion_pfd":0.03,"note":"Only validated suppression for Li-ion thermal runaway (NFPA 855)"},
    "Sprinkler Only":      {"base_pfd":0.05,"li_ion_pfd":0.7, "note":"Water delays spread but cannot arrest thermal runaway"},
    "Sprinkler":           {"base_pfd":0.05,"li_ion_pfd":0.7, "note":"Water delays spread but cannot arrest thermal runaway"},
    "Dry Chemical":        {"base_pfd":0.07,"li_ion_pfd":0.85,"note":"Ineffective against deeply embedded thermal events"},
    "None":                {"base_pfd":1.0, "li_ion_pfd":1.0, "note":"No suppression — failure on demand is certain"},
    "Foam":                {"base_pfd":0.05,"li_ion_pfd":0.6, "note":"Provides surface coverage but not thermal arrest"},
}

LI_ION_CHEMISTRIES = ['NMC (Li-ion)','NMC (Nickel Manganese Cobalt)','LFP (Li-ion)','LFP (Lithium Iron Phosphate)','NCA (Nickel Cobalt Aluminium)','LTO (Lithium Titanate)','LCO']

def compute_risk_assessment(profile):
    """
    ISO 31000 compliant risk scoring engine.
    Returns: risk_score (0-100), alarp_zone, sil_target, pfd, domain_scores, gaps, recommendations
    """
    suppression  = profile.get('suppression','')
    chemistry    = profile.get('chemistry','')
    detection    = profile.get('detection','')
    training     = profile.get('training_level','')
    erp          = profile.get('has_erp','')
    compliance   = profile.get('compliance_target','')
    insurance    = profile.get('insurance_level','')
    contingency  = profile.get('contingency_level','')
    facility     = profile.get('facility_type','')
    entity       = profile.get('entity_type', facility)
    hazards      = profile.get('hazard_keywords','')
    certification= profile.get('certification','')

    is_li_ion = any(c in chemistry for c in ['Li-ion','Lithium','NMC','LFP','NCA','LTO','LCO'])
    pfd_entry = PFD_TABLE.get(suppression, {"base_pfd":0.1,"li_ion_pfd":0.5,"note":"Unknown system"})
    pfd = pfd_entry['li_ion_pfd'] if is_li_ion else pfd_entry['base_pfd']

    # ── Domain scoring (higher = worse) ───────────────────────────────────────
    domain_scores = {}
    gaps = []
    recommendations = []

    # 1. Suppression gap (25pts)
    if not suppression or suppression == 'None':
        domain_scores['suppression_gap'] = 25
        gaps.append({"domain":"Suppression","severity":"CRITICAL","gap":"No suppression system installed","fix":"Deploy F-500 EA — validated for all hazard types including Li-ion"})
    elif is_li_ion and pfd >= 0.9:
        domain_scores['suppression_gap'] = 25
        gaps.append({"domain":"Suppression","severity":"CRITICAL","gap":f"{suppression} PFD={pfd:.2f} against {chemistry} — chemically incompatible","fix":"Replace with F-500 EA Micelle Mist (NFPA 855 compatible, PFD=0.03)"})
        recommendations.append({"urgency":"IMMEDIATE","action":f"Replace {suppression} with F-500 EA for Li-ion thermal runaway protection","standard":"NFPA 855","cert_path":"F-500 EA is FM/UL listed"})
    elif is_li_ion and pfd >= 0.5:
        domain_scores['suppression_gap'] = 18
        gaps.append({"domain":"Suppression","severity":"HIGH","gap":f"{suppression} provides partial protection only (PFD={pfd:.2f}) against Li-ion runaway","fix":"Supplement with F-500 EA or upgrade fully"})
        recommendations.append({"urgency":"30-DAY","action":f"Evaluate F-500 EA upgrade from {suppression}","standard":"NFPA 855","cert_path":"FM/UL listed"})
    elif pfd > 0.15:
        domain_scores['suppression_gap'] = 10
        gaps.append({"domain":"Suppression","severity":"MODERATE","gap":f"System PFD={pfd:.2f} — above SIL 1 threshold","fix":"Schedule maintenance and certification audit"})
    else:
        domain_scores['suppression_gap'] = 3

    # 2. Detection gap (20pts)
    no_det = ['None','No','Standard Smoke Only','Standard Smoke','Heat Detection Only','Heat Detection']
    if not detection or detection in no_det:
        domain_scores['detection_gap'] = 20
        gaps.append({"domain":"Detection","severity":"CRITICAL","gap":"No early-warning off-gas detection — first alert arrives at visible smoke (T+25min)","fix":"Smart-LX Gateway + VESDA (NFPA 855 §5.7)"})
        recommendations.append({"urgency":"IMMEDIATE","action":"Install Smart-LX Gateway off-gas detection","standard":"NFPA 855 §5.7","cert_path":"VdS / UL listed"})
    elif 'VESDA' in detection or 'Smart-LX' in detection:
        domain_scores['detection_gap'] = 2
    else:
        domain_scores['detection_gap'] = 8
        gaps.append({"domain":"Detection","severity":"MODERATE","gap":"Standard detection lacks early-warning off-gas capability","fix":"Upgrade to Smart-LX Gateway or VESDA"})

    # 3. Training gap (15pts)
    training_map = {
        'Fully trained and certified, with an emergency response plan in place': 1,
        'Partially trained and certified, with an emergency response plan in place': 7,
        'Not trained and certified, no emergency response plan in place': 12,
        'No training for this threat, no planning, no emergency response plan': 15,
    }
    domain_scores['training_gap'] = training_map.get(training, 8)
    if domain_scores['training_gap'] >= 12:
        gaps.append({"domain":"Training / ERP","severity":"HIGH","gap":"Workforce not trained for this hazard type. No ERP in place.","fix":"HCT Training Programme + ERP development (NFPA 1)"})
        recommendations.append({"urgency":"30-DAY","action":"Enrol in HCT hazard-specific training programme and develop site ERP","standard":"NFPA 1","cert_path":"ISO 45001 compatible"})
    elif domain_scores['training_gap'] >= 7:
        gaps.append({"domain":"Training / ERP","severity":"MODERATE","gap":"Partial training — ERP exists but coverage incomplete","fix":"Gap analysis and targeted refresher training"})

    # 4. Compliance gap (15pts)
    if not compliance:
        domain_scores['compliance_gap'] = 10
        gaps.append({"domain":"Compliance","severity":"MODERATE","gap":"No specific compliance target identified","fix":"ISO 31000 assessment to establish applicable standards"})
    elif 'VdS' in certification:
        domain_scores['compliance_gap'] = 1  # VdS covers NFPA + UL + CE
    elif 'UL' in certification or 'FM' in certification:
        domain_scores['compliance_gap'] = 3
    else:
        domain_scores['compliance_gap'] = 8
        gaps.append({"domain":"Compliance","severity":"MODERATE","gap":"No third-party certification on installed systems — elevated PFD and insurance risk","fix":"Certify to VdS (covers CE + NFPA equivalency + UL MDA) or UL/FM"})

    # 5. Insurance gap (10pts)
    insurance_map = {
        'Fully insured, business continuity plan in place': 1,
        'Partially insured, limited continuity planning': 5,
        'Minimal insurance, no continuity plan': 8,
        'Unknown or uninsured': 10,
    }
    domain_scores['insurance_gap'] = insurance_map.get(insurance, 5)
    if domain_scores['insurance_gap'] >= 8:
        gaps.append({"domain":"Insurance","severity":"HIGH","gap":"Inadequate insurance posture — large loss would be unrecoverable","fix":"Engage insurer for suppression retrofit credit analysis. ALARP documentation reduces premiums."})

    # 6. Architecture gap (10pts)
    contingency_map = {
        'Comprehensive contingency plan with tested backups': 1,
        'Some contingency planning, partial backups': 5,
        'Minimal contingency planning': 8,
        'No contingency plan': 10,
    }
    domain_scores['architecture_gap'] = contingency_map.get(contingency, 5)

    # 7. Contingency gap (5pts)
    domain_scores['contingency_gap'] = 3 if contingency else 5

    # ── Total risk score ───────────────────────────────────────────────────────
    total = 0
    for domain, weight_info in RISK_DOMAINS.items():
        total += domain_scores.get(domain, 0)
    risk_score = min(100, total)

    # ── ALARP zone ─────────────────────────────────────────────────────────────
    if risk_score >= 70:   alarp = ALARP_ZONES['unacceptable']
    elif risk_score >= 30: alarp = ALARP_ZONES['alarp']
    else:                  alarp = ALARP_ZONES['acceptable']

    # ── SIL target ────────────────────────────────────────────────────────────
    sil = score_to_sil(risk_score)

    # ── Insurance premium estimate ─────────────────────────────────────────────
    premium_reduction = 0
    if is_li_ion and pfd >= 0.9:
        premium_reduction = 2100000 if 'BESS' in facility or 'Data Center' in facility else 890000

    return {
        "risk_score":       risk_score,
        "alarp":            alarp,
        "sil":              sil,
        "pfd":              round(pfd, 3),
        "domain_scores":    domain_scores,
        "gaps":             gaps,
        "recommendations":  recommendations,
        "premium_reduction":premium_reduction,
        "entity_type":      entity,
        "facility_type":    facility,
        "suppression":      suppression,
        "chemistry":        chemistry,
        "is_li_ion":        is_li_ion,
        "cert_tiers":       CERT_TIERS,
        "suppression_standards": SUPPRESSION_STANDARDS,
    }


# ── /api/assess — ISO 31000 risk assessment endpoint ──────────────────────────

@app.route('/api/assess', methods=['POST'])
@login_required
def api_assess():
    b = request.get_json()
    # Accept either a passed profile or use the session user's saved profile
    profile = b.get('profile') if b.get('profile') else {}
    if not profile:
        saved = get_user_profile(session['user_id'])
        extra_rows = sheets_read('Profiles')
        user_rows = [r for r in extra_rows[1:] if len(r) > 1 and r[1].strip().lower() == session['user_id']]
        if user_rows:
            latest = user_rows[-1]
            keys = ['timestamp','email','name','org','role','facility_type','location','chemistry','suppression','detection','modules','jurisdiction','extra']
            for i, k in enumerate(keys):
                if i < len(latest): profile[k] = latest[i]
            if 'extra' in profile:
                try:
                    extra = json.loads(profile['extra'])
                    profile.update(extra)
                except: pass
        profile.update(saved)

    result = compute_risk_assessment(profile)
    # Log assessment
    sheets_append('Activity Log', [
        now_str(), session['user_id'], session.get('user_name',''), session.get('user_org',''),
        'Risk Assessment', f"Score={result['risk_score']}", result['alarp']['label'],
        result['sil']['sil'], result['pfd'], '', ''
    ])
    return jsonify(result)


# ── /api/erp/upload — Emergency Response Plan upload ──────────────────────────

@app.route('/api/erp/upload', methods=['POST'])
@login_required
def api_erp_upload():
    """Accept ERP document (text/plain or JSON summary) and store in Profiles."""
    b = request.get_json(silent=True) or {}
    erp_text = b.get('erp_text', '').strip()
    erp_name = b.get('erp_name', 'Site ERP').strip()
    if not erp_text:
        return jsonify({"error": "ERP content required"}), 400
    # Store summary in Profiles tab
    sheets_append('Profiles', [
        now_str(), session['user_id'], session.get('user_name',''),
        session.get('user_org',''), 'ERP_UPLOAD', erp_name,
        '', '', '', '', '', '', json.dumps({"erp_text": erp_text[:2000]})
    ])
    update_user(session['user_id'], 'has_erp', 'true')
    update_user(session['user_id'], 'erp_name', erp_name)
    sheets_append('Activity Log', [
        now_str(), session['user_id'], session.get('user_name',''), session.get('user_org',''),
        'ERP Uploaded', erp_name, f'{len(erp_text)} chars', '', '', '', ''
    ])
    return jsonify({"ok": True, "erp_name": erp_name, "chars": len(erp_text)})


# ── Enriched BASE_SYSTEM — ISO 31000 + ALARP + PFD + VdS/UL/NFPA ─────────────

BASE_SYSTEM = """You are Pantheon AI — the world's most advanced life safety intelligence engine. Senior NFPA fire investigator, ISO 31000 risk practitioner, IEC 61508 functional safety expert. Precise, authoritative, evidence-driven.

CORE FRAMEWORKS YOU APPLY IN EVERY RESPONSE:

ISO 31000 (Risk Management):
- Identify: What hazards exist given this entity type, location, and installed systems?
- Assess: Probability × Consequence. Use PFD data where relevant.
- Treat: Specific control measures with standard references.

ALARP (As Low As Reasonably Practicable):
- Unacceptable Zone (risk score ≥70): Risk cannot be justified. Must act.
- ALARP Zone (30–69): Must reduce risk until cost of further reduction is grossly disproportionate. Document all decisions for legal defence.
- Broadly Acceptable Zone (<30): Negligible risk. Monitor and maintain.

Probability of Failure on Demand (PFD):
- FM-200 / Clean Agent vs Li-ion: PFD = 1.0 (will fail on demand — chemically incompatible)
- CO₂ vs Li-ion: PFD = 0.9
- F-500 EA vs Li-ion: PFD = 0.03 (only validated suppression for thermal runaway)
- No suppression: PFD = 1.0
- When quoting PFD, explain what it means operationally: "9 times in 10, this system will not arrest thermal runaway."

SIL (Safety Integrity Level per IEC 61508):
- Risk score ≥70 → SIL 3 required (PFD target 0.001–0.0001)
- Risk score 50–69 → SIL 2 (PFD target 0.01–0.001)
- Risk score 30–49 → SIL 1 (PFD target 0.1–0.01)

STANDARDS HIERARCHY (VdS → UL/FM → NFPA):
- VdS is the highest tier: CE Notified Body, 2021 UL Mutual Data Acceptance Agreement, NFPA 2001 committee member. VdS certification covers CE + NFPA equivalency + UL.
- NFPA suppression standards by technology: NFPA 13 (sprinkler), NFPA 750 (water mist), NFPA 2001 (clean agent), NFPA 12 (CO₂), NFPA 11/16 (foam), NFPA 17/17A (dry/wet chem), NFPA 855 (BESS/Li-ion).
- For Li-ion: NFPA 855 is the governing standard. F-500 EA is the only system validated against it.

SUPPRESSION STANDARDS MAP:
| Technology   | NFPA    | VdS         | Li-ion OK |
|--------------|---------|-------------|-----------|
| Sprinkler    | 13/25   | CEA 4001    | No        |
| Water Mist   | 750     | VdS 3188    | Partial   |
| Clean Agent  | 2001    | VdS 2093    | NO        |
| CO₂          | 12      | VdS 2093    | NO        |
| Foam         | 11/16   | VdS foam    | No        |
| F-500 EA     | 855 compat | FM/UL    | YES       |

ENTITY TYPES YOU UNDERSTAND:
Power Grid (Power Gen, BESS, Solar+BESS, Substation), Parking/Charging, Fleet/Transportation, Government (Federal, State/Provincial, Municipal), Mining (Coal, Precious Metals, Minerals), Oil & Gas (Refinery, Drilling, Transportation, Pipeline), Recycling (Solid Waste, Metals, Tires, Li-ion Batteries), Manufacturing, Data Center, Warehouse, Healthcare, Marine/Port, Aviation, Telecom, Services.

VOICE:
- Always open with the user's specific risk posture — not a generic intro.
- Cite ALARP zone, PFD, and SIL target when discussing risk level.
- Reference NFPA/NEC/UL standards relevant to their jurisdiction and entity type.
- Explain WHY suppression agents fail chemically — not just that they fail.
- F-500 EA Micelle Mist is the recommended countermeasure for Li-ion and thermal runaway scenarios.
- When discussing costs: use specific numbers ($47M loss, $2.1M premium reduction, etc.).
- No markdown headers. Plain paragraphs. Tailor everything to their facility type, role, and entity type.
- As urgency escalates: shorter sentences, more timestamps, denser facts.

{user_context}

INCIDENT DATA:
{incident_data}
"""

FULL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE REALITY. 24 hours before. Apply ISO 31000 lens: what risks were identified, which were assessed, which were left untreated. Quote PFD for the installed suppression system against the actual chemistry. State the ALARP zone this facility was operating in.",
    1: "Narrate ACT 01 — RISK ACCUMULATION. 30-day window. Each decision that closed an escape path. Frame through ISO 31000 risk treatment failure — risks identified but not treated, or not identified at all. End with: 5/6 risk factors CRITICAL and UNMITIGATED. ALARP zone: UNACCEPTABLE.",
    2: "Narrate ACT 02 — STATE CHANGE. Second by second. Module 247 voltage spike at T+0:00. Cascade at T+1:30. VESDA detection at T+2:00. FM-200 deploys at T+5:00 — PFD=1.0 against Li-ion, fails as predicted. CO₂ at T+8:00 — insufficient. EPO at T+10:00 — partial failure, generator re-energizes. Fire dept dispatch T+15:00.",
    3: "Narrate ACT 03 — CASCADE & CONSTRAINT. 22 hours uncontrolled. 384 modules at 160°C. HF gas forces expanded evacuation. Clean agent exhausted. Fire partition holds but heat transfers through cable penetrations. Decision to authorize water after servers confirmed lost. 647 services offline. 858 TB destroyed. 101 firefighters, 22 vehicles. T+22h: fire controlled. Zero offsite backup existed.",
    4: "Narrate ACT 04 — POST-EVENT INTEL. 11 root causes. Impact: 50M+ citizens, $47M. Apply full ISO 31000 output: What Changed → What It Means → What To Do Next. Include ALARP analysis — what the cost of proper mitigation would have been vs. actual loss. Close with F-500 EA three-level mitigation (flammability, explosivity, toxicity), SIL target for a facility of this type, and insurance implications — $2.1M annual premium reduction with proper suppression retrofit.",
}
PARTIAL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE (PARTIAL FAILURE). Off-gas detection installed 6 months ago per NFPA 855. Same degraded battery array. ISO 31000: one risk was treated — off-gas detection. PFD for FM-200 vs Li-ion still = 1.0. ALARP zone: still HIGH but detection moves it toward the ALARP band.",
    1: "Narrate ACT 01 — EARLY WARNING at T-25 minutes. Off-gas detection catches electrolyte vapor. BMS flags Module 247. Controlled shutdown initiated. The risk treatment (detection) performed as designed. But suppression gap remains — FM-200 PFD=1.0 against Li-ion.",
    2: "Narrate ACT 02 — CONTAINED EVENT. Module 247 enters thermal runaway despite shutdown. Only 12 modules affected (not 384). FM-200 still fails (PFD=1.0). EPO works correctly — generator doesn't re-energize. Fire contained to battery room.",
    3: "Narrate ACT 03 — CONTROLLED RESPONSE. Fire department arrives to contained battery room fire. 8 firefighters, 2 vehicles (vs 101/22). Server Cluster A degraded but not destroyed. 4 services degraded, 0 offline. 0 TB lost. Duration: 3 hours. FM-200 still failed — suppression gap persists.",
    4: "Narrate ACT 04 — NEAR-MISS LESSONS. $3.2M vs $47M. Detection bought 25 minutes but FM-200 PFD=1.0 means the underlying suppression risk is unchanged. ISO 31000: one risk treated, one critical gap remains. Recommend F-500 EA (PFD=0.03). Insurance: $890K premium reduction. ALARP analysis: cost of F-500 EA upgrade vs. residual risk without it.",
}

BASE_SYSTEM = """You are Pantheon AI — a senior NFPA fire investigator and life safety intelligence engine. Precise, authoritative, evidence-driven. You know this user's facility, role, and history — use it in every response.

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
    """Generate a 2-sentence session summary and store it."""
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
                  "messages": [{"role": "user", "content": f"Summarise this Pantheon session in 2 sentences, noting any key gaps found or actions recommended: {content}"}]},
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
    # Log conversation
    sheets_append('Conversations', [now_str(), session['user_id'], session.get('user_org',''), sid, 'user', msg[:500], ''])
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
    # Always return ok to prevent email enumeration
    if row:
        token = generate_verify_token(email + ':reset')  # namespace reset tokens
        t = _load_tokens(); t[token] = {'email': email, 'expires': time.time() + 3600, 'purpose': 'reset'}; _save_tokens(t)
        reset_url = f"https://hct-pantheon.vercel.app/reset-password?token={token}"
        if SENDGRID_KEY:
            try:
                import httpx
                body = f"""
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#ffffff">
                  <div style="margin-bottom:28px">
                    <img src="https://hct-pantheon.vercel.app/static/assets/PantheonLogoGold.png" width="32" style="vertical-align:middle;margin-right:10px">
                    <span style="font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.1em;color:#9A7A28;text-transform:uppercase;vertical-align:middle">PANTHEON</span>
                  </div>
                  <h2 style="font-size:22px;font-weight:700;color:#111110;margin:0 0 10px">Reset your password</h2>
                  <p style="font-size:14px;color:#5A5750;margin:0 0 28px;line-height:1.6">Click the button below to set a new password. This link expires in 1 hour.</p>
                  <a href="{reset_url}" style="display:inline-block;background:#111110;color:#ffffff;text-decoration:none;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;text-transform:uppercase">Reset Password</a>
                  <p style="font-size:12px;color:#9A9288;margin:24px 0 0;line-height:1.6">If you didn't request this, you can safely ignore this email.</p>
                  <hr style="border:none;border-top:1px solid #EDEAE3;margin:28px 0">
                  <p style="font-size:11px;color:#C0BCB5;margin:0">Pantheon Life Safety OS &middot; HCT + Embedded Logix</p>
                </div>
                """
                httpx.post('https://api.sendgrid.com/v3/mail/send',
                    headers={'Authorization': f'Bearer {SENDGRID_KEY}', 'Content-Type': 'application/json'},
                    json={'personalizations': [{'to': [{'email': email}]}], 'from': {'email': FROM_EMAIL, 'name': 'Pantheon'}, 'subject': 'Reset your Pantheon password', 'content': [{'type': 'text/html', 'value': body}]},
                    timeout=15.0)
            except Exception as e:
                print(f"SendGrid reset error: {e}")
        else:
            print(f"[DEV] Reset link for {email}: {reset_url}")
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

@app.route('/reset-password')
def reset_password_page():
    token = request.args.get('token', '').strip()
    # Validate token exists before showing form
    if not token or token not in _load_tokens():
        return redirect(url_for('login_page') + '?msg=invalid_token')
    entry = _load_tokens().get(token, {})
    if time.time() > entry.get('expires', 0):
        return redirect(url_for('login_page') + '?msg=invalid_token')
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
    return jsonify({"ok": True, "has_key": bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))})

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

# ── Resend OTP ─────────────────────────────────────────────────────────────────
# (appended — keep at bottom before if __name__)
