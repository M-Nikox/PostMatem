# Contributing to PostMatem ♟️

Thank you for your interest in contributing to **PostMatem**! This project is a modern, privacy-first, client-side chess analysis workstation built with React, TypeScript, Vite, and WebAssembly Stockfish.

---

## 🛠️ Development Setup

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher recommended, Node 20 LTS preferred)
* npm / pnpm / yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/M-Nikox/PostMatem.git
cd PostMatem

# Install dependencies (runs scripts/copy-engines.js automatically)
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 📁 Codebase Structure

* `src/components/`
  * `analysis/`: Game review header, coach annotations, move tree navigation, blunder workout banner, shareable summary cards.
  * `board/`: Chessboard view, dynamic evaluation bar, captured pieces tray, appearance & themes modal.
  * `common/`: Classification vector badges, engine switcher, dropzone, about modal.
  * `library/`: Offline game library, opening explorer modal, Lichess / Chess.com importer.
  * `play/`: Match console, touch-move sparring controls, game-over modal.
* `src/core/`
  * `analysis/`: Move classification ($\Delta\text{XP}$ model), tactics & sacrifice detector, CAPS2 accuracy & Elo estimator, win-rate formulas.
  * `engine/`: Tier 1 `LiveEngine` (interactive worker), Tier 2 `WorkerPool` (batch review), UCI parser, engine configurations.
  * `sound/`: Web Audio sound effects manager.
  * `storage/`: IndexedDB game persistence, FEN evaluation cache.
  * `tree/`: Branching `MoveGraph` tree data structure, PGN parser and Informant NAG serializer.
* `src/store/`: Central state machine and actions powered by Zustand & Immer (`useAppStore.ts`).

---

## 🧪 Verification Before Submitting

Always ensure your code passes TypeScript type checks and bundles cleanly:

```bash
npm run build
```

---

## 📝 Pull Request Guidelines

1. **Keep it focused**: Each pull request should address a single feature or fix.
2. **Preserve privacy**: PostMatem is 100% client-side. Do not introduce remote server calls or analytics telemetry.
3. **Follow the obsidian aesthetic**: Maintain the modern dark design system tokens defined in `src/styles/globals.css`.
