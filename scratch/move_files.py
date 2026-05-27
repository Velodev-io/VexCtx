import os
import shutil
import re

ROOT_DIR = "/Users/yashswisingh/Sur Projects/Vexon-OS/vexon-os/VexCTX"
VEXCTX_DIR = os.path.join(ROOT_DIR, "vexctx")

# Step 1: Create directories if they do not exist
dirs = [
    os.path.join(VEXCTX_DIR, "shared"),
    os.path.join(VEXCTX_DIR, "vault"),
    os.path.join(VEXCTX_DIR, "retrieve"),
    os.path.join(VEXCTX_DIR, "graph")
]
for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_path = os.path.join(d, "__init__.py")
    if not os.path.exists(init_path):
        with open(init_path, "w") as f:
            f.write("# Feature Package Init\n")

# Step 2: Define file moves
# Source path (relative to vexctx/) -> Target path (relative to vexctx/)
moves = {
    "core/encryption.py": "vault/encryption.py",
    "core/ingestion.py": "vault/ingestion.py",
    "core/vault_manager.py": "vault/manager.py",
    "core/export.py": "vault/export.py",
    "stores/episodic.py": "vault/episodic.py",
    "stores/cache.py": "vault/cache.py",
    
    "core/chunking.py": "retrieve/chunking.py",
    "core/extractor.py": "retrieve/extractor.py",
    "core/retrieval.py": "retrieve/search.py",
    "core/summarizer.py": "retrieve/summarizer.py",
    "core/pricing_guard.py": "retrieve/pricing.py",
    "stores/vector.py": "retrieve/vector.py",
    
    "core/graph.py": "graph/builder.py",
    "stores/graph_store.py": "graph/store.py",
    
    "api/ws.py": "shared/ws.py",
    "api/health.py": "shared/health.py"
}

print("Moving files...")
for src_rel, dst_rel in moves.items():
    src_abs = os.path.join(VEXCTX_DIR, src_rel)
    dst_abs = os.path.join(VEXCTX_DIR, dst_rel)
    if os.path.exists(src_abs):
        shutil.copy2(src_abs, dst_abs)
        print(f"Copied {src_rel} -> {dst_rel}")
    else:
        print(f"Warning: Source {src_rel} not found")

# Step 3: Define import replacements
replacements = [
    (r"from vexctx\.models\.event import ContextEvent, EventType, SensitivityEnum", "from vexctx.vault.models import ContextEvent, EventType, SensitivityEnum"),
    (r"from vexctx\.models\.event import ContextEvent, EventType", "from vexctx.vault.models import ContextEvent, EventType"),
    (r"from vexctx\.models\.event import ContextEvent", "from vexctx.vault.models import ContextEvent"),
    (r"from vexctx\.models\.event import EventType", "from vexctx.vault.models import EventType"),
    (r"from vexctx\.models\.vault import VaultManifest, VaultSegment", "from vexctx.vault.models import VaultManifest, VaultSegment"),
    
    (r"from vexctx\.core\.encryption import encryption_service, LocalKEKProvider, CloudKEKProvider", "from vexctx.vault.encryption import encryption_service, LocalKEKProvider, CloudKEKProvider"),
    (r"from vexctx\.core\.encryption import encryption_service", "from vexctx.vault.encryption import encryption_service"),
    (r"from vexctx\.core\.ingestion import process_event", "from vexctx.vault.ingestion import process_event"),
    (r"from vexctx\.core\.vault_manager import vault_manager, VaultManager", "from vexctx.vault.manager import vault_manager, VaultManager"),
    (r"from vexctx\.core\.vault_manager import vault_manager", "from vexctx.vault.manager import vault_manager"),
    (r"from vexctx\.core\.vault_manager import VaultManager", "from vexctx.vault.manager import VaultManager"),
    (r"from vexctx\.core\.export import export_vault_data, import_vault_data", "from vexctx.vault.export import export_vault_data, import_vault_data"),
    (r"from vexctx\.stores\.episodic import episodic_store", "from vexctx.vault.episodic import episodic_store"),
    (r"from vexctx\.stores\.cache import cache", "from vexctx.vault.cache import cache"),
    
    (r"from vexctx\.models\.chunk import RetrievalChunk", "from vexctx.retrieve.models import RetrievalChunk"),
    (r"from vexctx\.models\.retrieval import SearchRequest, ChunksRequest, SummaryRequest, AgentBundleRequest", "from vexctx.retrieve.models import SearchRequest, ChunksRequest, SummaryRequest, AgentBundleRequest"),
    (r"from vexctx\.models\.memory import MemorySummary", "from vexctx.retrieve.models import MemorySummary"),
    
    (r"from vexctx\.core\.chunking import chunk_events", "from vexctx.retrieve.chunking import chunk_events"),
    (r"from vexctx\.core\.extractor import extractor", "from vexctx.retrieve.extractor import extractor"),
    (r"from vexctx\.core\.retrieval import retrieval", "from vexctx.retrieve.search import retrieval"),
    (r"from vexctx\.core\.summarizer import summarizer", "from vexctx.retrieve.summarizer import summarizer"),
    (r"from vexctx\.core\.pricing_guard import verify_pro_plan", "from vexctx.retrieve.pricing import verify_pro_plan"),
    (r"from vexctx\.core\.pricing_guard import verification_guard", "from vexctx.retrieve.pricing import verify_pro_plan"),
    (r"from vexctx\.stores\.vector import vector_store", "from vexctx.retrieve.vector import vector_store"),
    
    (r"from vexctx\.models\.context_node import ContextNode, ContextEdge", "from vexctx.graph.models import ContextNode, ContextEdge"),
    (r"from vexctx\.core\.graph import graph_builder", "from vexctx.graph.builder import graph_builder"),
    (r"from vexctx\.stores\.graph_store import graph_store", "from vexctx.graph.store import graph_store"),
    
    (r"from vexctx\.api\.ws import manager as ws_manager", "from vexctx.shared.ws import manager as ws_manager"),
    
    # Simple store cross-references
    (r"from vexctx\.stores import episodic", "from vexctx.vault import episodic"),
    (r"from vexctx\.stores import vector", "from vexctx.retrieve import vector"),
    (r"from vexctx\.stores import graph_store", "from vexctx.graph import store"),
    (r"from vexctx\.stores import cache", "from vexctx.vault import cache"),
]

def update_imports(file_path):
    with open(file_path, "r") as f:
        content = f.read()
    
    original = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
        
    if content != original:
        with open(file_path, "w") as f:
            f.write(content)
        print(f"Updated imports in {file_path}")

print("Updating imports in vexctx/...")
for root, _, files in os.walk(VEXCTX_DIR):
    for f in files:
        if f.endswith(".py"):
            update_imports(os.path.join(root, f))

print("Updating imports in tests/...")
TESTS_DIR = os.path.join(ROOT_DIR, "tests")
for root, _, files in os.walk(TESTS_DIR):
    for f in files:
        if f.endswith(".py"):
            update_imports(os.path.join(root, f))

# Step 4: Overwrite main.py
print("Overwriting main.py...")
main_content = """from contextlib import asynccontextmanager
from fastapi import FastAPI

from vexctx.config import settings
from vexctx.vault.router import router as vault_router
from vexctx.retrieve.router import router as retrieve_router
from vexctx.graph.router import router as graph_router
from vexctx.shared.health import router as health_router
from vexctx.shared.ws import router as ws_router

from vexctx.vault.episodic import episodic_store
from vexctx.graph.store import graph_store
from vexctx.vault.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize / warm up connection managers
    try:
        await episodic_store._get_db()
        print("SQLite episodic store initialized.")
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

# Register routers
app.include_router(vault_router)
app.include_router(retrieve_router)
app.include_router(graph_router)
app.include_router(health_router)
app.include_router(ws_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("vexctx.main:app", host="0.0.0.0", port=settings.VEXCTX_PORT, reload=True)
"""

with open(os.path.join(VEXCTX_DIR, "main.py"), "w") as f:
    f.write(main_content)
print("main.py overwritten successfully.")

# Step 5: Delete old layered folders
folders_to_delete = ["api", "core", "models", "stores"]
print("Deleting old directories...")
for fold in folders_to_delete:
    fold_abs = os.path.join(VEXCTX_DIR, fold)
    if os.path.exists(fold_abs):
        shutil.rmtree(fold_abs)
        print(f"Deleted old folder: {fold}")

print("Reorganization script finished execution.")
