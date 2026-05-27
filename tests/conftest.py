import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from vexctx.config import settings

@pytest.fixture(autouse=True, scope="session")
def override_settings(tmp_path_factory):
    tmp_dir = tmp_path_factory.mktemp("vexctx_test")
    # Set config parameters to use temp directory files
    settings.VEXCTX_DB_PATH = str(tmp_dir / "test_episodes.db")
    settings.VEXCTX_QDRANT_URL = ":memory:"
    settings.VEXCTX_QDRANT_COLLECTION = "test_vexctx_vectors"
    yield


@pytest.fixture(autouse=True)
def mock_ollama_and_redis():
    async_post_mock = AsyncMock()
    
    def side_effect(url, **kwargs):
        response_mock = MagicMock()
        response_mock.status_code = 200
        if "/api/embed" in url or "/api/embeddings" in url:
            response_mock.json.return_value = {"embeddings": [[0.1] * 768], "embedding": [0.1] * 768}
        elif "/api/chat" in url:
            content = (
                '{"entities": [{"label": "test_file.py", "type": "file"}, {"label": "VexCtx", "type": "project"}], '
                '"relationships": [{"from": "test_file.py", "to": "VexCtx", "relation": "BELONGS_TO"}]}'
            )
            response_mock.json.return_value = {"message": {"content": content}}
        else:
            response_mock.json.return_value = {}
        return response_mock

    async_post_mock.side_effect = side_effect

    mock_redis_client = MagicMock()
    mock_redis_client.ping.return_value = True
    mock_redis_client.pipeline.return_value = MagicMock()
    mock_redis_client.lrange.return_value = []

    with patch("httpx.AsyncClient.post", new=async_post_mock), \
         patch("redis.Redis.from_url", return_value=mock_redis_client):
        yield
