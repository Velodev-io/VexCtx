# Contributing to VexCTX

Thank you for your interest in contributing to VexCTX! We welcome contributions from the community to help make this local-first AI memory vault better for everyone.

---

## How to Contribute

### 1. Reporting Bugs
* Check the existing issues to see if the bug has already been reported.
* If not, open a new issue. Use a clear, descriptive title and provide details about your environment (OS, Python version, browser, etc.) and steps to reproduce.

### 2. Suggesting Enhancements
* We are always open to ideas! Please open an issue describing the feature or improvement you'd like to see, along with the use case and how it benefits users.

### 3. Submitting Pull Requests (PRs)
* Fork the repository and create your branch from `master` or `website-refinement`.
* Ensure your code follows the existing style guidelines.
* Run tests locally before submitting.
* Write a clear and concise PR description explaining your changes.

---

## Development Setup

### Prerequisite Tools
* **Python 3.12+**
* **Rust stable** (required for compiling the Tauri desktop app)
* **Node.js 20+** (required for the Tauri webview frontend)
* **uv** (recommended Python package manager)

### Local Daemon Setup
1. Clone your fork and enter the directory:
   ```bash
   git clone https://github.com/Velodev-io/VexCtx.git
   cd VexCtx
   ```
2. Sync python dependencies:
   ```bash
   uv sync
   ```
3. Copy environment template and configure:
   ```bash
   cp .env.example .env
   ```
4. Run the daemon locally:
   ```bash
   uv run uvicorn vexctx.main:app --port 8765 --reload
   ```

### Desktop App (Tauri) Setup
1. Navigate to the desktop folder and install dependencies:
   ```bash
   cd desktop
   npm install
   ```
2. Run in development mode:
   ```bash
   npm run dev
   # Or run Tauri dev environment directly:
   npm run tauri dev
   ```

---

## Code of Conduct

We enforce our [Code of Conduct](./CODE_OF_CONDUCT.md) in all community interactions. Please review it before contributing.

---

## Questions?

If you have any questions or need help, feel free to open a discussion or reach out to the maintainers.
