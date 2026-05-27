from contextlib import asynccontextmanager
from fastapi import FastAPI

from vexctx.config import settings
from vexctx.vault.router import router as vault_router
from vexctx.retrieve.router import router as retrieve_router
from vexctx.graph.router import router as graph_router
from vexctx.shared.health import router as health_router
from vexctx.shared.ws import router as ws_router
from vexctx.ext.router import router as ext_router
from vexctx.license.router import router as license_router

from vexctx.vault.episodic import episodic_store
from vexctx.graph.store import graph_store
from vexctx.vault.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize / warm up connection managers
    try:
        await episodic_store._get_db()
        print("SQLite episodic store initialized.")
        await episodic_store.deduplicate_episodes()
        print("Startup database deduplication completed.")
        await episodic_store.retrofit_project_ids()
        print("Startup database project ID retrofitting completed.")
    except Exception as e:
        print(f"Error initializing SQLite episodic store: {e}")
        
    try:
        await graph_store._get_db()
        print("SQLite graph store initialized.")
    except Exception as e:
        print(f"Error initializing SQLite graph store: {e}")
        
    try:
        cache._get_client()
        print("Redis client connectivity check complete.")
    except Exception as e:
        print(f"Redis cache client warm-up error: {e}")

    # Check cached license key status on startup
    try:
        from vexctx.license.verifier import verify_and_apply_license_state
        status = verify_and_apply_license_state()
        print(f"Cached license loaded. Active Plan: {status['plan'].upper()}")
    except Exception as e:
        print(f"Error checking cached license key: {e}")
        
    # Spawn background pruning task if configured
    if settings.VEXCTX_RETENTION_DAYS > 0:
        import asyncio
        async def run_startup_pruning():
            try:
                deleted = await episodic_store.prune_expired_vault_data(settings.VEXCTX_RETENTION_DAYS)
                if deleted > 0:
                    print(f"Startup pruning complete: deleted {deleted} expired events.")
            except Exception as pe:
                print(f"Startup data pruning failed: {pe}")
        asyncio.create_task(run_startup_pruning())

    # Spawn background Antigravity chat sync loop
    try:
        from vexctx.vault.antigravity import antigravity_sync
        import asyncio
        asyncio.create_task(antigravity_sync.start_loop())
        print("Antigravity chat sync loop registered successfully.")
    except Exception as se:
        print(f"Failed to launch Antigravity sync loop: {se}")

    yield
    
    # Close resources
    await episodic_store.close()
    await graph_store.close()
    print("Databases connection closed.")

app = FastAPI(
    title="VexCTX — Persistent Context Engine",
    description="Context and persistent memory layer for Vexon OS.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development, browser extensions, and Tauri desktop apps
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8765", 
        "http://127.0.0.1:8765",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost"
    ],
    allow_origin_regex="^(chrome-extension|moz-extension|tauri)://.*$|^https?://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(vault_router)
app.include_router(retrieve_router)
app.include_router(graph_router)
app.include_router(health_router)
app.include_router(ws_router)
app.include_router(ext_router)
app.include_router(license_router)

if __name__ == "__main__":
    import uvicorn
    import sys
    
    if getattr(sys, 'frozen', False):
        uvicorn.run(app, host="0.0.0.0", port=settings.VEXCTX_PORT)
    else:
        uvicorn.run("vexctx.main:app", host="0.0.0.0", port=settings.VEXCTX_PORT, reload=True)
