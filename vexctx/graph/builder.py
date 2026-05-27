import uuid
from datetime import datetime, timezone
from vexctx.vault.models import ContextEvent
from vexctx.graph.models import ContextNode, ContextEdge
from vexctx.graph.store import graph_store
from vexctx.retrieve.extractor import extractor

class GraphBuilder:
    async def update(self, event: ContextEvent):
        # Extract entities and relationships
        extracted = await extractor.extract(event)
        
        entities = extracted.get("entities", [])
        relationships = extracted.get("relationships", [])
        
        label_to_id = {}
        # 1. Upsert all nodes
        for ent in entities:
            label = ent["label"]
            node_type = ent["type"]
            node_id = f"{node_type}:{label}"
            label_to_id[label] = node_id
            
            node = ContextNode(
                node_id=node_id,
                node_type=node_type,
                label=label,
                attributes={"source_app": event.source_app, "session_id": event.session_id},
                last_accessed=datetime.now(timezone.utc),
                access_count=1,
                decay_score=1.0
            )
            await graph_store.upsert_node(node)
            
        # 2. Upsert all edges
        for rel in relationships:
            from_label = rel["from"]
            to_label = rel["to"]
            relation = rel["relation"]
            
            # Resolve labels to IDs
            source_id = label_to_id.get(from_label)
            if not source_id:
                node_type = "concept"
                if "." in from_label:
                    node_type = "file"
                source_id = f"{node_type}:{from_label}"
                label_to_id[from_label] = source_id
                node = ContextNode(
                    node_id=source_id,
                    node_type=node_type,
                    label=from_label,
                    attributes={"source_app": event.source_app, "session_id": event.session_id},
                    last_accessed=datetime.now(timezone.utc),
                    access_count=1,
                    decay_score=1.0
                )
                await graph_store.upsert_node(node)
                
            target_id = label_to_id.get(to_label)
            if not target_id:
                node_type = "concept"
                if "." in to_label:
                    node_type = "file"
                target_id = f"{node_type}:{to_label}"
                label_to_id[to_label] = target_id
                node = ContextNode(
                    node_id=target_id,
                    node_type=node_type,
                    label=to_label,
                    attributes={"source_app": event.source_app, "session_id": event.session_id},
                    last_accessed=datetime.now(timezone.utc),
                    access_count=1,
                    decay_score=1.0
                )
                await graph_store.upsert_node(node)
                
            edge = ContextEdge(
                source_id=source_id,
                target_id=target_id,
                relation=relation,
                weight=1.0,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            await graph_store.upsert_edge(edge)

    async def get_context_summary(self, query: str) -> dict:
        matched_nodes = await graph_store.find_nodes_by_query(query, limit=5)
        
        summary_nodes = {}
        summary_edges = []
        
        for node in matched_nodes:
            summary_nodes[node.node_id] = node
            
        for node in matched_nodes:
            neighbors = await graph_store.get_neighbors(node.node_id)
            for n_node in neighbors.get("nodes", []):
                if n_node.node_id not in summary_nodes:
                    summary_nodes[n_node.node_id] = n_node
            for edge in neighbors.get("edges", []):
                summary_edges.append(edge)
                
        unique_edges = {}
        for edge in summary_edges:
            key = (edge.source_id, edge.target_id, edge.relation)
            if key not in unique_edges:
                unique_edges[key] = edge
                
        return {
            "nodes": list(summary_nodes.values()),
            "edges": list(unique_edges.values())
        }

graph_builder = GraphBuilder()
