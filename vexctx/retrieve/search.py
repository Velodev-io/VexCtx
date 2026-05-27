import json
from datetime import datetime
from typing import Optional, Any
from vexctx.vault.models import ContextEvent
from vexctx.retrieve.models import RetrievalChunk
from vexctx.vault.episodic import episodic_store
from vexctx.retrieve.vector import vector_store
from vexctx.retrieve.chunking import chunk_events

class HybridRetrieval:
    async def get_filtered_events(
        self,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None
    ) -> list[ContextEvent]:
        """
        Query SQLite for events matching specific metadata filters.
        """
        db = await episodic_store._get_db()
        query = "SELECT id, event_type, source_app, content, metadata, timestamp, session_id, user_id, project_id, ai_assisted, sensitivity, exclude_from_export FROM episodes WHERE 1=1"
        params = []

        if project_id:
            query += " AND (project_id = ? OR json_extract(metadata, '$.project') = ?)"
            params.extend([project_id, project_id])
        if source_app:
            query += " AND LOWER(source_app) = LOWER(?)"
            params.append(source_app)
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date.isoformat())
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date.isoformat())
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)

        query += " ORDER BY timestamp DESC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            events = []
            for r in rows:
                events.append(ContextEvent(
                    event_id=r[0],
                    event_type=r[1],
                    source_app=r[2],
                    content=r[3],
                    metadata=json.loads(r[4]),
                    timestamp=datetime.fromisoformat(r[5]),
                    session_id=r[6],
                    user_id=r[7],
                    project_id=r[8],
                    ai_assisted=bool(r[9]),
                    sensitivity=r[10],
                    exclude_from_export=bool(r[11])
                ))
            return events

    async def hybrid_search(
        self,
        query: str,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        top_k: int = 10,
        chunk_type: str = "session",
        vault_id: str = "default_vault",
        chunk_response: bool = False
    ) -> list[Any]:
        """
        Hybrid search combining Lexical FTS5 and Vector Search, merging results via Reciprocal Rank Fusion (RRF),
        applying metadata filters, and packaging events into scored RetrievalChunks with citations.
        """
        # 1. Fetch filtered candidate events from SQLite
        candidates = await self.get_filtered_events(
            project_id=project_id,
            source_app=source_app,
            start_date=start_date,
            end_date=end_date,
            event_type=event_type
        )
        if not candidates:
            return []

        candidate_ids = {e.event_id for e in candidates}

        # 2. Perform Lexical & Semantic Searches if query is present
        if query and query.strip():
            # A. Vector Search (Qdrant)
            query_vector = await vector_store.embed(query)
            vector_results = await vector_store.search_async(query_vector, top_k=top_k * 5)
            
            # B. Lexical Search (SQLite FTS5)
            fts_results = await episodic_store.search_fts(query, limit=top_k * 5)

            # C. Reciprocal Rank Fusion (RRF)
            rrf_scores = {}
            events_by_id = {}

            # Vector Rank scoring
            for rank, event in enumerate(vector_results):
                if event.event_id in candidate_ids:
                    events_by_id[event.event_id] = event
                    rrf_scores[event.event_id] = rrf_scores.get(event.event_id, 0.0) + (1.0 / (60.0 + rank))

            # FTS Rank scoring
            for rank, event in enumerate(fts_results):
                if event.event_id in candidate_ids:
                    events_by_id[event.event_id] = event
                    rrf_scores[event.event_id] = rrf_scores.get(event.event_id, 0.0) + (1.0 / (60.0 + rank))

            # Sort candidate IDs by fused score descending
            sorted_event_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
            matched_events = [events_by_id[eid] for eid, _ in sorted_event_ids]
            
            # If no matches from search but candidates exist, fallback to chronological matching
            if not matched_events:
                matched_events = candidates
                # assign a tiny default score
                rrf_scores = {e.event_id: 0.01 for e in candidates}
        else:
            # Chronological retrieval if query is empty
            matched_events = candidates
            rrf_scores = {e.event_id: 1.0 for e in candidates}

        # If we just want raw ContextEvents (legacy mode)
        if not chunk_response:
            return matched_events[:top_k]

        # 3. Group matched events into semantic chunks
        chunks = chunk_events(matched_events, chunk_type=chunk_type, vault_id=vault_id)

        # 4. Score each chunk by aggregating the scores of its source events
        scored_chunks = []
        for chunk in chunks:
            # Average score of events in this chunk
            event_scores = [rrf_scores.get(eid, 0.0) for eid in chunk.source_event_ids]
            chunk_score = sum(event_scores) / len(event_scores) if event_scores else 0.0
            
            scored_chunks.append({
                "chunk": chunk,
                "score": round(chunk_score, 4),
                "citations": chunk.source_event_ids
            })

        # Sort chunks by score descending
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

retrieval = HybridRetrieval()
