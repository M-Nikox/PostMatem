# PostMatem Chess Engine Binaries

WebAssembly and JavaScript worker binaries for the Stockfish chess engine are served from this directory (`public/engines/`).

## Active Engine Files

* **Stockfish 19 Lite Single-Threaded (Default)**:
  * `stockfish-19-lite-single.js` — Web Worker loader
  * `stockfish-19-lite-single.wasm` (~1.7 MB) — Compiled WebAssembly binary
* **Stockfish 19 Lite Multi-Threaded**:
  * `stockfish-19-lite.js` — Web Worker loader
  * `stockfish-19-lite.wasm` (~1.6 MB) — Compiled WebAssembly binary
* **Stockfish 17 Lite Single-Threaded**:
  * `stockfish-17-lite-single.js`
  * `stockfish-17-lite-single.wasm` (~7.1 MB)
* **Stockfish 16 NNUE**:
  * `stockfish-nnue-16.js`
  * `stockfish-nnue-16.wasm` (~708 KB)
* **Stockfish 11 (Pure JavaScript fallback)**:
  * `stockfish-11.js` (~1.3 MB)

---

## 📜 Licensing & Source Code Notice (GPLv3)

Stockfish is free software licensed under the **GNU General Public License v3.0 (GPLv3)**.

In accordance with Section 6 of the GNU General Public License v3.0, the complete corresponding source code and build instructions for the Stockfish engine and WebAssembly compilation pipeline are freely available at:

* **Stockfish Upstream Engine**: [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)
* **Stockfish.js Emscripten WASM Port**: [https://github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)

See `LICENSE` in the root repository for the full text of the GNU General Public License.


