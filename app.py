import os, json, io, datetime, secrets, time, threading, hashlib
from flask import Flask, render_template, jsonify, request, Response, stream_with_context, session, redirect, url_for
from functools import wraps

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from fpdf import FPDF
except ImportError:
    FPDF = None

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET', secrets.token_hex(32))

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'pantheon-hct-2025')
ANTHROPIC_KEY  = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_KEY     = os.environ.get('OPENAI_API_KEY', '')
SIM_LIMIT_PER_WEEK = int(os.environ.get('SIM_LIMIT_PER_WEEK', '3'))
TRIAL_DAYS         = int(os.environ.get('TRIAL_DAYS', '90'))
SHEET_ID           = os.environ.get('GOOGLE_SHEET_ID', '')
SHEETS_CREDS       = os.environ.get('GOOGLE_SHEETS_CREDS', '')
TWILIO_SID         = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_TOKEN       = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE       = os.environ.get('TWILIO_PHONE', '')
OTP_ENABLED        = os.environ.get('OTP_ENABLED', 'false').lower() == 'true'

# ── helpers ────────────────────────────────────────────────────────────────────

def hash_pw(pw):
    return hashlib.sha256(pw.strip().encode()).hexdigest()

def now_str():
    return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

def get_device_info():
    ua = request.headers.get('User-Agent', '')
    device  = 'Mobile' if any(m in ua.lower() for m in ['mobile','iphone','android','ipad']) else 'Desktop'
    browser = 'Chrome' if 'Chrome' in ua else 'Safari' if 'Safari' in ua else 'Firefox' if 'Firefox' in ua else 'Edge' if 'Edge' in ua else 'Other'
    return device, browser

# ── Google Sheets ──────────────────────────────────────────────────────────────

_sheets_service = None

def get_sheets():
    global _sheets_service
    if _sheets_service: return _sheets_service
    if not SHEET_ID or not SHEETS_CREDS: return None
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        creds = Credentials.from_service_account_info(
            json.loads(SHEETS_CREDS),
            scopes=['https://www.googleapis.com/auth/spreadsheets'])
        _sheets_service = build('sheets', 'v4', credentials=creds)
        return _sheets_service
    except Exception as e:
        print(f"Sheets error: {e}")
        return None

def sheets_append(tab, values):
    def _do():
        try:
            svc = get_sheets()
            if svc:
                svc.spreadsheets().values().append(
                    spreadsheetId=SHEET_ID, range=f'{tab}!A:Z',
                    valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
                    body={'values': [values]}).execute()
        except Exception as e:
            print(f"Append error ({tab}): {e}")
    threading.Thread(target=_do, daemon=True).start()

def sheets_read(tab):
    try:
        svc = get_sheets()
        if not svc: return []
        return svc.spreadsheets().values().get(
            spreadsheetId=SHEET_ID, range=f'{tab}!A:Z').execute().get('values', [])
    except Exception as e:
        print(f"Read error ({tab}): {e}")
        return []

def sheets_update_cell(tab, row, col, value):
    def _do():
        try:
            svc = get_sheets()
            if svc:
                svc.spreadsheets().values().update(
                    spreadsheetId=SHEET_ID,
                    range=f'{tab}!{chr(64+col)}{row}',
                    valueInputOption='USER_ENTERED',
                    body={'values': [[value]]}).execute()
        except Exception as e:
            print(f"Update error: {e}")
    threading.Thread(target=_do, daemon=True).start()

def sheets_update_cell_sync(tab, row, col, value):
    """Synchronous update for critical writes (login, invite)."""
    try:
        svc = get_sheets()
        if svc:
            svc.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=f'{tab}!{chr(64+col)}{row}',
                valueInputOption='USER_ENTERED',
                body={'values': [[value]]}).execute()
    except Exception as e:
        print(f"Sync update error: {e}")

def sheets_append_sync(tab, values):
    """Synchronous append for critical writes (invite)."""
    try:
        svc = get_sheets()
        if svc:
            svc.spreadsheets().values().append(
                spreadsheetId=SHEET_ID, range=f'{tab}!A:Z',
                valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
                body={'values': [values]}).execute()
    except Exception as e:
        print(f"Sync append error ({tab}): {e}")

# ── User lookup ────────────────────────────────────────────────────────────────
# Sheet columns (1-indexed):
# 1=name  2=email  3=phone  4=org  5=password_hash  6=created  7=invited_by
# 8=first_login  9=last_login  10=trial_days  11=sims_week  12=sims_total  13=status

def find_user(email):
    rows = sheets_read('Users')
    for i, row in enumerate(rows[1:], start=2):
        if len(row) >= 2 and row[1].strip().lower() == email.strip().lower():
            return row, i
    return None, -1

# ── OTP helpers (Twilio — dormant until OTP_ENABLED=true) ─────────────────────

_otp_store = {}  # { email: { code, expires } }  — in-memory, serverless-safe for now

def send_otp(phone, code):
    if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE]):
        print("Twilio not configured — OTP not sent")
        return False
    try:
        from twilio.rest import Client
        Client(TWILIO_SID, TWILIO_TOKEN).messages.create(
            body=f"Your Pantheon access code: {code}",
            from_=TWILIO_PHONE, to=phone)
        return True
    except Exception as e:
        print(f"Twilio error: {e}")
        return False

def generate_otp(email):
    code = str(secrets.randbelow(900000) + 100000)  # 6-digit
    _otp_store[email] = {'code': code, 'expires': time.time() + 600}  # 10 min
    return code

def verify_otp(email, code):
    entry = _otp_store.get(email)
    if not entry: return False
    if time.time() > entry['expires']: del _otp_store[email]; return False
    if entry['code'] != code.strip(): return False
    del _otp_store[email]
    return True

# ── Auth decorators ────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        b = request.get_json(silent=True) or {}
        auth = request.headers.get('X-Admin-Password', '') or b.get('admin_password', '')
        if auth != ADMIN_PASSWORD:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

# ── Pages ──────────────────────────────────────────────────────────────────────

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/')
@login_required
def index():
    return render_template('dashboard.html')

# ── Auth API ───────────────────────────────────────────────────────────────────

@app.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    b = request.get_json()
    email    = (b.get('email', '') or b.get('identifier', '')).strip().lower()
    password = (b.get('password', '')).strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    row, row_num = find_user(email)
    if not row or len(row) < 5:
        return jsonify({"error": "Invalid credentials"}), 401

    # Check password hash (col 5, index 4)
    stored_hash = row[4].strip() if len(row) > 4 else ''
    if stored_hash != hash_pw(password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Check status
    if len(row) >= 13 and row[12].strip().lower() == 'revoked':
        return jsonify({"error": "Access revoked. Contact HCT."}), 403

    # Check trial
    days_left = TRIAL_DAYS
    if len(row) >= 6 and row[5]:
        try:
            created   = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
            days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
        except: pass
    if days_left <= 0:
        return jsonify({"error": "Trial expired. Contact HCT to renew."}), 403

    # OTP flow — if enabled, don't create session yet, send OTP and return pending
    if OTP_ENABLED:
        phone = row[2].strip() if len(row) > 2 else ''
        if not phone:
            return jsonify({"error": "No phone number on file for OTP. Contact admin."}), 400
        code = generate_otp(email)
        sent = send_otp(phone, code)
        # Store pre-auth state in session temporarily
        session['otp_pending'] = email
        return jsonify({"otp_required": True, "sent": sent, "phone_hint": f"***-***-{phone[-4:]}" if len(phone) >= 4 else "on file"})

    # No OTP — create session directly
    _create_session(email, row, row_num)
    sims = int(row[10]) if len(row) > 10 and row[10] else 0
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), email, row[0], row[3] if len(row)>3 else '', 'Logged In', '', '', '', '', device, browser])
    return jsonify({
        "ok": True,
        "name": session.get('user_name', ''),
        "org":  session.get('user_org', ''),
        "days_left": days_left,
        "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims)
    })

@app.route('/api/auth/verify_otp', methods=['POST'])
def auth_verify_otp():
    """Step 2 of login when OTP_ENABLED=true."""
    b     = request.get_json()
    email = session.get('otp_pending', '')
    code  = (b.get('code', '')).strip()

    if not email:
        return jsonify({"error": "No pending OTP session"}), 400
    if not verify_otp(email, code):
        return jsonify({"error": "Invalid or expired code"}), 401

    session.pop('otp_pending', None)
    row, row_num = find_user(email)
    if not row:
        return jsonify({"error": "User not found"}), 401

    _create_session(email, row, row_num)
    sims = int(row[10]) if len(row) > 10 and row[10] else 0
    days_left = TRIAL_DAYS
    if len(row) >= 6 and row[5]:
        try:
            created   = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
            days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
        except: pass
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), email, row[0], row[3] if len(row)>3 else '', 'Logged In (OTP)', '', '', '', '', device, browser])
    return jsonify({
        "ok": True,
        "name": session.get('user_name', ''),
        "org":  session.get('user_org', ''),
        "days_left": days_left,
        "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims)
    })

def _create_session(email, row, row_num):
    session['user_id']   = email
    session['user_name'] = row[0] if len(row) > 0 else ''
    session['user_org']  = row[3] if len(row) > 3 else ''
    now = now_str()
    if len(row) < 8 or not row[7]:
        sheets_update_cell_sync('Users', row_num, 8, now)  # first_login
    sheets_update_cell('Users', row_num, 9, now)  # last_login

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    if 'user_id' in session:
        sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), 'Logged Out', '', '', '', '', '', ''])
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/auth/me')
def auth_me():
    if 'user_id' not in session:
        return jsonify({"authenticated": False}), 401
    row, _ = find_user(session['user_id'])
    sims = int(row[10]) if row and len(row) > 10 and row[10] else 0
    return jsonify({
        "authenticated": True,
        "name": session.get('user_name',''),
        "org":  session.get('user_org',''),
        "sims_remaining": max(0, SIM_LIMIT_PER_WEEK - sims),
        "sims_per_week":  SIM_LIMIT_PER_WEEK
    })

# ── Admin API ──────────────────────────────────────────────────────────────────

@app.route('/api/admin/invite', methods=['POST'])
@admin_required
def admin_invite():
    b          = request.get_json()
    email      = (b.get('email', '') or b.get('identifier', '')).strip().lower()
    name       = b.get('name', '').strip()
    org        = b.get('org', '').strip()
    phone      = b.get('phone', '').strip()
    password   = b.get('password', '').strip()
    invited_by = b.get('invited_by', 'Admin').strip()

    if not email:       return jsonify({"error": "Email required"}), 400
    if not password:    return jsonify({"error": "Password required"}), 400

    existing, _ = find_user(email)
    if existing:        return jsonify({"error": "User already exists"}), 409

    pw_hash = hash_pw(password)
    sheets_append_sync('Users', [
        name, email, phone, org, pw_hash,
        now_str(), invited_by, '', '', str(TRIAL_DAYS), '0', '0', 'Active'
    ])
    sheets_append('Activity Log', [now_str(), invited_by, 'Admin', 'HCT', 'Invited User', email, name, org, '', '', ''])
    return jsonify({"ok": True, "email": email, "name": name})

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def admin_users():
    rows  = sheets_read('Users')
    users = []
    for row in rows[1:]:
        if len(row) < 5: continue
        days_left = TRIAL_DAYS
        if len(row) >= 6 and row[5]:
            try:
                created   = datetime.datetime.strptime(row[5].strip(), '%Y-%m-%d %H:%M:%S')
                days_left = max(0, TRIAL_DAYS - (datetime.datetime.utcnow() - created).days)
            except: pass
        users.append({
            "name":          row[0],
            "email":         row[1],
            "org":           row[3] if len(row) > 3 else '',
            "days_left":     days_left,
            "sims_this_week":int(row[10]) if len(row) > 10 and row[10] else 0,
            "total_sims":    int(row[11]) if len(row) > 11 and row[11] else 0,
            "last_login":    row[8]  if len(row) > 8  and row[8]  else 'Never',
            "status":        row[12] if len(row) > 12 else 'Active'
        })
    return jsonify({"users": users})

@app.route('/api/admin/revoke', methods=['POST'])
@admin_required
def admin_revoke():
    b     = request.get_json()
    email = (b.get('email', '') or b.get('identifier', '')).strip().lower()
    row, row_num = find_user(email)
    if row and row_num > 0:
        sheets_update_cell('Users', row_num, 13, 'Revoked')
        sheets_append('Activity Log', [now_str(), 'Admin', 'Admin', 'HCT', 'Revoked User', email, '', '', '', '', ''])
        return jsonify({"ok": True})
    return jsonify({"error": "User not found"}), 404

@app.route('/api/admin/reset_password', methods=['POST'])
@admin_required
def admin_reset_password():
    b           = request.get_json()
    email       = (b.get('email', '')).strip().lower()
    new_password = b.get('password', '').strip()
    if not email or not new_password:
        return jsonify({"error": "Email and new password required"}), 400
    row, row_num = find_user(email)
    if not row or row_num < 0:
        return jsonify({"error": "User not found"}), 404
    sheets_update_cell_sync('Users', row_num, 5, hash_pw(new_password))
    sheets_append('Activity Log', [now_str(), 'Admin', 'Admin', 'HCT', 'Reset Password', email, '', '', '', '', ''])
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
def api_incident():
    return jsonify(load_data())

@app.route('/api/status')
@login_required
def api_status():
    row, _ = find_user(session.get('user_id',''))
    sims = int(row[10]) if row and len(row) > 10 and row[10] else 0
    return jsonify({
        "has_key":       bool(get_key()),
        "model":         "claude-sonnet-4-20250514" if ANTHROPIC_KEY else "gpt-4o",
        "user":          session.get('user_name',''),
        "org":           session.get('user_org',''),
        "sims_remaining":max(0, SIM_LIMIT_PER_WEEK - sims),
        "otp_enabled":   OTP_ENABLED
    })

# ── AI streaming ───────────────────────────────────────────────────────────────

BASE_SYSTEM = """You are Pantheon AI — a senior NFPA fire investigator delivering a post-incident reconstruction briefing. Precise, authoritative, evidence-driven.
VOICE: Cite specific assets by name and ID. Use timestamps. Reference NFPA/NEC/UL standards. Explain WHY suppression failed chemically. F-500 EA Micelle Mist is the recommended countermeasure. No markdown headers. Plain paragraphs. 200-350 words per act. Use specific numbers from the data.
INCIDENT DATA:
{incident_data}
"""

FULL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE REALITY. 24 hours before. Systems appeared nominal. What was quietly degraded: battery array past rated life, no off-gas detection, no offsite backup. What should have triggered intervention but didn't.",
    1: "Narrate ACT 01 — RISK ACCUMULATION. 30-day window. Expired battery lifespan, skipped JSA, absent off-gas detection, raised BMS thresholds, denied budget request. Each decision closed an escape path. End: 5/6 risk factors CRITICAL and UNMITIGATED.",
    2: "Narrate ACT 02 — STATE CHANGE. Second by second. Module 247 voltage spike at T+0:00. Cascade at T+1:30. VESDA detection at T+2:00. FM-200 deploys at T+5:00 — fails against thermal runaway. CO₂ at T+8:00 — insufficient. EPO at T+10:00 — partial failure, generator re-energizes. Fire dept dispatch T+15:00.",
    3: "Narrate ACT 03 — CASCADE & CONSTRAINT. 22 hours uncontrolled. 384 modules at 160°C. HF gas forces expanded evacuation. Clean agent exhausted. Fire partition holds but heat transfers through cable penetrations. Decision to authorize water after servers confirmed lost. 647 services offline. 858 TB destroyed. 101 firefighters, 22 vehicles. T+22h: fire controlled. Zero offsite backup existed.",
    4: "Narrate ACT 04 — POST-EVENT INTEL. 11 root causes across Technical, Procedural, Architectural. Impact: 50M+ citizens, $47M estimated loss. Recommendations: What Changed → What It Means → What To Do Next. Close with F-500 EA three-level mitigation (flammability, explosivity, toxicity) and insurance implications — $2.1M annual premium reduction with proper suppression retrofit."
}

PARTIAL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE (PARTIAL). Off-gas detection installed 6 months ago per NFPA 855. Same degraded conditions otherwise.",
    1: "Narrate ACT 01 — EARLY WARNING. Off-gas detection catches electrolyte vapor from Module 247 at T-25 minutes. Controlled shutdown initiated.",
    2: "Narrate ACT 02 — CONTAINED. 12 modules affected (not 384). EPO works correctly. Fire contained to battery room.",
    3: "Narrate ACT 03 — CONTROLLED RESPONSE. 8 firefighters, 2 vehicles. 3 hours to containment. Zero data lost.",
    4: "Narrate ACT 04 — NEAR-MISS LESSONS. $3.2M vs $47M. FM-200 still failed. F-500 EA is the remaining gap. Insurance: $890K premium reduction."
}

def get_key():
    return ANTHROPIC_KEY or OPENAI_KEY

def _stream_anthropic(messages):
    import httpx
    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-4-20250514", "max_tokens": 2000,
                      "system": messages[0]["content"],
                      "messages": [m for m in messages[1:] if m["role"] != "system"],
                      "stream": True},
                timeout=90.0)
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
            r = c.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
                json={"model": "gpt-4o", "messages": messages, "stream": True, "max_tokens": 2000, "temperature": 0.7},
                timeout=90.0)
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

def _stream(messages):
    return _stream_anthropic(messages) if ANTHROPIC_KEY else _stream_openai(messages)

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    b   = request.get_json()
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    msgs = [{"role": "system", "content": sys}]
    for h in (b.get('history', []))[-10:]:
        msgs.append({"role": h["role"], "content": h["content"]})
    msgs.append({"role": "user", "content": b.get('message', '')})
    sheets_append('AI Conversations', [now_str(), session.get('user_id',''), session.get('user_org',''), b.get('message','')[:200], 'Chat', '', '', '', '0'])
    return _stream(msgs)

@app.route('/api/simulate/<mode>/<int:act_id>', methods=['POST'])
@login_required
def api_simulate(mode, act_id):
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    if act_id == 0:
        row, _ = find_user(session.get('user_id',''))
        sims   = int(row[10]) if row and len(row) > 10 and row[10] else 0
        if sims >= SIM_LIMIT_PER_WEEK:
            return jsonify({"error": "Weekly simulation limit reached", "limit": SIM_LIMIT_PER_WEEK}), 429
    prompts = FULL_PROMPTS if mode == 'full' else PARTIAL_PROMPTS
    if act_id not in prompts: return jsonify({"error": "Invalid act"}), 400
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    if mode == 'partial': sys += "\nIMPORTANT: PARTIAL FAILURE scenario. Early detection limited damage."
    msgs = [{"role": "system", "content": sys}, {"role": "user", "content": prompts[act_id]}]
    device, browser = get_device_info()
    sheets_append('Activity Log', [now_str(), session.get('user_id',''), session.get('user_name',''), session.get('user_org',''), 'Ran Simulation', f'Act {act_id}', mode, '', '', device, browser])
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
        return t.replace('\u2014','-').replace('\u2013','-').replace('\u2018',"'").replace('\u2019',"'").replace('\u201c','"').replace('\u201d','"').replace('\u2026','...').replace('\u00b0','deg').replace('\u00ae','(R)').replace('\u2212','-')

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 18)
    pdf.cell(0, 10, safe('PANTHEON — Life Safety OS'), ln=True)
    pdf.cell(0, 8, safe('Incident Reconstruction Report'), ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100,100,100)
    pdf.cell(0, 5, safe(f'{"Full" if mode=="full" else "Partial"} Failure Scenario  |  {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}  |  {session.get("user_org","")}'), ln=True)
    pdf.ln(4)
    pdf.set_draw_color(180,180,180)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_text_color(0,0,0)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, safe(inc.get('title','')), ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80,80,80)
    pdf.cell(0, 5, safe(f'{inc.get("id","")} | {inc.get("facility","")} | {inc.get("region","")} | {inc.get("date","")} | {inc.get("severity","")}'), ln=True)
    pdf.ln(5)

    names = ['Baseline Reality','Risk Accumulation','State Change','Cascade & Constraint','Post-Event Intel']
    pdf.set_text_color(0,0,0)
    for i, text in enumerate(acts[:5]):
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(0, 7, f'ACT {i:02d} — {names[i]}', ln=True)
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(60,60,60)
        clean = safe(text.replace('**','').replace('<strong>','').replace('</strong>','').replace('<br>','\n').replace('</p><p>','\n\n').replace('<p>','').replace('</p>',''))
        for line in clean.split('\n'):
            line = line.strip()
            if line: pdf.multi_cell(0, 4.5, line)
        pdf.ln(3)
        pdf.set_text_color(0,0,0)

    # Footer CTA
    pdf.ln(4)
    pdf.set_draw_color(180,180,180)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(120,120,120)
    pdf.multi_cell(0, 4, safe('This report was generated by Pantheon Life Safety OS — an HCT + Embedded Logix platform. For access or inquiries: hct-pantheon.vercel.app | okapade@hct-world.com'))

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return Response(buf.read(), mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=pantheon-{mode}-{inc.get("id","report")}.pdf'})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
