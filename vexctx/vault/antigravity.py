import os
import json
import re
import glob
import asyncio
import sys
import hashlib
import uuid
import subprocess
from datetime import datetime, timezone
from vexctx.vault.models import ContextEvent, EventType
from vexctx.vault.ingestion import process_event

class AntigravitySync:
    def __init__(self):
        self.processed_steps = {}  # session_id -> set of step_indices
        self.claude_mtimes = {}    # file_path -> last_mtime
        self.copilot_mtimes = {}   # file_path -> last_mtime
        self.antigravity_projects = {} # session_id -> project_name
        self.claude_projects = {}      # session_id -> project_name
        self.zsh_offset = 0
        self.last_app = None
        self.last_title = None
        self.zsh_history_path = os.path.expanduser("~/.zsh_history")
        self.claude_projects_dir = os.path.expanduser("~/.claude/projects")
        self.vscode_workspace_dir = os.path.expanduser("~/Library/Application Support/Code/User/workspaceStorage")
        
        # Initialize zsh history offset to current size to avoid parsing old history on startup
        if os.path.exists(self.zsh_history_path):
            try:
                self.zsh_offset = os.path.getsize(self.zsh_history_path)
            except Exception:
                self.zsh_offset = 0

    def generate_stable_uuid(self, namespace_key: str, unique_id: str) -> str:
        """Generate a stable UUID to prevent duplicate event ingestion"""
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{namespace_key}:{unique_id}"))

    def get_brain_dir(self) -> str:
        home = os.path.expanduser("~")
        return os.path.join(home, ".gemini", "antigravity-ide", "brain")

    def is_messenger_blocked(self, app_name: str, window_title: str) -> bool:
        """Block messaging and communication apps to enforce privacy"""
        blocked_keywords = {
            "whatsapp", "telegram", "slack", "discord", "signal", "messages", "imessage",
            "skype", "zoom", "microsoft teams", "teams", "viber", "line", "wechat", "facetime"
        }
        app_lower = app_name.lower()
        title_lower = window_title.lower()
        for kw in blocked_keywords:
            if kw in app_lower or kw in title_lower:
                return True
        return False

    async def sync_antigravity(self):
        """Original Antigravity IDE chat sync"""
        brain_dir = self.get_brain_dir()
        if not os.path.exists(brain_dir):
            return

        pattern = os.path.join(brain_dir, "*", ".system_generated", "logs", "transcript.jsonl")
        transcripts = glob.glob(pattern)

        for path in transcripts:
            parts = path.split(os.sep)
            try:
                session_id = parts[-4]
            except IndexError:
                continue
            
            if session_id not in self.processed_steps:
                self.processed_steps[session_id] = set()

            try:
                with open(path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for line in lines:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    step_index = data.get("step_index")
                    if step_index is None or step_index in self.processed_steps[session_id]:
                        continue

                    source = data.get("source")
                    event_type_str = data.get("type")
                    content = data.get("content", "")

                    if source == "USER_EXPLICIT" and event_type_str == "USER_INPUT":
                        # Resolve project_id from raw user input mapping (e.g. /path/to/Vexon-OS -> Velodev-io/Vexon-OS)
                        if session_id not in self.antigravity_projects:
                            self.antigravity_projects[session_id] = "global"
                            m = re.search(r"(?:^|[\s\"'\[>])([a-zA-Z]:[/\\][^\s\"']+|/[^\s\"']+)\s+->\s+", data.get("content", ""))
                            if m:
                                self.antigravity_projects[session_id] = os.path.basename(m.group(1).strip())
                        
                        project_id = self.antigravity_projects[session_id]
                        content = content.strip()
                        if not content:
                            continue

                        timestamp = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                        event_id = self.generate_stable_uuid("antigravity", f"{session_id}:{step_index}:prompt")
                        event = ContextEvent(
                            event_id=event_id,
                            event_type=EventType.AI_PROMPT,
                            source_app="antigravity",
                            session_id=session_id,
                            project_id=project_id,
                            timestamp=timestamp,
                            content=content,
                            origin="antigravity_sync",
                            metadata={"step_index": step_index}
                        )
                        await process_event(event)
                        self.processed_steps[session_id].add(step_index)

                    elif source == "MODEL" and event_type_str == "PLANNER_RESPONSE" and content:
                        project_id = self.antigravity_projects.get(session_id, "global")
                        timestamp = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                        event_id = self.generate_stable_uuid("antigravity", f"{session_id}:{step_index}:response")
                        event = ContextEvent(
                            event_id=event_id,
                            event_type=EventType.AI_RESPONSE,
                            source_app="antigravity",
                            session_id=session_id,
                            project_id=project_id,
                            timestamp=timestamp,
                            content=content.strip(),
                            origin="antigravity_sync",
                            metadata={"step_index": step_index}
                        )
                        await process_event(event)
                        self.processed_steps[session_id].add(step_index)

                except Exception:
                    pass

    async def sync_claude_code(self):
        """Sync Claude Code CLI chats"""
        claude_dir = self.claude_projects_dir
        if not os.path.exists(claude_dir):
            return

        # Claude Code logs can be nested under project slugs
        pattern = os.path.join(claude_dir, "**", "*.jsonl")
        transcripts = glob.glob(pattern, recursive=True)

        for path in transcripts:
            try:
                mtime = os.path.getmtime(path)
                # Skip if file has not changed
                if path in self.claude_mtimes and self.claude_mtimes[path] >= mtime:
                    continue
                self.claude_mtimes[path] = mtime
            except Exception:
                continue

            try:
                with open(path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for line in lines:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    event_type = data.get("type")
                    session_id = data.get("sessionId", "unknown_claude_session")

                    # Handle User Prompt
                    if event_type == "user":
                        msg = data.get("message", {})
                        content = msg.get("content")
                        if not content or data.get("isMeta"):
                            continue
                        
                        # Strip local-command-caveat or command blocks if wrapping content
                        if isinstance(content, str):
                            if "<local-command-caveat>" in content or "<local-command-stdout>" in content:
                                continue
                            content = content.strip()
                        else:
                            continue

                        cwd = data.get("cwd", "")
                        if session_id not in self.claude_projects:
                            self.claude_projects[session_id] = os.path.basename(cwd.strip()) if cwd else "global"
                        
                        project_id = self.claude_projects[session_id]
                        timestamp_str = data.get("timestamp")
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00")) if timestamp_str else datetime.now(timezone.utc)
                        msg_uuid = data.get("uuid", str(uuid.uuid4()))
                        
                        event_id = self.generate_stable_uuid("claude_code", f"{session_id}:{msg_uuid}:prompt")
                        event = ContextEvent(
                            event_id=event_id,
                            event_type=EventType.AI_PROMPT,
                            source_app="claude_code",
                            session_id=session_id,
                            project_id=project_id,
                            timestamp=timestamp,
                            content=content,
                            origin="claude_code_sync",
                            metadata={"cwd": cwd, "gitBranch": data.get("gitBranch", "")}
                        )
                        await process_event(event)

                    # Handle Assistant Response
                    elif event_type == "assistant":
                        msg = data.get("message", {})
                        content_blocks = msg.get("content", [])
                        if not content_blocks or not isinstance(content_blocks, list):
                            continue

                        # Extract text from content blocks
                        text_parts = []
                        for block in content_blocks:
                            if isinstance(block, dict) and block.get("type") == "text":
                                text_parts.append(block.get("text", ""))
                        
                        response_text = "\n".join(text_parts).strip()
                        if not response_text:
                            continue

                        project_id = self.claude_projects.get(session_id, "global")
                        timestamp_str = data.get("timestamp")
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00")) if timestamp_str else datetime.now(timezone.utc)
                        msg_uuid = data.get("uuid", str(uuid.uuid4()))

                        event_id = self.generate_stable_uuid("claude_code", f"{session_id}:{msg_uuid}:response")
                        event = ContextEvent(
                            event_id=event_id,
                            event_type=EventType.AI_RESPONSE,
                            source_app="claude_code",
                            session_id=session_id,
                            project_id=project_id,
                            timestamp=timestamp,
                            content=response_text,
                            origin="claude_code_sync",
                            metadata={"parentUuid": data.get("parentUuid", "")}
                        )
                        await process_event(event)

                except Exception:
                    pass

    def _walk_copilot_turns(self, data, turns):
        """Recursively walk Copilot JSON structure to extract request/response turns"""
        if isinstance(data, dict):
            if "requestId" in data:
                req_id = data["requestId"]
                if req_id not in turns:
                    turns[req_id] = {"request": {}, "responses": []}
                
                for k, val in data.items():
                    if val is not None:
                        if k == "response":
                            if isinstance(val, list):
                                turns[req_id]["responses"].extend(val)
                            else:
                                turns[req_id]["responses"].append(val)
                        else:
                            turns[req_id]["request"][k] = val
            
            for k, v in data.items():
                self._walk_copilot_turns(v, turns)
        elif isinstance(data, list):
            for item in data:
                self._walk_copilot_turns(item, turns)

    async def sync_vscode_copilot(self):
        """Sync VS Code Copilot chats"""
        vscode_dir = self.vscode_workspace_dir
        if not os.path.exists(vscode_dir):
            return

        pattern = os.path.join(vscode_dir, "*", "chatSessions", "*.jsonl")
        transcripts = glob.glob(pattern)

        for path in transcripts:
            try:
                mtime = os.path.getmtime(path)
                if path in self.copilot_mtimes and self.copilot_mtimes[path] >= mtime:
                    continue
                self.copilot_mtimes[path] = mtime
            except Exception:
                continue

            # Resolve project ID from workspace.json in the parent directory
            project_id = "global"
            try:
                parent_dir = os.path.dirname(os.path.dirname(path))
                workspace_json_path = os.path.join(parent_dir, "workspace.json")
                if os.path.exists(workspace_json_path):
                    with open(workspace_json_path, "r", encoding="utf-8") as wf:
                        wdata = json.load(wf)
                        folder_uri = wdata.get("folder") or wdata.get("workspace")
                        if folder_uri:
                            project_id = os.path.basename(folder_uri.strip("/").replace("%20", " "))
            except Exception:
                pass

            turns = {}
            try:
                with open(path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for line in lines:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    self._walk_copilot_turns(data, turns)
                except Exception:
                    pass

            for req_id, turn in turns.items():
                req_data = turn["request"]
                msg = req_data.get("message", {})
                
                # Extract prompt text
                prompt = None
                if isinstance(msg, dict):
                    prompt = msg.get("text")
                elif isinstance(msg, str):
                    prompt = msg
                
                if not prompt:
                    continue

                session_id = req_data.get("sessionId", "unknown_copilot_session")
                ts_ms = req_data.get("timestamp")
                timestamp = datetime.fromtimestamp(ts_ms / 1000.0, timezone.utc) if ts_ms else datetime.now(timezone.utc)

                # Extract response text
                resp_parts = []
                for resp in turn["responses"]:
                    if isinstance(resp, dict):
                        val = resp.get("value") or resp.get("text")
                        if val and resp.get("kind") != "thinking":
                            resp_parts.append(val)
                    elif isinstance(resp, str):
                        resp_parts.append(resp)
                
                response_text = "\n".join(resp_parts).strip()

                # Process Prompt Event
                prompt_event_id = self.generate_stable_uuid("vscode_copilot", f"{session_id}:{req_id}:prompt")
                prompt_event = ContextEvent(
                    event_id=prompt_event_id,
                    event_type=EventType.AI_PROMPT,
                    source_app="vscode_copilot",
                    session_id=session_id,
                    project_id=project_id,
                    timestamp=timestamp,
                    content=prompt,
                    origin="copilot_sync"
                )
                await process_event(prompt_event)

                # Process Response Event (if response exists)
                if response_text:
                    response_event_id = self.generate_stable_uuid("vscode_copilot", f"{session_id}:{req_id}:response")
                    response_event = ContextEvent(
                        event_id=response_event_id,
                        event_type=EventType.AI_RESPONSE,
                        source_app="vscode_copilot",
                        session_id=session_id,
                        project_id=project_id,
                        timestamp=timestamp,
                        content=response_text,
                        origin="copilot_sync"
                    )
                    await process_event(response_event)

    async def sync_zsh_history(self):
        """Sync Zsh history commands"""
        zsh_path = self.zsh_history_path
        if not os.path.exists(zsh_path):
            return

        try:
            current_size = os.path.getsize(zsh_path)
            if current_size < self.zsh_offset:
                self.zsh_offset = 0
            if current_size == self.zsh_offset:
                return

            with open(zsh_path, "r", encoding="utf-8", errors="ignore") as f:
                f.seek(self.zsh_offset)
                new_data = f.read()
                self.zsh_offset = f.tell()

            lines = new_data.split("\n")
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                cmd = line
                timestamp = None

                # Format check: : <timestamp>:<duration>;<cmd>
                if line.startswith(":"):
                    match = re.match(r"^:\s*(\d+):\d+;(.*)$", line)
                    if match:
                        ts_val = int(match.group(1))
                        timestamp = datetime.fromtimestamp(ts_val, timezone.utc)
                        cmd = match.group(2).strip()

                if not cmd:
                    continue

                if not timestamp:
                    timestamp = datetime.now(timezone.utc)

                event_id = self.generate_stable_uuid("zsh_history", f"{int(timestamp.timestamp())}:{cmd}")
                event = ContextEvent(
                    event_id=event_id,
                    event_type=EventType.TERMINAL_CMD,
                    source_app="terminal",
                    session_id="zsh_session",
                    timestamp=timestamp,
                    content=cmd,
                    origin="zsh_sync"
                )
                await process_event(event)

        except Exception:
            pass

    async def sync_active_window(self):
        """Mac frontmost Active Window focus transition tracker"""
        if sys.platform != "darwin":
            return

        # AppleScript to fetch frontmost process name and its window title
        script = '''
        tell application "System Events"
            try
                set frontmostProcess to first process whose frontmost is true
                set processName to name of frontmostProcess
                tell frontmostProcess
                    try
                        set windowName to name of window 1
                    on error
                        set windowName to ""
                    end try
                end tell
                return processName & "|||" & windowName
            on error
                return ""
            end try
        end tell
        '''
        try:
            res = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and res.stdout.strip():
                parts = res.stdout.strip().split("|||")
                app_name = parts[0].strip()
                window_title = parts[1].strip() if len(parts) > 1 else ""

                if not app_name:
                    return

                # Exclude if in Messenger Blocklist
                if self.is_messenger_blocked(app_name, window_title):
                    return

                # Only log focus transition changes to avoid spamming the DB
                if app_name != self.last_app or window_title != self.last_title:
                    self.last_app = app_name
                    self.last_title = window_title

                    timestamp = datetime.now(timezone.utc)
                    content = f"Switched to application: {app_name}"
                    if window_title:
                        content += f" — Title: {window_title}"

                    # Group window focus switches into 10-second slots for the stable UUID to prevent any race condition double-writes
                    time_slot = int(timestamp.timestamp()) // 10
                    event_id = self.generate_stable_uuid("active_window", f"{time_slot}:{app_name}:{window_title}")

                    event = ContextEvent(
                        event_id=event_id,
                        event_type=EventType.RESEARCH_ACTION,
                        source_app=app_name,
                        session_id="os_activity_session",
                        timestamp=timestamp,
                        content=content,
                        origin="active_window_tracker",
                        metadata={"app_name": app_name, "window_title": window_title}
                    )
                    await process_event(event)

        except Exception:
            pass

    async def sync_once(self):
        """Coordinate synchronization for all active logs if permission is granted"""
        # Load user permission check
        try:
            from vexctx.shared.preferences import load_preferences
            prefs = load_preferences()
            if not prefs.get("os_logging_enabled", False):
                return
        except Exception:
            # Safe default fallback is disabled
            return

        # 1. Antigravity IDE transcript logs
        await self.sync_antigravity()
        
        # 2. Claude Code CLI transcript logs
        await self.sync_claude_code()
        
        # 3. VS Code Copilot workspace chatSession logs
        await self.sync_vscode_copilot()

    async def start_loop(self):
        print("Antigravity chat sync loop starting...")
        # Give daemon server some seconds to fully start up first
        await asyncio.sleep(5)
        
        # Clean up any existing terminal command or active window logs to respect user preference
        try:
            from vexctx.vault.episodic import episodic_store
            db = await episodic_store._get_db()
            await db.execute("DELETE FROM episodes WHERE event_type IN ('terminal_cmd', 'research_action')")
            await db.commit()
            print("Successfully cleaned up non-AI logs (terminal_cmd, research_action) from SQLite store.")
        except Exception as e:
            print(f"Error cleaning up legacy logs: {e}")

        while True:
            try:
                await self.sync_once()
            except Exception as e:
                print(f"Error in global sync cycle: {e}")
            await asyncio.sleep(8)

antigravity_sync = AntigravitySync()
