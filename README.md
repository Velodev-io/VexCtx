# VexCTX

**Own your AI work history. Privately. Forever.**

VexCTX is a local-first encrypted memory vault for AI-assisted work. It silently runs in the background, records everything AI helps you do — prompts, responses, edits, commands, and generated artifacts — and stores it in an encrypted vault that never leaves your device.

When you need to recall, search, or inject your AI work history into any tool, VexCTX retrieves it — all on your machine.

---

## Why it exists

Current AI tools are stateless. Every time you start a new session, your context is gone — you re-explain your project, re-describe your stack, re-clarify your decisions. The tools that do attempt memory lock your history in proprietary cloud databases, creating privacy risks and corporate IP exposure.

VexCTX solves this by giving you a **private, encrypted, local memory vault** that you own completely. Your data never leaves your device. Not to us. Not to anyone.

---

## How it works

1. **Install once** — VexCTX runs silently in the background as a lightweight system service.
2. **It captures** — Every AI interaction (prompts, responses, file edits, commands) is captured as it happens.
3. **It encrypts automatically** — Every event is encrypted the moment it's captured. The app manages this transparently. You never touch a key.
4. **It stores locally** — Everything lives in an encrypted vault file on your machine. Nothing is sent anywhere.
5. **You access it through the app** — The VexCTX app is the only way to open and read your vault. Export your full history as JSON at any time.
6. **Retrieve on demand** — Paid users unlock on-device semantic search, summaries, and agent-ready context bundles — processed entirely on your machine.

---

## Trust model

VexCTX is built on one principle: **your data is yours, and only yours.**

*   **Fully Local**: All events are stored in an encrypted vault file on your device. We do not receive, transmit, or store your logs anywhere.
*   **App-Managed Encryption**: Your vault is encrypted using AES-256-GCM. The app handles this silently — you never manage a key, rotate a credential, or configure anything. It just works.
*   **App-Only Access**: The encrypted vault file cannot be opened by any other application. Only the VexCTX app can read and decrypt it.
*   **You Control Export**: You can export your full history as a JSON file at any time from within the app — on your terms.
*   **Data Minimization**: VexCTX captures only AI-assisted work events. It does not monitor your clipboard, keystrokes, screen, or non-AI activity.
*   **Privacy Blacklist**: Events from sensitive applications (e.g. password managers, banking apps) are automatically excluded before they are ever written to disk.

> **In short:** We never see your data. We never receive your data. Your AI work history is encrypted on your device and readable only through the VexCTX app.

---

## Free vs paid

### Free: VexCTX Vault
*   **AI Activity Capture**: Prompts, responses, file edits, commands, and artifacts — captured as you work.
*   **Transparent Encryption**: AES-256-GCM encryption, fully managed by the app. No setup required.
*   **Local Storage**: Everything stored in an encrypted vault file on your machine.
*   **Full Export**: Download your complete encrypted history as a JSON file at any time.
*   **Timeline View**: Browse a chronological history of your AI work inside the app.

### Pro: VexCTX Retrieve
*   **Semantic Search**: Find any moment in your AI work history using natural language queries — all on-device.
*   **Chunk-Level Retrieval**: Group and filter history by session, task, project, or date range.
*   **LLM Summaries**: Ask "What did I work on last week?" and get a synthesized summary — powered by your local LLM.
*   **Agent-Ready Bundles**: Package selected history into a structured, prompt-injectable context block — ready to paste into Claude, ChatGPT, Cursor, or any AI tool.
*   **Filtered Exports**: Export only the history you need — filtered by project, date, or app — as JSON or Markdown.

> All Pro retrieval features run **entirely on your device**. Your data is never sent to our servers to process these requests.

---

## Quick start

### Requirements
*   Python 3.12+
*   Ollama (for local LLM summarization and embeddings)
*   uv (Python package manager)

### Install

Run the one-step installer from the project directory:

```bash
chmod +x install.sh
./install.sh
```

Or install manually:

```bash
git clone https://github.com/Velodev-io/VexCtx.git
cd VexCtx
uv sync
cp .env.example .env
```

### Start local dependencies

```bash
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

### Run the API

```bash
uv run uvicorn vexctx.main:app --port 8765 --reload
```

---

## Browser Extension Setup

VexCTX includes a lightweight browser extension that automatically captures your conversations on supported AI websites (Claude.ai, ChatGPT, Gemini, and Perplexity) and streams them securely to your local VexCTX daemon.

### Features
* **Zero-Cloud Egress**: Events are sent *only* to `http://localhost:8765/ext/events`. No remote network requests are made.
* **Token-Based Pairing**: The extension pairs with your local daemon using a unique token stored in `~/.vexctx/ext_token.txt` to prevent unauthorized localhost access.
* **Granular Controls**: Toggle capture on/off globally or per-domain using the premium control popup.
* **Offline Buffering**: If the local daemon is stopped, the extension buffers up to 500 events locally and flushes them once the daemon restarts.

### How to Install

#### Google Chrome / Brave / Edge / Arc:
1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` directory from this repository.

#### Mozilla Firefox:
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the `extension/manifest-firefox.json` file in this repository.

---

## License Key & Data Retention Setup

### Stateless JWT License Key Activation
To unlock VexCTX Retrieve (Pro) on-device capabilities, you can generate a signed JWT license key from the Web Portal. 
Activate the key in your local daemon by sending a POST request:

```bash
curl -X POST http://localhost:8765/license/activate \
  -H "Content-Type: application/json" \
  -d '{"license_key": "YOUR_SIGNED_JWT_HERE"}'
```

To deactivate the license key:
```bash
curl -X POST http://localhost:8765/license/deactivate
```

Check the active license status:
```bash
curl http://localhost:8765/license/status
```

### 30-Day Storage Optimization & Pruning
VexCTX includes automatic data pruning to prevent high disk usage. By default, events older than 30 days are automatically deleted from SQLite, and their corresponding vector embeddings are purged from Qdrant, followed by a database compaction.
* Configure this via `VEXCTX_RETENTION_DAYS` in your `.env` (e.g. set to `60` for 60 days, or `0`/`-1` to keep all data permanently).
* Pruning runs asynchronously as a background task on daemon startup.

---

## Example API usage

### 1. Ingest an Event (Free)

```bash
curl -X POST http://localhost:8765/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "ai_prompt",
    "source_app": "vscode",
    "content": "How do I fix a Redis timeout in my FastAPI lifespan?",
    "session_id": "dev_session_1",
    "user_id": "default",
    "project_id": "VexCTX",
    "ai_assisted": true
  }'
```

### 2. Export Your Vault (Free)

```bash
curl -X POST "http://localhost:8765/vault/export?vault_id=default_vault"
```

### 3. Retrieve Context Bundle (Pro — Returns HTTP 402 on Free tier)

```bash
curl -X POST http://localhost:8765/retrieve/agent-bundle \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "VexCTX",
    "query": "Redis timeout configuration",
    "chunk_type": "session"
  }'
```

---

## Architecture overview

VexCTX is a fully local service. Every component runs on your machine:

```
+-------------------------------------------------------------+
|                       VexCTX Vault (Free)                   |
|  Local-First, Encrypted Capture & Timeline                  |
|                                                             |
|  [Capture API] --> [Privacy Filter] --> [Active Segment]    |
|                                               |             |
|  [Timeline View] <-- [SQLite Metadata] <------+             |
|  [JSON Export]  <-- [Encrypted Files (AES-256-GCM)]         |
+-------------------------------------------------------------+
                               |
                               v (Pro tier — on-device only)
+-------------------------------------------------------------+
|                     VexCTX Retrieve (Pro)                   |
|  On-Device Intelligence — Nothing Leaves Your Machine       |
|                                                             |
|  [Plan Guard] --> [Local Vault Decryption]                  |
|                          |                                  |
|                          v                                  |
|  [Chunking Engine] --> [Vector Store & FTS5]                |
|                          |                                  |
|                          v                                  |
|  [Hybrid Retrieval] --> [Rank Fusion (RRF)]                 |
|                          |                                  |
|                          v                                  |
|  [Local LLM (Ollama)] --> [Summaries & Agent Bundles]       |
+-------------------------------------------------------------+
```

*   **SQLite + FTS5**: Stores event metadata and powers keyword search — all local.
*   **Vector Engine (Qdrant)**: Semantic embeddings stored locally under `~/.vexctx/vectors/`. No external service.
*   **Local LLM (Ollama)**: Summarization and context synthesis runs on your machine via Ollama.
*   **Plan Guard**: Checks your local plan license. Blocks Pro endpoints on the Free tier with `402 Payment Required`.

---

## Roadmap

See the full phased roadmap in [ROADMAP.md](./ROADMAP.md). Summary:

### ✅ Phase 1 — Core Context Engine (Complete)
- [x] Encrypted vault segment creation (AES-256-GCM, app-managed)
- [x] Full portable export/import (JSON)
- [x] Hybrid FTS + Vector RRF search (on-device)
- [x] Client SDKs (Python and Node/TypeScript)
- [x] Plan gate checks (HTTP 402 with structured payload)

### ✅ Phase 2 — Browser Extension (Complete)
- [x] Chrome and Firefox Manifest V3 extensions (Claude.ai, ChatGPT, Gemini, Perplexity)
- [x] Local daemon bridge — captured data goes to local vault, nowhere else
- [x] Domain-level enable/disable controls
- [x] Firefox, Chrome, and Arc support
- [x] Chrome Web Store and Firefox Add-ons packages prepared

### ✅ Phase 3 — Lightweight Web Portal (vexctx.io) (Complete)
- [x] Account creation and authentication
- [x] Plan & subscription management (Free / Pro manual toggle)
- [x] License key delivery to the local app (Stateless signed JWTs)
- [x] Documentation and support hub
> Note: The portal manages accounts and licenses only. No user vault data is ever sent to or stored on the portal.

### 🔲 Phase 4 — Native App (.dmg / .exe)
- [ ] Tauri/Electron shell with bundled Python daemon
- [ ] macOS menu bar agent & Windows system tray
- [ ] Onboarding wizard with privacy consent flow
- [ ] In-app vault browser, timeline, and export
- [ ] Auto-updater via GitHub Releases
- [ ] Code signing & notarization (macOS + Windows)

### 🔲 Phase 5 — Package Manager Distribution
- [ ] PyPI package (`pipx install vexctx`)
- [ ] Homebrew formula (`brew install vexctx`)
- [ ] Winget manifest
- [ ] Universal curl installer (`curl -fsSL vexctx.io/install | bash`)

### 🔲 Phase 6 — Enterprise & Team
- [ ] Shared local network vaults (within a team's private infrastructure)
- [ ] Audit trail logging (local only)
- [ ] SSO license verification

### 🔲 Phase 7 — Vexon OS Native Integration
- [ ] OS-level event hooks (no browser extension needed)
- [ ] Proactive agents querying VexCTX local retrieve APIs before executing tasks

---

## License

This project is licensed under the Apache 2.0 License — see the LICENSE file for details.
