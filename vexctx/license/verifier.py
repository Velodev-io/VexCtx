import os
import json
import jwt
from datetime import datetime
from vexctx.config import settings

def verify_jwt_license(token: str) -> dict:
    """
    Decodes and cryptographically validates the JWT license key locally
    using the shared symmetric secret.
    """
    try:
        # Decodes the JWT. Throws error if signature is invalid or expired.
        payload = jwt.decode(
            token,
            settings.VEXCTX_JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("License key has expired.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid cryptographic license key signature.")

def save_cached_license(token: str) -> None:
    """
    Saves the license token to a local JSON cache on disk.
    """
    path = settings.license_cache_path_abs
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    data = {
        "license_key": token,
        "last_verified": datetime.utcnow().isoformat()
    }
    
    try:
        with open(path, "w") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Error caching license to disk: {e}")

def load_cached_license() -> dict:
    """
    Reads the cached license key from disk and attempts to verify it.
    If valid, returns the verified payload. If invalid, raises ValueError.
    """
    path = settings.license_cache_path_abs
    if not os.path.exists(path):
        raise ValueError("No cached license found.")
        
    try:
        with open(path, "r") as f:
            data = json.load(f)
            
        token = data.get("license_key")
        if not token:
            raise ValueError("Malformed license cache.")
            
        payload = verify_jwt_license(token)
        payload["last_verified"] = data.get("last_verified")
        return payload
    except Exception as e:
        # If cache reading/decoding fails, propagate the error
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
        raise ValueError(f"License verification failed: {str(e)}")

def clear_cached_license() -> None:
    """
    Clears the cached license file from disk.
    """
    path = settings.license_cache_path_abs
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            print(f"Error removing cached license: {e}")

def verify_and_apply_license_state() -> dict:
    """
    Helper to verify the cached license state on startup.
    Updates the setting plan type dynamically.
    """
    try:
        payload = load_cached_license()
        plan = payload.get("plan", "free").lower().strip()
        settings.VEXCTX_PLAN_TYPE = plan
        return {
            "valid": True,
            "email": payload.get("email"),
            "plan": plan,
            "expires_at": payload.get("exp"),
            "last_verified": payload.get("last_verified")
        }
    except Exception:
        # Defaults to free tier on verification error
        settings.VEXCTX_PLAN_TYPE = "free"
        return {
            "valid": False,
            "plan": "free"
        }
