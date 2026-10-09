# Contributing to PostMatem

Thank you for your interest in contributing to PostMatem! Whether you are fixing a bug, proposing an improvement, polishing documentation, or submitting a feature, your help is welcome.

This guide provides an overview of the project setup, codebase architecture, and pull request workflow to help you get started smoothly.

---

## Ways to Contribute

You do not need to write large features to make a meaningful impact. Helpful ways to get involved include:

- **Reporting bugs**: Finding edge cases, engine worker glitches, or move-tree anomalies.
- **Suggesting features**: Sharing ideas for analysis tools, training workflows, or UX refinements.
- **Improving documentation**: Clarifying guides, updating shortcut tables, or adding inline comments.
- **Submitting code**: Fixing known issues, optimizing performance, or implementing new capabilities.

---

## Reporting Issues & Suggesting Features

If you encounter an issue or have an idea to share, please open an issue on GitHub:

- **Search first**: Take a quick look through [existing issues](https://github.com/M-Nikox/PostMatem/issues) to see if the topic is already being discussed.
- **Bug reports**: Include steps to reproduce the problem, your browser and operating system, and any relevant FEN strings, PGNs, or console error messages.
- **Feature suggestions**: Describe the workflow you would like to see and why it would be useful.

Issue templates are provided to help structure reports and make them easy to address.

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher; Node.js 20 LTS recommended)
- npm, pnpm, or yarn

### Installation

```bash
git clone https://github.com/M-Nikox/PostMatem.git
cd PostMatem
npm install
```

`npm install` runs a postinstall script (`scripts/copy-engines.js`) that automatically places the necessary Stockfish engine binaries into `public/engines/`.

### Running Locally

```bash
npm run dev
```

The development server will be available at `http://localhost:5173`.

---

## Codebase Architecture

Here is a quick tour of the directory structure to help you navigate the codebase:

- `src/components/`
  - `analysis/`: Game review header, coach notes, move tree, blunder workout, and social share cards.
  - `board/`: Chessboard view, dynamic evaluation bar, captured pieces tray, and appearance settings.
  - `common/`: Move classification vector badges, engine selector, file dropzone, and modals.
  - `library/`: Offline game storage, opening explorer modal, and external game importers (Lichess, Chess.com).
  - `play/`: Match console, engine sparring controls, and game-over dialogs.
- `src/core/`
  - `analysis/`: Move classification ($\Delta\text{XP}$ model), tactics and sacrifice detectors, CAPS2 accuracy, and win-rate models.
  - `engine/`: Interactive Web Worker (`LiveEngine`), batch review pool (`WorkerPool`), UCI parser, and engine configs.
  - `sound/`: Web Audio synthesis and game sound effects.
  - `storage/`: IndexedDB persistence for games and evaluation caches.
  - `tree/`: `MoveGraph` tree structure, PGN parser, and Informant NAG serializer.
- `src/store/`: Central state store and actions powered by Zustand and Immer (`useAppStore.ts`).

---

## Development Guidelines

### Privacy & Client-Side Independence

One of PostMatem's core principles is complete client-side execution. All engine calculations, move analyses, and match storage must run locally in the browser:
- Do not introduce server-side requirements, remote analytics, telemetry, or user tracking.
- Network requests should only occur when explicitly triggered by the user (such as importing games from Lichess or Chess.com public APIs).

### Code Style & Quality

- **TypeScript**: The project uses strict type checking. Please avoid using `any` when possible. If you need help typing a complex structure or Web Worker interface, feel free to ask in your PR.
- **Styling**: Use the existing CSS variables and design tokens defined in `src/styles/globals.css` so new views stay visually consistent.
- **State Management**: Shared application state lives in `useAppStore.ts` with Immer-based actions. Local UI state should stay within component hooks (`useState`, `useRef`).

### Validation

Before submitting changes, make sure the project builds cleanly without TypeScript or bundling errors:

```bash
npm run build
```

---

## Submitting a Pull Request

1. **Fork and branch**: Create a descriptive branch from `master` (e.g. `fix/eval-bar-flip` or `feat/opening-filter`).
2. **Keep it focused**: Try to keep pull requests scoped to a single fix or feature. This makes changes easier to review and merge quickly.
3. **Draft PRs are welcome**: If you want early feedback on an architectural decision or approach before finishing, feel free to open a Draft PR.
4. **Build verification**: Ensure `npm run build` passes before marking the PR as ready for review.
5. **Describe your changes**: Fill out the pull request template with a short summary of what changed and reference any related issues.

---

## Questions or Need Help?

If you have questions about how a particular part of the engine or move graph works, or want to discuss an idea before writing code, please open an issue or start a discussion. We are happy to help!

---

## License

All contributions to PostMatem are licensed under the [GNU General Public License v3.0](LICENSE). By contributing, you agree that your contributions will be licensed under the GPLv3.

