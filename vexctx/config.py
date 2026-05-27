import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    VEXCTX_PORT: int = 8765
    VEXCTX_DB_PATH: str = "~/VEX CTX/metadata.db"
    VEXCTX_VECTOR_PATH: str = "~/VEX CTX/vectors"
    VEXCTX_VAULT_PATH: str = "~/VEX CTX/vaults"
    VEXCTX_REDIS_URL: str = "redis://localhost:6379/3"
    
    # Vector store configuration (using Qdrant in-memory or server)
    VEXCTX_QDRANT_URL: str = ":memory:"
    VEXCTX_QDRANT_COLLECTION: str = "vexctx_vectors"
    
    # Encryption configuration
    VEXCTX_ENCRYPTION_MODE: str = "local_managed"
    VEXCTX_KEK_PROVIDER: str = "local"
    VEXCTX_LOCAL_MASTER_KEY_PATH: str = "~/VEX CTX/master.key"
    
    # AI service configuration
    VEXCTX_LLM_MODEL: str = "llama3.2:3b"
    VEXCTX_EMBED_PROVIDER: str = "ollama"
    VEXCTX_EMBED_MODEL: str = "nomic-embed-text"
    VEXCTX_EMBED_DIMENSIONS: int = 768
    VEXCTX_SUMMARY_PROVIDER: str = "ollama"
    VEXCTX_SUMMARY_MODEL: str = "llama3.2:3b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Retrieval and Search bounds
    VEXCTX_PLAN_TYPE: str = "free"
    VEXCTX_FREE_RETRIEVAL_LIMIT: int = 0
    VEXCTX_MAX_CONTEXT_TOKENS: int = 2000
    VEXCTX_TOP_K: int = 10
    VEXCTX_TOP_K_NODES: int = 15
    
    # Privacy configurations
    VEXCTX_EXCLUDED_APPS: str = "password_manager,banking_app"
    VEXCTX_LOCAL_ONLY: bool = True

    # Extension configurations
    VEXCTX_EXT_TOKEN_PATH: str = "~/VEX CTX/ext_token.txt"
    VEXCTX_TRUSTED_EXT_IDS: str = ""  # Comma-separated list of allowed extension IDs

    # License and Retention configurations
    VEXCTX_JWT_SECRET: str = "dev-secret-key-change-in-prod"
    VEXCTX_LICENSE_KEY: str = ""
    VEXCTX_LICENSE_CACHE_PATH: str = "~/VEX CTX/license.json"
    VEXCTX_RETENTION_DAYS: int = 30

    @property
    def db_path_abs(self) -> str:
        return os.path.abspath(os.path.expanduser(self.VEXCTX_DB_PATH))

    @property
    def vault_path_abs(self) -> str:
        return os.path.abspath(os.path.expanduser(self.VEXCTX_VAULT_PATH))

    @property
    def master_key_path_abs(self) -> str:
        return os.path.abspath(os.path.expanduser(self.VEXCTX_LOCAL_MASTER_KEY_PATH))

    @property
    def ext_token_path_abs(self) -> str:
        return os.path.abspath(os.path.expanduser(self.VEXCTX_EXT_TOKEN_PATH))

    @property
    def license_cache_path_abs(self) -> str:
        return os.path.abspath(os.path.expanduser(self.VEXCTX_LICENSE_CACHE_PATH))

settings = Settings()
