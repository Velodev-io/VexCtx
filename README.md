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
6. **Retrieve on demand** — Search and review your complete timeline history directly within the local dashboard app.

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


## Quick start

### Install via Homebrew (Recommended)

To install VexCTX using the Homebrew package manager, run:

```bash
brew tap Velodev-io/tap
brew install vexctx
```

Once installed, start the local daemon server:

```bash
vexctx --port 8765
```

---

### Alternative Installation (Manual)

If you do not use Homebrew, you can install from source:

#### Requirements
*   Python 3.12+
*   uv (Python package manager)

#### Setup
```bash
git clone https://github.com/Velodev-io/VexCtx.git
cd VexCtx
uv sync
cp .env.example .env
```

#### Run the API
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

## Data Retention & Pruning

VexCTX includes automatic local data pruning to prevent high disk usage. By default, events older than 30 days are automatically deleted from SQLite, followed by a database compaction.
* Configure this via `VEXCTX_RETENTION_DAYS` in your `.env` (e.g. set to `60` for 60 days, or `0`/`-1` to keep all data permanently).
* Pruning runs locally and asynchronously as a background task on daemon startup.

---

## Example API usage

### 1. Ingest an Event

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

### 2. Export Your Vault

```bash
curl -X POST "http://localhost:8765/vault/export?vault_id=default_vault"
```

---

## Architecture overview

VexCTX is a fully local service. Every component runs on your machine:

```
+-------------------------------------------------------------+
|                           VexCTX                            |
|           Local-First, Encrypted Memory Vault               |
|                                                             |
|  [Capture API] --> [Privacy Filter] --> [Active Segment]    |
|                                               |             |
|  [Timeline View] <-- [SQLite + FTS5]  <-------+             |
|  [JSON Export]  <-- [Encrypted Files (AES-256-GCM)]         |
+-------------------------------------------------------------+
```

*   **SQLite + FTS5**: Stores event metadata and powers fast keyword search — all local.
*   **Encrypted Storage**: Secure AES-256-GCM files saved directly on your local disk.

---


## License

This project is licensed under the Apache 2.0 License — see the LICENSE file for details.
