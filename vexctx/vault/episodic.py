import os
import json
import uuid
import aiosqlite
from datetime import datetime
from vexctx.config import settings
from vexctx.vault.models import ContextEvent, EventType, SensitivityEnum

class EpisodicStore:
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
            CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                source_app TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                project_id TEXT,
                task_id TEXT,
                origin TEXT,
                ai_assisted INTEGER NOT NULL DEFAULT 1,
                sensitivity TEXT NOT NULL DEFAULT 'low',
                exclude_from_export INTEGER NOT NULL DEFAULT 0
            )
        """)
        # Auto-migration for existing databases
        for col in ["task_id", "origin"]:
            try:
                await self._db.execute(f"ALTER TABLE episodes ADD COLUMN {col} TEXT")
            except Exception:
                pass
        await self._db.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
                episode_id UNINDEXED,
                content,
                source_app,
                event_type
            )
        """)
        await self._db.commit()

    async def close(self):
        if self._db:
            await self._db.close()
            self._db = None

    async def insert(self, event: ContextEvent) -> str:
        db = await self._get_db()
        event_id = event.event_id or str(uuid.uuid4())
        timestamp_str = event.timestamp.isoformat()
        metadata_str = json.dumps(event.metadata)
        
        await db.execute(
            """INSERT OR REPLACE INTO episodes 
            (id, event_type, source_app, content, metadata, timestamp, session_id, user_id, project_id, task_id, origin, ai_assisted, sensitivity, exclude_from_export) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id, 
                event.event_type.value, 
                event.source_app, 
                event.content, 
                metadata_str, 
                timestamp_str, 
                event.session_id, 
                event.user_id,
                event.project_id,
                event.task_id,
                event.origin,
                1 if event.ai_assisted else 0,
                event.sensitivity.value,
                1 if event.exclude_from_export else 0
            )
        )
        # Check if already exists in FTS to prevent duplication
        async with db.execute("SELECT 1 FROM episodes_fts WHERE episode_id = ?", (event_id,)) as cursor:
            exists = await cursor.fetchone()
        if not exists:
            await db.execute(
                "INSERT INTO episodes_fts (episode_id, content, source_app, event_type) VALUES (?, ?, ?, ?)",
                (event_id, event.content, event.source_app, event.event_type.value)
            )
        await db.commit()
        return event_id

    async def get_recent(self, session_id: str, limit: int = 50) -> list[ContextEvent]:
        db = await self._get_db()
        async with db.execute(
            """SELECT id, event_type, source_app, content, metadata, timestamp, session_id, user_id, project_id, task_id, origin, ai_assisted, sensitivity, exclude_from_export 
               FROM episodes WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?""",
            (session_id, limit)
        ) as cursor:
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
                    task_id=r[9],
                    origin=r[10],
                    ai_assisted=bool(r[11]),
                    sensitivity=r[12],
                    exclude_from_export=bool(r[13])
                ))
            return events

    async def get_timeline(self, limit: int = 50, offset: int = 0) -> list[ContextEvent]:
        db = await self._get_db()
        async with db.execute(
            """SELECT id, event_type, source_app, content, metadata, timestamp, session_id, user_id, project_id, task_id, origin, ai_assisted, sensitivity, exclude_from_export 
               FROM episodes ORDER BY timestamp DESC LIMIT ? OFFSET ?""",
            (limit, offset)
        ) as cursor:
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
                    task_id=r[9],
                    origin=r[10],
                    ai_assisted=bool(r[11]),
                    sensitivity=r[12],
                    exclude_from_export=bool(r[13])
                ))
            return events

    async def search_fts(self, query: str, limit: int = 10) -> list[ContextEvent]:
        db = await self._get_db()
        words = [w for w in query.replace('"', '').replace("'", "").split() if w]
        if not words:
            return []
        fts_query = " OR ".join(words)
        try:
            async with db.execute(
                """
                SELECT e.id, e.event_type, e.source_app, e.content, e.metadata, e.timestamp, e.session_id, e.user_id, e.project_id, e.task_id, e.origin, e.ai_assisted, e.sensitivity, e.exclude_from_export
                FROM episodes e 
                JOIN episodes_fts f ON e.id = f.episode_id 
                WHERE episodes_fts MATCH ? 
                ORDER BY rank 
                LIMIT ?
                """,
                (fts_query, limit)
            ) as cursor:
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
                        task_id=r[9],
                        origin=r[10],
                        ai_assisted=bool(r[11]),
                        sensitivity=r[12],
                        exclude_from_export=bool(r[13])
                    ))
                return events
        except Exception:
            return []

    async def get_count(self) -> int:
        db = await self._get_db()
        async with db.execute("SELECT COUNT(*) FROM episodes") as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0

    async def get_sessions(self) -> list[dict]:
        db = await self._get_db()
        async with db.execute("SELECT session_id, COUNT(*) FROM episodes GROUP BY session_id") as cursor:
            rows = await cursor.fetchall()
            return [{"session_id": r[0], "event_count": r[1]} for r in rows]

    async def wipe_session(self, session_id: str):
        db = await self._get_db()
        await db.execute("DELETE FROM episodes WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM episodes_fts WHERE episode_id NOT IN (SELECT id FROM episodes)")
        await db.commit()

    async def wipe_all(self):
        db = await self._get_db()
        await db.execute("DELETE FROM episodes")
        await db.execute("DELETE FROM episodes_fts")
        await db.commit()

    async def prune_expired_vault_data(self, days: int) -> int:
        """
        Prunes events older than the specified number of days from SQLite database,
        removes matching vector embeddings from Qdrant, and runs database vacuum/compaction
        to reclaim physical disk storage space.
        Returns the number of deleted records.
        """
        if days <= 0:
            return 0
            
        from datetime import timedelta
        cutoff_dt = datetime.utcnow() - timedelta(days=days)
        cutoff_str = cutoff_dt.isoformat()
        
        db = await self._get_db()
        
        # 1. Fetch count of rows to be deleted
        async with db.execute("SELECT COUNT(*) FROM episodes WHERE timestamp < ?", (cutoff_str,)) as cursor:
            row = await cursor.fetchone()
            deleted_count = row[0] if row else 0
            
        if deleted_count == 0:
            return 0
            
        # 2. Delete vectors from Qdrant
        try:
            from vexctx.retrieve.vector import vector_store
            await vector_store.delete_older_than_async(cutoff_dt)
        except Exception as e:
            print(f"Failed to delete old vectors during pruning: {e}")
            
        # 3. Delete from episodes table
        await db.execute("DELETE FROM episodes WHERE timestamp < ?", (cutoff_str,))
        
        # 4. Clean up the episodes_fts table to keep it in sync
        await db.execute("DELETE FROM episodes_fts WHERE episode_id NOT IN (SELECT id FROM episodes)")
        
        await db.commit()
        
        # 5. Run compaction to shrink physical disk storage
        try:
            await db.execute("PRAGMA incremental_vacuum;")
            await db.execute("PRAGMA optimize;")
            await db.commit()
        except Exception as e:
            print(f"Compaction optimize failed: {e}")
            
        return deleted_count

    async def deduplicate_episodes(self):
        """Removes duplicate rows based on content, source_app, and timestamp"""
        db = await self._get_db()
        await db.execute("""
            DELETE FROM episodes
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM episodes
                GROUP BY source_app, content, timestamp
            )
        """)
        await db.execute("""
            DELETE FROM episodes_fts
            WHERE episode_id NOT IN (SELECT id FROM episodes)
        """)
        await db.commit()

    async def retrofit_project_ids(self):
        """Retrofits project_id for older episodes lacking it, using metadata/content analysis."""
        db = await self._get_db()
        
        # Find sessions that have NULL, empty, or 'global' project_ids
        async with db.execute(
            "SELECT DISTINCT session_id, source_app FROM episodes WHERE project_id IS NULL OR project_id = '' OR project_id = 'global'"
        ) as cursor:
            sessions = await cursor.fetchall()
            
        import re
        
        # Scan workspace storage to match vscode copilot sessions if needed
        copilot_session_to_project = {}
        vscode_dir = os.path.expanduser("~/Library/Application Support/Code/User/workspaceStorage")
        if os.path.exists(vscode_dir):
            try:
                for root, dirs, files in os.walk(vscode_dir):
                    if "chatSessions" in dirs:
                        proj = "global"
                        workspace_json_path = os.path.join(root, "workspace.json")
                        if os.path.exists(workspace_json_path):
                            with open(workspace_json_path, "r", encoding="utf-8") as wf:
                                wdata = json.load(wf)
                                folder_uri = wdata.get("folder") or wdata.get("workspace")
                                if folder_uri:
                                    proj = os.path.basename(folder_uri.strip("/").replace("%20", " "))
                        
                        chat_sessions_dir = os.path.join(root, "chatSessions")
                        if os.path.exists(chat_sessions_dir):
                            for f_name in os.listdir(chat_sessions_dir):
                                if f_name.endswith(".jsonl"):
                                    s_id = f_name[:-6] # strip .jsonl
                                    copilot_session_to_project[s_id] = proj
            except Exception:
                pass

        for session_id, source_app in sessions:
            if not session_id:
                continue
                
            project_id = None
            
            # Fetch all episodes for this session to scan their metadata or content
            async with db.execute(
                "SELECT content, metadata FROM episodes WHERE session_id = ?",
                (session_id,)
            ) as ep_cursor:
                episodes = await ep_cursor.fetchall()
                
            if source_app == "claude_code":
                for content, meta_str in episodes:
                    try:
                        meta = json.loads(meta_str)
                        cwd = meta.get("cwd")
                        if cwd:
                            project_id = os.path.basename(cwd.strip())
                            if project_id:
                                break
                    except Exception:
                        pass
            elif source_app == "antigravity":
                for content, meta_str in episodes:
                    if content:
                        m = re.search(r"(?:^|[\s\"'\[>])([a-zA-Z]:[/\\][^\s\"']+|/[^\s\"']+)\s+->\s+", content)
                        if m:
                            project_id = os.path.basename(m.group(1).strip())
                            if project_id:
                                break
                            if project_id:
                                break
            elif source_app == "vscode_copilot":
                project_id = copilot_session_to_project.get(session_id)
                
            if project_id and project_id != "global":
                await db.execute(
                    "UPDATE episodes SET project_id = ? WHERE session_id = ?",
                    (project_id, session_id)
                )
                
        await db.commit()

episodic_store = EpisodicStore()
