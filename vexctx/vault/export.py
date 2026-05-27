import json
import os
from typing import Any
from vexctx.config import settings
from vexctx.vault.manager import VaultManager, vault_manager
from vexctx.vault.episodic import episodic_store
from vexctx.retrieve.vector import vector_store
from vexctx.vault.models import VaultManifest, VaultSegment

def export_vault_data(vault_id: str = "default_vault") -> dict[str, Any]:
    """
    Package manifest and encrypted segments into a single portable dictionary.
    """
    vm = VaultManager(vault_id=vault_id)
    manifest = vm.load_manifest()
    
    segments = []
    for i in range(manifest.segment_count):
        seg_path = vm._get_segment_path(i)
        if os.path.exists(seg_path):
            with open(seg_path, "r") as f:
                segments.append(json.load(f))
                
    return {
        "manifest": manifest.model_dump(),
        "segments": segments
    }

async def import_vault_data(data: dict[str, Any], vault_id: str = "default_vault") -> dict[str, Any]:
    """
    Import manifest and encrypted segments.
    Decrypts the events to re-index them in the local SQLite metadata and vector store.
    """
    if "manifest" not in data or "segments" not in data:
        raise ValueError("Invalid import data: must contain 'manifest' and 'segments'")

    vm = VaultManager(vault_id=vault_id)
    
    # 1. Clear current vault database entries and local vault files
    vm.wipe_vault()
    # We also wipe the episodic SQLite database to make sure it matches the imported vault
    await episodic_store.wipe_all()
    # Note: If vector store cleanup is needed, we could recreate the collection, 
    # but for now, we'll let upsert handle overwriting/indexing.

    # 2. Write manifest
    manifest_data = data["manifest"]
    manifest_data["vault_id"] = vault_id
    manifest = VaultManifest.model_validate(manifest_data)
    vm._manifest = manifest
    vm.save_manifest()

    # 3. Write segments & Decrypt events for re-indexing
    events_reindexed = 0
    for seg_dict in data["segments"]:
        segment = VaultSegment.model_validate(seg_dict)
        
        # Save segment file to disk
        seg_path = vm._get_segment_path(segment.segment_index)
        with open(seg_path, "w") as f:
            f.write(segment.model_dump_json(indent=2))
            
        # Decrypt segment events
        events = vm.read_segment(segment.segment_index)
        
        # 4. Re-index in episodic SQLite and Vector Store
        for event in events:
            # Insert to SQLite
            await episodic_store.insert(event)
            
            # Embed and upsert to vector store
            try:
                emb = await vector_store.embed(event.content)
                await vector_store.upsert_async(event, emb)
            except Exception as e:
                print(f"Failed to index imported event in vector store: {e}")
                
            events_reindexed += 1

    return {
        "vault_id": vault_id,
        "segments_imported": len(data["segments"]),
        "events_imported": events_reindexed
    }
