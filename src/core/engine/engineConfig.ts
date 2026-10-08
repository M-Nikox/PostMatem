import { EngineConfig, EngineName } from './types';
import { getAssetPath } from '../../utils/paths';

export const ENGINE_CONFIGS: Record<EngineName, EngineConfig> = {
  [EngineName.Stockfish19Lite]: {
    name: EngineName.Stockfish19Lite,
    displayName: 'Stockfish 19 Lite (WASM)',
    path: getAssetPath('engines/stockfish-19-lite.js'),
    multiPv: 3,
    defaultDepth: 18,
    hashSizeMb: 32,
  },
  [EngineName.Stockfish19]: {
    name: EngineName.Stockfish19,
    displayName: 'Stockfish 19 (Full NNUE)',
    path: getAssetPath('engines/stockfish-19.js'),
    multiPv: 3,
    defaultDepth: 22,
    hashSizeMb: 128,
  },
  [EngineName.Stockfish19LiteSingle]: {
    name: EngineName.Stockfish19LiteSingle,
    displayName: 'Stockfish 19 (WASM)',
    path: getAssetPath('engines/stockfish-19-lite-single.js'),
    multiPv: 3,
    defaultDepth: 18,
    hashSizeMb: 32,
  },
  [EngineName.Stockfish17Lite]: {
    name: EngineName.Stockfish17Lite,
    displayName: 'Stockfish 17 Lite (WASM)',
    path: getAssetPath('engines/stockfish-17-lite.js'),
    multiPv: 3,
    defaultDepth: 18,
    hashSizeMb: 32,
  },
  [EngineName.Stockfish17LiteSingle]: {
    name: EngineName.Stockfish17LiteSingle,
    displayName: 'Stockfish 17 (WASM)',
    path: getAssetPath('engines/stockfish-17-lite-single.js'),
    multiPv: 3,
    defaultDepth: 18,
    hashSizeMb: 32,
  },
  [EngineName.Stockfish16NNUE]: {
    name: EngineName.Stockfish16NNUE,
    displayName: 'Stockfish 16 NNUE (WASM)',
    path: getAssetPath('engines/stockfish-nnue-16.js'),
    multiPv: 3,
    defaultDepth: 18,
    hashSizeMb: 32,
  },
  [EngineName.Stockfish16Lite]: {
    name: EngineName.Stockfish16Lite,
    displayName: 'Stockfish 16 Lite (Fallback JS)',
    path: getAssetPath('engines/fallback-stockfish.js'),
    multiPv: 3,
    defaultDepth: 16,
    hashSizeMb: 16,
  },
  [EngineName.Stockfish11]: {
    name: EngineName.Stockfish11,
    displayName: 'Stockfish 11 (Pure JS)',
    path: getAssetPath('engines/stockfish-11.js'),
    multiPv: 3,
    defaultDepth: 14,
    hashSizeMb: 16,
  },
};

export const DEFAULT_ENGINE = EngineName.Stockfish19LiteSingle;

export interface SelectableEngine {
  id: EngineName;
  name: string;
  badge: string;
  description: string;
  isWasm: boolean;
}

export const FULL_ENGINE_ITEM: SelectableEngine = {
  id: EngineName.Stockfish19,
  name: 'Stockfish 19 Pro',
  badge: 'Full NNUE • 99MB',
  description: 'Uncompressed dual-net NNUE with 128MB hash for grandmaster-level calculation.',
  isWasm: true,
};

export const SELECTABLE_ENGINES: SelectableEngine[] = [
  {
    id: EngineName.Stockfish19LiteSingle,
    name: 'Stockfish 19',
    badge: 'WASM • Default',
    description: 'Latest single-threaded NNUE. Fastest live evaluation and deepest lines.',
    isWasm: true,
  },
  {
    id: EngineName.Stockfish17LiteSingle,
    name: 'Stockfish 17',
    badge: 'WASM • Stable',
    description: 'Classic tournament-grade engine with rock-solid positional evaluation.',
    isWasm: true,
  },
  {
    id: EngineName.Stockfish16NNUE,
    name: 'Stockfish 16 NNUE',
    badge: 'WASM',
    description: 'Compact classical neural network architecture.',
    isWasm: true,
  },
  {
    id: EngineName.Stockfish11,
    name: 'Stockfish 11',
    badge: 'Pure JS',
    description: 'Lightweight JavaScript engine running universally without WebAssembly.',
    isWasm: false,
  },
];

let fullEngineDetected: boolean | null = null;

/**
 * Checks if the full 99MB Stockfish 19 WASM is hosted or locally present on disk.
 */
export async function detectFullEngineAvailability(): Promise<boolean> {
  if (fullEngineDetected !== null) return fullEngineDetected;
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch(getAssetPath('engines/stockfish-19.wasm'), { method: 'HEAD' });
    fullEngineDetected = res.ok && res.status === 200;
  } catch {
    fullEngineDetected = false;
  }
  return fullEngineDetected;
}

export function isFullEngineDetected(): boolean {
  return fullEngineDetected === true;
}

/**
 * Calculates optimal worker count for background game reviews
 * without starving the main thread or consuming excessive device memory.
 */
export function getRecommendedWorkerCount(): number {
  if (typeof navigator === 'undefined') return 2;

  const cores = navigator.hardwareConcurrency || 4;
  // Reserve 1-2 cores for UI and interactive worker
  const maxFromThreads = Math.max(1, Math.min(8, Math.floor(cores * 0.75)));

  // Check device memory if supported by browser
  let maxFromMemory = 4;
  if ('deviceMemory' in navigator && typeof (navigator as unknown as { deviceMemory: number }).deviceMemory === 'number') {
    const memoryGb = (navigator as unknown as { deviceMemory: number }).deviceMemory;
    maxFromMemory = Math.max(1, Math.floor(memoryGb / 2));
  }

  return Math.min(maxFromThreads, maxFromMemory, 4);
}

/**
 * Checks if WebAssembly is supported in the current environment
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch {
    return false;
  }
  return false;
}
