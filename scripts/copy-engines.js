import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const enginesTarget = path.join(rootDir, 'public', 'engines');

const includeFull = process.argv.includes('--full') || process.env.POSTMATEM_FULL_ENGINE === 'true';

if (includeFull) {
  console.log('[postmatem-setup] Power-User mode: Including Full Stockfish 19 NNUE (99MB).');
}

if (!fs.existsSync(enginesTarget)) {
  fs.mkdirSync(enginesTarget, { recursive: true });
}

let copiedCount = 0;

// 1. Copy Stockfish 19 binaries from node_modules if present
const stockfishCandidates = [
  path.join(rootDir, 'node_modules', 'stockfish', 'bin'),
  path.join(rootDir, 'node_modules', 'stockfish', 'src'),
  path.join(rootDir, 'node_modules', 'stockfish'),
];

for (const candidate of stockfishCandidates) {
  if (fs.existsSync(candidate)) {
    try {
      const files = fs.readdirSync(candidate);
      for (const file of files) {
        // Exclude the heavy ~99MB non-lite WASMs unless explicitly requested via --full
        if (!includeFull && (file === 'stockfish-19.wasm' || file === 'stockfish-19-single.wasm')) {
          continue;
        }
        if (
          file.startsWith('stockfish-19') &&
          (file.endsWith('.js') || file.endsWith('.wasm'))
        ) {
          const src = path.join(candidate, file);
          const dest = path.join(enginesTarget, file);
          fs.copyFileSync(src, dest);
          console.log(`[postmatem-setup] Copied Stockfish 19 file: ${file}`);
          copiedCount++;
        }
      }
      if (copiedCount > 0) break;
    } catch (e) {
      console.warn(`[postmatem-setup] Could not read ${candidate}:`, e.message);
    }
  }
}

// 2. Also copy fallback engine binaries from _references if not already present
const centichessRef = path.join(rootDir, '_references', 'centichess', 'src', 'engines', 'stockfish');
if (fs.existsSync(centichessRef)) {
  try {
    const refFiles = fs.readdirSync(centichessRef);
    for (const file of refFiles) {
      const dest = path.join(enginesTarget, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(centichessRef, file), dest);
        console.log(`[postmatem-setup] Copied fallback engine file: ${file}`);
      }
    }
  } catch (e) {
    console.warn('[postmatem-setup] Could not copy fallback engines:', e.message);
  }
}

console.log('[postmatem-setup] Engine check complete.');
