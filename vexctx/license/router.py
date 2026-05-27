from fastapi import APIRouter, HTTPException
from vexctx.config import settings
from vexctx.license.models import LicenseActivateRequest, LicenseStatusResponse
from vexctx.license.verifier import (
    verify_jwt_license,
    save_cached_license,
    clear_cached_license,
    verify_and_apply_license_state
)

router = APIRouter(prefix="/license", tags=["license"])

@router.post("/activate", response_model=LicenseStatusResponse)
async def activate_license(request: LicenseActivateRequest):
    """
    Activate a license key (signed JWT). Validates the key locally
    and saves it to the local cache if valid.
    """
    try:
        payload = verify_jwt_license(request.license_key)
        save_cached_license(request.license_key)
        
        plan = payload.get("plan", "free").lower().strip()
        settings.VEXCTX_PLAN_TYPE = plan
        
        from datetime import datetime
        return LicenseStatusResponse(
            valid=True,
            email=payload.get("email"),
            plan=plan,
            expires_at=str(payload.get("exp")),
            last_verified=datetime.utcnow().isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/deactivate")
async def deactivate_license():
    """
    Deactivate the current license and reset plan to free.
    """
    clear_cached_license()
    settings.VEXCTX_PLAN_TYPE = "free"
    return {"status": "success", "message": "License deactivated."}

@router.get("/status", response_model=LicenseStatusResponse)
async def get_license_status():
    """
    Check the current active license status on this device.
    """
    status = verify_and_apply_license_state()
    if not status["valid"]:
        return LicenseStatusResponse(
            valid=False,
            plan="free"
        )
    return LicenseStatusResponse(
        valid=True,
        email=status["email"],
        plan=status["plan"],
        expires_at=str(status["expires_at"]),
        last_verified=status["last_verified"]
    )
