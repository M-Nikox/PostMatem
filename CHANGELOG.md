# Changelog

All notable changes to **PostMatem** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-02

### 🚀 Initial Public Release

PostMatem v1.0.0 is an offline-first, client-side chess workstation combining deep game reviews, tactical move classifications, Stockfish sparring, and an opening study book — running 100% locally in your browser via WebAssembly.

---

### Key Features & Capabilities

#### 🧠 Two-Tier WebAssembly Chess Engine
* **Tier 1 (`LiveEngine`)**: Dedicated interactive Web Worker optimized for sub-10ms UI responsiveness, MultiPV candidate lines, and throttled 60ms UI updates.
* **Tier 2 (`WorkerPool`)**: Concurrent Web Worker pool that batch evaluates full games across multi-threaded CPU cores in seconds.
* **Engine Selectability**: Support for Stockfish 19 Lite, Stockfish 17 Lite, Stockfish 16 NNUE, and Stockfish 11 pure JavaScript fallback.
* **Resilience & Watchdog**: Monotonic search ID synchronization preventing stale move injection and auto-recovery watchdog that respawns crashed workers in under 50ms.

#### 📊 Post-Mortem Game Review & Move Classification
* **Expected Points Lost ($\Delta\text{XP}$) Model**: Calibrated move classification grading moves into *Brilliant (`!!`)*, *Great (`!`)*, *Best (`★`)*, *Excellent*, *Good*, *Inaccuracy (`?!`)*, *Mistake (`?`)*, *Blunder (`??`)*, and *Miss (`✕`)*.
* **Sacrifice Validation**: Brilliant detection rigorously verifies material sacrifice and sound tactical compensation without false positives on opening tension.
* **Performance Elo & Accuracy**: Multi-factor CAPS2 model estimating player performance Elo and accuracy percentages using Average Centipawn Loss (ACPL) and complexity weighting.
* **Advantage & Eval Swing Graph**: Interactive $1000 \times 100$ dynamic canvas plotting win percentage curves with click-to-jump move navigation and animated pin tracking.

#### 🎯 "Retry Your Mistakes" (Blunder Workout)
* **Automated Extraction**: Scans game reviews for inaccuracies, mistakes, misses, and blunders.
* **In-Board Problem Solving**: Rewinds board state to before the error and prompts the user to find the winning continuation.
* **Two-Level Progressive Hints**: Level 1 highlights the correct piece with a luminous pulse; Level 2 projects an emerald destination arrow.
* **Workout Scorecard**: Tracks first-try accuracy and provides immediate retry options.

#### ⚔️ Engine Sparring & Bot Play
* **20 Calibrated Elo Levels**: Play against Stockfish from Level 1 (~800 Elo) up to Level 20 (3200+ GM strength).
* **Two Play Modes**:
  * *Casual Match*: Live evaluation bar, best-move arrows, classification badges, and unlimited takebacks.
  * *Competitive Match*: Strict touch-move discipline with all engine assists, evaluations, and badges suppressed.
* **Game Rules Engine**: Strict legal move validation, promotion selector, threefold repetition detection, 50-move rule, and terminal checkmate handling.

#### 📖 ECO Opening Explorer & Study Book
* **3,000+ Opening Variations**: Comprehensive offline database categorized by opening families (*1. e4, Sicilian, French & Caro-Kann, 1. d4, Indian Defenses, Gambits, Flank / English*).
* **Instant Search**: Filter by opening name, ECO code (*e.g., B90, C50*), or SAN move sequence.
* **1-Click Study**: Loads lines directly onto the board in Analysis mode with live Stockfish evaluation.

#### 🌐 Direct Lichess & Chess.com Importer
* **Profile & Feed Lookup**: Search any username to retrieve recent matches with opponent ratings, time controls, and outcomes.
* **1-Click Actions**: Directly launch PostMatem Game Review, load onto the analysis board, save to local library, or copy PGN.

#### 🎨 Shareable Social Game Summary Card
* **1200×630px High-Res Card**: Generates Retina-ready summary cards featuring player badges, game outcome, accuracy %, estimated Elo, final position board thumbnail, and advantage sparkline.
* **1-Click Export**: Native Clipboard API copy for instant pasting into Discord, Twitter, or Reddit, plus high-res PNG download.

#### 💾 Local-First Persistence & PGN Compatibility
* **IndexedDB Storage**: Local game archive and persistent evaluation cache avoiding redundant engine recalculations.
* **Universal PGN Export**: Exports PGNs annotated with standard Informant NAGs (`$1`, `$3`, `$4`), centipawn/mate evaluations, and review metadata headers.
* **Global Drag-and-Drop & Auto-Paste**: Drag `.pgn` or `.fen` files directly onto the window, or press `Ctrl+V` / `Cmd+V` anywhere to auto-import.

#### 🎹 Aesthetics & Acoustic Feedback
* **Obsidian Design System**: Tailored dark/light mode with CSS design tokens, glassmorphism overlays, and Lucide vector iconography.
* **Customization**: Multiple vector piece sets, board textures (*Modern Wood, Slate, Glass*), and accent color themes.
* **Acoustics**: Zero-latency Web Audio sound effects for moves, captures, checks, game victory, and errors.
