import pytest
from vexctx.vault.models import ContextEvent, EventType
from vexctx.vault.episodic import episodic_store
from vexctx.retrieve.vector import vector_store
from vexctx.retrieve.search import retrieval

@pytest.mark.asyncio
async def test_vector_search():
    event = ContextEvent(
        event_type=EventType.FILE_OPENED,
        source_app="vscode",
        content="main.py",
        metadata={"project": "Arenex"},
        session_id="test_retrieval"
    )
    embedding = [0.2] * 768
    await vector_store.upsert_async(event, embedding)
    
    results = await vector_store.search_async(embedding, top_k=2)
    assert len(results) > 0
    assert results[0].content == "main.py"

@pytest.mark.asyncio
async def test_fts_search():
    event = ContextEvent(
        event_type=EventType.TERMINAL_CMD,
        source_app="terminal",
        content="docker compose up",
        metadata={},
        session_id="test_retrieval"
    )
    await episodic_store.insert(event)
    
    results = await episodic_store.search_fts("docker")
    assert len(results) > 0
    assert results[0].content == "docker compose up"

@pytest.mark.asyncio
async def test_hybrid_search():
    event = ContextEvent(
        event_type=EventType.CODE_WRITTEN,
        source_app="vscode",
        content="import redis",
        metadata={"project": "Arenex"},
        session_id="test_retrieval"
    )
    await episodic_store.insert(event)
    embedding = await vector_store.embed(event.content)
    await vector_store.upsert_async(event, embedding)
    
    results = await retrieval.hybrid_search("redis", top_k=5)
    assert len(results) > 0
    assert any("redis" in r.content for r in results)
