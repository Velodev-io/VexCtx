from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class ContextNode(BaseModel):
    node_id: str
    node_type: str
    label: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[list[float]] = None
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    access_count: int = 0
    decay_score: float = 1.0

class ContextEdge(BaseModel):
    source_id: str
    target_id: str
    relation: str
    weight: float = 1.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
