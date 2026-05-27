import subprocess
import time
import httpx
import sys
import json
from sdk.python.vexctx_client import VexCTX

def main():
    print("=== VexCTX Pro Plan End-to-End Test ===")
    
    # 1. Start uvicorn server on port 8769 in the background with VEXCTX_PLAN_TYPE=pro
    env = {
        **subprocess.os.environ,
        "VEXCTX_PORT": "8769",
        "VEXCTX_PLAN_TYPE": "pro",
        "VEXCTX_QDRANT_URL": ":memory:",
        "VEXCTX_DB_PATH": "scratch/test_pro_metadata.db",
        "VEXCTX_VAULT_PATH": "scratch/test_pro_vaults",
        "VEXCTX_LOCAL_MASTER_KEY_PATH": "scratch/test_pro_master.key",
    }
    
    print("Starting uvicorn server on port 8769...")
    proc = subprocess.Popen(
        ["uv", "run", "uvicorn", "vexctx.main:app", "--port", "8769"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for the server to spin up
    client = VexCTX("http://localhost:8769")
    retries = 10
    success = False
    for i in range(retries):
        try:
            resp = httpx.get("http://localhost:8769/health", timeout=1.0)
            if resp.status_code == 200:
                success = True
                print("Server is up and running!")
                break
        except Exception:
            pass
        time.sleep(0.5)
        
    if not success:
        print("Failed to start server. Stdout/Stderr:")
        stdout, stderr = proc.communicate(timeout=1.0)
        print("STDOUT:", stdout)
        print("STDERR:", stderr)
        sys.exit(1)
        
    try:
        # 2. Ingest AI-assisted events
        print("\n[1] Ingesting events...")
        client.add_event(
            event_type="ai_prompt",
            source_app="vscode",
            content="How do I write a secure FastAPI endpoint that returns a custom JSON header?",
            session_id="session_fastapi_123",
            project_id="VexDemo",
            ai_assisted=True
        )
        client.add_event(
            event_type="ai_response",
            source_app="vscode",
            content="To return custom headers, use the Response parameter or return a JSONResponse: Response(content=data, headers={'X-Custom': 'Value'})",
            session_id="session_fastapi_123",
            project_id="VexDemo",
            ai_assisted=True
        )
        print("Ingestion complete.")
        
        # 3. Perform semantic search
        print("\n[2] Performing semantic search (query='custom JSON header')...")
        search_res = client.search(
            query="custom JSON header",
            project_id="VexDemo",
            chunk_type="session"
        )
        print("Search results:")
        print(json.dumps(search_res, indent=2))
        
        # 4. Get synthesis summary
        print("\n[3] Generating LLM context summary...")
        summary_res = client.get_summary(
            query="custom headers in fastapi",
            project_id="VexDemo",
            chunk_type="session"
        )
        print("Summary result:")
        print(json.dumps(summary_res, indent=2))
        
        # 5. Create agent bundle
        print("\n[4] Creating agent bundle...")
        bundle_res = client.create_agent_bundle(
            project_id="VexDemo",
            query="FastAPI custom headers",
            chunk_type="session"
        )
        print("Agent bundle metadata:")
        print(f" -> Bundle ID: {bundle_res.get('bundle_id')}")
        print(f" -> Token count estimate: {bundle_res.get('token_count_estimate')}")
        print(f" -> Summary: {bundle_res.get('summary')}")
        
    finally:
        # Shut down server
        print("\nShutting down the server...")
        proc.terminate()
        try:
            proc.wait(timeout=5.0)
            print("Server stopped cleanly.")
        except subprocess.TimeoutExpired:
            proc.kill()
            print("Server killed.")
            
if __name__ == "__main__":
    main()
