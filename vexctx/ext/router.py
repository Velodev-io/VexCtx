import os
from fastapi import APIRouter, Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from vexctx.config import settings
from vexctx.ext.models import ExtensionEvent
from vexctx.vault.models import ContextEvent, EventType
from vexctx.vault.ingestion import process_event

router = APIRouter(prefix="/ext", tags=["extension"])
security = HTTPBearer()

def get_or_create_ext_token() -> str:
    path = settings.ext_token_path_abs
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                token = f.read().strip()
                if token:
                    return token
        except Exception as e:
            print(f"Error reading extension token: {e}")
            
    import secrets
    token = secrets.token_hex(32)
    try:
        with open(path, "w") as f:
            f.write(token)
    except Exception as e:
        print(f"Error saving extension token: {e}")
    return token

def verify_ext_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    token = get_or_create_ext_token()
    if credentials.credentials != token:
        raise HTTPException(status_code=401, detail="Invalid extension authorization token")
    return credentials.credentials

@router.get("/status")
async def get_status():
    """
    Returns the running daemon status, version, and current plan tier.
    """
    return {
        "running": True,
        "version": "1.0.0",
        "plan": settings.VEXCTX_PLAN_TYPE
    }

@router.post("/auth")
async def authenticate_extension(request: Request):
    """
    Pair the browser extension with the local daemon.
    Strictly restricted to localhost origin and extension schemes (chrome-extension or moz-extension).
    """
    # 1. Enforce localhost origin on request
    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "localhost", "::1", "testclient"):
        raise HTTPException(status_code=403, detail="Access denied. Authentication is only permitted from localhost.")

    # 2. Check Origin header to ensure it's from a browser extension
    origin = request.headers.get("origin", "")
    if not (origin.startswith("chrome-extension://") or origin.startswith("moz-extension://")):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Request must originate from a verified browser extension context."
        )

    # 3. If VEXCTX_TRUSTED_EXT_IDS is specified, check against it
    if settings.VEXCTX_TRUSTED_EXT_IDS:
        trusted_ids = [ext_id.strip() for ext_id in settings.VEXCTX_TRUSTED_EXT_IDS.split(",") if ext_id.strip()]
        # Origin will be chrome-extension://<id> or moz-extension://<uuid>
        # Extract the extension ID
        ext_id = origin.split("://")[-1]
        if ext_id not in trusted_ids:
            raise HTTPException(status_code=403, detail="Access denied. Browser extension ID is not in the trusted list.")

    # Return the secure token to the pairing extension
    return {"token": get_or_create_ext_token()}

@router.post("/events")
async def ingest_extension_events(
    events: List[ExtensionEvent],
    token: str = Depends(verify_ext_token)
):
    """
    Ingest batch of captured events from the extension.
    Converts ExtensionEvent to ContextEvent and processes them.
    """
    ingested_count = 0
    skipped_count = 0
    
    for ext_event in events:
        # Determine event type based on message role
        event_type = EventType.AI_PROMPT if ext_event.role == "user" else EventType.AI_RESPONSE
        
        # Populate context event metadata
        metadata = {
            **ext_event.metadata,
            "url": ext_event.url,
            "turn_index": ext_event.turn_index,
            "captured_at": ext_event.captured_at.isoformat()
        }
        
        context_event = ContextEvent(
            event_type=event_type,
            source_app=ext_event.source_app,
            session_id=ext_event.session_id,
            origin="browser_extension",
            timestamp=ext_event.captured_at,
            content=ext_event.content,
            metadata=metadata
        )
        
        success = await process_event(context_event)
        if success:
            ingested_count += 1
        else:
            skipped_count += 1
            
    return {
        "status": "success",
        "ingested": ingested_count,
        "skipped": skipped_count
    }
