from fastapi import APIRouter, HTTPException, Path
from vexctx.graph.store import graph_store

router = APIRouter(prefix="/graph")

@router.get("/nodes")
async def list_nodes():
    nodes = await graph_store.list_nodes()
    return {"nodes": nodes}

@router.get("/edges")
async def list_edges():
    edges = await graph_store.list_edges()
    return {"edges": edges}

@router.delete("/nodes/{node_id:path}")
async def delete_node(node_id: str = Path(...)):
    await graph_store.delete_node(node_id)
    return {"status": "deleted", "node_id": node_id}

@router.post("/consolidate")
async def consolidate_graph():
    await graph_store.decay_all()
    return {"status": "consolidated", "action": "decay_scores_multiplied_by_0.95"}
