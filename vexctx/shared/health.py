from fastapi import APIRouter
from vexctx.vault.episodic import episodic_store
from vexctx.retrieve.vector import vector_store
from vexctx.vault.manager import vault_manager
from vexctx.config import settings

router = APIRouter()

@router.get("/health")
async def health():
    try:
        episode_count = await episodic_store.get_count()     
    except Exception:
        episode_count = -1
        
    try:
        vector_count = vector_store.get_count()
    except Exception:
        vector_count = -1
        
    return {
        "status": "healthy",
        "sqlite_episodes_count": episode_count,
        "qdrant_vectors_count": vector_count
    }

@router.get("/stats")
async def stats():
    try:
        episode_count = await episodic_store.get_count()
    except Exception:
        episode_count = 0
        
    try:
        vector_count = vector_store.get_count()
    except Exception:
        vector_count = 0

    try:
        manifest = vault_manager.load_manifest()
        segment_count = manifest.segment_count
        source_apps = manifest.source_apps
        project_ids = manifest.project_ids
    except Exception:
        segment_count = 0
        source_apps = []
        project_ids = []

    return {
        "plan_type": settings.VEXCTX_PLAN_TYPE,
        "event_count": episode_count,
        "segment_count": segment_count,
        "vector_count": vector_count,
        "source_apps": source_apps,
        "project_ids": project_ids
    }

@router.get("/daemon/logs")
async def get_daemon_logs(limit: int = 200):
    """
    Reads the last N lines of the daemon log file (located at ~/.vexctx/daemon.log).
    """
    import os
    log_dir = os.path.dirname(settings.db_path_abs)
    log_path = os.path.join(log_dir, "daemon.log")
    
    if not os.path.exists(log_path):
        return {"logs": "No logs recorded yet. Start using VexCTX to generate logs."}
        
    try:
        with open(log_path, "r") as f:
            lines = f.readlines()
        
        last_lines = lines[-limit:]
        return {"logs": "".join(last_lines)}
    except Exception as e:
        return {"logs": f"Error reading logs: {e}"}

@router.delete("/daemon/logs")
async def clear_daemon_logs():
    """
    Clears the contents of the daemon log file.
    """
    import os
    log_dir = os.path.dirname(settings.db_path_abs)
    log_path = os.path.join(log_dir, "daemon.log")
    
    if os.path.exists(log_path):
        try:
            with open(log_path, "w") as f:
                f.write("")
            return {"status": "success", "message": "Logs cleared."}
        except Exception as e:
            return {"status": "error", "message": f"Error clearing logs: {e}"}
    return {"status": "success", "message": "Log file does not exist."}

@router.get("/preferences")
async def get_preferences():
    from vexctx.shared.preferences import load_preferences
    return load_preferences()

@router.post("/preferences")
async def update_preferences(prefs: dict):
    from vexctx.shared.preferences import save_preferences
    save_preferences(prefs)
    return {"status": "success", "preferences": prefs}