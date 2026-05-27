# Product Roadmap — VexCTX

**Version:** 2.1.0  
**Author:** Product & Engineering  

---

## 1. Product Vision

VexCTX is the memory layer for AI-assisted work — private, encrypted, and entirely local.

It runs silently on your machine, captures every AI interaction, encrypts it automatically, and stores it in a vault that only you can open. When you need to recall, search, or feed your history into any AI tool, it does that too — on your device, with no data ever leaving.

**The core promise is non-negotiable:** We never see your data. We never receive it. Your AI work history is yours alone.

---

## 2. Privacy & Encryption Model

### The Principle
VexCTX operates on a **zero-server-data** model:

- All data is captured, encrypted, and stored **on the user's device only**.
- The app manages encryption **transparently** — users never manage keys, rotate credentials, or configure anything related to security.
- **Nothing is transmitted to Velodev's servers.** Not logs. Not metadata. Not analytics about the content of your AI work.
- The encrypted vault file can only be opened by the VexCTX application.

### Encryption Details
- **Algorithm**: AES-256-GCM per vault segment.
- **Key Management**: Fully internal to the app. The app generates, stores, and uses the local key silently. Users do not interact with it.
- **Export**: Users can export their full vault as a JSON file from within the app at any time.
- **No Cloud Backup**: Velodev does not offer or operate a cloud backup for vault contents.

### What Velodev Does Store (Account Layer Only)
The only data Velodev holds is what is strictly necessary to manage accounts and subscriptions:
- Your email address (for account login)
- Your subscription plan status (Free or Pro)
- License key metadata

**No vault content. No event logs. No AI conversation data. Ever.**

---

## 3. Distribution Strategy

VexCTX will be made available across four distribution channels, released in sequence:

| Channel | Audience | Timeline |
|---|---|---|
| **API / CLI (current)** | Developers running locally | ✅ Available now |
| **Browser Extension** | Web AI users (Claude.ai, ChatGPT, Gemini) | Phase 2 |
| **Lightweight Web Portal** | All users — account & subscription only | Phase 3 |
| **Native App (.dmg / .exe)** | All users — one-click desktop install | Phase 4 |
| **PyPI / Homebrew** | Developers who prefer package managers | Phase 5 |

---

## 4. Free vs Pro Model

### Free: VexCTX Vault
Everything captured and stored — for free, forever, locally.

| Feature | Description |
|---|---|
| AI Activity Capture | Prompts, responses, file edits, commands, artifacts |
| Transparent Encryption | AES-256-GCM, fully managed by the app |
| Local Storage | Encrypted vault file on your machine |
| Full JSON Export | Download your complete history at any time |
| Timeline View | Browse history chronologically inside the app |
| Privacy Blacklist | Automatic exclusion of sensitive apps |

### Pro: VexCTX Retrieve
Unlock on-device retrieval intelligence. All processing happens on your machine.

| Feature | Description |
|---|---|
| Semantic Search | Natural language search across your vault — on-device |
| Chunk Retrieval | Filter by session, project, date, app, or task |
| LLM Summaries | "What did I work on last week?" — answered locally via Ollama |
| Agent-Ready Bundles | Formatted context blocks ready to inject into any AI tool |
| Filtered Exports | Export only what you need — by project, date, or app |

> All Pro features run entirely on the user's device. No data is transmitted to process retrieval requests.

---

## 5. Product Phases & Milestones

---

### ✅ Phase 1: Core Context Engine (Complete)
*Goal: A working, encrypted, local-first context vault with on-device retrieval.*

- [x] Event ingestion & privacy blacklist filtering
- [x] AES-256-GCM envelope encryption (app-managed, transparent)
- [x] Full portable JSON export/import
- [x] Hybrid FTS + Vector RRF search (Qdrant + SQLite/FTS5, fully local)
- [x] Local LLM summarization (Ollama)
- [x] Agent-ready context bundles
- [x] Client SDKs (Python and Node/TypeScript)
- [x] Plan gate checks (HTTP 402 — blocks Pro endpoints on Free tier)

**What was removed:** All cloud sync, remote backend, and key management features have been removed from the architecture. VexCTX is now a fully local, zero-server-data product.

---

### ✅ Phase 2: Browser Extension (Complete)
*Goal: Capture AI conversations from web-based tools without requiring any manual setup.*

**What it does:**
- Runs as a Chrome/Firefox/Arc browser extension.
- Detects and captures AI interactions on supported domains: Claude.ai, ChatGPT.com, Gemini.google.com, Perplexity.ai.
- Sends captured events to the **local VexCTX daemon only** — via a local secure HTTP bridge.
- Captured data never passes through Velodev servers. The extension talks directly to the app running on `localhost`.
- Users enable/disable capture per domain with a single click.
- If the local daemon is not running, the extension shows a prompt to start it — it does not fall back to any cloud endpoint.

**Milestones:**
- [x] Chrome and Firefox Manifest V3 extension scaffolds
- [x] Content scripts for Claude.ai, ChatGPT, Gemini, Perplexity
- [x] Secure local bridge (extension ↔ localhost daemon with token pairing)
- [x] Extension settings page (per-domain toggle, privacy blacklist)
- [x] Firefox and Arc compatibility layer
- [x] Chrome Web Store and Firefox Add-ons packages prepared

**Exit Criteria:** Extension captures a Claude.ai conversation and it appears in the local VexCTX timeline within 2 seconds, with no network traffic outside of `localhost`.

---

### ✅ Phase 3: Lightweight Web Portal (vexctx.io) (Complete)
*Goal: Give users a simple hub to manage their account and subscription. No vault data here.*

**What it includes:**
- Account sign-up and login (Email / Google / GitHub OAuth)
- Plan management (Free / Pro manual toggle, Stripe postponed)
- License key delivery to the local app (Signed JWT)
- Documentation, FAQ, and privacy policy
- Support contact

**What it does NOT include:**
- Vault storage of any kind
- Log viewing or retrieval of user AI history
- Any mechanism to receive or process vault content

**Milestones:**
- [x] Auth system & stateless dashboard (Next.js)
- [x] Billing / Plan management (Stateless Free/Pro toggle)
- [x] License key generation and local offline verification (Signed JWTs)
- [x] Public documentation & onboarding guides
- [x] Privacy policy & trust transparency page
- [x] Launch at `vexctx.io`

**Exit Criteria:** A user can sign up, toggle to Pro, and have their local VexCTX app automatically recognize the Pro plan locally via signed JWT verification.

---

### ✅ Phase 4: Native App (.dmg / .exe) (Complete)
*Goal: Install VexCTX like any consumer app. No terminal. No Python. No setup.*

**What it includes:**
- Standalone `.dmg` installer for macOS
- Standalone `.exe` installer for Windows
- macOS menu bar agent / Windows system tray icon
- Onboarding wizard: privacy consent, app selection, enable/disable controls
- In-app vault browser: timeline, search (Pro), export
- Bundled Python daemon (PyInstaller) — no local Python required

**Milestones:**
- [x] Tauri shell scaffold (Rust + WebView)
- [x] Bundled Python daemon (PyInstaller single-binary sidecar)
- [x] macOS LaunchAgent integration (auto-start on login)
- [x] Windows startup task integration
- [x] Menu bar / tray UI: status, open vault, quit application
- [x] In-app vault browser and timeline flow
- [x] Onboarding wizard with privacy consent screen
- [ ] Auto-updater via GitHub Releases (Deferred to Phase 5)
- [ ] macOS code signing & notarization (Deferred to Phase 5)
- [ ] Windows code signing (Deferred to Phase 5)

**Exit Criteria:** A user downloads the `.dmg`, installs it, completes onboarding, and the daemon begins capturing automatically — with no terminal interaction at any point.

---

### 🔲 Phase 5: Package Manager Distribution
*Goal: Single-command install for developers.*

- [ ] PyPI package (`pipx install vexctx` → exposes `vexctx start`, `vexctx status`, `vexctx export`)
- [ ] Homebrew tap formula (`brew install vexctx`)
- [ ] Winget manifest (`winget install Velodev.VexCTX`)
- [ ] Universal curl installer (`curl -fsSL vexctx.io/install | bash`)

**Exit Criteria:** `pipx install vexctx && vexctx start` boots the daemon on a clean machine with no other prior setup.

---

### 🔲 Phase 6: Enterprise & Team
*Goal: Private team deployments with shared local network vaults.*

- [ ] Shared vaults on local network infrastructure (company-controlled servers, not Velodev cloud)
- [ ] Team access controls (who can read/write to shared vault)
- [ ] Audit trail logging (stored on team's own infrastructure)
- [ ] Enterprise license verification (SSO / SAML for license auth)
- [ ] Self-hosted deployment guide

---

### 🔲 Phase 7: Vexon OS Native Integration
*Goal: VexCTX becomes the default context daemon for Vexon OS.*

- [ ] OS-level event hooks (no browser extension or API call needed — Vexon OS emits events natively)
- [ ] Vexon OS secure credential manager integration
- [ ] Proactive system agents querying VexCTX local retrieve APIs before executing tasks
- [ ] Unified context graph across all Vexon OS applications

---

## 6. Beta Plan

### Target Cohorts
1. **Cohort A (Developers)**: Engineers using VS Code, terminal tools, and AI coding assistants who want persistent on-device AI context recall.
2. **Cohort B (AI Power Users)**: Heavy Claude.ai/ChatGPT users who want a searchable local history of their AI conversations without any cloud exposure.
3. **Cohort C (Privacy-First Professionals)**: Lawyers, researchers, doctors, or anyone who cannot afford their AI work history leaving their device.

### Exit Gates for Public Launch
* **Privacy Gate**: Independent verification that zero vault content is transmitted over the network during normal operation.
* **Stability Gate**: Zero crash or memory leak failures over 7 consecutive days.
* **Encryption Gate**: 100% of testers complete an export/re-import cycle with verified data integrity.
* **Trust Gate**: ≥ 95% of surveyed users can correctly describe what VexCTX does and does not transmit.

---

## 7. Key Success Metrics

| Metric | Target |
|---|---|
| Active local installations | Growth curve |
| Export rate (% of users who export their vault) | > 30% |
| Browser extension active installs | 1,000+ at Phase 2 launch |
| Free → Pro conversion rate | > 8% |
| Trust comprehension rate | > 95% |
| Network traffic to Velodev during capture | Zero (vault content) |

---

## 8. Recommended Next 90 Days

| Week | Focus |
|---|---|
| Weeks 1–2 | Remove cloud sync code from codebase, finalize local-only architecture |
| Weeks 3–4 | Browser extension scaffold (Chrome MV3, content scripts, localhost bridge) |
| Week 5 | Extension settings UI, per-domain controls, daemon-not-running prompt |
| Week 6 | Chrome Web Store submission |
| Weeks 7–9 | Web portal: auth, plan management, Stripe billing, license key delivery |
| Weeks 10–11 | Portal launch at `vexctx.io`, privacy policy, documentation |
| Week 12 | Native app planning & Tauri/Electron scaffold kickoff |
