import pytest
import os
import shutil
from datetime import datetime, timezone
from vexctx.vault.models import ContextEvent, EventType
from vexctx.vault.ingestion import process_event
from vexctx.vault.export import export_vault_data, import_vault_data
from vexctx.vault.manager import vault_manager
from vexctx.vault.episodic import episodic_store
from vexctx.config import settings

@pytest.fixture(autouse=True)
def setup_temp_vault():
    original_vault_path = settings.VEXCTX_VAULT_PATH
    settings.VEXCTX_VAULT_PATH = "~/VEX CTX/test_vaults"
    
    # Clean test vault directory and reset global states
    if os.path.exists(settings.vault_path_abs):
        shutil.rmtree(settings.vault_path_abs)
    
    db_path = settings.db_path_abs
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
            
    vault_manager.wipe_vault()
        
    yield
    
    # Cleanup after test
    if os.path.exists(settings.vault_path_abs):
        shutil.rmtree(settings.vault_path_abs)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    vault_manager.wipe_vault()
    settings.VEXCTX_VAULT_PATH = original_vault_path

@pytest.mark.asyncio
async def test_export_import_roundtrip():
    # 1. Ingest test events
    event1 = ContextEvent(
        event_type=EventType.AI_PROMPT,
        source_app="copilot",
        content="How do I write an export/import test?",
        metadata={"project": "Sur"},
        session_id="session_export_test"
    )
    event2 = ContextEvent(
        event_type=EventType.AI_RESPONSE,
        source_app="copilot",
        content="You can serialize the events and verify database roundtrips.",
        metadata={"project": "Sur"},
        session_id="session_export_test"
    )
    
    await process_event(event1)
    await process_event(event2)
    
    # Flush active buffer to disk segments
    vault_manager.flush()
    
    # Verify local files exist
    manifest = vault_manager.load_manifest()
    assert manifest.segment_count == 1
    assert manifest.event_count == 2
    
    # 2. Export Vault
    export_bundle = export_vault_data(vault_id="default_vault")
    assert "manifest" in export_bundle
    assert "segments" in export_bundle
    assert len(export_bundle["segments"]) == 1
    
    # 3. Wipe and verify local is clean
    vault_manager.wipe_vault()
    await episodic_store.wipe_all()
    assert not os.path.exists(vault_manager._get_manifest_path())
    assert await episodic_store.get_count() == 0
    
    # 4. Import Vault
    import_result = await import_vault_data(export_bundle, vault_id="default_vault")
    assert import_result["events_imported"] == 2
    assert import_result["segments_imported"] == 1
    
    # 5. Verify local files and database were restored
    restored_manifest = vault_manager.load_manifest()
    assert restored_manifest.segment_count == 1
    assert restored_manifest.event_count == 2
    
    restored_events = await episodic_store.get_recent("session_export_test")
    assert len(restored_events) == 2
    assert restored_events[0].content in ["How do I write an export/import test?", "You can serialize the events and verify database roundtrips."]
