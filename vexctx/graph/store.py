import os
import json
import aiosqlite
from datetime import datetime
from vexctx.config import settings
from vexctx.graph.models import ContextNode, ContextEdge

class GraphStore:
    def __init__(self, db_path: str = None):
        self._db_path = db_path
        self._db = None
        self._db_loop = None

    @property
    def db_path(self) -> str:
        return self._db_path or settings.db_path_abs

    async def _get_db(self) -> aiosqlite.Connection:
        import asyncio
        current_loop = asyncio.get_running_loop()
        if self._db is None or self._db_loop != current_loop:
            if self._db is not None:
                try:
                    await self._db.close()
                except Exception:
                    pass
                self._db = None

            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            # Detect and safely remove plaintext database to re-initialize as encrypted
            if os.path.exists(self.db_path):
                try:
                    with open(self.db_path, "rb") as f:
                        header = f.read(16)
                    if header.startswith(b"SQLite format 3\x00"):
                        for suffix in ["", "-wal", "-shm"]:
                            p = self.db_path + suffix
                            if os.path.exists(p):
                                os.remove(p)
                except Exception:
                    pass

            import sqlcipher3
            from vexctx.vault.encryption import encryption_service
            self._db = await aiosqlite.connect(self.db_path, factory=sqlcipher3.Connection)
            kek_hex = encryption_service.get_provider().get_kek().hex()
            await self._db.execute(f"PRAGMA key = \"x'{kek_hex}'\"")
            self._db_loop = current_loop
            await self._init_db()
        return self._db

    async def _init_db(self):
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA busy_timeout=5000")
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                node_id TEXT PRIMARY KEY,
                node_type TEXT NOT NULL,
                label TEXT NOT NULL,
                attributes TEXT NOT NULL, -- JSON serialized
                last_accessed TEXT NOT NULL,
                access_count INTEGER DEFAULT 0,
                decay_score REAL DEFAULT 1.0
            )
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS edges (
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                relation TEXT NOT NULL,
                weight REAL DEFAULT 1.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (source_id, target_id, relation),
                FOREIGN KEY (source_id) REFERENCES nodes (node_id) ON DELETE CASCADE,
                FOREIGN KEY (target_id) REFERENCES nodes (node_id) ON DELETE CASCADE
            )
        """)
        await self._db.commit()

    async def close(self):
        if self._db:
            await self._db.close()
            self._db = None

    async def upsert_node(self, node: ContextNode):
        db = await self._get_db()
        attributes_str = json.dumps(node.attributes)
        last_accessed_str = node.last_accessed.isoformat()
        
        await db.execute(
            """
            INSERT INTO nodes (node_id, node_type, label, attributes, last_accessed, access_count, decay_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(node_id) DO UPDATE SET
                attributes = excluded.attributes,
                last_accessed = excluded.last_accessed,
                access_count = access_count + 1,
                decay_score = 1.0
            """,
            (node.node_id, node.node_type, node.label, attributes_str, last_accessed_str, node.access_count or 1, node.decay_score)
        )
        await db.commit()

    async def upsert_edge(self, edge: ContextEdge):
        db = await self._get_db()
        created_str = edge.created_at.isoformat()
        updated_str = edge.updated_at.isoformat()
        
        await db.execute(
            """
            INSERT INTO edges (source_id, target_id, relation, weight, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id, target_id, relation) DO UPDATE SET
                weight = weight + excluded.weight,
                updated_at = excluded.updated_at
            """,
            (edge.source_id, edge.target_id, edge.relation, edge.weight, created_str, updated_str)
        )
        await db.commit()

    async def get_node(self, node_id: str) -> Optional[ContextNode]:
        db = await self._get_db()
        async with db.execute(
            "SELECT node_id, node_type, label, attributes, last_accessed, access_count, decay_score FROM nodes WHERE node_id = ?",
            (node_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return ContextNode(
                    node_id=row[0],
                    node_type=row[1],
                    label=row[2],
                    attributes=json.loads(row[3]),
                    last_accessed=datetime.fromisoformat(row[4]),
                    access_count=row[5],
                    decay_score=row[6]
                )
        return None

    async def get_neighbors(self, node_id: str) -> dict:
        db = await self._get_db()
        
        # 1. Fetch connected edges
        edges = []
        async with db.execute(
            "SELECT source_id, target_id, relation, weight, created_at, updated_at FROM edges WHERE source_id = ? OR target_id = ?",
            (node_id, node_id)
        ) as cursor:
            rows = await cursor.fetchall()
            for r in rows:
                edges.append(ContextEdge(
                    source_id=r[0],
                    target_id=r[1],
                    relation=r[2],
                    weight=r[3],
                    created_at=datetime.fromisoformat(r[4]),
                    updated_at=datetime.fromisoformat(r[5])
                ))
        
        # 2. Fetch neighboring nodes
        nodes = []
        # Find unique neighbor IDs
        neighbor_ids = set()
        for e in edges:
            if e.source_id != node_id:
                neighbor_ids.add(e.source_id)
            if e.target_id != node_id:
                neighbor_ids.add(e.target_id)
                
        if neighbor_ids:
            placeholders = ",".join("?" for _ in neighbor_ids)
            async with db.execute(
                f"SELECT node_id, node_type, label, attributes, last_accessed, access_count, decay_score FROM nodes WHERE node_id IN ({placeholders})",
                list(neighbor_ids)
            ) as cursor:
                rows = await cursor.fetchall()
                for r in rows:
                    nodes.append(ContextNode(
                        node_id=r[0],
                        node_type=r[1],
                        label=r[2],
                        attributes=json.loads(r[3]),
                        last_accessed=datetime.fromisoformat(r[4]),
                        access_count=r[5],
                        decay_score=r[6]
                    ))
                    
        return {"edges": edges, "nodes": nodes}

    async def find_nodes_by_query(self, query: str, limit: int = 15) -> list[ContextNode]:
        db = await self._get_db()
        # Find nodes where label or attributes match the query term
        # Case insensitive query using LIKE
        words = [w for w in query.replace('"', '').replace("'", "").split() if w]
        if not words:
            return []
            
        where_clauses = []
        params = []
        for w in words:
            where_clauses.append("(label LIKE ? OR attributes LIKE ?)")
            params.extend([f"%{w}%", f"%{w}%"])
            
        where_str = " OR ".join(where_clauses)
        
        nodes = []
        async with db.execute(
            f"SELECT node_id, node_type, label, attributes, last_accessed, access_count, decay_score FROM nodes WHERE {where_str} ORDER BY decay_score DESC, access_count DESC LIMIT ?",
            params + [limit]
        ) as cursor:
            rows = await cursor.fetchall()
            for r in rows:
                nodes.append(ContextNode(
                    node_id=r[0],
                    node_type=r[1],
                    label=r[2],
                    attributes=json.loads(r[3]),
                    last_accessed=datetime.fromisoformat(r[4]),
                    access_count=r[5],
                    decay_score=r[6]
                ))
        return nodes

    async def decay_all(self):
        db = await self._get_db()
        await db.execute("UPDATE nodes SET decay_score = decay_score * 0.95")
        await db.commit()

    async def list_nodes(self) -> list[ContextNode]:
        db = await self._get_db()
        nodes = []
        async with db.execute("SELECT node_id, node_type, label, attributes, last_accessed, access_count, decay_score FROM nodes") as cursor:
            rows = await cursor.fetchall()
            for r in rows:
                nodes.append(ContextNode(
                    node_id=r[0],
                    node_type=r[1],
                    label=r[2],
                    attributes=json.loads(r[3]),
                    last_accessed=datetime.fromisoformat(r[4]),
                    access_count=r[5],
                    decay_score=r[6]
                ))
        return nodes

    async def list_edges(self) -> list[ContextEdge]:
        db = await self._get_db()
        edges = []
        async with db.execute("SELECT source_id, target_id, relation, weight, created_at, updated_at FROM edges") as cursor:
            rows = await cursor.fetchall()
            for r in rows:
                edges.append(ContextEdge(
                    source_id=r[0],
                    target_id=r[1],
                    relation=r[2],
                    weight=r[3],
                    created_at=datetime.fromisoformat(r[4]),
                    updated_at=datetime.fromisoformat(r[5])
                ))
        return edges

    async def delete_node(self, node_id: str):
        db = await self._get_db()
        await db.execute("DELETE FROM nodes WHERE node_id = ?", (node_id,))
        await db.commit()

    async def clear_all(self):
        db = await self._get_db()
        await db.execute("DELETE FROM edges")
        await db.execute("DELETE FROM nodes")
        await db.commit()

graph_store = GraphStore()
