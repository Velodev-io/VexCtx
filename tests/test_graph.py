import pytest
from datetime import datetime, timezone
from vexctx.graph.models import ContextNode, ContextEdge
from vexctx.graph.store import graph_store
from vexctx.graph.builder import graph_builder
from vexctx.vault.models import ContextEvent, EventType

@pytest.mark.asyncio
async def test_node_upsert_and_decay():
    await graph_store.clear_all()
    
    node = ContextNode(
        node_id="file:main.py",
        node_type="file",
        label="main.py",
        attributes={"project": "Arenex"},
        last_accessed=datetime.now(timezone.utc),
        access_count=1,
        decay_score=1.0
    )
    await graph_store.upsert_node(node)
    
    saved_node = await graph_store.get_node("file:main.py")
    assert saved_node is not None
    assert saved_node.label == "main.py"
    assert saved_node.decay_score == 1.0
    
    await graph_store.decay_all()
    decayed_node = await graph_store.get_node("file:main.py")
    assert decayed_node.decay_score == 0.95

@pytest.mark.asyncio
async def test_edge_upsert_and_neighbors():
    node_a = ContextNode(
        node_id="file:main.py",
        node_type="file",
        label="main.py",
        attributes={},
        last_accessed=datetime.now(timezone.utc)
    )
    node_b = ContextNode(
        node_id="project:Arenex",
        node_type="project",
        label="Arenex",
        attributes={},
        last_accessed=datetime.now(timezone.utc)
    )
    await graph_store.upsert_node(node_a)
    await graph_store.upsert_node(node_b)
    
    edge = ContextEdge(
        source_id="file:main.py",
        target_id="project:Arenex",
        relation="BELONGS_TO",
        weight=1.0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    await graph_store.upsert_edge(edge)
    
    neighbors = await graph_store.get_neighbors("file:main.py")
    assert len(neighbors["nodes"]) == 1
    assert neighbors["nodes"][0].node_id == "project:Arenex"
    assert len(neighbors["edges"]) == 1
    assert neighbors["edges"][0].relation == "BELONGS_TO"

@pytest.mark.asyncio
async def test_graph_update_from_event():
    await graph_store.clear_all()
    event = ContextEvent(
        event_type=EventType.FILE_OPENED,
        source_app="vscode",
        content="main.py",
        metadata={"project": "Arenex"},
        session_id="test_graph"
    )
    await graph_builder.update(event)
    
    nodes = await graph_store.list_nodes()
    assert len(nodes) > 0
    labels = [n.label for n in nodes]
    assert "test_file.py" in labels or "main.py" in labels
