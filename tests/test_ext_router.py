import os
import tempfile
from fastapi.testclient import TestClient
from vexctx.main import app
from vexctx.config import settings

client = TestClient(app)

def test_ext_status():
    response = client.get("/ext/status")
    assert response.status_code == 200
    data = response.json()
    assert data["running"] is True
    assert "version" in data
    assert "plan" in data

def test_ext_auth_success():
    # Set up temp token path
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        orig_token_path = settings.VEXCTX_EXT_TOKEN_PATH
        settings.VEXCTX_EXT_TOKEN_PATH = tmp.name
        
        try:
            # 1. First auth request (generates token)
            headers = {"Origin": "chrome-extension://abcdefghijklmnop"}
            response = client.post("/ext/auth", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            token1 = data["token"]
            assert len(token1) == 64  # secrets.token_hex(32) is 64 chars
            
            # 2. Second auth request (reads existing token)
            response2 = client.post("/ext/auth", headers=headers)
            assert response2.status_code == 200
            assert response2.json()["token"] == token1
        finally:
            settings.VEXCTX_EXT_TOKEN_PATH = orig_token_path
            try:
                os.remove(tmp.name)
            except Exception:
                pass

def test_ext_auth_invalid_origin():
    # Origin from arbitrary web pages should be rejected
    headers = {"Origin": "https://malicious-site.com"}
    response = client.post("/ext/auth", headers=headers)
    assert response.status_code == 403
    
    # Missing Origin header should be rejected
    response = client.post("/ext/auth")
    assert response.status_code == 403

def test_ext_auth_trusted_ids_filtering():
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        orig_token_path = settings.VEXCTX_EXT_TOKEN_PATH
        orig_trusted_ids = settings.VEXCTX_TRUSTED_EXT_IDS
        
        settings.VEXCTX_EXT_TOKEN_PATH = tmp.name
        settings.VEXCTX_TRUSTED_EXT_IDS = "my-trusted-chrome-id,my-trusted-firefox-id"
        
        try:
            # Trusted ID should succeed
            headers = {"Origin": "chrome-extension://my-trusted-chrome-id"}
            response = client.post("/ext/auth", headers=headers)
            assert response.status_code == 200
            
            # Untrusted ID should fail
            headers2 = {"Origin": "chrome-extension://untrusted-chrome-id"}
            response2 = client.post("/ext/auth", headers=headers2)
            assert response2.status_code == 403
        finally:
            settings.VEXCTX_EXT_TOKEN_PATH = orig_token_path
            settings.VEXCTX_TRUSTED_EXT_IDS = orig_trusted_ids
            try:
                os.remove(tmp.name)
            except Exception:
                pass

def test_ext_events_ingestion():
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        orig_token_path = settings.VEXCTX_EXT_TOKEN_PATH
        settings.VEXCTX_EXT_TOKEN_PATH = tmp.name
        
        try:
            # Generate a token first
            headers_auth = {"Origin": "chrome-extension://abcdef"}
            auth_resp = client.post("/ext/auth", headers=headers_auth)
            token = auth_resp.json()["token"]
            
            # Ingest events with correct token
            payload = [
                {
                    "session_id": "test-session-123",
                    "source_app": "claude_ai",
                    "url": "https://claude.ai/chat/1",
                    "role": "user",
                    "content": "Hello, computer!",
                    "turn_index": 0
                },
                {
                    "session_id": "test-session-123",
                    "source_app": "claude_ai",
                    "url": "https://claude.ai/chat/1",
                    "role": "assistant",
                    "content": "Hello! How can I help you today?",
                    "turn_index": 1
                }
            ]
            
            headers_events = {"Authorization": f"Bearer {token}"}
            response = client.post("/ext/events", json=payload, headers=headers_events)
            assert response.status_code == 200
            res_data = response.json()
            assert res_data["status"] == "success"
            assert res_data["ingested"] == 2
            
            # Ingest events with wrong token should fail
            headers_events_bad = {"Authorization": "Bearer bad-token-123"}
            response2 = client.post("/ext/events", json=payload, headers=headers_events_bad)
            assert response2.status_code == 401
            
            # Ingest events with missing token should fail
            response3 = client.post("/ext/events", json=payload)
            assert response3.status_code == 401
        finally:
            settings.VEXCTX_EXT_TOKEN_PATH = orig_token_path
            try:
                os.remove(tmp.name)
            except Exception:
                pass
