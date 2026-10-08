import { PositionEvaluation } from '../engine/types';

export enum MoveClassificationType {
  BRILLIANT = 'brilliant',
  GREAT = 'great',
  BEST = 'best',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  INACCURACY = 'inaccuracy',
  MISTAKE = 'mistake',
  BLUNDER = 'blunder',
  FORCED = 'forced',
  BOOK = 'book',
  MISS = 'miss',
}

export interface SacrificedPiece {
  type: string;
  square: string;
  value: number;
}

export interface MoveClassification {
  type: MoveClassificationType;
  label: string;
  glyph: string;               // Text glyph: '!!', '!', '★', '?', '?!', '??'
  color: string;               // Hex color token
  accuracyScore: number;       // 0 - 100%
  centipawnLoss: number;       // Eval loss in centipawns
  winRateBefore: number;       // 0 - 100%
  winRateAfter: number;        // 0 - 100%
  winRateLoss: number;         // Delta W
  comment: string;             // Explanatory coaching sentence
  sacrificedPieces?: SacrificedPiece[];
}

export type GamePhaseType = 'opening' | 'middlegame' | 'endgame';

export interface PhaseBreakdown {
  accuracy: { white: number; black: number };
  brilliantCount: { white: number; black: number };
  blunderCount: { white: number; black: number };
}

export interface AnalysisReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteEstimatedElo?: number;
  blackEstimatedElo?: number;
  whiteAcpl: number;
  blackAcpl: number;
  classificationCounts: {
    white: Record<MoveClassificationType, number>;
    black: Record<MoveClassificationType, number>;
  };
  phases: {
    opening: PhaseBreakdown;
    middlegame: PhaseBreakdown;
    endgame?: PhaseBreakdown;
  };
  evaluations: PositionEvaluation[];
}
