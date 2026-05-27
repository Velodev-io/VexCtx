import pytest
from fastapi.testclient import TestClient
from vexctx.main import app
from vexctx.config import settings

client = TestClient(app)

@pytest.fixture
def set_free_plan():
    original_plan = settings.VEXCTX_PLAN_TYPE
    settings.VEXCTX_PLAN_TYPE = "free"
    yield
    settings.VEXCTX_PLAN_TYPE = original_plan

@pytest.fixture
def set_pro_plan():
    original_plan = settings.VEXCTX_PLAN_TYPE
    settings.VEXCTX_PLAN_TYPE = "pro"
    yield
    settings.VEXCTX_PLAN_TYPE = original_plan

def test_pricing_gate_free_tier(set_free_plan):
    # Verify that retrieve endpoints do not return 402 on free tier since they are now unlocked
    
    # 1. Search
    res = client.post("/retrieve/search", json={"query": "test query"})
    assert res.status_code != 402
    
    # 2. Chunks
    res = client.post("/retrieve/chunks", json={})
    assert res.status_code != 402
    
    # 3. Summary
    res = client.post("/retrieve/summary", json={"query": "test query"})
    assert res.status_code != 402
    
    # 4. Agent bundle
    res = client.post("/retrieve/agent-bundle", json={})
    assert res.status_code != 402

def test_pricing_gate_pro_tier(set_pro_plan):
    # Verify that retrieve endpoints do not return 402 on pro tier
    
    # 1. Search
    res = client.post("/retrieve/search", json={"query": "test query"})
    assert res.status_code != 402
    
    # 2. Chunks
    res = client.post("/retrieve/chunks", json={})
    assert res.status_code != 402
