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

def test_jwt_validation():
    # 1. Create a valid token
    payload = {
        "email": "test@velodev.io",
        "plan": "pro",
        "exp": int((datetime.utcnow() + timedelta(days=1)).timestamp())
    }
    token = jwt.encode(payload, settings.VEXCTX_JWT_SECRET, algorithm="HS256")
    
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
    expired_token = jwt.encode(expired_payload, settings.VEXCTX_JWT_SECRET, algorithm="HS256")
    
    with pytest.raises(ValueError, match="expired"):
        verify_jwt_license(expired_token)

    # 4. Create token with wrong secret
    wrong_token = jwt.encode(payload, "wrong-secret-key-12345", algorithm="HS256")
    with pytest.raises(ValueError, match="signature"):
        verify_jwt_license(wrong_token)

def test_license_endpoints():
    payload = {
        "email": "dev@velodev.io",
        "plan": "pro",
        "exp": int((datetime.utcnow() + timedelta(days=10)).timestamp())
    }
    token = jwt.encode(payload, settings.VEXCTX_JWT_SECRET, algorithm="HS256")

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
