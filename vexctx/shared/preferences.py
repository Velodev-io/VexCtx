import os
import json
from vexctx.config import settings

def get_preferences_path() -> str:
    log_dir = os.path.dirname(settings.db_path_abs)
    return os.path.join(log_dir, "preferences.json")

def load_preferences() -> dict:
    path = get_preferences_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    # Return defaults
    return {
        "os_logging_enabled": True,
        "onboarded": False,
        "retention_days": 30
    }

def save_preferences(prefs: dict):
    path = get_preferences_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(prefs, f, indent=2)
