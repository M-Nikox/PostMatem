# PostMatem — Application Summary & Architecture Overview

Welcome to **PostMatem**! This document provides future engineers, contributors, and readers with a comprehensive overview of what PostMatem is, the design philosophy behind it, its core feature pillars, and its technical architecture.

---

## 1. What is PostMatem?

**PostMatem** is a modern, high-performance, client-side chess analysis studio, game review suite, and engine sparring platform. 

### Core Philosophy:
* **Zero-Subscription, Desktop-Grade Quality**: Delivering the visual polish, coach commentary, and move classification depth of commercial platforms (such as Chess.com and Lichess) directly inside an open-source, local-first web application.
* **100% Client-Side & Privacy-First**: All chess engine calculations, game evaluations, and position caching run locally on your device via **WebAssembly (WASM)** and Web Workers. No games, positions, or telemetry are ever sent to an external server.
* **Obsidian Aesthetic**: Designed with an ultra-clean, modern dark aesthetic, featuring glassmorphism, responsive micro-animations, custom SVG vector badges, and curated board/piece themes.

---

## 2. Core Feature Pillars

### A. Sparring & Play Studio (`mode: 'PLAY'`)
* **Calibrated Bot Levels**: Play against Stockfish from Level 1 (~800 Elo) up to Level 20 (3200+ Elo Grandmaster strength).
* **Two Play Styles**:
  * **Casual Match**: Play with live evaluation, best-move arrows, real-time move classifications, and takebacks (`Z` / `Ctrl+Z`).
  * **Competition Match**: Strictly suppresses all engine aids, arrows, evaluation bars, and classification badges to guarantee complete fair play and tournament-style discipline.
* **Smart Board Interactions**: Instant drag-and-drop piece pickup via a zero-slop custom Touch/Mouse backend, with optional cursor-hiding on drag, click-to-move, and an in-board promotion strip.

### B. Post-Mortem Game Review (`mode: 'ANALYSIS'`)
* **Parallel Multi-Worker Batch Evaluation**: Evaluates full games in seconds using a background Web Worker pool.
* **Chess.com Classification V2 Model**:
  * Every move is graded based on **Expected Points Lost ($\Delta\text{XP}$)**: Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Forced, and Book.
  * **Strict Brilliant (!!) Detection**: Requires an active, sound piece sacrifice (no fake brilliants or opening tension false positives).
  * **Great Move (!) Detection**: Identifies "the only move", critical game-saving resources, and tactical breakthroughs.
  * **Miss (✕) Detection**: Highlights missed wins and missed forced checkmates.
* **Performance Elo Estimator**: A multi-factor CAPS2 model that estimates player rating using Accuracy %, Average Centipawn Loss (ACPL), blunder frequency, game outcome, and game complexity.
* **Dynamic AI Coach Commentary**: Tactical cards explaining *why* a move was a blunder or great move in plain English.

### C. "Retry Your Mistakes" (Interactive Blunder Workout)
* **One-Click Workout**: Automatically scans completed game reviews for Inaccuracies, Mistakes, Misses, and Blunders.
* **Interactive In-Board Solving**: Rewinds the board to the position before the mistake, freezing board state until the user finds the winning continuation.
* **Full Move Simulation**: Playing the correct continuation advances the board, locks the piece on the destination square, displays the green `★ Best` badge, and plays tactile chess audio.
* **2-Level Interactive Hints**:
  * *Level 1*: Highlights the correct piece in a luminous cyan pulse.
  * *Level 2*: Draws an emerald-green arrow pointing to the destination square.
* **Workout Scorecard**: Tracks first-try accuracy and provides immediate reset/retry options.

### D. Advantage & Eval Swing Graph
* **Calibrated Dynamic Canvas**: A $1000 \times 100$ coordinate system centered at $y = 50$ (0.00 equality).
* **Dual Area Shading**: Soft warm ivory gradient fill for White advantages; rich dark graphite fill for Black advantages.
* **Real-Time Position Tracking**: An animated pin marker glides along the curve as you step through the game.
* **Interactive Scrubbing & Click-to-Jump**: Hovering anywhere displays the move number, SAN string, and exact eval score. Clicking jumps the chessboard directly to that position.

### E. Frictionless Import & Power-User Navigation
* **Global Drag-and-Drop**: Drag any `.pgn` or `.fen` file from your desktop directly onto the PostMatem window to load it immediately.
* **Smart Clipboard Paste (`Ctrl+V` / `Cmd+V`)**: Automatically detects whether clipboard text is a FEN string or a PGN game, loading it with toast feedback.
* **Keyboard Hotkeys**:
  * `←` / `→` or `Space`: Step through moves.
  * `↑` / `↓`: Jump to start / end of game.
  * `F`: Flip board orientation.
  * `E`: Toggle evaluation bar.
  * `H`: Toggle hint arrows.
  * `B`: Toggle move badges.
  * `Z` / `Ctrl+Z`: Takeback move.
  * `Esc`: Exit workout or close modals.

---

## 3. Technical Architecture & Tech Stack

```
                         ┌─────────────────────────────────────┐
                         │         PostMatem Frontend          │
                         │    React 19 + TypeScript + Vite     │
                         └──────────────────┬──────────────────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      ▼                     ▼                     ▼
             ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
             │  Zustand Store  │   │  Chessboard UI  │   │ Move Navigation │
             │  (useAppStore)  │   │ (react-chessb.) │   │   (MoveGraph)   │
             └────────┬────────┘   └─────────────────┘   └─────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│  Tier 1 Engine│           │  Tier 2 Engine│
│  (LiveEngine) │           │ (WorkerPool)  │
│ Real-Time Eval│           │ Batch Review  │
└───────┬───────┘           └───────┬───────┘
        │                           │
        ▼                           ▼
┌───────────────────────────────────────────┐
│     WebAssembly (WASM) Web Workers        │
│ Stockfish 19 Lite / 17 Lite / 16 NNUE     │
└───────────────────────────────────────────┘
```

### Technology Breakdown
1. **Core Framework**: React 19, TypeScript, Vite.
2. **State Management**: [Zustand](https://github.com/pmndrs/zustand) with [Immer](https://github.com/immerjs/immer) for immutable tree state and undo/redo history.
3. **Chess Rules & Notation**: [`chess.js`](https://github.com/jhlywa/chess.js) for legal move validation, FEN parsing, and move generation.
4. **Engine Backends**:
   * Stockfish compiled to WebAssembly (WASM).
   * **Tier 1 (`LiveEngine`)**: Single dedicated Web Worker for sub-10ms interactive eval and candidate lines (MultiPV = 3).
   * **Tier 2 (`WorkerPool`)**: Concurrent Web Worker pool for fast parallel post-mortem game analysis.
   * Auto-recovery watchdog that catches worker crashes and automatically respawns a healthy engine in under 50ms.
5. **Local Persistence**: [IDB](https://github.com/jakearchibald/idb) (IndexedDB wrapper) for zero-latency evaluation caching and game library storage.
6. **Styling**: Pure Vanilla CSS design tokens (`src/styles/globals.css`), glassmorphic overlays, and Lucide React icons.

---

## 4. Key Directory & Codebase Map

For quick navigation when modifying or extending PostMatem:

```
PostMatem/
├── docs/                               # Architecture and feature specifications
│   ├── APP_SUMMARY.md                  # This document
│   └── ENGINE_ARCHITECTURE.md          # WebAssembly & Stockfish technical deep-dive
├── public/
│   ├── boards/                         # Custom SVG board textures
│   ├── engines/                        # Stockfish WASM and JS engine binaries
│   ├── icons/                          # Classification SVGs (brilliant, blunder, etc.)
│   └── pieces/                         # Vector chess piece sets (White/Black)
└── src/
    ├── components/
    │   ├── analysis/                   # Game review, coach cards, workout banner, graph
    │   ├── board/                      # Chessboard view, EvalBar, captured pieces, theme modals
    │   ├── common/                     # ClassificationIcon, GlobalDropZone, toasts
    │   ├── library/                    # Offline game library, opening explorer, Lichess / Chess.com importer
    │   └── play/                       # Match console, sparring controls, game-over modal
    ├── core/
    │   ├── analysis/                   # MoveClassifier, TacticsDetector, EloEstimator, WinRateMath
    │   ├── engine/                     # LiveEngine, WorkerPool, engineConfig, stockfishElo
    │   ├── sound/                      # SoundManager (move, capture, check, victory, error)
    │   ├── storage/                    # IndexedDB database and EvalCache
    │   └── tree/                       # MoveGraph tree data structure & PgnParser
    ├── hooks/                          # useKeyboardShortcuts
    └── store/                          # useAppStore.ts (central app state & actions)
```

---

## 5. Getting Started & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Local Dev Server**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```

*Happy coding and may your moves always be Brilliant!* ♟️✨
