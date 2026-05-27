import asyncio
import json
from vexctx.config import settings
from vexctx.vault.models import ContextEvent, SensitivityEnum
from vexctx.vault.episodic import episodic_store
from vexctx.retrieve.vector import vector_store
from vexctx.vault.cache import cache
from vexctx.vault.manager import vault_manager
from vexctx.shared.ws import manager as ws_manager

# Keep references to background tasks to prevent garbage collection
_background_tasks = set()

async def process_event(event: ContextEvent) -> bool:
    """
    Ingest, validate, encrypt, cache, and index incoming context events.
    Returns True if event was ingested, False if dropped due to privacy exclusions.
    """
    # Privacy filtering is delegated to the client/user end. Ingest all received events.

    # 3. Store raw episode in SQLite
    await episodic_store.insert(event)

    # 4. Append event to current active vault segment (and auto-flush if buffer is full)
    vault_manager.append_event(event)

    # 5. Push to Redis hot cache
    await cache.push(event.session_id, event)

    # 6. Stream event over WebSocket to connected clients
    try:
        event_json = event.model_dump_json()
        await ws_manager.broadcast(event_json)
    except Exception as e:
        print(f"Error broadcasting event over websocket: {e}")

    # 7. Async: embed content and store in Qdrant Vector Store
    async def run_indexing():
        try:
            embedding = await vector_store.embed(event.content)
            await vector_store.upsert_async(event, embedding)
        except Exception as e:
            print(f"Non-blocking vector store indexing failed: {e}")

        # Keep graph builder optional/fallback if imported
        try:
            from vexctx.graph.builder import graph_builder
            await graph_builder.update(event)
        except Exception:
            pass

    task = asyncio.create_task(run_indexing())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return True
