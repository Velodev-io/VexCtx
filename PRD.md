# Product Requirements Document (PRD) — VexCTX

**Version:** 1.0.0  
**Author:** Product & Engineering  
**Status:** Draft  
**Target Release:** standalone v1 Beta  

---

## Short Executive Summary

VexCTX is a local-first persistent memory substrate for AI-assisted work. It has two layers: **VexCTX Vault**—a free, local-first encrypted memory vault of AI interactions owned entirely by the user; and **VexCTX Retrieve**—a paid intelligence layer that selectively decrypts, chunks, indexes, and retrieves pieces of that history for search, summaries, and agent consumption. 

The core trust principle is simple: **the user always owns their encrypted vault data**. Paid value comes from the *retrieval and synthesis intelligence* applied to the data, not from locking the user out of their own archive.

---

## 1. Problem Statement
Current AI-assisted interfaces (chat interfaces, code assistants, agents) are highly stateless. They discard rich contextual history after a session ends. While users want to preserve their AI-assisted work history, they are rightfully concerned about privacy, data sovereignty, and background surveillance. Existing solutions either lock user context in proprietary cloud silos or offer naive, unencrypted local logging that risks exposing sensitive developer files and passwords.

---

## 2. Vision
VexCTX aims to become the standard, secure, local-first context storage engine for all AI-assisted work. By dividing the system into an open, free, highly secure Vault and a paid Retrieve intelligence layer, VexCTX establishes deep user trust through mathematical data ownership, while building a sustainable developer-tool business around contextual retrieval.

---

## 3. Product Goals
1. **Local-First & Portable**: All event collections and vaults exist locally. Vaults can be exported and imported with zero cloud lock-in.
2. **Envelope Encryption by Default**: All sensitive logs are encrypted locally using AES-256-GCM.
3. **Decoupled Architecture**: Separate event ingestion (free, fast, local) from retrieval/semantic chunking (paid, intelligence-gated).
4. **Agent-Ready Integration**: Expose standard WebSocket and REST APIs so any IDE extension, terminal assistant, or external agent can consume VexCTX context.
5. **Wedge for Vexon OS**: The standalone micro-product must be architected so it can be seamlessly merged as the native persistent context layer of Vexon OS.

---

## 4. Non-Goals
* **Not Full-Device Surveillance**: VexCTX does not record raw keylogs, full-screen videos, or general background OS actions not directly linked to AI work.
* **Not Cloud-First Storage**: The primary database is local. Cloud syncing of vaults is a future opt-in capability.
* **No Enterprise BYOK in v1**: The API interfaces will design for BYOK, but v1 relies on a local master KEK.
* **No Stripe/Billing in Core Service**: Plan levels are checked internally via config variables and token boundaries.

---

## 5. Target Users
* **AI Power Users**: Users who orchestrate multiple agents and want a unified, persistent memory.
* **Developers**: Software engineers using GitHub Copilot, Cursor, or CLI agents who need semantic recall of commands and prompts.
* **Researchers & Analysts**: Non-engineers using LLMs to compile and verify research nodes.

---

## 6. Core Use Cases & User Stories
* **Use Case 1: Prompt & Command Recovery**  
  *User Story:* As a developer, I want to find the exact prompt and shell command that AI suggested to repair a Redis memory leak last week so I can re-apply it.
* **Use Case 2: Multi-Tool Import/Export**  
  *User Story:* As a privacy-conscious user, I want to export my encrypted memory vault from my work laptop and import it on my personal desktop, knowing that only my local key can decrypt it.
* **Use Case 3: Context Bundling for External Agents**  
  *User Story:* As an agent orchestrator, I want to generate an "agent context bundle" (summary + top-k relevant chunks) about Project Arenex and inject it into a clean GPT-4 session to continue my task.

---

## 7. Product Architecture

VexCTX is split into two bounded zones:

```
+-------------------------------------------------------------+
|                       VexCTX Vault                          |
|  (Free, Local-First, Encrypted Ingestion & Timeline)        |
|                                                             |
|  [Ingestion API] --> [Privacy Filters] --> [Active Segment]  |
|                                                  |          |
|  [Timeline API]  <-- [SQLite Metadata] <----------+          |
|  [Export/Import] <-- [Encrypted Files (AES-256-GCM)]        |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      VexCTX Retrieve                        |
|  (Paid-Gated Search, Chunking & Synthesis Intelligence)      |
|                                                             |
|  [Pricing Guard] --> [Authorized Decryption]                |
|                             |                               |
|                             v                               |
|  [Chunking Engine] -> [Vector Store & FTS5]                 |
|                             |                               |
|                             v                               |
|  [Hybrid Retrieval] -> [Rank Fusion (RRF)]                  |
|                             |                               |
|                             v                               |
|  [Summarizer (Ollama)] -> [/retrieve/summary & bundles]     |
+-------------------------------------------------------------+
```

---

## 8. Functional Requirements & Plan Boundaries

### Free Tier: VexCTX Vault
* **Req-1.1**: Ingest AI-assisted events (prompts, responses, command approvals, edit metadata).
* **Req-1.2**: Filter events against a configurable list of excluded applications (e.g. password managers, banking apps).
* **Req-1.3**: Store raw event records encrypted inside local vault segments.
* **Req-1.4**: Export full vaults into a portable, single-file archive.
* **Req-1.5**: Import vaults from a local archive file back into the active database.
* **Req-1.6**: Query a basic timeline history of events (free, lexical/basic chronological list).

### Paid Tier: VexCTX Retrieve (Pro/Team)
* **Req-2.1**: Process background chunking of encrypted vault segments into semantic search-ready nodes.
* **Req-2.2**: Index chunks in Qdrant (semantic vector store) and SQLite (FTS5).
* **Req-2.3**: Execute hybrid lexical + semantic search with Reciprocal Rank Fusion (RRF).
* **Req-2.4**: Apply metadata filters (project, source app, date ranges) to search queries.
* **Req-2.5**: Generate text summaries over search results using Ollama.
* **Req-2.6**: Export structured, LLM-ready "Agent Context Bundles".

---

## 9. Security and Trust Model

### Trust Principles
1. **Mathematical Sovereignty**: Data is encrypted at rest using AES-256-GCM. Even if a third-party copies the raw vault file, they cannot read it without the Key Encryption Key (KEK).
2. **Data Minimization**: VexCTX records only explicit AI-assisted work events rather than broad, passive device or system clipboard surveillance. Ingested events must be explicitly generated or linked to an active AI integration. Sensitive system applications are blacklisted globally.

### Encryption Architecture
VexCTX uses an **envelope encryption model** to secure memory vaults:

1. **Data Encryption Key (DEK)**: A unique, cryptographically random 256-bit symmetric key is generated for each vault segment. Vault payloads are encrypted/decrypted using AES-256-GCM with this DEK.
2. **Key Encryption Key (KEK)**: The DEK is encrypted using a master KEK.
3. **KEK Provider Interface**: 
   * `local`: The KEK is read from a protected local master key file (`~/.vexctx/master.key`). If it doesn't exist, it is generated.
   * `cloud` (Future): The KEK is managed by a cloud Key Management Service (KMS) and requested via authenticated OIDC.
   * `byok` (Future): Enterprises supply their own hardware security module or KMS endpoint.
4. **Portability**: The encrypted DEK, nonce, auth tag, and manifest are stored together, allowing the user to move the archive file between devices.

---

## 10. Data Model Requirements

### 1. ContextEvent
```python
class ContextEvent(BaseModel):
    event_id: str                   # Unique UUID
    event_type: EventType           # e.g., AI_PROMPT, AI_RESPONSE, FILE_EDITED, COMMAND_EXECUTED
    source_app: str                 # e.g., "vscode", "terminal", "chrome"
    session_id: str                 # Ingestion session ID
    user_id: str                    # Owner identifier
    project_id: Optional[str]        # Target directory/project association
    timestamp: datetime             # Time of action
    content: str                    # Text payload (prompt content, terminal cmd, output code)
    metadata: dict                  # Rich JSON metadata
    ai_assisted: bool = True        # Safety flag
    sensitivity: SensitivityEnum    # Low / High / Excluded
    exclude_from_export: bool = False
```

### 2. Vault Manifest & Segments
* **VaultManifest**: Holds `vault_id`, `version`, `owner_id`, `created_at`, `segment_refs`, and metadata filters (`source_apps`, `project_ids`, `event_count`).
* **VaultSegment**: A collection of encrypted events. Holds the hex-encoded ciphertext, AES-GCM nonce, AES-GCM auth tag, and the encrypted DEK metadata.

### 3. Retrieval Chunk
```python
class RetrievalChunk(BaseModel):
    chunk_id: str
    vault_id: str
    source_event_ids: list[str]     # Back-references to source events
    project_id: Optional[str]
    time_range_start: datetime
    time_range_end: datetime
    chunk_type: str                 # e.g., "event", "session", "task"
    plaintext_hash: str             # For deduplication
    metadata: dict
    fts_text: str                   # Plaintext representation for FTS indexing
```

---

## 11. API Requirements

### Free Endpoints
* `POST /events`: Ingests a new ContextEvent.
* `GET /timeline`: Lists chronological history with optional pagination and limit.
* `POST /vault/export`: Exports the local vault into a portable JSON package.
* `POST /vault/import`: Imports and decrypts a vault package to re-populate the local store.
* `GET /vault/{vault_id}/manifest`: Returns manifest metadata for the given vault.
* `GET /health`: Basic health metrics (db status, cache status, record count).
* `GET /stats`: High-level metrics for events, segments, and vector counts.
* `WS /ws/events`: WebSocket stream of incoming events for timeline updates.

### Paid Endpoints (Blocked by `PricingGuard`)
* `POST /retrieve/search`: Semantic and hybrid search over vault chunks.
* `POST /retrieve/chunks`: Pulls exact chunks for a specific session/project context.
* `POST /retrieve/summary`: Combines hybrid search results into a cohesive, structured LLM summary.
* `POST /retrieve/agent-bundle`: Generates a structured JSON pack optimized for ingestion by coding agents.

#### Pricing Enforcement & Gating Strategy (HTTP 402)
To gate advanced retrieval APIs, the `PricingGuard` checks the configured `VEXCTX_PLAN_TYPE`. When the plan is set to `"free"`, these paid endpoints respond with **HTTP 402 (Payment Required)**.
* **Client SDK Integration**: Using HTTP 402 (rather than generic HTTP 403 or HTTP 401) provides an unambiguous signal. Client applications, IDE plugins, or agents can catch this status code and immediately present upgrade prompt flows or premium activation links to the user.
* **Custom Gateway Mapping**: In setups where standard API proxies or enterprise policies mandate conventional error states, the application can map HTTP 402 responses to HTTP 403 (Forbidden) using simple API gateway rules or service middleware.

---

## 12. Retrieval Architecture & Rank Fusion

To resolve queries accurately without relying on clean database joins, VexCTX implements a hybrid lexical/semantic retrieval pipeline:

1. **Lexical Search (SQLite FTS5)**: Finds precise term matches (e.g. function names, error codes, specific commands).
2. **Semantic Search (Qdrant)**: Resolves conceptual queries (e.g. "how did I connect to redis").
3. **Rank-based Fusion (Reciprocal Rank Fusion - RRF)**: Combines scores from lexical and semantic passes:
   
$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{60 + r_m(d)}$$

Where $M$ contains the search models (FTS5, Vector), and $r_m(d)$ is the rank of document $d$ in model $m$. This rank-based combination is mathematically robust compared to combining raw scores, which operate on incompatible scales.

#### Local-First Vector Storage (Qdrant Implementation Status)
To enable local semantic lookup, VexCTX leverages Qdrant. The vector database runs in three modes to support different environments:

| Mode | Configuration | Use Case / Characteristics |
|---|---|---|
| **In-Memory (`:memory:`)** | Default for tests | Transient execution, perfect for rapid test runs and ephemeral trials. Not suited for persistent workloads. |
| **Local On-Disk Path** | Preferred Local Production | Persists vector points in a local filesystem folder (e.g. `~/.vexctx/qdrant_data`). This is the **preferred local-first persistent mode** for general load. It avoids running any external background containers or processes. |
| **Remote Server** | Scale / Multi-machine | Directs vector traffic to an external Qdrant instance via HTTP/gRPC host endpoints, facilitating enterprise scaling and shared context caches. |

The retrieval layer is abstracted from the underlying vector engine. If system resource constraints or package size requirements dictate, the vector engine can be replaced with lighter embedded libraries (such as `sqlite-vec` or `faiss-cpu`) without modifying the upper-level REST API.

---

## 13. Privacy Controls
* **Application Blacklist**: Events originating from apps matching `VEXCTX_EXCLUDED_APPS` (e.g. `1Password`, `Keychain`, banking domains) are immediately dropped during validation.
* **Sensitivity Tagging**: Ingested content can be tagged. High-sensitivity records are marked `exclude_from_export=True`.

### Why VexCTX Does Not Monitor the General Clipboard
VexCTX follows a strict **data minimization** approach. It records only explicit AI-assisted work events (e.g. prompts sent to AI, responses received, approvals granted, agent-triggered edits, and generated artifacts), rather than broad passive clipboard or keystroke tracking. 

Avoiding background clipboard monitoring:
1. **Prevents Accidental Leakage**: Restricts the ingestion of sensitive personal data, credentials, password clips, or banking details copied during daily OS usage.
2. **Reinforces User Trust**: Establishes VexCTX as an intentional persistent memory tool for AI work, rather than an intrusive background surveillance utility.
3. **Reduces Attack Surface**: Limits the storage footprint to relevant work logs, ensuring the encrypted vault remains highly secure.

---

## 14. Why This Becomes a Vexon OS Wedge Product
VexCTX is the perfect Trojan horse for Vexon OS adoption:
1. **Low Friction**: It runs as a lightweight, local daemon requiring zero cloud setup.
2. **Solves an Immediate Problem**: Developers want search/recall for their local AI assistant history today.
3. **Context Substrate**: When VexCTX is running, it creates a structured history of all developer workflows.
4. **Natural Upgrade**: When Vexon OS launches, it already has access to a rich, encrypted local context database (VexCTX) that can immediately power proactive system-level intelligence without starting from scratch.

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Privacy Concerns / Surveillance FUD** | High | Open-source the Vault core; focus strictly on structured, opt-in AI workflow events, avoiding passive clipboard or keystroke tracking entirely. |
| **Weak Retrieval Quality** | Medium | Implement RRF rank fusion rather than naive keyword search; provide fallback local embeddings. |
| **Key Loss/Locked Data** | High | Document the local master key location clearly. Implement robust recovery and warning indicators. |
