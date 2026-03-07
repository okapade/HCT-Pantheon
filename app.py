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
app.config['SESSION_COOKIE_HTTPONLY'] = Trueimport os, json, io, datetime
from flask import Flask, render_template, jsonify, request, Response, stream_with_context

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

def load_data():
    with open(os.path.join(os.path.dirname(__file__), 'data', 'incident.json')) as f:
        return json.load(f)

# ═══════════════════════════════════════════════════
# JURISDICTION-AWARE COMPLIANCE DATABASE
# ═══════════════════════════════════════════════════
JURISDICTION_DB = {
    "US": {
        "federal": [
            {"code": "NFPA 855", "title": "Stationary Energy Storage Systems", "edition": "2023", "scope": "Federal", "type": "fire_protection", "mandatory": True, "desc": "Primary standard for BESS installation and fire protection. Requires HMA for all Li-ion installations >20 kWh."},
            {"code": "NFPA 75", "title": "Fire Protection of IT Equipment", "edition": "2024", "scope": "Federal", "type": "fire_protection", "mandatory": True, "desc": "Governs fire protection for data centers including detection, suppression, and separation."},
            {"code": "NFPA 72", "title": "Fire Alarm & Signaling Code", "edition": "2022", "scope": "Federal", "type": "detection", "mandatory": True, "desc": "Detection system requirements including VESDA, spot detection, and notification appliances."},
            {"code": "NFPA 13", "title": "Sprinkler Systems", "edition": "2022", "scope": "Federal", "type": "suppression", "mandatory": True, "desc": "Automatic sprinkler design/installation. Pre-action systems common in data centers."},
            {"code": "NFPA 2001", "title": "Clean Agent Suppression", "edition": "2022", "scope": "Federal", "type": "suppression", "mandatory": False, "desc": "Clean agent systems. NOTE: Chemically incompatible with Li-ion thermal runaway."},
            {"code": "NFPA 750", "title": "Water Mist Fire Protection", "edition": "2023", "scope": "Federal", "type": "suppression", "mandatory": False, "desc": "Basis for F-500 EA Micelle Mist delivery systems."},
            {"code": "NFPA 18A", "title": "Wetting/Encapsulator Agents", "edition": "2022", "scope": "Federal", "type": "suppression", "mandatory": False, "desc": "Classification for encapsulator agents. Section 7.7 defines micelle-forming agents."},
            {"code": "NFPA 1620", "title": "Pre-Incident Planning", "edition": "2020", "scope": "Federal", "type": "operations", "mandatory": True, "desc": "Pre-incident planning and emergency response protocol development."},
            {"code": "NEC Art. 645", "title": "IT Equipment Rooms", "edition": "2023", "scope": "Federal", "type": "electrical", "mandatory": True, "desc": "EPO requirements, disconnecting means, and wiring for IT rooms."},
            {"code": "NEC Art. 480", "title": "Storage Batteries", "edition": "2023", "scope": "Federal", "type": "electrical", "mandatory": True, "desc": "Battery installation: ventilation, clearances, overcurrent protection."},
            {"code": "UL 9540A", "title": "Thermal Runaway Test Method", "edition": "2023", "scope": "Federal", "type": "testing", "mandatory": True, "desc": "Large-scale fire test for BESS propagation risk and suppression effectiveness."},
            {"code": "OSHA 1910", "title": "General Industry Standards", "edition": "Current", "scope": "Federal", "type": "safety", "mandatory": True, "desc": "Workplace safety: hazmat handling, emergency action plans, fire prevention."},
            {"code": "EPA PFAS", "title": "PFAS Regulations", "edition": "2024", "scope": "Federal", "type": "environmental", "mandatory": True, "desc": "Fluorinated substance restrictions. F-500 EA is fluorine-free and compliant."},
            {"code": "IFC Ch. 12", "title": "Energy Storage Systems", "edition": "2024", "scope": "Federal", "type": "fire_protection", "mandatory": True, "desc": "IFC Chapter 12: ESS installation, commissioning, and decommissioning."},
        ],
        "states": {
            "CA": {"name": "California", "standards": [
                {"code": "CFC Ch. 12", "title": "CA Fire Code — ESS", "edition": "2022", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "California amendments to IFC Ch.12. Requires UL 9540A for ALL installations."},
                {"code": "Title 24 Pt 9", "title": "CA Fire Code", "edition": "2022", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "California Building Standards fire protection requirements."},
                {"code": "CPUC ESS", "title": "CPUC Energy Storage Safety", "edition": "2023", "scope": "State", "type": "regulatory", "mandatory": True, "desc": "CPUC safety requirements for utility-connected ESS."},
                {"code": "SB-38", "title": "Battery Recycling Act", "edition": "2022", "scope": "State", "type": "environmental", "mandatory": True, "desc": "Battery recycling and end-of-life management."},
            ], "notes": "Most aggressive BESS requirements in the US. LA, SF, San Diego add local amendments."},
            "TX": {"name": "Texas", "standards": [
                {"code": "TFC", "title": "Texas Fire Code (IFC)", "edition": "2021", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "Texas adopts IFC with amendments. Requires HMA."},
                {"code": "PUCT Rules", "title": "Public Utility Commission", "edition": "2023", "scope": "State", "type": "regulatory", "mandatory": True, "desc": "ERCOT interconnection safety standards for grid-scale BESS."},
            ], "notes": "Massive BESS deployment (ERCOT). Enforcement varies by AHJ."},
            "NY": {"name": "New York", "standards": [
                {"code": "FDNY Rules", "title": "FDNY Battery Storage Rules", "edition": "2023", "scope": "City", "type": "fire_protection", "mandatory": True, "desc": "FDNY-specific ESS rules: permits, inspections, 24/7 monitoring mandate."},
                {"code": "NYC BC Ch. 12", "title": "NYC Building Code ESS", "edition": "2022", "scope": "City", "type": "fire_protection", "mandatory": True, "desc": "NYC ESS requirements exceeding state code. Quarterly inspections."},
                {"code": "PSC Order", "title": "Public Service Commission", "edition": "2023", "scope": "State", "type": "regulatory", "mandatory": True, "desc": "NYS PSC ESS deployment and safety requirements."},
            ], "notes": "NYC/FDNY most prescriptive local requirements in US. 24/7 remote monitoring mandatory."},
            "MA": {"name": "Massachusetts", "standards": [
                {"code": "527 CMR", "title": "MA Fire Code", "edition": "2023", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "MA fire code with ESS amendments. References NFPA 855."},
                {"code": "DFS BESS", "title": "Dept of Fire Services BESS", "edition": "2023", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "MA DFS guidance referencing FRA BESS fire impact assessment."},
            ], "notes": "DFS actively references FRA BESS fire impact assessment framework."},
            "FL": {"name": "Florida", "standards": [
                {"code": "FFC", "title": "FL Fire Prevention Code", "edition": "2023", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "Florida IFC adoption. Hurricane zone requirements affect BESS enclosures."},
                {"code": "FBC Ch. 12", "title": "FL Building Code ESS", "edition": "2023", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "Wind load and flood zone requirements for ESS."},
            ], "notes": "Hurricane zones require structural standards for outdoor BESS."},
            "AZ": {"name": "Arizona", "standards": [
                {"code": "IFC-AZ", "title": "Arizona Fire Code", "edition": "2021", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "Arizona IFC adoption for BESS installations."},
                {"code": "ACC Rules", "title": "AZ Corporation Commission", "edition": "2023", "scope": "State", "type": "regulatory", "mandatory": True, "desc": "Post-McMicken enhanced monitoring and response requirements."},
            ], "notes": "Post-McMicken explosion (2019): heightened BESS scrutiny."},
            "IL": {"name": "Illinois", "standards": [
                {"code": "IFC-IL", "title": "Illinois Fire Code", "edition": "2021", "scope": "State", "type": "fire_protection", "mandatory": True, "desc": "Illinois IFC adoption."},
                {"code": "Chicago BC", "title": "Chicago Building Code ESS", "edition": "2023", "scope": "City", "type": "fire_protection", "mandatory": True, "desc": "Chicago uses own building code, not IFC."},
            ], "notes": "Chicago operates under its own building code."},
        }
    },
    "UK": {"federal": [
        {"code": "BS EN 62619", "title": "Battery Safety Requirements", "edition": "2022", "scope": "National", "type": "safety", "mandatory": True, "desc": "Li-ion battery safety for industrial applications."},
        {"code": "BS 9999", "title": "Fire Safety in Building Design", "edition": "2017", "scope": "National", "type": "fire_protection", "mandatory": True, "desc": "Fire safety code of practice for buildings."},
        {"code": "HSE DSEAR", "title": "Dangerous Substances Regs", "edition": "2002", "scope": "National", "type": "safety", "mandatory": True, "desc": "DSEAR applies to Li-ion off-gas environments."},
        {"code": "NFCC Guidance", "title": "NFCC BESS Guidance", "edition": "2023", "scope": "National", "type": "fire_protection", "mandatory": True, "desc": "National Fire Chiefs Council BESS guidance."},
    ], "states": {}},
    "AU": {"federal": [
        {"code": "AS/NZS 5139", "title": "BESS Safety", "edition": "2019", "scope": "National", "type": "safety", "mandatory": True, "desc": "Battery storage safety for residential/commercial."},
        {"code": "NCC Vol 1", "title": "National Construction Code", "edition": "2022", "scope": "National", "type": "fire_protection", "mandatory": True, "desc": "National fire safety requirements for ESS."},
        {"code": "AS 1851", "title": "Fire Protection Service", "edition": "2012", "scope": "National", "type": "maintenance", "mandatory": True, "desc": "Routine maintenance of fire protection systems."},
    ], "states": {}},
    "DE": {"federal": [
        {"code": "VDE 2510-50", "title": "Stationary BESS Safety", "edition": "2017", "scope": "National", "type": "safety", "mandatory": True, "desc": "German safety guide for stationary BESS."},
        {"code": "VdS 3103", "title": "PV + Storage Fire Protection", "edition": "2019", "scope": "National", "type": "fire_protection", "mandatory": True, "desc": "VdS fire protection for PV and battery storage."},
    ], "states": {}},
    "SG": {"federal": [
        {"code": "SS 691", "title": "Green Data Centres", "edition": "2022", "scope": "National", "type": "standards", "mandatory": True, "desc": "Singapore Standard for green data centres."},
        {"code": "SCDF Reqs", "title": "SCDF Fire Safety", "edition": "2023", "scope": "National", "type": "fire_protection", "mandatory": True, "desc": "SCDF ESS provisions for high-rise/critical infrastructure."},
    ], "states": {}},
}

def get_jurisdiction_standards(country_code, state_code=None):
    result = {"jurisdiction": {"country": country_code, "state": state_code}, "federal": [], "state": [], "local_notes": "", "total_count": 0, "compliance_gaps": [], "risk_factors": []}
    country = JURISDICTION_DB.get(country_code, JURISDICTION_DB.get("US"))
    if not country: return result
    result["federal"] = country.get("federal", [])
    if state_code and state_code in country.get("states", {}):
        state = country["states"][state_code]
        result["state"] = state.get("standards", [])
        result["local_notes"] = state.get("notes", "")
        result["jurisdiction"]["state_name"] = state.get("name", "")
    result["total_count"] = len(result["federal"]) + len(result["state"])
    result["compliance_gaps"] = [
        {"standard": "NFPA 855", "gap": "Off-gas detection not installed", "severity": "CRITICAL"},
        {"standard": "UL 9540A", "gap": "No large-scale fire test conducted", "severity": "HIGH"},
        {"standard": "NFPA 750/18A", "gap": "No encapsulator agent suppression", "severity": "CRITICAL"},
        {"standard": "NEC 645", "gap": "EPO logic does not isolate generator", "severity": "HIGH"},
    ]
    result["risk_factors"] = [
        {"factor": "Battery age exceeds rated life", "standard": "NFPA 855", "status": "NON-COMPLIANT"},
        {"factor": "No off-gas detection", "standard": "NFPA 855", "status": "NON-COMPLIANT"},
        {"factor": "Clean agent incompatible with Li-ion", "standard": "NFPA 2001", "status": "GAP"},
        {"factor": "Zero offsite backup", "standard": "NFPA 75", "status": "NON-COMPLIANT"},
    ]
    return result

API_REGISTRY = {
    "endpoints": [
        {"method": "GET", "path": "/api/incident", "name": "Get Incident Data", "description": "Full incident dataset: assets, services, standards, timeline, root cause.", "category": "Core Data", "auth": "API Key", "params": [], "rate_limit": "100/min"},
        {"method": "GET", "path": "/api/status", "name": "System Status", "description": "System health, API key status, active model.", "category": "Core Data", "auth": "None", "params": [], "rate_limit": "1000/min"},
        {"method": "POST", "path": "/api/simulate/{mode}/{act_id}", "name": "Run Simulation Act", "description": "Stream AI narrative for a specific act. Returns SSE.", "category": "Simulation", "auth": "API Key", "params": [{"name": "mode", "type": "path", "required": True, "desc": "'full' or 'partial'"}, {"name": "act_id", "type": "path", "required": True, "desc": "0-4"}], "rate_limit": "20/min"},
        {"method": "POST", "path": "/api/chat", "name": "Chat with Pantheon AI", "description": "Send message with history. Returns streaming SSE.", "category": "AI Intelligence", "auth": "API Key", "params": [{"name": "message", "type": "body", "required": True, "desc": "User message"}, {"name": "history", "type": "body", "required": False, "desc": "[{role, content}]"}], "rate_limit": "30/min"},
        {"method": "POST", "path": "/api/compliance/check", "name": "Compliance Check", "description": "All applicable standards + gaps for a jurisdiction.", "category": "Compliance", "auth": "API Key", "params": [{"name": "country", "type": "body", "required": True, "desc": "ISO country code"}, {"name": "state", "type": "body", "required": False, "desc": "State code"}, {"name": "facility_type", "type": "body", "required": False, "desc": "data_center, utility, etc."}], "rate_limit": "60/min"},
        {"method": "GET", "path": "/api/compliance/standards", "name": "List All Standards", "description": "Complete standards database across all jurisdictions.", "category": "Compliance", "auth": "API Key", "params": [{"name": "type", "type": "query", "required": False, "desc": "fire_protection, detection, etc."}], "rate_limit": "60/min"},
        {"method": "POST", "path": "/api/risk/score", "name": "Risk Score", "description": "Calculate facility risk score (0-100) from configuration.", "category": "Risk Intelligence", "auth": "API Key", "params": [{"name": "battery_chemistry", "type": "body", "required": True, "desc": "NMC, LFP, NCA, LTO"}, {"name": "battery_age_years", "type": "body", "required": True, "desc": "Age in years"}, {"name": "suppression_type", "type": "body", "required": True, "desc": "fm200, co2, f500ea, none"}, {"name": "detection_offgas", "type": "body", "required": True, "desc": "Boolean"}], "rate_limit": "30/min"},
        {"method": "POST", "path": "/api/report/pdf", "name": "Generate PDF Report", "description": "PDF incident reconstruction with all acts and recommendations.", "category": "Reports", "auth": "API Key", "params": [{"name": "mode", "type": "body", "required": True, "desc": "'full' or 'partial'"}, {"name": "acts", "type": "body", "required": True, "desc": "Array of 5 act texts"}], "rate_limit": "10/min"},
        {"method": "POST", "path": "/api/monitor/ingest", "name": "Ingest Sensor Data", "description": "Ingest from BMS, VESDA, Smart-LX, or any MQTT/REST source. Sensor-agnostic.", "category": "Monitoring", "auth": "API Key", "params": [{"name": "source", "type": "body", "required": True, "desc": "smartlx, vesda, honeywell, etc."}, {"name": "readings", "type": "body", "required": True, "desc": "[{sensor_id, metric, value, unit, timestamp}]"}, {"name": "facility_id", "type": "body", "required": True, "desc": "Facility ID"}], "rate_limit": "1000/min"},
        {"method": "GET", "path": "/api/monitor/alerts", "name": "Get Active Alerts", "description": "Active monitoring alerts with severity and recommended action.", "category": "Monitoring", "auth": "API Key", "params": [{"name": "facility_id", "type": "query", "required": True, "desc": "Facility ID"}, {"name": "severity", "type": "query", "required": False, "desc": "low, medium, high, critical"}], "rate_limit": "100/min"},
        {"method": "POST", "path": "/api/training/enroll", "name": "Enroll in Training", "description": "Enroll personnel in role-based LMS training paths.", "category": "Training", "auth": "API Key", "params": [{"name": "employee_id", "type": "body", "required": True, "desc": "Employee ID"}, {"name": "role", "type": "body", "required": True, "desc": "facility_manager, maintenance_tech, etc."}], "rate_limit": "30/min"},
        {"method": "GET", "path": "/api/training/status", "name": "Training Status", "description": "Workforce readiness and certification status.", "category": "Training", "auth": "API Key", "params": [{"name": "facility_id", "type": "query", "required": True, "desc": "Facility ID"}], "rate_limit": "60/min"},
    ],
    "sdk": {
        "python": 'import requests\n\nAPI_KEY = "pk_live_..."\nBASE = "https://api.pantheon.ai/v1"\n\n# Compliance check\nresp = requests.post(f"{BASE}/compliance/check",\n    headers={"Authorization": f"Bearer {API_KEY}"},\n    json={"country": "US", "state": "CA"})\nprint(f"{resp.json()[\'total_count\']} standards apply")\n\n# Risk score\nresp = requests.post(f"{BASE}/risk/score",\n    headers={"Authorization": f"Bearer {API_KEY}"},\n    json={"battery_chemistry": "NMC",\n          "battery_age_years": 11,\n          "suppression_type": "fm200",\n          "detection_offgas": False})\nprint(resp.json())',
        "javascript": 'const API_KEY = "pk_live_...";\nconst BASE = "https://api.pantheon.ai/v1";\n\n// Compliance check\nconst resp = await fetch(`${BASE}/compliance/check`, {\n  method: "POST",\n  headers: {\n    "Authorization": `Bearer ${API_KEY}`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    country: "US", state: "NY"\n  })\n});\nconst data = await resp.json();\nconsole.log(`${data.total_count} standards apply`);',
        "curl": '# Compliance check\ncurl -X POST https://api.pantheon.ai/v1/compliance/check \\\n  -H "Authorization: Bearer pk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d \'{"country":"US","state":"CA"}\'\n\n# Risk score\ncurl -X POST https://api.pantheon.ai/v1/risk/score \\\n  -H "Authorization: Bearer pk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d \'{"battery_chemistry":"NMC","battery_age_years":11,"suppression_type":"fm200","detection_offgas":false}\''
    }
}


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
    2: "Narrate ACT 02 — STATE CHANGE. Second by second. Module 247 voltage spike at T+0:00. Cascade at T+1:30. VESDA detection at T+2:00. FM-200 deploys at T+5:00 — fails against thermal runaway. CO₂ at T+8:00 — insufficient. EPO at T+10:00 — partial failure, generator re-energizes. Fire dept dispatch T+15:00.",
    3: "Narrate ACT 03 — CASCADE & CONSTRAINT. 22 hours uncontrolled. 384 modules at 160°C. HF gas forces expanded evacuation. Clean agent exhausted. Fire partition holds but heat transfers through cable penetrations. Decision to authorize water after servers confirmed lost. 647 services offline. 858 TB destroyed. 101 firefighters, 22 vehicles. T+22h: fire controlled. Zero offsite backup existed.",
    4: "Narrate ACT 04 — POST-EVENT INTEL. 11 root causes across Technical, Procedural, Architectural. Impact: 50M+ citizens, $47M estimated loss. Recommendations: What Changed → What It Means → What To Do Next. Close with F-500 EA three-level mitigation (flammability, explosivity, toxicity) and insurance implications — $2.1M annual premium reduction with proper suppression retrofit."
}

PARTIAL_PROMPTS = {
    0: "Narrate ACT 00 — BASELINE REALITY (PARTIAL FAILURE SCENARIO). Same facility, same degraded conditions. But in this scenario, off-gas detection was installed 6 months ago per NFPA 855 recommendations. Battery array still past rated life. Walk through what's the same and what's different.",
    1: "Narrate ACT 01 — EARLY WARNING TRIGGERED. Off-gas detection catches electrolyte vapor from Module 247 at T-25 minutes before thermal runaway. BMS flags the module. Facility team initiates controlled shutdown of Battery Array A. JSA still wasn't done, but the detection bought time.",
    2: "Narrate ACT 02 — CONTAINED EVENT. Module 247 enters thermal runaway despite shutdown attempt. But: only 12 modules affected (not 384). FM-200 still fails against Li-ion chemistry. However, EPO works correctly this time — generator doesn't re-energize. Fire contained to battery room.",
    3: "Narrate ACT 03 — CONTROLLED RESPONSE. Fire department arrives to contained battery room fire. 8 firefighters, 2 vehicles (vs 101/22). Server Cluster A degraded but not destroyed. 4 services degraded, 0 fully offline. 0 TB data lost. Duration: 3 hours. FM-200 still failed — suppression gap remains.",
    4: "Narrate ACT 04 — LESSONS FROM A NEAR-MISS. Even with early detection limiting damage to $3.2M (vs $47M), no installed suppression can arrest Li-ion thermal runaway. Off-gas detection bought 25 minutes but didn't stop the fire. FM-200 is chemically incompatible. Recommend F-500 EA. Insurance: $890K premium reduction."
}

def get_key():
    return os.environ.get('ANTHROPIC_API_KEY', '')

def _stream(messages):
    import httpx
    # Convert from OpenAI format to Anthropic format
    system_text = ""
    anthropic_msgs = []
    for m in messages:
        if m["role"] == "system":
            system_text += m["content"] + "\n"
        else:
            anthropic_msgs.append({"role": m["role"], "content": m["content"]})
    # Ensure messages alternate correctly — merge consecutive same-role messages
    merged = []
    for m in anthropic_msgs:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1]["content"] += "\n\n" + m["content"]
        else:
            merged.append(dict(m))
    if not merged or merged[0]["role"] != "user":
        merged.insert(0, {"role": "user", "content": "Begin."})

    def gen():
        with httpx.Client(timeout=90.0) as c:
            r = c.post("https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": get_key(),
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 2000,
                    "system": system_text.strip(),
                    "messages": merged,
                    "stream": True
                },
                timeout=90.0)
            r.raise_for_status()
            for line in r.iter_lines():
                if not line.startswith("data: "):
                    continue
                ch = line[6:]
                if ch == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                try:
                    o = json.loads(ch)
                    etype = o.get("type", "")
                    if etype == "content_block_delta":
                        delta = o.get("delta", {})
                        if delta.get("type") == "text_delta" and "text" in delta:
                            yield f"data: {json.dumps({'content': delta['text']})}\n\n"
                    elif etype == "message_stop":
                        yield "data: [DONE]\n\n"
                        break
                except:
                    continue
    return Response(stream_with_context(gen()), mimetype='text/event-stream')

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/incident')
def api_incident():
    return jsonify(load_data())

@app.route('/api/status')
def api_status():
    return jsonify({"has_key": bool(get_key()), "model": "claude-sonnet-4-20250514"})

@app.route('/api/chat', methods=['POST'])
def api_chat():
    if not get_key(): return jsonify({"error": "ANTHROPIC_API_KEY not set in .env"}), 500
    b = request.get_json()
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    msgs = [{"role": "system", "content": sys}]
    for h in (b.get('history', []))[-10:]:
        msgs.append({"role": h["role"], "content": h["content"]})
    msgs.append({"role": "user", "content": b.get('message', '')})
    return _stream(msgs)

@app.route('/api/simulate/<mode>/<int:act_id>', methods=['POST'])
def api_simulate(mode, act_id):
    if not get_key(): return jsonify({"error": "ANTHROPIC_API_KEY not set in .env"}), 500
    prompts = FULL_PROMPTS if mode == 'full' else PARTIAL_PROMPTS
    if act_id not in prompts: return jsonify({"error": "Invalid act"}), 400
    sys = BASE_SYSTEM.format(incident_data=json.dumps(load_data(), indent=2))
    if mode == 'partial':
        sys += "\n\nIMPORTANT: This is a PARTIAL FAILURE scenario where early detection limited the damage."
    msgs = [{"role": "system", "content": sys}, {"role": "user", "content": prompts[act_id]}]
    return _stream(msgs)

@app.route('/api/compliance/check', methods=['POST'])
def api_compliance_check():
    b = request.get_json() or {}
    return jsonify(get_jurisdiction_standards(b.get('country', 'US'), b.get('state')))

@app.route('/api/compliance/standards')
def api_compliance_standards():
    stype = request.args.get('type')
    all_stds = []
    for cc, country in JURISDICTION_DB.items():
        for s in country.get("federal", []):
            s2 = dict(s); s2["country"] = cc
            if stype and s2.get("type") != stype: continue
            all_stds.append(s2)
    return jsonify({"standards": all_stds, "count": len(all_stds)})

@app.route('/api/risk/score', methods=['POST'])
def api_risk_score():
    b = request.get_json() or {}
    score = 50; factors = []
    chem = b.get('battery_chemistry', 'NMC')
    age = b.get('battery_age_years', 0)
    supp = b.get('suppression_type', 'none')
    offgas = b.get('detection_offgas', False)
    if chem in ('NMC', 'NCA'): score += 15; factors.append({"factor": f"{chem} — high thermal runaway risk", "impact": "+15"})
    if age > 10: score += 20; factors.append({"factor": f"Age {age}yr exceeds rated life", "impact": "+20"})
    elif age > 7: score += 10; factors.append({"factor": f"Age {age}yr approaching EOL", "impact": "+10"})
    if supp in ('fm200', 'co2'): score += 15; factors.append({"factor": f"{supp.upper()} incompatible with Li-ion", "impact": "+15"})
    elif supp == 'none': score += 25; factors.append({"factor": "No suppression", "impact": "+25"})
    elif supp == 'f500ea': score -= 25; factors.append({"factor": "F-500 EA covers all vectors", "impact": "-25"})
    if not offgas: score += 15; factors.append({"factor": "No off-gas detection", "impact": "+15"})
    else: score -= 10; factors.append({"factor": "Off-gas detection active", "impact": "-10"})
    score = max(0, min(100, score))
    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 40 else "LOW"
    return jsonify({"risk_score": score, "risk_level": level, "factors": factors})

@app.route('/api/console/registry')
def api_console_registry():
    return jsonify(API_REGISTRY)

# ═══════════════════════════════════════════════════
# MONITOR ENDPOINTS
# In-memory alert store (replace with DB/Redis in production)
# ═══════════════════════════════════════════════════
import threading
_monitor_lock   = threading.Lock()
_alert_store    = {}   # facility_id -> [alert, ...]
_sensor_store   = {}   # facility_id -> {sensor_id -> latest_reading}
_MAX_ALERTS     = 50   # cap per facility

def _make_alert(source, sensor_id, metric, value, unit, threshold, severity, zone=None):
    return {
        "id":          f"{source}-{sensor_id}-{int(datetime.datetime.utcnow().timestamp())}",
        "source":      source,
        "sensor_id":   sensor_id,
        "zone":        zone or sensor_id,
        "metric":      metric,
        "value":       value,
        "unit":        unit,
        "threshold":   threshold,
        "severity":    severity,
        "timestamp":   datetime.datetime.utcnow().isoformat() + "Z",
        "message":     f"{metric} reading {value}{unit} exceeds {threshold}{unit} threshold",
        "recommended": "Inspect zone and review suppression readiness"
    }

def _evaluate_readings(source, readings, facility_id):
    """
    Evaluate sensor readings against thresholds, generate alerts.
    Thresholds are conservative per NFPA 855 / Smart-LX defaults.
    """
    THRESHOLDS = {
        "temperature":   {"warning": 35, "high": 45, "critical": 60, "unit": "°C"},
        "hf_ppm":        {"warning": 0.5, "high": 1.0, "critical": 3.0, "unit": "ppm"},
        "co_ppm":        {"warning": 25,  "high": 50,  "critical": 100, "unit": "ppm"},
        "co2_ppm":       {"warning": 1000,"high": 5000,"critical": 10000,"unit": "ppm"},
        "voc_ppm":       {"warning": 50,  "high": 200, "critical": 500, "unit": "ppm"},
        "humidity":      {"warning": 70,  "high": 80,  "critical": 90,  "unit": "%"},
        "voltage_delta": {"warning": 0.05,"high": 0.1, "critical": 0.2, "unit": "V"},
        "impedance":     {"warning": 1.2, "high": 1.5, "critical": 2.0, "unit": "mΩ"},
    }
    new_alerts = []
    for r in readings:
        metric    = r.get("metric", "").lower()
        sensor_id = r.get("sensor_id", "unknown")
        try:
            value = float(r.get("value", 0))
        except (TypeError, ValueError):
            continue
        thresholds = THRESHOLDS.get(metric)
        if not thresholds:
            continue
        severity = None
        if value >= thresholds["critical"]:
            severity = "critical"
        elif value >= thresholds["high"]:
            severity = "high"
        elif value >= thresholds["warning"]:
            severity = "medium"
        if severity:
            alert = _make_alert(
                source=source,
                sensor_id=sensor_id,
                metric=metric,
                value=value,
                unit=thresholds["unit"],
                threshold=thresholds[severity],
                severity=severity,
                zone=r.get("zone", sensor_id)
            )
            new_alerts.append(alert)
    return new_alerts


@app.route('/api/monitor/ingest', methods=['POST'])
def api_monitor_ingest():
    b           = request.get_json() or {}
    source      = b.get("source", "unknown")
    readings    = b.get("readings", [])
    facility_id = b.get("facility_id", "default")

    if not isinstance(readings, list):
        return jsonify({"error": "readings must be an array"}), 400

    with _monitor_lock:
        # Store latest reading per sensor
        if facility_id not in _sensor_store:
            _sensor_store[facility_id] = {}
        for r in readings:
            sid = r.get("sensor_id", "unknown")
            _sensor_store[facility_id][sid] = {
                **r,
                "received_at": datetime.datetime.utcnow().isoformat() + "Z"
            }

        # Evaluate and store alerts
        new_alerts = _evaluate_readings(source, readings, facility_id)
        if facility_id not in _alert_store:
            _alert_store[facility_id] = []
        _alert_store[facility_id].extend(new_alerts)
        # Cap to last N alerts
        _alert_store[facility_id] = _alert_store[facility_id][-_MAX_ALERTS:]

    return jsonify({
        "received":    len(readings),
        "alerts_fired": len(new_alerts),
        "facility_id": facility_id,
        "source":      source,
        "timestamp":   datetime.datetime.utcnow().isoformat() + "Z"
    })


@app.route('/api/monitor/alerts', methods=['GET'])
def api_monitor_alerts():
    facility_id = request.args.get("facility_id", "default")
    severity_filter = request.args.get("severity")

    with _monitor_lock:
        alerts = list(_alert_store.get(facility_id, []))

    if severity_filter:
        alerts = [a for a in alerts if a.get("severity") == severity_filter.lower()]

    # Sort newest-first
    alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)

    return jsonify({
        "facility_id": facility_id,
        "alerts":      alerts,
        "count":       len(alerts),
        "timestamp":   datetime.datetime.utcnow().isoformat() + "Z"
    })


@app.route('/api/monitor/sensors', methods=['GET'])
def api_monitor_sensors():
    facility_id = request.args.get("facility_id", "default")
    with _monitor_lock:
        sensors = dict(_sensor_store.get(facility_id, {}))
    return jsonify({"facility_id": facility_id, "sensors": sensors, "count": len(sensors)})


# ═══════════════════════════════════════════════════
# PROFILE UPDATE (used by dashboard settings panel)
# In demo mode: accepts the update and returns success.
# In production (Vercel auth app): override this with
# the Google Sheets write implementation.
# ═══════════════════════════════════════════════════
_demo_profiles = {}  # email/session -> {field: value}

@app.route('/api/profile/update', methods=['POST'])
def api_profile_update():
    b     = request.get_json() or {}
    field = b.get("field", "")
    value = b.get("value", "")
    if not field:
        return jsonify({"error": "field required"}), 400
    # In demo mode, store in memory keyed by a session cookie if present
    session_key = request.cookies.get("pantheon_session", "demo")
    if session_key not in _demo_profiles:
        _demo_profiles[session_key] = {}
    _demo_profiles[session_key][field] = value
    return jsonify({"ok": True, "field": field, "updated": True})


# ═══════════════════════════════════════════════════
# AUTH/ME STUB (demo mode — no real auth)
# Returns a synthetic profile from demo_profiles.
# Vercel production app overrides this with Sheets lookup.
# ═══════════════════════════════════════════════════
@app.route('/api/auth/me', methods=['GET'])
def api_auth_me():
    session_key = request.cookies.get("pantheon_session", "demo")
    saved = _demo_profiles.get(session_key, {})
    profile = {
        "name":               saved.get("name", "Demo User"),
        "email":              saved.get("email", "demo@pantheon.ai"),
        "org":                saved.get("org", "Hazard Control Technologies"),
        "location":           saved.get("location", "Fayetteville, GA"),
        "role":               saved.get("role", "Safety Engineer"),
        "title":              saved.get("title", "Safety Engineer"),
        "facility_type":      saved.get("facility_type", "Data Center"),
        "chemistry":          saved.get("chemistry", "NMC"),
        "suppression":        saved.get("suppression", "FM-200"),
        "detection":          saved.get("detection", "VESDA"),
        "first_login":        saved.get("first_login", datetime.datetime.utcnow().strftime("%Y-%m-%d")),
        "onboarding_complete": saved.get("onboarding_complete", "false"),
        "trial_days":         90,
        "plan":               "trial"
    }
    return jsonify(profile)


@app.route('/api/report/pdf', methods=['POST'])
def api_report_pdf():
    if FPDF is None: return jsonify({"error": "fpdf2 not installed"}), 500
    b = request.get_json(); mode = b.get('mode', 'full'); acts = b.get('acts', [])
    data = load_data(); inc = data['incident']; sol = data['acts']['act_04']['hct_solution']; isFull = mode == 'full'
    def safe(t): return t.replace('\u2014','-').replace('\u2013','-').replace('\u2018',"'").replace('\u2019',"'").replace('\u201c','"').replace('\u201d','"').replace('\u2026','...').replace('\u00b0','deg').replace('\u00ae','(R)').replace('\u2212','-')
    pdf = FPDF(); pdf.set_auto_page_break(auto=True, margin=20); pdf.add_page()
    pdf.set_font('Helvetica','B',18); pdf.cell(0,10,safe('PANTHEON - Incident Reconstruction Report'),ln=True)
    pdf.set_font('Helvetica','',9); pdf.set_text_color(100,100,100)
    pdf.cell(0,5,safe(f'{"Full" if isFull else "Partial"} Failure | {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}'),ln=True)
    pdf.ln(3); pdf.set_draw_color(180,180,180); pdf.line(10,pdf.get_y(),200,pdf.get_y()); pdf.ln(4)
    pdf.set_text_color(0,0,0); pdf.set_font('Helvetica','B',11); pdf.cell(0,7,safe(inc['title']),ln=True)
    pdf.set_font('Helvetica','',9); pdf.set_text_color(80,80,80)
    pdf.cell(0,5,safe(f'{inc["id"]} | {inc["facility"]} | {inc["region"]} | {inc["date"]} | {inc["severity"]}'),ln=True); pdf.ln(5)
    pdf.set_text_color(0,0,0); pdf.set_font('Helvetica','B',10); pdf.cell(0,7,'IMPACT SUMMARY',ln=True)
    pdf.set_font('Helvetica','',9)
    for s in [f'Estimated Loss: {"$47M" if isFull else "$3.2M"}', f'Services: {"647" if isFull else "4"} | Duration: {"22h" if isFull else "3h"}', f'Data Lost: {"858 TB" if isFull else "0 TB"}']: pdf.cell(0,5,f'  - {s}',ln=True)
    pdf.ln(4)
    names = ['Baseline Reality','Risk Accumulation','State Change','Cascade & Constraint','Post-Event Intel']
    for i,text in enumerate(acts[:5]):
        pdf.set_font('Helvetica','B',10); pdf.set_text_color(0,0,0); pdf.cell(0,7,f'ACT {i:02d} - {names[i]}',ln=True)
        pdf.set_font('Helvetica','',9); pdf.set_text_color(60,60,60)
        clean = safe(text.replace('**','').replace('<strong>','').replace('</strong>','').replace('<br>','\n').replace('</p><p>','\n\n').replace('<p>','').replace('</p>',''))
        for line in clean.split('\n'):
            line = line.strip()
            if line: pdf.multi_cell(0,4.5,line)
        pdf.ln(3)
    pdf.set_text_color(0,0,0); pdf.set_font('Helvetica','B',10); pdf.cell(0,7,'PRIMARY RECOMMENDATION',ln=True)
    pdf.set_font('Helvetica','',9); pdf.multi_cell(0,4.5,safe(f'{sol["product"]} ({sol["standard"]})\n{sol["description"]}'))
    buf = io.BytesIO(); pdf.output(buf); buf.seek(0)
    return Response(buf.read(), mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=pantheon-{mode}-{inc["id"]}.pdf'})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
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
    return jsonify({"ok": True})

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
    return jsonify({"ok": True})

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
    return jsonify({"ok": True})

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
    return jsonify({"ok": True})

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
    return jsonify({"ok": True})

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

# ── Resend OTP ─────────────────────────────────────────────────────────────────
# (appended — keep at bottom before if __name__)
