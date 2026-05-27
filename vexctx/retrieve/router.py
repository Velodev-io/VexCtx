from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import tiktoken

from vexctx.retrieve.pricing import verify_pro_plan
from vexctx.retrieve.models import SearchRequest, ChunksRequest, SummaryRequest, AgentBundleRequest
from vexctx.retrieve.search import retrieval
from vexctx.retrieve.summarizer import summarizer
from vexctx.graph.builder import graph_builder
from vexctx.config import settings

router = APIRouter()

# --- Legacy Context and Ingestion Integration API ---

@router.get("/context")
async def get_context(query: str = Query(...), limit: int = Query(10)):
    results = await retrieval.hybrid_search(query, top_k=limit)
    return {"results": results}

class InjectRequest(BaseModel):
    query: str
    session_id: str

def truncate_to_tokens(text: str, max_tokens: int) -> str:
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        tokens = encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        return encoding.decode(tokens[:max_tokens])
    except Exception:
        words = text.split()
        if len(words) <= max_tokens:
            return text
        return " ".join(words[:max_tokens])

@router.post("/inject")
async def inject_context(payload: InjectRequest):
    events = await retrieval.hybrid_search(payload.query, top_k=settings.VEXCTX_TOP_K_NODES)
    graph_summary = await graph_builder.get_context_summary(payload.query)
    
    projects = set()
    files = set()
    commands = []
    chats = []
    searches = []
    
    for event in events:
        proj = event.metadata.get("project")
        if proj:
            projects.add(proj)
        
        if event.event_type.value in ("file_opened", "file_edited", "file_closed"):
            files.add(event.content)
        elif event.event_type.value == "terminal_cmd":
            commands.append(event.content)
        elif event.event_type.value == "ai_chat_turn":
            chats.append(event.content)
        elif event.event_type.value == "search_query":
            searches.append(event.content)
            
    nodes = graph_summary.get("nodes", [])
    edges = graph_summary.get("edges", [])
    techs = [n.label for n in nodes if n.node_type == "technology"]
    
    lines = ["[VEXCTX — Session Context]"]
    
    if projects:
        lines.append(f"Active project: {', '.join(projects)}")
    elif nodes:
        proj_nodes = [n.label for n in nodes if n.node_type == "project"]
        if proj_nodes:
            lines.append(f"Active project: {', '.join(proj_nodes)}")
            
    if files:
        lines.append(f"Recent files: {', '.join(list(files)[:5])}")
    if commands:
        lines.append(f"Recent commands: {', '.join(commands[:5])}")
    if chats:
        lines.append(f"Recent AI focus: {chats[0] if chats else ''}")
    if searches:
        lines.append(f"Recent searches: {', '.join(searches[:3])}")
    if techs:
        lines.append(f"Technologies in use: {', '.join(techs[:6])}")
        
    if nodes or edges:
        lines.append("\nContext Graph Entities:")
        for node in nodes[:10]:
            lines.append(f"  - [{node.node_type.upper()}] {node.label}")
        if edges:
            lines.append("\nRelationships:")
            for edge in edges[:5]:
                lines.append(f"  - {edge.source_id} --({edge.relation})--> {edge.target_id}")
                
    if events:
        lines.append("\nRecent Activity Timeline:")
        for event in events[:5]:
            lines.append(f"  - [{event.event_type.value.upper()}] in {event.source_app}: {event.content[:100]}")
            
    lines.append("[END VEXCTX]")
    
    context_block = "\n".join(lines)
    truncated_block = truncate_to_tokens(context_block, settings.VEXCTX_MAX_CONTEXT_TOKENS)
    return {"context_block": truncated_block}

# --- Pro Semantic Retrieval API (Pricing Gated) ---

@router.post("/retrieve/search", dependencies=[Depends(verify_pro_plan)], tags=["retrieve"])
async def retrieve_search(request: SearchRequest):
    try:
        results = await retrieval.hybrid_search(
            query=request.query,
            project_id=request.project_id,
            source_app=request.source_app,
            start_date=request.start_date,
            end_date=request.end_date,
            event_type=request.event_type,
            top_k=request.top_k,
            chunk_type=request.chunk_type,
            vault_id=request.vault_id,
            chunk_response=True
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve/chunks", dependencies=[Depends(verify_pro_plan)], tags=["retrieve"])
async def retrieve_chunks(request: ChunksRequest):
    try:
        results = await retrieval.hybrid_search(
            query="",
            project_id=request.project_id,
            source_app=request.source_app,
            start_date=request.start_date,
            end_date=request.end_date,
            event_type=request.event_type,
            top_k=request.top_k,
            chunk_type=request.chunk_type,
            vault_id=request.vault_id,
            chunk_response=True
        )
        return {"chunks": [r["chunk"] for r in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve/summary", dependencies=[Depends(verify_pro_plan)], tags=["retrieve"])
async def retrieve_summary(request: SummaryRequest):
    try:
        results = await retrieval.hybrid_search(
            query=request.query,
            project_id=request.project_id,
            source_app=request.source_app,
            start_date=request.start_date,
            end_date=request.end_date,
            event_type=request.event_type,
            top_k=5,
            chunk_type=request.chunk_type,
            vault_id=request.vault_id,
            chunk_response=True
        )
        if not results:
            return {"query": request.query, "summary": "No relevant context found.", "citations": []}
            
        chunks = [r["chunk"] for r in results]
        summary_text = await summarizer.summarize_chunks(request.query, chunks)
        citations = list(set(cid for chunk in chunks for cid in chunk.source_event_ids))
        
        return {
            "query": request.query,
            "summary": summary_text,
            "chunks_analyzed": len(chunks),
            "citations": citations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve/agent-bundle", dependencies=[Depends(verify_pro_plan)], tags=["retrieve"])
async def retrieve_agent_bundle(request: AgentBundleRequest):
    try:
        query_str = request.query or ""
        results = await retrieval.hybrid_search(
            query=query_str,
            project_id=request.project_id,
            source_app=request.source_app,
            start_date=request.start_date,
            end_date=request.end_date,
            top_k=10,
            chunk_type=request.chunk_type,
            vault_id=request.vault_id,
            chunk_response=True
        )
        
        chunks = [r["chunk"] for r in results]
        citations = list(set(cid for chunk in chunks for cid in chunk.source_event_ids))
        
        summary_text = ""
        if chunks:
            summary_text = await summarizer.summarize_chunks(
                query_str or "general overview of the context", 
                chunks
            )

        import uuid
        bundle_id = str(uuid.uuid4())
        
        return {
            "bundle_id": bundle_id,
            "project_id": request.project_id,
            "vault_id": request.vault_id,
            "summary": summary_text,
            "chunks": [c.model_dump() for c in chunks],
            "citations": citations,
            "token_count_estimate": sum(len(c.fts_text.split()) for c in chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
