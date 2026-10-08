export type ScoreType = 'cp' | 'mate';

export interface UciLine {
  id: number;                 // MultiPV rank (1, 2, 3...)
  depth: number;              // Current search depth reached
  score: number;              // Centipawns or moves-to-mate (normalized: positive = White advantage)
  type: ScoreType;            // 'cp' or 'mate'
  uciMove: string;            // The primary move in UCI notation (e.g. "e2e4")
  pv: string[];               // Full principal variation line (sequence of UCI moves)
}

export interface PositionEvaluation {
  fen: string;
  depth: number;
  lines: UciLine[];           // Top MultiPV lines sorted by rank
  bestMove?: string;          // Primary engine move ("e2e4")
  nps?: number;               // Nodes per second
  timeMs?: number;            // Search time in ms
  engineName: string;         // e.g. "Stockfish 17 Lite"
}

export enum EngineName {
  Stockfish19Lite = 'stockfish-19-lite',
  Stockfish19 = 'stockfish-19',
  Stockfish19LiteSingle = 'stockfish-19-lite-single',
  Stockfish17Lite = 'stockfish-17-lite',
  Stockfish17LiteSingle = 'stockfish-17-lite-single',
  Stockfish16NNUE = 'stockfish-16-nnue',
  Stockfish16Lite = 'stockfish-16-lite',
  Stockfish11 = 'stockfish-11'
}

export interface EngineConfig {
  name: EngineName;
  displayName: string;
  path: string;
  multiPv: number;
  defaultDepth: number;
  hashSizeMb: number;
}

export interface EngineWorker {
  id: string;
  isReady: boolean;
  isBusy: boolean;
  uci: (command: string) => void;
  listen: (message: string) => void;
  terminate: () => void;
}

export interface WorkerJob {
  id: string;
  fen: string;
  depth: number;
  multiPv: number;
  onUpdate?: (partial: PositionEvaluation) => void;
  resolve: (result: PositionEvaluation) => void;
  reject: (error: Error) => void;
}
