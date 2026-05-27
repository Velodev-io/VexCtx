import time
import json
import os
import httpx
from sdk.python.vexctx_client import VexCTX

BASE_URL = "http://localhost:8765"
client = VexCTX(base_url=BASE_URL)

def log_section(title):
    print("\n" + "="*50)
    print(f" {title} ")
    print("="*50)

def wait_for_server():
    print("Waiting for local server to respond at port 8765...")
    for _ in range(5):
        try:
            httpx.get(f"{BASE_URL}/health")
            print("Server is online!")
            return True
        except Exception:
            time.sleep(1)
    print("Could not connect to VexCTX server. Please make sure uvicorn is running:")
    print("  uv run uvicorn vexctx.main:app --port 8765 --reload")
    return False

def run_demo():
    if not wait_for_server():
        return

    # 1. Ingest Events
    log_section("1. Ingesting Real-World Activity Logs")
    events = [
        {
            "event_type": "ai_prompt",
            "source_app": "vscode",
            "content": "How do I implement connection pools for a redis client in python?",
            "project_id": "Arenex",
            "session_id": "session_demo_99"
        },
        {
            "event_type": "ai_response",
            "source_app": "vscode",
            "content": "You can use redis.ConnectionPool(host='localhost', port=6379, db=0). Pass this pool to redis.Redis(connection_pool=pool).",
            "project_id": "Arenex",
            "session_id": "session_demo_99"
        },
        {
            "event_type": "terminal_cmd",
            "source_app": "terminal",
            "content": "git commit -am 'add redis connection pool implementation' && git push origin main",
            "project_id": "Arenex",
            "session_id": "session_demo_99"
        }
    ]

    for event in events:
        print(f"Ingesting: [{event['event_type']}] {event['content'][:50]}...")
        res = client.add_event(
            event_type=event["event_type"],
            source_app=event["source_app"],
            content=event["content"],
            session_id=event["session_id"],
            project_id=event["project_id"]
        )
        print("Response:", res)
        time.sleep(0.2)

    # 2. Query Free Timeline
    log_section("2. Querying Basic Chronological Timeline (Free)")
    timeline_resp = client.get_timeline(limit=5)
    timeline = timeline_resp.get("timeline", [])
    print(f"Found {len(timeline)} events in timeline:")
    for ev in timeline:
        print(f" - [{ev.get('timestamp')}] {ev.get('source_app')}: {ev.get('content')}")

    # 3. Test Retrieval Gating (Pro vs Free)
    log_section("3. Testing Pricing Gate (Free Plan)")
    print("Checking search endpoint (Expect HTTP 402 upgrade response)...")
    try:
        # Search will trigger 402 if plan_type is set to 'free' (default)
        client.search(query="redis pool")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 402:
            print("SUCCESS: Gate blocked retrieval request with HTTP 402.")
            print("Response body:")
            print(json.dumps(e.response.json(), indent=2))
        else:
            print(f"Unexpected error code: {e.response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

    # Note: To test PRO capabilities, configure VEXCTX_PLAN_TYPE=pro in your .env and restart uvicorn

    # 4. Vault Export/Import flow
    log_section("4. Testing Vault Export & Portability")
    print("Exporting current vault...")
    export_bundle = client.export_vault()
    print("Vault exported successfully!")
    print(f"Manifest: {export_bundle.get('manifest')}")
    print(f"Export contains {len(export_bundle.get('segments', []))} encrypted segments.")

    # We simulate moving to a clean machine by wiping the database via API
    log_section("5. Simulating Data Import on Clean Machine")
    print("Wiping all local active events...")
    httpx.delete(f"{BASE_URL}/sessions/all")
    
    restored_timeline_resp = client.get_timeline(limit=5)
    restored_timeline = restored_timeline_resp.get("timeline", [])
    print(f"Timeline immediately after wipe (should be empty): {len(restored_timeline)} events.")

    print("Importing our exported vault bundle...")
    import_res = client.import_vault(export_bundle)
    print("Import response:", import_res)

    restored_timeline_after_resp = client.get_timeline(limit=5)
    restored_timeline_after = restored_timeline_after_resp.get("timeline", [])
    print(f"Timeline after restoring vault: {len(restored_timeline_after)} events.")
    for ev in restored_timeline_after:
        print(f" - {ev.get('source_app')}: {ev.get('content')}")

if __name__ == "__main__":
    run_demo()
