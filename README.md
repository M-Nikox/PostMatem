<p align="center">
  <img src="public/icons/chess-knight.svg" width="120" alt="PostMatem Logo">
</p>

<h1 align="center">PostMatem</h1>
<h3 align="center">Client-Side Chess Workstation and Game Review Studio</h3>

<p align="center">
  <a href="https://github.com/M-Nikox/PostMatem/releases"><img src="https://img.shields.io/github/v/release/M-Nikox/PostMatem?label=release&color=4c9a2a" alt="Release"></a>
  <a href="https://github.com/M-Nikox/PostMatem/actions/workflows/ci.yml"><img src="https://github.com/M-Nikox/PostMatem/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue" alt="License"></a>
</p>

---

## Overview

PostMatem is a private, client-side chess workstation providing real-time game reviews, blunder workouts, branching move tree analysis, and engine sparring. The platform runs entirely within the browser via WebAssembly (WASM) and multi-threaded Web Workers, requiring no server-side computation, user accounts, or telemetry.

## Features

- **Client-Side Engine Execution**: Stockfish 19 and 17 Lite NNUE run locally inside sandboxed Web Workers with no external evaluation requests.
- **Game Review and Move Classification**: Move classification based on an Expected Points Lost ($\Delta\text{XP}$) model, detecting Brilliant sacrifices, Great moves, Best moves, Inaccuracies, Mistakes, Blunders, and Misses.
- **Blunder Workout**: Interactive puzzle generator that rewinds the board to critical errors, tests refutations against Stockfish, and provides progressive hint tiers.
- **Advantage and Win-Rate Chart**: Continuous win-percentage curves over the course of the game with interactive move scrubbing.
- **Versus Engine Sparring**: 20 calibrated Elo rating tiers across Casual (hints, evaluation bar, takebacks) and Competitive (strict touch-move rules) modes.
- **ECO Opening Book**: Searchable catalog of over 3,000 opening variations with one-click analysis board loading.
- **External Match Importer**: Direct PGN retrieval from Lichess and Chess.com public user feeds.
- **Export Formats**: Standard annotated PGN export with Informant NAG glyphs, and 1200x630px social summary cards.
- **Local Persistence**: Offline game archiving and evaluation caching powered by IndexedDB.

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Right` / `Space` | Advance to next move |
| `Left` | Return to previous move |
| `Up` / `Home` | Jump to start of game |
| `Down` / `End` | Jump to end of game |
| `Z` / `Ctrl + Z` | Takeback move (Casual mode) |
| `F` | Flip board perspective |
| `E` | Toggle evaluation bar |
| `H` | Toggle best-move suggestion arrow |
| `B` | Toggle move classification badges |

## Architecture & Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **State Management**: Zustand and Immer
- **Chess Logic**: [chess.js](https://github.com/jhlywa/chess.js)
- **Board Component**: [react-chessboard](https://github.com/Clariity/react-chessboard)
- **Engine**: [Stockfish 19 Lite](https://stockfishchess.org) via WebAssembly
- **Storage**: [idb](https://github.com/jakearchibald/idb) (IndexedDB wrapper)
- **Iconography**: [Lucide React](https://lucide.dev)

## Getting Started

### Prerequisites

- Node.js 18 or higher (Node.js 20 LTS recommended)
- npm, pnpm, or yarn

### Installation

```bash
git clone https://github.com/M-Nikox/PostMatem.git
cd PostMatem
npm install
```

### Development Server

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Optional Full NNUE Engine (Local Setup)

PostMatem defaults to the single-threaded Stockfish 19 Lite WASM binary (~1.7 MB). To copy and enable the uncompressed 99 MB full neural network binary locally:

```bash
npm run setup:engines:full
```

## Deployment

PostMatem produces static assets compatible with any static hosting provider. The build output requires standard WebAssembly cross-origin isolation headers (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`).

- **GitHub Pages**: Automated deployment is configured in `.github/workflows/deploy.yml`.
- **Cloudflare Pages**: Set build command to `npm run build` and output directory to `dist`. Preconfigured via `public/_headers`.
- **Vercel**: Configuration and security headers are specified in `vercel.json`.
- **Netlify**: Configuration and security headers are specified in `netlify.toml`.

## Credits and Attributions

PostMatem incorporates work from the open-source chess and software community:

- **[Stockfish](https://stockfishchess.org)**: Chess engine by Marco Costalba, Joona Kiiski, Tord Romstad, Stéphane Nicolet, and the Stockfish development community (GPLv3).
- **[Stockfish.js](https://github.com/nmrugg/stockfish.js)**: WebAssembly engine port by nmrugg and contributors (GPLv3).
- **[CentiChess](https://github.com/cooper-ross/centichess)**: Architecture reference for Web Worker engine pools by Cooper Ross (CC0 1.0).
- **[Chesskit](https://github.com/GuillaumeSD/Chesskit)**: Reference architecture by GuillaumeSD.
- **[Lichess](https://lichess.org)**: Mathematical win-rate model and ECO dataset (AGPLv3 / CC0).
- **[Colin M.L. Burnett](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)**: Staunton vector chess pieces (CC BY-SA 3.0 / GFDL).
- **[RhosGFX](https://rhosgfx.itch.io/vector-chess-pieces)**: Themed piece artwork and board illustrations.

Detailed license information and original links are available in [CREDITS.md](CREDITS.md).

## Author

- **M-Nikox** — [@M-Nikox](https://github.com/M-Nikox)

## License

PostMatem is free software licensed under the [GNU General Public License v3.0 (GPLv3)](LICENSE).
Stockfish engine binaries in `public/engines/` are distributed under the [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html).
