#!/usr/bin/env python3
"""
TerraFlow India - Local HTTP Server & API Gateway
Serves static assets and provides REST endpoints for:
- Two-factor OTP generation & REAL Mobile SMS dispatch (Fast2SMS / Twilio)
- User registration & security clearance
- Real-time incident alert telemetry & Service Worker notifications
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import time
import random
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "js", "data", "registered_users.json")
CONFIG_FILE = os.path.join(BASE_DIR, "sms_config.json")
ACTIVE_OTPS = {}  # identifier -> { otp, expires_at }
DEFAULT_FAST2SMS_KEY = "VJ7tBkxumeq8STlHds789iJIwfAIuyQhOEYtgiYpaaKbUJuCkxLNzMbePyqkA4iOU8rJ2GvH838loKjP"

def load_sms_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                if not cfg.get('api_key'):
                    cfg['api_key'] = DEFAULT_FAST2SMS_KEY
                return cfg
        except Exception:
            pass
    return {"provider": "fast2sms", "api_key": DEFAULT_FAST2SMS_KEY}

def get_fast2sms_wallet(api_key):
    try:
        req = urllib.request.Request("https://www.fast2sms.com/dev/wallet", headers={
            "authorization": api_key,
            "User-Agent": "TerraFlow-SMS/1.0"
        })
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        return {"return": False, "error": str(e)}

def save_sms_config(cfg):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print("Error saving SMS config:", e)

class TerraFlowRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and Service Worker headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        if self.path.endswith('sw.js'):
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Content-Type', 'application/javascript')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/sms/config':
            cfg = load_sms_config()
            masked = cfg.copy()
            if masked.get('api_key'):
                masked['api_key_masked'] = masked['api_key'][:6] + '...' + masked['api_key'][-6:]
            self.send_json(200, masked)
        elif self.path == '/api/sms/wallet':
            cfg = load_sms_config()
            key = cfg.get('api_key') or DEFAULT_FAST2SMS_KEY
            wallet_info = get_fast2sms_wallet(key)
            self.send_json(200, wallet_info)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/auth/send-otp':
            self.handle_send_otp()
        elif self.path == '/api/auth/verify-otp':
            self.handle_verify_otp()
        elif self.path == '/api/auth/register':
            self.handle_register()
        elif self.path == '/api/incidents':
            self.handle_new_incident()
        elif self.path == '/api/sms/save-config':
            self.handle_save_sms_config()
        else:
            self.send_error(404, "Endpoint not found")

    def read_json_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                raw = self.rfile.read(length).decode('utf-8')
                return json.loads(raw)
        except Exception:
            pass
        return {}

    def send_json(self, status_code, data):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def handle_save_sms_config(self):
        body = self.read_json_body()
        cfg = load_sms_config()
        if 'api_key' in body:
            cfg['api_key'] = body['api_key'].strip()
        if 'provider' in body:
            cfg['provider'] = body['provider'].strip()
        save_sms_config(cfg)
        print(f"  [SMS CONFIG UPDATED]: Provider={cfg.get('provider')}, KeySet={'YES' if cfg.get('api_key') else 'NO'}")
        self.send_json(200, {'success': True, 'message': 'SMS Gateway configuration saved successfully.'})

    def handle_send_otp(self):
        body = self.read_json_body()
        email = body.get('email', '').strip()
        mobile = body.get('mobile', '').strip().replace(' ', '').replace('+91', '')
        provided_otp = body.get('otp')
        client_api_key = body.get('fast2sms_api_key')

        otp_code = provided_otp or str(random.randint(100000, 999999))
        identifier = mobile or email or 'default_user'
        expires_at = time.time() + 600  # 10 minutes

        ACTIVE_OTPS[identifier] = {
            'otp': otp_code,
            'expires_at': expires_at,
            'email': email,
            'mobile': mobile
        }

        # Check for configured Fast2SMS API Key
        cfg = load_sms_config()
        api_key = (client_api_key.strip() if client_api_key else "") or cfg.get('api_key', '').strip() or DEFAULT_FAST2SMS_KEY
        real_sms_sent = False
        sms_error_msg = None
        sms_response_msg = None

        if api_key and len(mobile) == 10 and mobile.isdigit():
            print(f"  [DISPATCHING REAL SMS VIA FAST2SMS TO +91 {mobile}]...")
            try:
                # Fast2SMS Quick OTP API Call
                sms_url = "https://www.fast2sms.com/dev/bulkV2"
                payload = json.dumps({
                    "variables_values": otp_code,
                    "route": "otp",
                    "numbers": mobile
                }).encode('utf-8')

                req = urllib.request.Request(sms_url, data=payload, headers={
                    "authorization": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "TerraFlow-SMS/1.0"
                })

                with urllib.request.urlopen(req, timeout=12) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    raw_msg = res_body.get('message')
                    msg_text = raw_msg[0] if isinstance(raw_msg, list) and raw_msg else str(raw_msg or '')
                    
                    if res_body.get('return') is True or res_body.get('return') == True:
                        real_sms_sent = True
                        sms_response_msg = msg_text or "SMS sent successfully."
                        print(f"  >>> SUCCESS: Real SMS delivered to +91 {mobile} via Fast2SMS! ({sms_response_msg})")
                    else:
                        sms_error_msg = msg_text or str(res_body)
                        print(f"  >>> Fast2SMS Response: {res_body}")
            except urllib.error.HTTPError as e:
                err_content = e.read().decode('utf-8')
                sms_error_msg = f"HTTP {e.code}: {err_content}"
                print(f"  >>> Fast2SMS HTTP Error {e.code}: {err_content}")
            except Exception as e:
                sms_error_msg = str(e)
                print(f"  >>> Fast2SMS Network Error: {e}")

        print("\n" + "=" * 64)
        print("  [TERRAFLOW SMS & EMAIL GATEWAY]")
        print(f"  To Mobile: +91 {mobile}")
        print(f"  To Email:  {email}")
        print(f"  REAL OTP CODE: [ {otp_code} ]  (Valid for 10 minutes)")
        if real_sms_sent:
            print("  Status: REAL SMS DISPATCHED TO CELL PHONE TOWER!")
        else:
            print("  Status: Standalone Dispatch & Simulator Active (Add Fast2SMS key for live cell SMS)")
        print("=" * 64 + "\n")

        self.send_json(200, {
            'success': True,
            'message': 'OTP generated and dispatched.',
            'otp': otp_code,
            'expires_in': 600,
            'real_sms_sent': real_sms_sent,
            'sms_error': sms_error_msg,
            'mobile': mobile
        })

    def handle_verify_otp(self):
        body = self.read_json_body()
        identifier = body.get('mobile', '').replace(' ', '').replace('+91', '') or body.get('email')
        entered_code = body.get('code', '').strip()

        record = ACTIVE_OTPS.get(identifier)
        if not record:
            # Fallback search
            for k, v in ACTIVE_OTPS.items():
                if v['otp'] == entered_code:
                    record = v
                    break

        if record:
            if time.time() > record['expires_at']:
                self.send_json(400, {'success': False, 'message': 'OTP has expired. Please request a new one.'})
                return
            if record['otp'] == entered_code:
                self.send_json(200, {'success': True, 'message': 'OTP verified successfully.'})
                return

        self.send_json(400, {'success': False, 'message': 'Invalid verification code.'})

    def handle_register(self):
        body = self.read_json_body()
        print(f"  [SECURITY CLEARANCE ACTIVATED]: {body.get('fullName')} ({body.get('organization')})")
        self.send_json(200, {
            'success': True,
            'message': 'Account registered and clearance granted.',
            'user': body
        })

    def handle_new_incident(self):
        body = self.read_json_body()
        print("\n" + "!" * 64)
        print("  [REAL-TIME INCIDENT BROADCAST DISPATCHED]")
        print(f"  Title:    {body.get('title')}")
        print(f"  Severity: {body.get('severity', 'HIGH').upper()}")
        print(f"  Location: {body.get('location')}")
        print("!" * 64 + "\n")
        self.send_json(200, {'success': True, 'message': 'Incident logged and broadcasted to active operators.'})

def run_server():
    os.chdir(BASE_DIR)
    
    # Try finding an open port starting from 8080
    ports = [8080, 8081, 8082, 3000, 5000]
    httpd = None
    active_port = 8080

    for p in ports:
        try:
            httpd = socketserver.TCPServer(("", p), TerraFlowRequestHandler)
            active_port = p
            break
        except OSError:
            continue

    if not httpd:
        print("Error: Could not bind to any port in", ports)
        sys.exit(1)

    url = f"http://localhost:{active_port}/index.html"
    print("=" * 68)
    print("  [TERRAFLOW INDIA] Subsurface & Pipeline Intelligence Platform")
    print(f"  Local Web Server & API running at: {url}")
    print("  Features Active: Public Dashboard, Mobile SMS OTP, Background Alerts")
    print("  Press Ctrl+C to stop the server")
    print("=" * 68)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down TerraFlow server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
