import pytest
from datetime import datetime
from vexctx.vault.models import ContextEvent, EventType
from vexctx.vault.episodic import episodic_store
from vexctx.vault.ingestion import process_event

@pytest.mark.asyncio
async def test_event_creation():
    event = ContextEvent(
        event_type=EventType.FILE_OPENED,
        source_app="vscode",
        content="test_file.py",
        metadata={"project": "VexCtx"},
        session_id="test_session"
    )
    assert event.source_app == "vscode"
    assert event.content == "test_file.py"
    assert event.user_id == "default"

@pytest.mark.asyncio
async def test_episodic_insert():
    event = ContextEvent(
        event_type=EventType.FILE_OPENED,
        source_app="vscode",
        content="test_file.py",
        metadata={"project": "VexCtx"},
        session_id="test_session"
    )
    event_id = await episodic_store.insert(event)
    assert event_id is not None
    
    recent = await episodic_store.get_recent("test_session")
    assert len(recent) > 0
    assert recent[0].content == "test_file.py"

@pytest.mark.asyncio
async def test_ingestion_pipeline():
    event = ContextEvent(
        event_type=EventType.TERMINAL_CMD,
        source_app="terminal",
        content="git commit -m 'initial'",
        metadata={"repo": "VexCtx"},
        session_id="test_session"
    )
    await process_event(event)
    
    recent = await episodic_store.get_recent("test_session")
    assert any(e.content == "git commit -m 'initial'" for e in recent)

@pytest.mark.asyncio
async def test_non_ai_event_ingested():
    event = ContextEvent(
        event_type=EventType.TERMINAL_CMD,
        source_app="terminal",
        content="git commit -m 'manual command'",
        session_id="test_session",
        ai_assisted=False
    )
    success = await process_event(event)
    assert success

