import json
import redis
import asyncio
from vexctx.config import settings
from vexctx.vault.models import ContextEvent

class RedisCache:
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.VEXCTX_REDIS_URL
        self._client = None
        self._enabled = True

    def _get_client(self):
        if not self._enabled:
            return None
        if self._client is None:
            try:
                self._client = redis.Redis.from_url(self.redis_url, decode_responses=True)
                self._client.ping()
            except Exception as e:
                print(f"Redis connection failed: {e}. Degrading gracefully and disabling Redis cache.")
                self._enabled = False
                self._client = None
        return self._client

    async def push(self, session_id: str, event: ContextEvent):
        client = self._get_client()
        if not client:
            return
        key = f"session:{session_id}"
        event_json = event.model_dump_json()
        try:
            def _push():
                pipe = client.pipeline()
                pipe.lpush(key, event_json)
                pipe.ltrim(key, 0, 49)
                pipe.execute()
            await asyncio.to_thread(_push)
        except Exception as e:
            print(f"Redis push failed: {e}. Disabling Redis cache.")
            self._enabled = False
            self._client = None

    async def get_recent(self, session_id: str) -> list[ContextEvent]:
        client = self._get_client()
        if not client:
            return []
        key = f"session:{session_id}"
        try:
            def _get():
                return client.lrange(key, 0, 49)
            raw_events = await asyncio.to_thread(_get)
            events = []
            for item in raw_events:
                events.append(ContextEvent.model_validate_json(item))
            return events
        except Exception as e:
            print(f"Redis lrange failed: {e}. Disabling Redis cache.")
            self._enabled = False
            self._client = None
            return []

cache = RedisCache()
