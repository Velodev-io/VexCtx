import httpx
import sys
import json
from sdk.python.vexctx_client import VexCTX

def main():
    print("=== VexCTX Real-World API Test ===")
    
    # 1. Initialize client (pointing to the running server on port 8765)
    client = VexCTX("http://localhost:8765")
    
    # 2. Check current health
    try:
        health_resp = httpx.get("http://localhost:8765/health")
        health_data = health_resp.json()
        print(f"\n[Health Check]: Status={health_data.get('status')}, SQLite Episodes={health_data.get('sqlite_episodes_count')}, Qdrant Vectors={health_data.get('qdrant_vectors_count')}")
    except Exception as e:
        print(f"\n[Error]: Could not contact VexCTX server: {e}")
        print("Please ensure uvicorn is running on port 8765.")
        sys.exit(1)
        
    # 3. Ingest AI-assisted events
    print("\n[Step 1]: Ingesting AI-assisted developer events...")
    
    try:
        prompt_evt = client.add_event(
            event_type="ai_prompt",
            source_app="cursor",
            content="Write a high-performance Python function that calculates Fibonacci sequence values using memoization.",
            session_id="fib_session_001",
            project_id="VexMemo",
            ai_assisted=True
        )
        print(f" -> Prompt event added: ID={prompt_evt.get('event_id')}, Encrypted={prompt_evt.get('encrypted', False)}")
        
        response_evt = client.add_event(
            event_type="ai_response",
            source_app="cursor",
            content="Here is a memoized Fibonacci function:\n\n```python\ndef fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n-1, memo) + fib(n-2, memo)\n    return memo[n]\n```",
            session_id="fib_session_001",
            project_id="VexMemo",
            ai_assisted=True
        )
        print(f" -> Response event added: ID={response_evt.get('event_id')}, Encrypted={response_evt.get('encrypted', False)}")
    except Exception as e:
        print(f"Failed to ingest events: {e}")
        
    # 4. View chronological timeline
    print("\n[Step 2]: Querying Vault chronological timeline...")
    try:
        timeline = client.get_timeline(limit=5)
        print(f" -> Total events in timeline: {len(timeline.get('timeline', []))}")
        for evt in timeline.get('timeline', [])[:3]:
            print(f"   * [{evt.get('event_type')}] {evt.get('source_app')}: {evt.get('content')[:80]}...")
    except Exception as e:
        print(f"Failed to query timeline: {e}")
        
    # 5. Export encrypted vault
    print("\n[Step 3]: Exporting Vault segments...")
    try:
        export_data = client.export_vault(vault_id="default_vault")
        segments = export_data.get('segments', [])
        print(f" -> Vault export successful: Segments count = {len(segments)}")
        for segment in segments:
            print(f"   * Segment index {segment.get('segment_index')}: {len(segment.get('encrypted_data_blocks', []))} encrypted logs")
    except Exception as e:
        print(f"Failed to export vault: {e}")
        
    # 6. Test retrieval and search (restricted by the billing gate in 'free' tier)
    print("\n[Step 4]: Testing paid Retrieval (semantic search)...")
    try:
        search_results = client.search(
            query="memoization python function",
            project_id="VexMemo",
            chunk_type="session"
        )
        print(" -> Search succeeded!")
        print(json.dumps(search_results, indent=2))
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 402:
            print(" -> [Pricing Guard Triggered!]: HTTP 402 Payment Required")
            print("    Structured response:")
            print(json.dumps(e.response.json(), indent=2))
        else:
            print(f" -> Search failed with status code {e.response.status_code}: {e.response.text}")
    except Exception as e:
        print(f" -> Search error: {e}")
        
    print("\n=== Real-World API Test Finished ===")

if __name__ == "__main__":
    main()
