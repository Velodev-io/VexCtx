import httpx
from typing import Optional, Dict, Any

class VexCTX:
    def __init__(self, base_url: str = "http://localhost:8765"):
        self.base_url = base_url.rstrip("/")

    # --- Sync Methods ---

    def add_event(
        self, 
        event_type: str, 
        source_app: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None, 
        session_id: str = "default", 
        user_id: str = "default",
        project_id: Optional[str] = None,
        sensitivity: str = "low",
        exclude_from_export: bool = False,
        ai_assisted: bool = True
    ) -> dict:
        payload = {
            "event_type": event_type,
            "source_app": source_app,
            "content": content,
            "metadata": metadata or {},
            "session_id": session_id,
            "user_id": user_id,
            "project_id": project_id,
            "sensitivity": sensitivity,
            "exclude_from_export": exclude_from_export,
            "ai_assisted": ai_assisted
        }
        response = httpx.post(f"{self.base_url}/events", json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()

    def get_timeline(self, limit: int = 50, offset: int = 0) -> dict:
        response = httpx.get(
            f"{self.base_url}/timeline",
            params={"limit": limit, "offset": offset},
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()

    def export_vault(self, vault_id: str = "default_vault") -> dict:
        response = httpx.post(
            f"{self.base_url}/vault/export",
            params={"vault_id": vault_id},
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()

    def import_vault(self, data: dict, vault_id: str = "default_vault") -> dict:
        response = httpx.post(
            f"{self.base_url}/vault/import",
            json=data,
            params={"vault_id": vault_id},
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()

    def search(
        self,
        query: str,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        top_k: int = 10,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "query": query,
            "project_id": project_id,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "event_type": event_type,
            "top_k": top_k,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        response = httpx.post(f"{self.base_url}/retrieve/search", json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()

    def get_summary(
        self,
        query: str,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "query": query,
            "project_id": project_id,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "event_type": event_type,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        response = httpx.post(f"{self.base_url}/retrieve/summary", json=payload, timeout=20.0)
        response.raise_for_status()
        return response.json()

    def create_agent_bundle(
        self,
        project_id: Optional[str] = None,
        query: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "project_id": project_id,
            "query": query,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        response = httpx.post(f"{self.base_url}/retrieve/agent-bundle", json=payload, timeout=20.0)
        response.raise_for_status()
        return response.json()

    # --- Async Methods ---

    async def add_event_async(
        self, 
        event_type: str, 
        source_app: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None, 
        session_id: str = "default", 
        user_id: str = "default",
        project_id: Optional[str] = None,
        sensitivity: str = "low",
        exclude_from_export: bool = False,
        ai_assisted: bool = True
    ) -> dict:
        payload = {
            "event_type": event_type,
            "source_app": source_app,
            "content": content,
            "metadata": metadata or {},
            "session_id": session_id,
            "user_id": user_id,
            "project_id": project_id,
            "sensitivity": sensitivity,
            "exclude_from_export": exclude_from_export,
            "ai_assisted": ai_assisted
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/events", json=payload, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def get_timeline_async(self, limit: int = 50, offset: int = 0) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/timeline",
                params={"limit": limit, "offset": offset},
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()

    async def export_vault_async(self, vault_id: str = "default_vault") -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/vault/export",
                params={"vault_id": vault_id},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def import_vault_async(self, data: dict, vault_id: str = "default_vault") -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/vault/import",
                json=data,
                params={"vault_id": vault_id},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def search_async(
        self,
        query: str,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        top_k: int = 10,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "query": query,
            "project_id": project_id,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "event_type": event_type,
            "top_k": top_k,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/retrieve/search", json=payload, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def get_summary_async(
        self,
        query: str,
        project_id: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "query": query,
            "project_id": project_id,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "event_type": event_type,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/retrieve/summary", json=payload, timeout=20.0)
            response.raise_for_status()
            return response.json()

    async def create_agent_bundle_async(
        self,
        project_id: Optional[str] = None,
        query: Optional[str] = None,
        source_app: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        chunk_type: str = "session",
        vault_id: str = "default_vault"
    ) -> dict:
        payload = {
            "project_id": project_id,
            "query": query,
            "source_app": source_app,
            "start_date": start_date,
            "end_date": end_date,
            "chunk_type": chunk_type,
            "vault_id": vault_id
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/retrieve/agent-bundle", json=payload, timeout=20.0)
            response.raise_for_status()
            return response.json()
