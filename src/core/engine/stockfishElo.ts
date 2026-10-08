/**
 * Maps Stockfish skill levels (1-20) to realistic human Elo ratings,
 * aligned with standard Chess.com and Lichess bot benchmarks.
 */
const STOCKFISH_ELO_MAP: Record<number, number> = {
  1: 800,
  2: 900,
  3: 1000,
  4: 1100,
  5: 1200,
  6: 1300,
  7: 1400,
  8: 1500,
  9: 1600,
  10: 1750,
  11: 1900,
  12: 2050,
  13: 2200,
  14: 2350,
  15: 2500,
  16: 2650,
  17: 2800,
  18: 2950,
  19: 3100,
  20: 3200,
};

export function getStockfishElo(level: number): number {
  const clamped = Math.max(1, Math.min(20, Math.round(level)));
  return STOCKFISH_ELO_MAP[clamped] || 1500;
}

/**
 * Returns appropriate search depth tailored for human skill level.
 * Level 1 searches only 1 ply with heavy blunder injection; Level 20 searches 20 ply.
 */
export function getEngineDepthForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 8) return 6;
  if (level <= 10) return 8;
  if (level <= 13) return 10;
  if (level <= 16) return 14;
  if (level <= 18) return 16;
  return 20;
}
