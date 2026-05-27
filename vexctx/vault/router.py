from fastapi import APIRouter, Query, HTTPException, Path, Body
from typing import Any
from vexctx.vault.models import ContextEvent
from vexctx.vault.ingestion import process_event
from vexctx.vault.episodic import episodic_store
from vexctx.vault.export import export_vault_data, import_vault_data
from vexctx.vault.manager import VaultManager

router = APIRouter()

# --- Ingestion & Timeline Events ---

@router.post("/events")
async def ingest_event(event: ContextEvent):
    success = await process_event(event)
    if not success:
        return {"status": "dropped", "reason": "privacy_filter_or_not_ai_assisted"}
    return {"status": "ingested", "event_id": event.event_id}

@router.get("/timeline")
async def get_timeline(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        events = await episodic_store.get_timeline(limit=limit, offset=offset)
        return {"timeline": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline: {e}")

# --- Sessions Administration ---

@router.get("/sessions")
async def list_sessions():
    sessions = await episodic_store.get_sessions()
    return {"sessions": sessions}

@router.delete("/sessions/all")
async def wipe_all_sessions():
    await episodic_store.wipe_all()
    return {"status": "all_sessions_wiped"}

@router.delete("/sessions/{session_id}")
async def wipe_session(session_id: str = Path(...)):
    await episodic_store.wipe_session(session_id)
    return {"status": "session_wiped", "session_id": session_id}

# --- Vault Import & Export Portability ---

@router.post("/vault/export")
async def export_vault(vault_id: str = Query("default_vault", description="The ID of the vault to export")):
    try:
        from vexctx.vault.manager import vault_manager
        vault_manager.flush()
    except Exception:
        pass
        
    try:
        data = export_vault_data(vault_id=vault_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export vault: {e}")

@router.post("/vault/import")
async def import_vault(
    data: dict[str, Any] = Body(...),
    vault_id: str = Query("default_vault", description="The ID of the vault to import into")
):
    try:
        result = await import_vault_data(data, vault_id=vault_id)
        return {"status": "success", "imported": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import vault: {e}")

@router.get("/vault/{vault_id}/manifest")
async def get_vault_manifest(vault_id: str = Path(..., description="The ID of the vault")):
    try:
        vm = VaultManager(vault_id=vault_id)
        manifest = vm.load_manifest()
        return manifest
    except Exception as e:
        raise HTTPException(status_code=444, detail=f"Failed to load vault manifest: {e}")

@router.get("/vault/{vault_id}/segments")
async def get_vault_segments(vault_id: str = Path(..., description="The ID of the vault")):
    try:
        import os
        from vexctx.config import settings
        vm = VaultManager(vault_id=vault_id)
        manifest = vm.load_manifest()
        
        segments = []
        for index, ref in enumerate(manifest.segment_refs):
            path = os.path.join(settings.vault_path_abs, ref)
            size_bytes = 0
            last_modified = ""
            if os.path.exists(path):
                size_bytes = os.path.getsize(path)
                mtime = os.path.getmtime(path)
                from datetime import datetime, timezone
                last_modified = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
            
            segments.append({
                "index": index,
                "file_name": ref,
                "size_bytes": size_bytes,
                "last_modified": last_modified
            })
        return segments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load vault segments: {e}")
@router.get("/vault/{vault_id}/segments/{index}/decrypt")
async def decrypt_vault_segment(
    vault_id: str = Path(..., description="The ID of the vault"),
    index: int = Path(..., description="The index of the segment to decrypt")
):
    try:
        vm = VaultManager(vault_id=vault_id)
        events = vm.read_segment(index)
        return [event.model_dump() for event in events]
    except IndexError:
        raise HTTPException(status_code=404, detail="Segment index out of range")
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decrypt segment: {e}")

@router.get("/vault/{vault_id}/categorized")
async def get_vault_categorized(vault_id: str = Path(...)):
    import json
    try:
        db = await episodic_store._get_db()
        async with db.execute(
            """SELECT id, event_type, source_app, content, metadata, timestamp, session_id, project_id, origin, ai_assisted, sensitivity
               FROM episodes
               ORDER BY timestamp ASC"""
        ) as cursor:
            rows = await cursor.fetchall()
            
        developer_tools = {}
        terminal_history = []
        os_activity = []
        other_activity = []

        for r in rows:
            event_id, event_type, source_app, content, metadata_str, timestamp_str, session_id, project_id, origin, ai_assisted, sensitivity = r
            try:
                metadata = json.loads(metadata_str)
            except Exception:
                metadata = {}
                
            event_dict = {
                "id": event_id,
                "event_type": event_type,
                "source_app": source_app,
                "content": content,
                "metadata": metadata,
                "timestamp": timestamp_str,
                "session_id": session_id,
                "project_id": project_id,
                "origin": origin,
                "ai_assisted": bool(ai_assisted),
                "sensitivity": sensitivity
            }
            
            if source_app in ["antigravity", "claude_code", "vscode_copilot"]:
                app_bucket = developer_tools.setdefault(source_app, {})
                proj_name = project_id if project_id and project_id != "global" else "global"
                proj_bucket = app_bucket.setdefault(proj_name, {})
                sess_name = session_id if session_id else "unknown_session"
                sess_bucket = proj_bucket.setdefault(sess_name, [])
                sess_bucket.append(event_dict)
            elif source_app == "terminal" or session_id == "zsh_session" or origin == "zsh_sync":
                terminal_history.append(event_dict)
            elif session_id == "os_activity_session" or origin == "active_window_tracker":
                os_activity.append(event_dict)
            else:
                other_activity.append(event_dict)
                
        response_data = {
            "developer_tools": developer_tools,
            "global_activity": {
                "terminal_history": terminal_history,
                "os_activity": os_activity
            }
        }
        if other_activity:
            response_data["global_activity"]["other_activity"] = other_activity
            
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build categorized hierarchy: {e}")

@router.get("/vault/{vault_id}/export/zip")
async def export_vault_zip(vault_id: str = Path(...)):
    import io
    import zipfile
    import json
    from fastapi.responses import StreamingResponse
    from datetime import datetime
    try:
        db = await episodic_store._get_db()
        async with db.execute(
            """SELECT id, event_type, source_app, content, metadata, timestamp, session_id, project_id, origin, ai_assisted, sensitivity
               FROM episodes
               ORDER BY timestamp ASC"""
        ) as cursor:
            rows = await cursor.fetchall()
            
        developer_tools = {}
        terminal_history = []
        os_activity = []
        other_activity = []

        for r in rows:
            event_id, event_type, source_app, content, metadata_str, timestamp_str, session_id, project_id, origin, ai_assisted, sensitivity = r
            try:
                metadata = json.loads(metadata_str)
            except Exception:
                metadata = {}
                
            event_dict = {
                "id": event_id,
                "event_type": event_type,
                "source_app": source_app,
                "content": content,
                "metadata": metadata,
                "timestamp": timestamp_str,
                "session_id": session_id,
                "project_id": project_id,
                "origin": origin,
                "ai_assisted": bool(ai_assisted),
                "sensitivity": sensitivity
            }
            
            if source_app in ["antigravity", "claude_code", "vscode_copilot"]:
                app_bucket = developer_tools.setdefault(source_app, {})
                proj_name = project_id if project_id and project_id != "global" else "global"
                proj_bucket = app_bucket.setdefault(proj_name, {})
                sess_name = session_id if session_id else "unknown_session"
                sess_bucket = proj_bucket.setdefault(sess_name, [])
                sess_bucket.append(event_dict)
            elif source_app == "terminal" or session_id == "zsh_session" or origin == "zsh_sync":
                terminal_history.append(event_dict)
            elif session_id == "os_activity_session" or origin == "active_window_tracker":
                os_activity.append(event_dict)
            else:
                other_activity.append(event_dict)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            for app, projects in developer_tools.items():
                for project, sessions in projects.items():
                    for session_id, events in sessions.items():
                        session_json = json.dumps(events, indent=2)
                        filename = f"developer_tools/{app}/project_{project}/session_{session_id}.json"
                        zip_file.writestr(filename, session_json)
                        
            if terminal_history:
                zip_file.writestr("global_activity/terminal_history.json", json.dumps(terminal_history, indent=2))
                
            if os_activity:
                zip_file.writestr("global_activity/os_activity.json", json.dumps(os_activity, indent=2))
                
            if other_activity:
                zip_file.writestr("global_activity/other_activity.json", json.dumps(other_activity, indent=2))
                
        zip_buffer.seek(0)
        
        timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")
        filename = f"vexctx_export_{timestamp}.zip"
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export zipped archive: {e}")
