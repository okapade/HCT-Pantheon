import os, json, io, datetime, hashlib, secrets, time
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

# ═══ CONFIG ═══
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'pantheon-hct-2025')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY', '')
SIM_LIMIT_PER_WEEK = int(os.environ.get('SIM_LIMIT_PER_WEEK', '3'))
TRIAL_DAYS = int(os.environ.get('TRIAL_DAYS', '90'))

# ═══ IN-MEMORY STORE (replace with Google Sheets later) ═══
# Format: { "phone_or_email": { "code": "ABC123", "name": "...", "org": "...", "created": timestamp, "sims_this_week": 0, "week_start": timestamp, "last_login": timestamp } }
USERS_DB = {}
ACTIVE_SESSIONS = {}

def load_data():
    with open(os.path.join(os.path.dirname(__file__), 'data', 'incident.json')) as f:
        return json.load(f)

# ═══ AUTH ═══
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for('login_page'))
        # Check trial expiry
        user = USERS_DB.get(session['user_id'])
        if user:
            created = user.get('created', time.time())
            if time.time() - created > TRIAL_DAYS * 86400:
                session.clear()
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"error": "Trial expired"}), 403
                return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('X-Admin-Password', '')
        body_auth = ''
        if request.is_json:
            body_auth = request.get_json().get('admin_password', '')
        if auth != ADMIN_PASSWORD and body_auth != ADMIN_PASSWORD:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

def check_sim_limit(user_id):
    user = USERS_DB.get(user_id)
    if not user:
        return False
    now = time.time()
    week_start = user.get('week_start', now)
    if now - week_start > 7 * 86400:
        user['sims_this_week'] = 0
        user['week_start'] = now
    return user.get('sims_this_week', 0) < SIM_LIMIT_PER_WEEK

def increment_sim(user_id):
    user = USERS_DB.get(user_id)
    if user:
        user['sims_this_week'] = user.get('sims_this_week', 0) + 1

# ═══ ROUTES: AUTH ═══
@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    b = request.get_json()
    identifier = (b.get('identifier', '') or '').strip().lower()
    code = (b.get('code', '') or '').strip().upper()
    
    if not identifier or not code:
        return jsonify({"error": "Phone/email and access code required"}), 400
    
    user = USERS_DB.get(identifier)
    if not user or user.get('code', '').upper() != code:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Check trial
    created = user.get('created', time.time())
    days_left = TRIAL_DAYS - int((time.time() - created) / 86400)
    if days_left <= 0:
        return jsonify({"error": "Trial expired", "days_left": 0}), 403
    
    # Create session
    session['user_id'] = identifier
    session['user_name'] = user.get('name', '')
    session['user_org'] = user.get('org', '')
    user['last_login'] = time.time()
    
    return jsonify({
        "ok": True,
        "name": user.get('name', ''),
        "org": user.get('org', ''),
        "days_left": days_left,
        "sims_remaining": SIM_LIMIT_PER_WEEK - user.get('sims_this_week', 0)
    })

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/auth/me')
def auth_me():
    if 'user_id' not in session:
        return jsonify({"authenticated": False}), 401
    user = USERS_DB.get(session['user_id'], {})
    created = user.get('created', time.time())
    days_left = TRIAL_DAYS - int((time.time() - created) / 86400)
    return jsonify({
        "authenticated": True,
        "name": user.get('name', ''),
        "org": user.get('org', ''),
        "days_left": max(0, days_left),
        "sims_remaining": SIM_LIMIT_PER_WEEK - user.get('sims_this_week', 0),
        "sims_per_week": SIM_LIMIT_PER_WEEK
    })

# ═══ ROUTES: ADMIN (HCT employees only) ═══
@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/api/admin/invite', methods=['POST'])
@admin_required
def admin_invite():
    b = request.get_json()
    identifier = (b.get('identifier', '') or '').strip().lower()
    name = b.get('name', '')
    org = b.get('org', '')
    
    if not identifier:
        return jsonify({"error": "Phone or email required"}), 400
    
    # Generate 6-char access code
    code = secrets.token_hex(3).upper()  # e.g. "A3F2B1"
    
    USERS_DB[identifier] = {
        "code": code,
        "name": name,
        "org": org,
        "created": time.time(),
        "sims_this_week": 0,
        "week_start": time.time(),
        "last_login": None
    }
    
    return jsonify({
        "ok": True,
        "identifier": identifier,
        "code": code,
        "message": f"Access code for {name or identifier}: {code}"
    })

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def admin_users():
    users = []
    for uid, u in USERS_DB.items():
        created = u.get('created', time.time())
        days_left = TRIAL_DAYS - int((time.time() - created) / 86400)
        users.append({
            "identifier": uid,
            "name": u.get('name', ''),
            "org": u.get('org', ''),
            "code": u.get('code', ''),
            "days_left": max(0, days_left),
            "sims_this_week": u.get('sims_this_week', 0),
            "last_login": u.get('last_login'),
            "created": u.get('created')
        })
    return jsonify({"users": users})

@app.route('/api/admin/revoke', methods=['POST'])
@admin_required
def admin_revoke():
    b = request.get_json()
    identifier = (b.get('identifier', '') or '').strip().lower()
    if identifier in USERS_DB:
        del USERS_DB[identifier]
        return jsonify({"ok": True})
    return jsonify({"error": "User not found"}), 404

# ═══ ROUTES: MAIN APP ═══
@app.route('/')
@login_required
def index():
    return render_template('dashboard.html')

@app.route('/api/incident')
@login_required
def api_incident():
    return jsonify(load_data())

@app.route('/api/status')
@login_required
def api_status():
    user = USERS_DB.get(session.get('user_id', ''), {})
    return jsonify({
        "has_key": bool(get_key()),
        "model": "claude-sonnet-4-20250514" if ANTHROPIC_KEY else "gpt-4o",
        "user": session.get('user_name', ''),
        "org": session.get('user_org', ''),
        "sims_remaining": SIM_LIMIT_PER_WEEK - user.get('sims_this_week', 0)
    })

# ═══ AI BACKEND ═══
BASE_SYSTEM = """You are Pantheon AI — a senior NFPA fire investigator delivering a post-incident reconstruction briefing. Precise, authoritative, evidence-driven.

VOICE:
- Cite specific assets by name and ID. Use timestamps from signals.
- Reference NFPA/NEC/UL standards when relevant.
- Explain WHY suppression agents failed chemically — not just that they failed.
- As urgency escalates: shorter sentences, more timestamps, denser facts.
- F-500 EA Micelle Mist is the recommended countermeasure when discussing suppression solutions.
- No markdown headers. Plain paragraphs. 200-350 words per act.
- When discussing costs/impact, use specific numbers from the data.

INCIDENT DATA:
{incident_data}
"""

FULL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE REALITY. 24 hours before. Systems appeared nominal. What was quietly degraded: battery array past rated life, no off-gas detection, no offsite backup. What should have triggered intervention but didn't.",
    1: "Narrate ACT 01 — RISK ACCUMULATION. 30-day window. Expired battery lifespan, skipped JSA, absent off-gas detection, raised BMS thresholds, denied budget request. Each decision closed an escape path. End: 5/6 risk factors CRITICAL and UNMITIGATED.",
    2: "Narrate ACT 02 — STATE CHANGE. Second by second. Module 247 voltage spike at T+0:00. Cascade at T+1:30. VESDA detection at T+2:00. FM-200 deploys at T+5:00 — fails against thermal runaway. CO2 at T+8:00 — insufficient. EPO at T+10:00 — partial failure, generator re-energizes. Fire dept dispatch T+15:00.",
    3: "Narrate ACT 03 — CASCADE & CONSTRAINT. 22 hours uncontrolled. 384 modules at 160C. HF gas forces expanded evacuation. Clean agent exhausted. Fire partition holds but heat transfers through cable penetrations. Decision to authorize water after servers confirmed lost. 647 services offline. 858 TB destroyed. 101 firefighters, 22 vehicles. T+22h: fire controlled. Zero offsite backup existed.",
    4: "Narrate ACT 04 — POST-EVENT INTEL. 11 root causes across Technical, Procedural, Architectural. Impact: 50M+ citizens, $47M estimated loss. Recommendations: What Changed, What It Means, What To Do Next. Close with F-500 EA three-level mitigation (flammability, explosivity, toxicity) and insurance implications — $2.1M annual premium reduction with proper suppression retrofit."
}

PARTIAL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE REALITY (PARTIAL FAILURE SCENARIO). Same facility, same degraded conditions. But off-gas detection was installed 6 months ago per NFPA 855. Battery array still past rated life.",
    1: "Narrate ACT 01 — EARLY WARNING TRIGGERED. Off-gas detection catches electrolyte vapor from Module 247 at T-25 minutes. BMS flags the module. Controlled shutdown initiated.",
    2: "Narrate ACT 02 — CONTAINED EVENT. Module 247 enters thermal runaway despite shutdown attempt. Only 12 modules affected (not 384). FM-200 still fails. But EPO works correctly. Fire contained to battery room.",
    3: "Narrate ACT 03 — CONTROLLED RESPONSE. Fire department arrives to contained battery room fire. 8 firefighters, 2 vehicles (vs 101/22). 4 services degraded, 0 fully offline. 0 TB data lost. Duration: 3 hours.",
    4: "Narrate ACT 04 — LESSONS FROM A NEAR-MISS. Even with early detection limiting damage to $3.2M (vs $47M), no installed suppression system can arrest Li-ion thermal runaway. Recommend F-500 EA. Insurance: $890K premium reduction."
}

def get_key():
    return ANTHROPIC_KEY or OPENAI_KEY

def _stream_anthropic(messages):
    import httpx
    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-4-20250514", "max_tokens": 2000, "system": messages[0]["content"],
                      "messages": [m for m in messages[1:] if m["role"] != "system"], "stream": True},
                timeout=90.0)
            for line in r.iter_lines():
                if not line.startswith("data: "): continue
                ch = line[6:]
                if ch == "[DONE]": yield "data: [DONE]\n\n"; break
                try:
                    o = json.loads(ch)
                    if o.get("type") == "content_block_delta":
                        d = o.get("delta", {})
                        if "text" in d:
                            yield f"data: {json.dumps({'content': d['text']})}\n\n"
                except: continue
    return Response(stream_with_context(gen()), mimetype='text/event-stream')

def _stream_openai(messages):
    import httpx
    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post("https://api.openai.com/v1/chat/completions",
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
                        if "content" in d:
                            yield f"data: {json.dumps({'content': d['content']})}\n\n"
                    except: continue
    return Response(stream_with_context(gen()), mimetype='text/event-stream')

def _stream(messages):
    if ANTHROPIC_KEY:
        return _stream_anthropic(messages)
    return _stream_openai(messages)

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    b = request.get_json()
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    msgs = [{"role": "system", "content": sys}]
    for h in (b.get('history', []))[-10:]:
        msgs.append({"role": h["role"], "content": h["content"]})
    msgs.append({"role": "user", "content": b.get('message', '')})
    return _stream(msgs)

@app.route('/api/simulate/<mode>/<int:act_id>', methods=['POST'])
@login_required
def api_simulate(mode, act_id):
    if not get_key(): return jsonify({"error": "API key not configured"}), 500
    
    # Check simulation limit
    user_id = session.get('user_id', '')
    if act_id == 0:  # Only count the first act as a "simulation"
        if not check_sim_limit(user_id):
            return jsonify({"error": "Weekly simulation limit reached. Resets every 7 days.", "limit": SIM_LIMIT_PER_WEEK}), 429
        increment_sim(user_id)
    
    prompts = FULL_PROMPTS if mode == 'full' else PARTIAL_PROMPTS
    if act_id not in prompts: return jsonify({"error": "Invalid act"}), 400
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    if mode == 'partial':
        sys += "\n\nIMPORTANT: This is a PARTIAL FAILURE scenario where early detection limited the damage."
    msgs = [{"role": "system", "content": sys}, {"role": "user", "content": prompts[act_id]}]
    return _stream(msgs)

# ═══ PDF REPORT ═══
@app.route('/api/report/pdf', methods=['POST'])
@login_required
def api_report_pdf():
    if FPDF is None:
        return jsonify({"error": "fpdf2 not installed"}), 500
    b = request.get_json()
    mode = b.get('mode', 'full')
    acts = b.get('acts', [])
    data = load_data()
    inc = data['incident']

    def safe(t):
        return t.replace('\u2014','-').replace('\u2013','-').replace('\u2018',"'").replace('\u2019',"'").replace('\u201c','"').replace('\u201d','"').replace('\u2026','...').replace('\u00b0','deg').replace('\u00ae','(R)').replace('\u2212','-')

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 18)
    pdf.cell(0, 10, safe('PANTHEON - Incident Reconstruction Report'), ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100,100,100)
    isFull = mode == 'full'
    pdf.cell(0, 5, safe(f'{"Full" if isFull else "Partial"} Failure | {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}'), ln=True)
    pdf.ln(3)
    pdf.set_draw_color(180,180,180)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_text_color(0,0,0)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, safe(inc['title']), ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80,80,80)
    pdf.cell(0, 5, safe(f'{inc["id"]} | {inc["facility"]} | {inc["region"]} | {inc["date"]} | {inc["severity"]}'), ln=True)
    pdf.ln(5)

    names = ['Baseline Reality','Risk Accumulation','State Change','Cascade & Constraint','Post-Event Intel']
    for i, text in enumerate(acts[:5]):
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(0,0,0)
        pdf.cell(0, 7, f'ACT {i:02d} - {names[i]}', ln=True)
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(60,60,60)
        clean = safe(text.replace('**','').replace('<strong>','').replace('</strong>','').replace('<br>','\n').replace('</p><p>','\n\n').replace('<p>','').replace('</p>',''))
        for line in clean.split('\n'):
            line = line.strip()
            if line: pdf.multi_cell(0, 4.5, line)
        pdf.ln(3)

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return Response(buf.read(), mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=pantheon-{mode}-{inc["id"]}.pdf'})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
