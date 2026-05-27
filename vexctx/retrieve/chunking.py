import hashlib
import uuid
from datetime import datetime
from vexctx.vault.models import ContextEvent
from vexctx.retrieve.models import RetrievalChunk

def _compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def chunk_events(events: list[ContextEvent], chunk_type: str = "session", vault_id: str = "default_vault") -> list[RetrievalChunk]:
    """
    Groups events and maps them into RetrievalChunks based on the specified chunking strategy.
    Strategies:
      - 'event': Single-event chunks.
      - 'session': Grouped by session_id.
      - 'project': Grouped by project_id (or event.metadata['project']).
      - 'task': Grouped by event.metadata['task_id'] (with session-based fallback).
    """
    if not events:
        return []

    # Sort events by timestamp to ensure chronological order
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    groups: dict[str, list[ContextEvent]] = {}

    for event in sorted_events:
        group_key = "default"
        if chunk_type == "event":
            group_key = event.event_id
        elif chunk_type == "session":
            group_key = event.session_id or "unknown_session"
        elif chunk_type == "project":
            group_key = event.project_id or event.metadata.get("project") or "no_project"
        elif chunk_type == "task":
            group_key = event.metadata.get("task_id") or event.session_id or "unknown_task"
        
        if group_key not in groups:
            groups[group_key] = []
        groups[group_key].append(event)

    chunks = []
    for key, group_events in groups.items():
        if not group_events:
            continue
            
        # Compile FTS text
        fts_lines = []
        source_ids = []
        project_ids = set()
        apps = set()
        
        for e in group_events:
            source_ids.append(e.event_id)
            if e.project_id:
                project_ids.add(e.project_id)
            elif e.metadata.get("project"):
                project_ids.add(e.metadata["project"])
            apps.add(e.source_app)
            
            # Format event content beautifully
            time_str = e.timestamp.isoformat()
            fts_lines.append(f"[{e.source_app}] ({e.event_type.value}) at {time_str}:\n{e.content}\n")
            
        fts_text = "\n".join(fts_lines)
        
        # Calculate time range
        start_time = group_events[0].timestamp
        end_time = group_events[-1].timestamp
        
        # Aggregate metadata
        agg_metadata = {
            "event_count": len(group_events),
            "apps": list(apps),
            "projects": list(project_ids),
            "keys_matched": list(set(k for e in group_events for k in e.metadata.keys()))
        }
        
        proj_id = list(project_ids)[0] if len(project_ids) == 1 else None
        
        chunk = RetrievalChunk(
            chunk_id=str(uuid.uuid4()),
            vault_id=vault_id,
            source_event_ids=source_ids,
            project_id=proj_id,
            time_range_start=start_time,
            time_range_end=end_time,
            chunk_type=chunk_type,
            plaintext_hash=_compute_hash(fts_text),
            metadata=agg_metadata,
            fts_text=fts_text
        )
        chunks.append(chunk)
        
    return chunks
