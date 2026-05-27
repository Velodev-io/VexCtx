import os
import json
import asyncio
import uuid
from datetime import datetime
from qdrant_client import QdrantClient
from qdrant_client.http import models
import httpx
from vexctx.config import settings
from vexctx.vault.models import ContextEvent

class VectorStore:
    def __init__(self):
        self._client = None

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            if settings.VEXCTX_QDRANT_URL == ":memory:":
                self._client = QdrantClient(":memory:")
            else:
                self._client = QdrantClient(url=settings.VEXCTX_QDRANT_URL)
        return self._client

    def _ensure_collection(self):
        client = self._get_client()
        try:
            client.get_collection(settings.VEXCTX_QDRANT_COLLECTION)
        except Exception:
            client.create_collection(
                collection_name=settings.VEXCTX_QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=settings.VEXCTX_EMBED_DIMENSIONS,
                    distance=models.Distance.COSINE
                )
            )

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient() as client:
            try:
                # Try standard embed endpoint
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embed",
                    json={"model": settings.VEXCTX_EMBED_MODEL, "input": text},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if "embeddings" in data and len(data["embeddings"]) > 0:
                        return data["embeddings"][0]
            except Exception:
                pass

            try:
                # Try legacy embeddings endpoint
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": settings.VEXCTX_EMBED_MODEL, "prompt": text},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if "embedding" in data:
                        return data["embedding"]
            except Exception:
                pass
                
        # Zero-vector fallback
        return [0.0] * settings.VEXCTX_EMBED_DIMENSIONS

    def upsert(self, event: ContextEvent, embedding: list[float]):
        client = self._get_client()
        self._ensure_collection()
        
        point_id = str(uuid.uuid4())
        client.upsert(
            collection_name=settings.VEXCTX_QDRANT_COLLECTION,
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "event_type": event.event_type.value,
                        "source_app": event.source_app,
                        "content": event.content,
                        "metadata": json.dumps(event.metadata),
                        "timestamp": event.timestamp.isoformat(),
                        "session_id": event.session_id,
                        "user_id": event.user_id,
                    }
                )
            ]
        )

    async def upsert_async(self, event: ContextEvent, embedding: list[float]):
        await asyncio.to_thread(self.upsert, event, embedding)

    def search(self, query_vector: list[float], top_k: int = 10) -> list[ContextEvent]:
        client = self._get_client()
        self._ensure_collection()
        
        results = client.query_points(
            collection_name=settings.VEXCTX_QDRANT_COLLECTION,
            query=query_vector,
            limit=top_k
        ).points
        
        events = []
        for r in results:
            p = r.payload
            events.append(ContextEvent(
                event_type=p["event_type"],
                source_app=p["source_app"],
                content=p["content"],
                metadata=json.loads(p["metadata"]),
                timestamp=datetime.fromisoformat(p["timestamp"]),
                session_id=p["session_id"],
                user_id=p["user_id"]
            ))
        return events

    async def search_async(self, query_vector: list[float], top_k: int = 10) -> list[ContextEvent]:
        return await asyncio.to_thread(self.search, query_vector, top_k)

    def delete_older_than(self, cutoff_dt: datetime):
        client = self._get_client()
        try:
            self._ensure_collection()
            client.delete(
                collection_name=settings.VEXCTX_QDRANT_COLLECTION,
                points_selector=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="timestamp",
                            range=models.Range(
                                lt=cutoff_dt.isoformat()
                            )
                        )
                    ]
                )
            )
        except Exception as e:
            print(f"Error deleting old vectors from Qdrant: {e}")

    async def delete_older_than_async(self, cutoff_dt: datetime):
        await asyncio.to_thread(self.delete_older_than, cutoff_dt)

    def get_count(self) -> int:
        try:
            client = self._get_client()
            res = client.get_collection(settings.VEXCTX_QDRANT_COLLECTION)
            return res.points_count
        except Exception:
            return 0

vector_store = VectorStore()
