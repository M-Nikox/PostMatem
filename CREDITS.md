# Credits & Acknowledgements

PostMatem is built on the shoulders of open-source chess engines, community-developed libraries, and talented digital artists. We gratefully acknowledge the following projects, creators, and references.

---

## 1. Reference Projects & Inspiration

* **[CentiChess](https://github.com/cooper-ross/centichess)**
  * **Role**: Primary architecture reference for client-side WebAssembly Stockfish worker pools and move classification methodology.
  * **Author**: Cooper Ross
  * **License**: [Creative Commons CC0 1.0 Universal (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/)

* **[Chesskit](https://github.com/GuillaumeSD/Chesskit)**
  * **Role**: Reference architecture and inspiration for modular browser-first chess toolkits.
  * **Author**: GuillaumeSD

---

## 2. Artwork & Visual Assets

* **Classic Staunton Vector Pieces (`cburnett`)**
  * **Creator**: **Colin M.L. Burnett** (`cburnett`)
  * **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) / Lichess Piece Library
  * **Usage**: Rendered as standard SVG Staunton pieces (`public/pieces/cburnett/`).
  * **License**: [Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/) and [GNU Free Documentation License (GFDL)](https://www.gnu.org/licenses/fdl-1.3.html).

* **Themed Vector Chess Pieces & Boards**
  * **Creator**: **RhosGFX**
  * **Source**: [https://rhosgfx.itch.io/vector-chess-pieces](https://rhosgfx.itch.io/vector-chess-pieces)
  * **Usage**: Rendered across the board themes (`White`, `Black`, `Flat`, `Wood`, `board-1.svg`, `board-2.svg`, `board-3.svg`).
  * **License**: Free asset license for personal and commercial game development.

* **UI Icons**
  * **Project**: [Lucide Icons](https://lucide.dev)
  * **Authors**: Cole Bemis & the Lucide Open Source Community
  * **License**: [ISC License](https://github.com/lucide-react/lucide/blob/main/LICENSE)

---

## 3. Chess Engines & WebAssembly Integration

* **[Stockfish](https://stockfishchess.org)**
  * **Authors**: Marco Costalba, Joona Kiiski, Tord Romstad, Stéphane Nicolet, and the Stockfish development community.
  * **Role**: Local-first chess engine powering single-threaded NNUE live evaluation, opponent moves, and post-mortem batch reviews.
  * **License**: [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html) (see `LICENSE` for full text).
  * **Source Code Availability**: As required by Section 6 of the GPLv3, the corresponding source code for the Stockfish engine and tournament builds is freely accessible at [github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish).

* **[Stockfish.js / stockfish.wasm](https://github.com/nmrugg/stockfish.js)**
  * **Maintainers**: nmrugg, hi-ogawa, niklasf, and contributors.
  * **Role**: Emscripten / WebAssembly compilation pipeline enabling Stockfish to execute in browser Web Workers.
  * **License**: [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html).
  * **Source Code Availability**: The complete Emscripten build scripts and source code are available at [github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js).

---

## 4. Core Libraries & Dependencies

* **[chess.js](https://github.com/jhlywa/chess.js)**
  * **Author**: Jeff Hlywa (`jhlywa`) and contributors
  * **Role**: Chess rules engine, move legality validation, SAN/UCI translation, and FEN generation.
  * **License**: [BSD 2-Clause License](https://github.com/jhlywa/chess.js/blob/master/LICENSE)

* **[react-chessboard](https://github.com/Clariity/react-chessboard)**
  * **Author**: Clariity (`Clarithink`)
  * **Role**: Interactive SVG chessboard, drag-and-drop piece interactions, and coordinate systems.
  * **License**: [MIT License](https://github.com/Clariity/react-chessboard/blob/main/LICENSE)

* **[Zustand & Immer](https://github.com/pmndrs/zustand)**
  * **Authors**: Poimandres (`pmndrs`) and contributors
  * **Role**: High-performance reactive state management and immutable move tree manipulation.
  * **License**: [MIT License](https://github.com/pmndrs/zustand/blob/main/LICENSE)

* **[idb](https://github.com/jakearchibald/idb)**
  * **Author**: Jake Archibald
  * **Role**: IndexedDB promise wrapper powering PostMatem's offline-first game library and evaluation cache.
  * **License**: [Apache License 2.0](https://github.com/jakearchibald/idb/blob/master/LICENSE)

---

## 5. Mathematical Models & Datasets

* **[Lichess](https://lichess.org)**
  * **Authors**: Thibault Duplessis and the Lichess team
  * **Role**:
    - Centipawn-to-win-percentage sigmoidal curve ($2 / (1 + e^{-0.00368208 \cdot cp}) - 1$).
    - Standard ECO opening book data (`openings.tsv`).
  * **License**: [GNU AGPLv3](https://github.com/lichess-org/lila/blob/master/LICENSE) & CC0 datasets.

---

## 6. Sound Effects & Audio

* **Board Acoustic Effects**:
  * Audio samples for moves, captures, checks, castling, and promotions adapted from public domain / Creative Commons CC0 audio repositories (Lichess audio set & Freesound.org).
