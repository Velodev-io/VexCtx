from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, Field

class RetrievalChunk(BaseModel):
    chunk_id: str
    vault_id: str
    source_event_ids: list[str] = Field(default_factory=list)
    project_id: Optional[str] = None
    time_range_start: datetime
    time_range_end: datetime
    chunk_type: str  # 'event', 'session', 'task', 'project'
    plaintext_hash: str
    metadata: dict = Field(default_factory=dict)
    fts_text: str
    embedding_ref: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    source_app: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_type: Optional[str] = None
    top_k: int = 10
    chunk_type: str = "session"
    vault_id: str = "default_vault"

class ChunksRequest(BaseModel):
    project_id: Optional[str] = None
    source_app: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_type: Optional[str] = None
    top_k: int = 20
    chunk_type: str = "session"
    vault_id: str = "default_vault"

class SummaryRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    source_app: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_type: Optional[str] = None
    chunk_type: str = "session"
    vault_id: str = "default_vault"

class AgentBundleRequest(BaseModel):
    project_id: Optional[str] = None
    query: Optional[str] = None
    source_app: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    chunk_type: str = "session"
    vault_id: str = "default_vault"

class MemorySummary(BaseModel):
    summary_id: str
    summary_text: str
    session_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    decay_score: float = 1.0
