import pytest
import os
import tempfile
import json
from datetime import datetime, timezone
from vexctx.vault.antigravity import antigravity_sync
from vexctx.shared.preferences import load_preferences, save_preferences, get_preferences_path

def test_messenger_blocklist():
    assert antigravity_sync.is_messenger_blocked("WhatsApp", "") is True
    assert antigravity_sync.is_messenger_blocked("Slack", "Chat thread") is True
    assert antigravity_sync.is_messenger_blocked("Safari", "Telegram Web") is True
    assert antigravity_sync.is_messenger_blocked("Chrome", "Google Search") is False
    assert antigravity_sync.is_messenger_blocked("VS Code", "main.py") is False

def test_stable_uuid():
    uuid1 = antigravity_sync.generate_stable_uuid("zsh_history", "12345:ls")
    uuid2 = antigravity_sync.generate_stable_uuid("zsh_history", "12345:ls")
    uuid3 = antigravity_sync.generate_stable_uuid("zsh_history", "12345:cd")
    
    assert uuid1 == uuid2
    assert uuid1 != uuid3
    # Check it is valid UUID format
    assert len(uuid1) == 36

def test_preferences_save_load():
    orig_prefs = load_preferences()
    try:
        test_prefs = {
            "os_logging_enabled": True,
            "onboarded": True,
            "retention_days": 90
        }
        save_preferences(test_prefs)
        loaded = load_preferences()
        assert loaded["os_logging_enabled"] is True
        assert loaded["onboarded"] is True
        assert loaded["retention_days"] == 90
    finally:
        # Restore original
        save_preferences(orig_prefs)

@pytest.mark.asyncio
async def test_zsh_history_parsing():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as f:
        temp_path = f.name
        
    try:
        # Standard history format and extended history format
        commands_to_write = (
            "ls -la\n"
            ": 1775451200:0;git status\n"
            "cd ..\n"
        )
        with open(temp_path, "w") as f:
            f.write(commands_to_write)
            
        sync = antigravity_sync.__class__()
        sync.zsh_history_path = temp_path
        sync.zsh_offset = 0 # force read from beginning
        
        # We need to monkeypatch process_event to just capture what events are synced
        events_captured = []
        async def mock_process_event(event):
            events_captured.append(event)
            return True
            
        import vexctx.vault.antigravity as ag_mod
        orig_proc = ag_mod.process_event
        ag_mod.process_event = mock_process_event
        
        try:
            await sync.sync_zsh_history()
            assert len(events_captured) == 3
            assert events_captured[0].content == "ls -la"
            assert events_captured[1].content == "git status"
            assert events_captured[2].content == "cd .."
            assert events_captured[1].timestamp.timestamp() == 1775451200
        finally:
            ag_mod.process_event = orig_proc
    finally:
        os.remove(temp_path)

@pytest.mark.asyncio
async def test_claude_transcript_parsing():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as f:
        temp_path = f.name
        
    try:
        turns = [
            {"type": "user", "sessionId": "session-1", "message": {"content": "hello world"}, "timestamp": "2026-05-27T12:00:00.000Z", "uuid": "msg-1"},
            {"type": "assistant", "sessionId": "session-1", "message": {"content": [{"type": "text", "text": "Hi there!"}]}, "timestamp": "2026-05-27T12:00:05.000Z", "uuid": "msg-2"}
        ]
        with open(temp_path, "w") as f:
            for turn in turns:
                f.write(json.dumps(turn) + "\n")
                
        sync = antigravity_sync.__class__()
        sync.claude_projects_dir = os.path.dirname(temp_path)
        
        events_captured = []
        async def mock_process_event(event):
            events_captured.append(event)
            return True
            
        import vexctx.vault.antigravity as ag_mod
        orig_proc = ag_mod.process_event
        ag_mod.process_event = mock_process_event
        
        try:
            # Manually trigger parse
            sync.claude_mtimes = {}
            # Mocking transcripts scan
            import glob
            orig_glob = glob.glob
            glob.glob = lambda pattern, recursive=False: [temp_path]
            try:
                await sync.sync_claude_code()
                assert len(events_captured) == 2
                assert events_captured[0].content == "hello world"
                assert events_captured[0].source_app == "claude_code"
                assert events_captured[1].content == "Hi there!"
                assert events_captured[1].source_app == "claude_code"
            finally:
                glob.glob = orig_glob
        finally:
            ag_mod.process_event = orig_proc
    finally:
        os.remove(temp_path)

@pytest.mark.asyncio
async def test_vscode_copilot_parsing():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as f:
        temp_path = f.name
        
    try:
        # Mock Copilot session jsonl format
        line1 = {
            "kind": 0,
            "v": {
                "sessionId": "session-copilot",
                "requests": [
                    {
                        "requestId": "req-c1",
                        "timestamp": 1775451200000,
                        "message": {"text": "explain recursion"},
                        "response": [
                            {"kind": "thinking", "value": "thinking process..."},
                            {"kind": "markdown", "value": "Recursion is when a function calls itself."}
                        ]
                    }
                ]
            }
        }
        with open(temp_path, "w") as f:
            f.write(json.dumps(line1) + "\n")
            
        sync = antigravity_sync.__class__()
        sync.vscode_workspace_dir = os.path.dirname(temp_path)
        
        events_captured = []
        async def mock_process_event(event):
            events_captured.append(event)
            return True
            
        import vexctx.vault.antigravity as ag_mod
        orig_proc = ag_mod.process_event
        ag_mod.process_event = mock_process_event
        
        try:
            sync.copilot_mtimes = {}
            import glob
            orig_glob = glob.glob
            glob.glob = lambda pattern: [temp_path]
            try:
                await sync.sync_vscode_copilot()
                # Expect prompt and response
                assert len(events_captured) == 2
                assert events_captured[0].content == "explain recursion"
                assert events_captured[0].source_app == "vscode_copilot"
                assert events_captured[1].content == "Recursion is when a function calls itself."
                assert events_captured[1].source_app == "vscode_copilot"
            finally:
                glob.glob = orig_glob
        finally:
            ag_mod.process_event = orig_proc
    finally:
        os.remove(temp_path)

@pytest.mark.asyncio
async def test_retrofit_project_ids():
    from vexctx.vault.episodic import episodic_store
    from vexctx.vault.models import ContextEvent, EventType
    
    # Clean database first
    await episodic_store.wipe_all()
    
    # 1. Insert a Claude event with null project_id but cwd in metadata
    event_claude = ContextEvent(
        event_id="test-claude-retro",
        event_type=EventType.AI_PROMPT,
        source_app="claude_code",
        session_id="session-claude-retro",
        timestamp=datetime.now(timezone.utc),
        content="hello claude",
        metadata={"cwd": "/Users/binova/projects/my-claude-proj"}
    )
    # Force project_id to None/empty for the test
    event_claude.project_id = None
    await episodic_store.insert(event_claude)
    
    # 2. Insert an Antigravity event with null project_id but workspace path mappings in content
    event_ag = ContextEvent(
        event_id="test-ag-retro",
        event_type=EventType.AI_PROMPT,
        source_app="antigravity",
        session_id="session-ag-retro",
        timestamp=datetime.now(timezone.utc),
        content="<USER_REQUEST>/Users/binova/projects/my-ag-proj -> some-corpus</USER_REQUEST>",
        metadata={}
    )
    event_ag.project_id = None
    await episodic_store.insert(event_ag)
    
    # Verify they have None/empty/global project_id initially
    db = await episodic_store._get_db()
    async with db.execute("SELECT id, project_id FROM episodes") as cursor:
        rows = await cursor.fetchall()
        for rid, pid in rows:
            assert pid is None or pid == "" or pid == "global"
            
    # Run retrofitting
    await episodic_store.retrofit_project_ids()
    
    # Assert retrofitted project_id values
    async with db.execute("SELECT id, project_id FROM episodes") as cursor:
        rows = await cursor.fetchall()
        row_map = {r[0]: r[1] for r in rows}
        
    assert row_map["test-claude-retro"] == "my-claude-proj"
    assert row_map["test-ag-retro"] == "my-ag-proj"


@pytest.mark.asyncio
async def test_get_vault_categorized():
    from vexctx.vault.episodic import episodic_store
    from vexctx.vault.models import ContextEvent, EventType
    from vexctx.vault.router import get_vault_categorized
    
    await episodic_store.wipe_all()
    
    # Insert structured developer tools events
    event_dev = ContextEvent(
        event_id="dev-event-id",
        event_type=EventType.AI_PROMPT,
        source_app="antigravity",
        session_id="session-ag",
        project_id="my-ag-project",
        timestamp=datetime.now(timezone.utc),
        content="some user request",
        metadata={}
    )
    await episodic_store.insert(event_dev)
    
    # Insert global activity events
    event_term = ContextEvent(
        event_id="term-event-id",
        event_type=EventType.TERMINAL_CMD,
        source_app="terminal",
        session_id="zsh_session",
        timestamp=datetime.now(timezone.utc),
        content="ls -la",
        metadata={}
    )
    await episodic_store.insert(event_term)
    
    # Call endpoint
    res = await get_vault_categorized(vault_id="default_vault")
    
    # Verify structure
    assert "developer_tools" in res
    assert "global_activity" in res
    
    # Check developer tools
    assert "antigravity" in res["developer_tools"]
    assert "my-ag-project" in res["developer_tools"]["antigravity"]
    assert "session-ag" in res["developer_tools"]["antigravity"]["my-ag-project"]
    assert len(res["developer_tools"]["antigravity"]["my-ag-project"]["session-ag"]) == 1
    assert res["developer_tools"]["antigravity"]["my-ag-project"]["session-ag"][0]["id"] == "dev-event-id"
    
    # Check global activity
    assert "terminal_history" in res["global_activity"]
    assert len(res["global_activity"]["terminal_history"]) == 1
    assert res["global_activity"]["terminal_history"][0]["id"] == "term-event-id"
