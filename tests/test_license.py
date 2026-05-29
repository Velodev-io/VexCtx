import os
import json
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from vexctx.config import settings
from vexctx.main import app
from vexctx.license.verifier import (
    verify_jwt_license,
    save_cached_license,
    load_cached_license,
    clear_cached_license,
    verify_and_apply_license_state
)
from vexctx.vault.episodic import episodic_store
from vexctx.vault.models import ContextEvent, EventType, SensitivityEnum

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_license():
    """
    Ensure the license cache is cleared before and after each test.
    """
    clear_cached_license()
    original_plan = settings.VEXCTX_PLAN_TYPE
    yield
    clear_cached_license()
    settings.VEXCTX_PLAN_TYPE = original_plan

PRIVATE_KEY_PEM = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAm7wsnU1EC5AU89PgsKJi95TjQsvRgc7McIcrt3ktggnnjmwL
Mzl34FbbZVmLsIjMb3uop66gIHqZ7a2EQYrEUM/Yu69YB+7L6TVa7EV3ydqzq9fm
PCeEvnSXVxRNZQ+eoFzziKc6gFuIzwxEMK2cLlAvGlSKJPjCafdT5n1EAwyRehQJ
meM97jSpuDBakbzM0eZImKiywy67NprrAVhx5vJ4r98/fZRutHp6UwN3gpORpJLH
r9Qa3xZa89QQQQ1i0Z8wMgiQpQOGM5+Um9tqrfK4NMwOnQkmEiQLRa7KpD5PVFYS
fAUenZKEoTnWsBZByz3zLbHKCKbkmxP9OoxkSQIDAQABAoIBAAU9+kp5NVcmTG5A
rYmEjcxDqLqw3aZ+7YbEJgaQ/6Um7DJxFJdu0cgtZEkvEHKqyCbghLbQO/eb6N6F
PrRuFVmbBXKb3ly1/wskjqDxXazfvbiFFezkb6Vxiz6VIl3Kfs5rEo+BAYkci6hc
g1cYIO+2Jz+9pMDF1tV2S86wXL+1eRrrSGQYanCgmVn1eHOlhhZRTWqCqSrs60+F
wbiPsxPZseo/vCUZfnlf1ZSKyjxD5rzUNSkEB72mIZVv7SIh8eituKZUxkVVFnlL
6WXO31KoEYum2VgEI7fsIG5RQEjpWbtPwFZwFACDoA9swZZAUXMmjHyfbLdxpL+z
NdTtRFkCgYEA2RH0CLY1YqKcM2t6yr4EDSYIYJalrqsXeK/0nKAacGGRgLZWWs9c
lES7kfFazORly83UIG1+ZGoYC59w6tldMb8f2MFVFpsTCkYjD7zc6esXZeJb/4qK
D6FkZOqNo7bbm3iPbqBiIuS2GB3zHgYCA0QUjuwmVNWAs5TZRr5ePs8CgYEAt6o6
E/5GvqBr5whgzLz6scOcfJHmvOOgod2PphMX/ADDZ2LyN+fRyAASlT9/ftyYpuK0
NdrqKk8tSC9PHqre1nut1p8vzzR8sQhdVnwXNLBcHEbJiCAEkpqLJ9AkVNzy/ZZw
kuSj3FIWJhD9ufClkelWdcJeC0OWCeBnGOCMsWcCgYBEkZVCwzvt4mvxGjx5mrhw
5tiymiPQHx+U8hAVAcYYRdnOjMqOeP5Hn8aYfWMvYd5+GJCvhabtVU4vLbhflzYH
JtaKg9e7AlVrY2hj6kbmZWrItk5VVI/0DAlIj4cadgK9A8JbMbKOTyzuRVes3jz4
hyLvWs1o8uBq2dQgsrXWpQKBgCgnVzs3xE+40t5XvpIEXuquUXAKld+GBIBe6CDu
27eEkzPvNfVzATIwkd9/Wmhp4hXaSnvbuIY3eTbm4O1bfgx2TbM2akVqvDgYFA/s
YUZrqDemYjkYhudmUjYKE2daRuWaFlKHGiv45k68ODyGmCwmT3i/XcAorozKOr/9
l8TRAoGBAJfSZN76vTiPXe+LwnOTnd6ZqMf6WC5gt+EPBIudoay0Q1VTQz77kftM
ZQYZz4lmw4Ub13E9j5vpk2GhlVmvTnL2DLDPIhuEj2/O5R0IIne3bnznmV8RNlMB
GD8XuOQiVjnL6FEy0NCLZtqTfxQYGp7Yyk0nWcFYgEq9R3dJmtpv
-----END RSA PRIVATE KEY-----"""

def test_jwt_validation():
    # 1. Create a valid token
    payload = {
        "email": "test@velodev.io",
        "plan": "pro",
        "exp": int((datetime.utcnow() + timedelta(days=1)).timestamp())
    }
    token = jwt.encode(payload, PRIVATE_KEY_PEM, algorithm="RS256")
    
    # 2. Verify validation succeeds
    decoded = verify_jwt_license(token)
    assert decoded["email"] == "test@velodev.io"
    assert decoded["plan"] == "pro"

    # 3. Create an expired token
    expired_payload = {
        "email": "test@velodev.io",
        "plan": "pro",
        "exp": int((datetime.utcnow() - timedelta(days=1)).timestamp())
    }
    expired_token = jwt.encode(expired_payload, PRIVATE_KEY_PEM, algorithm="RS256")
    
    with pytest.raises(ValueError, match="expired"):
        verify_jwt_license(expired_token)

    # 4. Create token with wrong secret / key
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    wrong_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wrong_pem = wrong_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    )
    wrong_token = jwt.encode(payload, wrong_pem, algorithm="RS256")
    with pytest.raises(ValueError, match="signature"):
        verify_jwt_license(wrong_token)

def test_license_endpoints():
    payload = {
        "email": "dev@velodev.io",
        "plan": "pro",
        "exp": int((datetime.utcnow() + timedelta(days=10)).timestamp())
    }
    token = jwt.encode(payload, PRIVATE_KEY_PEM, algorithm="RS256")

    # 1. Activate valid license
    response = client.post("/license/activate", json={"license_key": token})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["valid"] is True
    assert res_data["email"] == "dev@velodev.io"
    assert res_data["plan"] == "pro"
    assert settings.VEXCTX_PLAN_TYPE == "pro"

    # 2. Get status (should reflect active license)
    status_response = client.get("/license/status")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data["valid"] is True
    assert status_data["plan"] == "pro"
    assert status_data["email"] == "dev@velodev.io"

    # 3. Deactivate license
    deactivate_response = client.post("/license/deactivate")
    assert deactivate_response.status_code == 200
    assert deactivate_response.json()["status"] == "success"
    assert settings.VEXCTX_PLAN_TYPE == "free"

    # 4. Get status again (should be free/invalid)
    status_response2 = client.get("/license/status")
    assert status_response2.status_code == 200
    assert status_response2.json()["valid"] is False
    assert status_response2.json()["plan"] == "free"

def test_activate_invalid_license():
    # Test activating with invalid key
    response = client.post("/license/activate", json={"license_key": "invalid-token-here"})
    assert response.status_code == 400
    assert "Invalid" in response.json()["detail"]

@pytest.mark.asyncio
async def test_data_retention_pruning():
    # Ensure episodic store is initialized
    await episodic_store._get_db()
    await episodic_store.wipe_all()

    now = datetime.utcnow()
    
    # 1. Create one normal recent event (e.g. 5 days ago)
    recent_event = ContextEvent(
        event_type=EventType.AI_PROMPT,
        source_app="claude_ai",
        content="I am a recent event",
        timestamp=now - timedelta(days=5),
        session_id="session-recent",
        user_id="user-1"
    )
    
    # 2. Create one old expired event (e.g. 40 days ago)
    expired_event = ContextEvent(
        event_type=EventType.AI_PROMPT,
        source_app="chatgpt",
        content="I am an expired event",
        timestamp=now - timedelta(days=40),
        session_id="session-expired",
        user_id="user-1"
    )

    await episodic_store.insert(recent_event)
    await episodic_store.insert(expired_event)

    count_before = await episodic_store.get_count()
    assert count_before == 2

    # 3. Prune data older than 30 days
    deleted_count = await episodic_store.prune_expired_vault_data(30)
    assert deleted_count == 1

    # 4. Verify only the recent event remains
    count_after = await episodic_store.get_count()
    assert count_after == 1

    timeline = await episodic_store.get_timeline(limit=10)
    assert len(timeline) == 1
    assert timeline[0].content == "I am a recent event"
