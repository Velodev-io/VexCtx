from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional

class ExtensionEvent(BaseModel):
    session_id: str
    source_app: str          # "claude_ai", "chatgpt", "gemini", "perplexity"
    url: str
    role: str                # "user" | "assistant"
    content: str
    turn_index: int
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict = Field(default_factory=dict)
