from fastapi.testclient import TestClient
from vexctx.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "sqlite_episodes_count" in data
    assert "qdrant_vectors_count" in data

def test_events_ingestion_endpoint():
    payload = {
        "event_type": "file_opened",
        "source_app": "editor",
        "content": "/projects/arenex/main.py",
        "session_id": "test_api_session",
        "metadata": {"project": "Arenex"}
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ingested"

def test_context_retrieval_endpoint():
    response = client.get("/context?query=arenex&limit=5")
    assert response.status_code == 200
    assert "results" in response.json()

def test_inject_endpoint():
    payload = {
        "query": "Arenex redis issue",
        "session_id": "test_api_session"
    }
    response = client.post("/inject", json=payload)
    assert response.status_code == 200
    assert "context_block" in response.json()
    assert "[VEXCTX — Session Context]" in response.json()["context_block"]

def test_graph_endpoints():
    response = client.get("/graph/nodes")
    assert response.status_code == 200
    assert "nodes" in response.json()

    response = client.get("/graph/edges")
    assert response.status_code == 200
    assert "edges" in response.json()
