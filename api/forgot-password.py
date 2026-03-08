"""
api/forgot-password.py — Vercel serverless endpoint
Handles forgot-password requests for Pantheon.

Setup:
  1. pip install resend (or add to requirements.txt)
  2. Add RESEND_API_KEY to Vercel environment variables
     (Dashboard → Your Project → Settings → Environment Variables)
  3. Add FROM_EMAIL env var: e.g. "Pantheon <noreply@pantheon.hct-world.com>"
  4. Deploy — Vercel will wire /api/forgot-password automatically

Flow:
  POST /api/forgot-password { "email": "user@example.com" }
  → Looks up user in your DB
  → Generates a signed token (HMAC + timestamp, 1hr expiry)
  → Sends reset link via Resend
  → Always returns 200 (prevents email enumeration)
"""

import json
import os
import hashlib
import hmac
import time
import base64
from http.server import BaseHTTPRequestHandler

# ── Dependency: resend (add to requirements.txt: resend>=0.7.0)
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False


# ── Config (all from Vercel env vars — never hardcode) ──────────────────────
RESEND_API_KEY   = os.environ.get('RESEND_API_KEY', '')
FROM_EMAIL       = os.environ.get('FROM_EMAIL', 'Pantheon <noreply@hct-world.com>')
APP_BASE_URL     = os.environ.get('APP_BASE_URL', 'https://hct-pantheon.vercel.app')
TOKEN_SECRET     = os.environ.get('RESET_TOKEN_SECRET', 'change-this-in-vercel-env')
TOKEN_EXPIRY_SEC = 3600  # 1 hour


# ── Token generation ─────────────────────────────────────────────────────────
def generate_reset_token(email: str) -> str:
    """
    Creates a URL-safe token: base64(email + ':' + timestamp + ':' + hmac)
    No database required — the token is self-verifying.
    """
    ts = str(int(time.time()))
    payload = f"{email}:{ts}"
    sig = hmac.new(
        TOKEN_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()[:32]
    raw = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip('=')


def verify_reset_token(token: str) -> str | None:
    """
    Returns email if token is valid + not expired, else None.
    Call this from your /api/reset-password endpoint.
    """
    try:
        padded = token + '=' * (4 - len(token) % 4)
        raw = base64.urlsafe_b64decode(padded).decode()
        parts = raw.rsplit(':', 3)  # email, ts, sig (email may contain :)
        email, ts, sig = ':'.join(parts[:-2]), parts[-2], parts[-1]
        # Verify expiry
        if int(time.time()) - int(ts) > TOKEN_EXPIRY_SEC:
            return None
        # Verify HMAC
        payload = f"{email}:{ts}"
        expected = hmac.new(
            TOKEN_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:32]
        if not hmac.compare_digest(expected, sig):
            return None
        return email
    except Exception:
        return None


# ── Email template ───────────────────────────────────────────────────────────
def build_email_html(reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Pantheon password</title>
</head>
<body style="margin:0;padding:0;background:#f0eeea;font-family:'IBM Plex Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e0d8;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:28px 36px;text-align:center;">
          <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">PANTHEON</div>
          <div style="color:#999;font-size:10px;letter-spacing:4px;margin-top:4px;font-family:monospace;">LIFE SAFETY OS</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 36px 28px;">
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0d0d0d;letter-spacing:-0.3px;">
            Reset your password
          </h2>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#555;">
            We received a request to reset the password for your Pantheon account.
            Click the button below to create a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="{reset_url}"
               style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500;
                      letter-spacing:0.2px;">
              Reset Password
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:12px;color:#999;line-height:1.6;">
            Or copy this link into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:11px;color:#1a1a1a;word-break:break-all;
                    background:#f4f2ef;padding:10px 12px;border-radius:6px;font-family:monospace;">
            {reset_url}
          </p>
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            If you didn't request this, you can safely ignore this email — your password won't be changed.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 36px;border-top:1px solid #ece9e4;">
          <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
            Pantheon · Hazard Control Technologies · hct-world.com
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Main handler ─────────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length) or b'{}')
            email  = (body.get('email') or '').strip().lower()
        except Exception:
            self._json(400, {'error': 'Invalid request body'})
            return

        # Basic email validation
        if not email or '@' not in email or '.' not in email.split('@')[-1]:
            self._json(400, {'error': 'A valid email address is required'})
            return

        # ── Look up user ──────────────────────────────────────────────────
        # Replace this block with your actual user lookup (Google Sheets, DB, etc.)
        # For now we accept all emails and always send (prevents enumeration).
        # user_exists = lookup_user_in_db(email)
        # if not user_exists:
        #     self._json(200, {'ok': True})  # Still return 200 — don't leak existence
        #     return

        # ── Generate token + reset URL ────────────────────────────────────
        token     = generate_reset_token(email)
        reset_url = f"{APP_BASE_URL}/reset-password?token={token}"

        # ── Send email via Resend ─────────────────────────────────────────
        if not RESEND_API_KEY:
            # Dev mode — log the link instead of sending
            print(f"[DEV] Reset link for {email}: {reset_url}")
            self._json(200, {'ok': True, 'dev_url': reset_url})
            return

        if not RESEND_AVAILABLE:
            self._json(500, {'error': 'Email service not installed. Add resend to requirements.txt'})
            return

        try:
            resend.api_key = RESEND_API_KEY
            resend.Emails.send({
                'from':    FROM_EMAIL,
                'to':      [email],
                'subject': 'Reset your Pantheon password',
                'html':    build_email_html(reset_url),
            })
        except Exception as e:
            print(f"[ERROR] Resend failed: {e}")
            # Don't expose email errors to client
            self._json(200, {'ok': True})
            return

        # Always return 200 regardless — prevents email enumeration
        self._json(200, {'ok': True})

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors_headers()
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args): pass  # Silence default request logging
