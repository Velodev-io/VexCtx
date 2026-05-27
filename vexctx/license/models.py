from pydantic import BaseModel
from typing import Optional

class LicenseActivateRequest(BaseModel):
    license_key: str

class LicenseStatusResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    plan: str
    expires_at: Optional[str] = None
    last_verified: Optional[str] = None
