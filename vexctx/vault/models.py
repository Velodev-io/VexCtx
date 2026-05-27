import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class EventType(str, Enum):
    AI_PROMPT = "ai_prompt"
    AI_RESPONSE = "ai_response"
    AI_COMMAND = "ai_command"
    FILE_EDITED = "file_edited"
    ARTIFACT_GENERATED = "artifact_generated"
    RESEARCH_ACTION = "research_action"
    APPROVAL_DECISION = "approval_decision"
    SESSION_METADATA = "session_metadata"
    
    # Legacy event types for backwards compatibility
    FILE_OPENED = "file_opened"
    FILE_CLOSED = "file_closed"
    CODE_WRITTEN = "code_written"
    TERMINAL_CMD = "terminal_cmd"
    AI_CHAT_TURN = "ai_chat_turn"

class SensitivityEnum(str, Enum):
    LOW = "low"
    HIGH = "high"
    EXCLUDED = "excluded"

class ContextEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    source_app: str
    session_id: str
    user_id: str = "default"
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    origin: Optional[str] = None  # e.g., "ai_chat", "agent_execution", "approval", "artifact", "system_integration"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    content: str
    metadata: dict = Field(default_factory=dict)
    ai_assisted: bool = True
    sensitivity: SensitivityEnum = SensitivityEnum.LOW
    exclude_from_export: bool = False

class VaultManifest(BaseModel):
    vault_id: str
    version: str = "1.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    owner_id: str = "default"
    encryption_mode: str = "local_managed"
    segment_count: int = 0
    segment_refs: list[str] = Field(default_factory=list)
    event_count: int = 0
    project_ids: list[str] = Field(default_factory=list)
    source_apps: list[str] = Field(default_factory=list)
    exportable: bool = True

class VaultSegment(BaseModel):
    segment_index: int
    encrypted_content: str
    nonce: str
    tag: str
    encrypted_dek: str
    dek_nonce: str
    dek_tag: str
