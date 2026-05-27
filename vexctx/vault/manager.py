import os
import json
from datetime import datetime, timezone
import uuid
from typing import Optional
from vexctx.config import settings
from vexctx.vault.models import ContextEvent
from vexctx.vault.models import VaultManifest, VaultSegment
from vexctx.vault.encryption import encryption_service

class VaultManager:
    def __init__(self, vault_id: str = "default_vault"):
        self.vault_id = vault_id
        self._manifest: Optional[VaultManifest] = None
        self._buffer: list[ContextEvent] = []

    def _get_manifest_path(self) -> str:
        return os.path.join(settings.vault_path_abs, f"{self.vault_id}_manifest.json")

    def _get_segment_path(self, index: int) -> str:
        return os.path.join(settings.vault_path_abs, f"{self.vault_id}_segment_{index}.enc")

    def load_manifest(self) -> VaultManifest:
        if self._manifest is not None:
            return self._manifest

        path = self._get_manifest_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    data = json.load(f)
                    self._manifest = VaultManifest.model_validate(data)
                    return self._manifest
            except Exception as e:
                print(f"Error loading vault manifest: {e}. Re-initializing.")

        # Create default manifest
        self._manifest = VaultManifest(
            vault_id=self.vault_id,
            owner_id="default",
            encryption_mode=settings.VEXCTX_ENCRYPTION_MODE,
            segment_count=0,
            segment_refs=[]
        )
        self.save_manifest()
        return self._manifest

    def save_manifest(self):
        if self._manifest is None:
            return
        path = self._get_manifest_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            # model_dump_json serializes datetimes cleanly
            f.write(self._manifest.model_dump_json(indent=2))

    def append_event(self, event: ContextEvent):
        """Buffer event for segment encryption"""
        self._buffer.append(event)
        
        # Auto-flush if buffer is large (e.g. 50 events) to maintain performance
        if len(self._buffer) >= 50:
            self.flush()

    def flush(self) -> Optional[str]:
        """
        Encrypt buffered events and write them out as a new vault segment.
        Updates the manifest metadata.
        """
        if not self._buffer:
            return None

        manifest = self.load_manifest()
        segment_index = manifest.segment_count

        # Serialize list of events to JSON bytes
        events_data = [e.model_dump() for e in self._buffer]
        # Serialize datetime fields cleanly using standard ISO format strings
        for event_dict in events_data:
            if isinstance(event_dict.get("timestamp"), datetime):
                event_dict["timestamp"] = event_dict["timestamp"].isoformat()
                
        plaintext = json.dumps(events_data).encode("utf-8")

        # Encrypt the segment using envelope encryption
        encrypted_data = encryption_service.encrypt_envelope(plaintext)
        
        # Create VaultSegment object
        segment = VaultSegment(
            segment_index=segment_index,
            encrypted_content=encrypted_data["encrypted_content"],
            nonce=encrypted_data["nonce"],
            tag=encrypted_data["tag"],
            encrypted_dek=encrypted_data["encrypted_dek"],
            dek_nonce=encrypted_data["dek_nonce"],
            dek_tag=encrypted_data["dek_tag"]
        )

        # Save segment to file
        seg_path = self._get_segment_path(segment_index)
        with open(seg_path, "w") as f:
            f.write(segment.model_dump_json(indent=2))

        # Update manifest metadata
        manifest.segment_count += 1
        manifest.segment_refs.append(f"{self.vault_id}_segment_{segment_index}.enc")
        manifest.event_count += len(self._buffer)
        
        # Update project lists and apps
        for event in self._buffer:
            app = event.source_app
            if app and app not in manifest.source_apps:
                manifest.source_apps.append(app)
            
            project = event.metadata.get("project") if event.metadata else None
            if project and project not in manifest.project_ids:
                manifest.project_ids.append(project)

        manifest.updated_at = datetime.now(timezone.utc)
        self.save_manifest()

        # Clear buffer
        self._buffer.clear()
        
        return seg_path

    def read_segment(self, segment_index: int) -> list[ContextEvent]:
        """Read and decrypt events from a given segment index"""
        manifest = self.load_manifest()
        if segment_index < 0 or segment_index >= manifest.segment_count:
            raise IndexError("Segment index out of range")

        seg_path = self._get_segment_path(segment_index)
        if not os.path.exists(seg_path):
            raise FileNotFoundError(f"Segment file not found: {seg_path}")

        with open(seg_path, "r") as f:
            segment_data = json.load(f)
            segment = VaultSegment.model_validate(segment_data)

        # Decrypt envelope
        encrypted_dict = {
            "encrypted_content": segment.encrypted_content,
            "nonce": segment.nonce,
            "tag": segment.tag,
            "encrypted_dek": segment.encrypted_dek,
            "dek_nonce": segment.dek_nonce,
            "dek_tag": segment.dek_tag
        }
        
        plaintext = encryption_service.decrypt_envelope(encrypted_dict)
        events_list = json.loads(plaintext.decode("utf-8"))

        events = []
        for e in events_list:
            # Parse timestamp if it is string
            if "timestamp" in e and isinstance(e["timestamp"], str):
                e["timestamp"] = datetime.fromisoformat(e["timestamp"])
            events.append(ContextEvent.model_validate(e))
        return events

    def wipe_vault(self):
        """Wipe all segments and manifest from disk"""
        manifest = self.load_manifest()
        for ref in manifest.segment_refs:
            path = os.path.join(settings.vault_path_abs, ref)
            if os.path.exists(path):
                os.remove(path)
        
        manifest_path = self._get_manifest_path()
        if os.path.exists(manifest_path):
            os.remove(manifest_path)

        self._manifest = None
        self._buffer.clear()

vault_manager = VaultManager()
