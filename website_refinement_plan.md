# Website Refinement Plan — VexCTX Cyber-Deck Landing Page

This document details the visual style, interactive features, architecture, and step-by-step implementation roadmap for the upgraded VexCTX website. The site will be built using the existing **Next.js & TypeScript** codebase located in the [portal](file:///Users/binova/Documents/Projects/Suru/Vexon/vexon-os/Vexon-OS/vexon-os/VexCTX/portal) directory.

---

## 1. Visual Style & Theme: **The Cyber-Deck**

Rather than duplicating the standard SaaS layout (soft blobs, rounded purple cards), the VexCTX website will be modeled after a physical, retro-futuristic hacker console or **Cyber-Deck**. It emphasizes that your data is local, concrete, and physical—locked inside your personal vault.

### Core Brand Tokens
*   **Background:** Off-Black Obsidian (`#06070a`) layered with a low-opacity structural alignment grid (`rgba(255,255,255,0.02)`).
*   **Borders & Lines:** Thin, high-contrast, zero-radius borders (`border-radius: 0px`). Clean dividers using `border: 1px solid rgba(255, 255, 255, 0.08)`.
*   **Typography:**
    *   *Headlines & Labels:* **PP Neue Montreal** / **Monument Extended** (heavy, industrial sans-serif).
    *   *System Readouts & Code:* **JetBrains Mono** / **Space Mono** (monospace).
*   **Color Accents:**
    *   **Industrial Amber / Orange (`#FF5500` / `hsl(16, 100%, 50%)`)**: Primary action triggers, alerts, and warnings.
    *   **Phosphor Green (`#00FF66` / `hsl(144, 100%, 50%)`)**: Success flags, data flow indicators, and terminal prompts.
    *   **Terminal Blue (`#0088FF` / `hsl(208, 100%, 50%)`)**: Structural labels and system tags.

---

## 2. Interactive Feature Architecture (Grid Layout)

The landing page will be structured as a cohesive terminal grid system:

### Section A: System Initialization (Hero)
*   **Left Column:** Heavy display typographic layout introducing the problem of stateless AI workflows and the VexCTX solution.
*   **Right Column:** The **Active Ingestion Flow** animation inside a technical chassis container.
*   **Actions:** Tactile "DOWNLOAD" utility console. Features **Dynamic OS & Architecture Detection** (auto-detects macOS Apple Silicon, Windows, and Linux to serve the exact installer file).

### Section B: Technical Specs & Problem-Solution Matrix
*   A side-by-side skeuomorphic table comparing the traditional, insecure "Cloud AI Flow" against the local, secure "VexCTX Vault".
*   Fitted with analog-style status lights (LED green/red) that change states on hover.

### Section C: Live Memory Simulator
*   An interactive playground showing the **Search Simulator** on the left and the **Grid Indexer** on the right. When the user interacts with the search bar, the grid indexer lights up dynamically, illustrating local indexing in real-time.

### Section D: Live Changelog / Release Tracker
*   A dedicated route (`/changelog`) or section rendering a chronological timeline of recent updates, fixes, and active download package sizes fetched directly from the GitHub API.

---

## 3. Detailed Specification of Features & Animations

We will build these custom, high-fidelity components using vanilla CSS, Tailwind, canvas, or Next.js React patterns.

### Dynamic OS & Architecture Detector
*   **Detection Algorithm:**
    1.  Check `navigator.userAgentData` (modern Chromium API) to query values for `architecture` (`arm` or `x86`).
    2.  Fall back to **WebGL rendering engine check** for Apple Silicon detection on Safari (queries for `Apple M1/M2/M3/M4` GPU model naming via `WEBGL_debug_renderer_info`).
    3.  Check `navigator.platform` or standard `userAgent` regex matches to differentiate between Windows (`win`), macOS (`mac`), and Linux (`linux`).
*   **UX Action:** Automatically surfaces the download link for the detected package (e.g. `VexCTX_1.0.0_aarch64.dmg` for Apple Silicon, `VexCTX_1.0.0_x64-setup.exe` for Windows, `VexCTX_1.0.0_amd64.AppImage` for Linux) with fallback selector dropdowns visible beneath.

### Live Changelog & Release Tracker Page
*   **Implementation:**
    1.  Next.js Server Component page (`src/app/changelog/page.tsx`) that fetches releases from `https://api.github.com/repos/Velodev-io/VexCtx/releases` during compilation or with **Incremental Static Regeneration (ISR)** to bypass rate-limiting.
    2.  Renders releases in a vertical cyberpunk pipeline timeline. Each node displays the tag, date, version details, and a dynamic list of built binaries (displaying live download metrics).

### Animation 1: The Active Ingestion Flow (SVG Particle Flow)
*   **Concept:** Visually shows data stream events from browser icons (Claude, ChatGPT, etc.) into the local VexCTX daemon.
*   **Technical Implementation:**
    *   An SVG canvas with source node icons (Claude, ChatGPT, Gemini) on the left and a central Vault Node on the right.
    *   Using requestAnimationFrame or CSS keyframes, tiny green particles (`#00FF66`) stream along SVG paths, pulsing and changing size before merging into the central vault.

### Animation 2: Interactive Search Simulator (Glitch CRT Terminal)
*   **Concept:** A mock terminal displaying how quick keyword queries locate history.
*   **Technical Implementation:**
    *   A monospace window styled with a CRT scanline background overlay.
    *   Uses a typewriter loop that types search parameters (e.g. `vexctx query "lifespan config"`).
    *   Once typed, the screen does a brief "CRT flicker" and lists out structured search returns.

### Animation 3: Active SQLite / Grid Indexer
*   **Concept:** Illustrates real-time data database state management and compaction.
*   **Technical Implementation:**
    *   A grid of `16x16` pixel-like square elements.
    *   When the search simulator runs or on hover, a Javascript loop periodically updates the active block array.
    *   Blocks light up green/orange, cascade downward, and settle in compacted rows.

### Animation 4: Cursor-Reactive Vector Net (Magnetic Field)
*   **Concept:** A modern grid of interconnected lines that distort as the user's cursor moves across them.
*   **Technical Implementation:**
    *   A full-width HTML5 `<canvas>` element serving as a background overlay.
    *   Draws a grid of dot points interconnected by faint lines (`rgba(255, 255, 255, 0.04)`).
    *   Tracks mouse movements. If the mouse is within a certain radius of a point, the point is pulled toward the mouse coordinates using a spring tension algorithm.

---

## 4. Implementation Steps

### Phase 1: Foundation & Styling Upgrades
*   Modify `globals.css` and setup the **Cyber-Deck** design tokens, fonts, and grid layout framework.
*   Create responsive viewport structures with zero-radius border styling.

### Phase 2: Building OS Detection & Changelog Routing
*   Write `detectOS.ts` utility. Bind to the primary download button component.
*   Add dynamic route `changelog/page.tsx` with GitHub Releases client hooks.

### Phase 3: Animation Integration
1.  Code the HTML5 Canvas for the **Cursor-Reactive Vector Net** to ensure lightweight, hardware-accelerated movement.
2.  Build the **Active Ingestion Flow** using SVG paths and custom CSS particle animations.
3.  Implement the CRT terminal mock and coordinate the typewriter scripting.
4.  Construct the CSS Grid-based database defragmentation loops linked to search actions.

### Phase 4: SEO & Performance Auditing
*   Confirm semantic layout structures (`h1` placement, meta tags).
*   Ensure smooth 60fps renders on mobile and desktop layout variations.
