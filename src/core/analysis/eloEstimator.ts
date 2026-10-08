import { PositionEvaluation } from '../engine/types';

export interface PerformanceRatingOptions {
  acpl: number;
  accuracy?: number;
  blunders?: number;
  mistakes?: number;
  inaccuracies?: number;
  moveCount?: number;
  gameOutcome?: 'win' | 'loss' | 'draw';
  opponentRating?: number;
}

/**
 * Centipawn Loss and Performance Elo Rating Estimator.
 * Calibrated against modern tournament performance and Chess.com CAPS2 distributions.
 * Avoids both arcade over-inflation and demoralizing arbitrary rating floors.
 */
export class EloEstimator {
  /**
   * Computes Average Centipawn Loss (ACPL) for White and Black.
   */
  public static computeAverageCpl(
    evaluations: PositionEvaluation[]
  ): { whiteAcpl: number; blackAcpl: number } {
    if (evaluations.length < 2) {
      return { whiteAcpl: 0, blackAcpl: 0 };
    }

    let whiteCplTotal = 0;
    let whiteMovesCount = 0;
    let blackCplTotal = 0;
    let blackMovesCount = 0;

    let previousScore = this.extractClampedScore(evaluations[0]);

    for (let i = 1; i < evaluations.length; i++) {
      const currentScore = this.extractClampedScore(evaluations[i]);
      const isWhiteMove = i % 2 === 1; // Position 0 -> 1 is White's move 1

      if (isWhiteMove) {
        // If score decreased, White lost evaluation
        const loss = Math.max(0, previousScore - currentScore);
        whiteCplTotal += Math.min(loss, 1000);
        whiteMovesCount++;
      } else {
        // If score increased, Black lost evaluation (positive = White advantage)
        const loss = Math.max(0, currentScore - previousScore);
        blackCplTotal += Math.min(loss, 1000);
        blackMovesCount++;
      }

      previousScore = currentScore;
    }

    return {
      whiteAcpl: whiteMovesCount > 0 ? Math.round(whiteCplTotal / whiteMovesCount) : 0,
      blackAcpl: blackMovesCount > 0 ? Math.round(blackCplTotal / blackMovesCount) : 0,
    };
  }

  /**
   * Estimates game performance rating synthesizing Accuracy %, ACPL, Error Frequency,
   * Game Length, and Outcome into a grounded, realistic rating.
   */
  public static estimatePerformanceRating(
    optionsOrAcpl: PerformanceRatingOptions | number,
    legacyBaselineRating?: number
  ): number {
    let acpl: number;
    let accuracy: number | undefined;
    let blunders = 0;
    let mistakes = 0;
    let inaccuracies = 0;
    let moveCount = 30;
    let gameOutcome: 'win' | 'loss' | 'draw' | undefined;

    if (typeof optionsOrAcpl === 'number') {
      acpl = optionsOrAcpl;
      accuracy = Math.max(30, Math.min(99, Math.round(100 - acpl / 1.6)));
      if (legacyBaselineRating && legacyBaselineRating > 0) {
        const rawDiff = (accuracy - 70) * 15;
        return Math.round(Math.max(400, Math.min(3200, legacyBaselineRating + rawDiff)));
      }
    } else {
      acpl = optionsOrAcpl.acpl;
      accuracy = optionsOrAcpl.accuracy;
      blunders = optionsOrAcpl.blunders ?? 0;
      mistakes = optionsOrAcpl.mistakes ?? 0;
      inaccuracies = optionsOrAcpl.inaccuracies ?? 0;
      moveCount = optionsOrAcpl.moveCount ?? 30;
      gameOutcome = optionsOrAcpl.gameOutcome;
    }

    // 1. Base Elo from Accuracy % (Realist CAPS2 & Tournament Curve)
    const acc = accuracy !== undefined ? accuracy : Math.max(30, Math.min(99, 100 - acpl / 1.6));
    let baseElo: number;

    if (acc >= 98) {
      baseElo = 2700 + (acc - 98) * 80;   // 2700 - 2860 (Super GM)
    } else if (acc >= 94) {
      baseElo = 2400 + (acc - 94) * 75;   // 2400 - 2700 (GM / IM)
    } else if (acc >= 88) {
      baseElo = 2050 + (acc - 88) * 58.3; // 2050 - 2400 (Candidate Master / Master)
    } else if (acc >= 80) {
      baseElo = 1750 + (acc - 80) * 37.5; // 1750 - 2050 (Club / Advanced)
    } else if (acc >= 70) {
      baseElo = 1450 + (acc - 70) * 30.0; // 1450 - 1750 (Intermediate)
    } else if (acc >= 60) {
      baseElo = 1150 + (acc - 60) * 30.0; // 1150 - 1450 (Developing)
    } else if (acc >= 50) {
      baseElo = 850 + (acc - 50) * 30.0;  // 850 - 1150 (Casual)
    } else {
      baseElo = Math.max(400, 850 - (50 - acc) * 15); // 400 - 850 (Beginner)
    }

    // 2. ACPL Fine Tuning
    const expectedAcpl = Math.max(10, (100 - acc) * 1.4);
    if (acpl > expectedAcpl) {
      baseElo -= Math.min(120, (acpl - expectedAcpl) * 1.2);
    } else {
      baseElo += Math.min(75, (expectedAcpl - acpl) * 1.0);
    }

    // 3. Proportional Tactical Error Deductions (Normalized by moves)
    const normalizedMoves = Math.max(14, moveCount);
    const blunderRate = blunders / normalizedMoves;
    const mistakeRate = mistakes / normalizedMoves;
    const inaccuracyRate = inaccuracies / normalizedMoves;
    baseElo -= Math.min(260, blunderRate * 750 + mistakeRate * 220 + inaccuracyRate * 60);

    // 4. Short-Game Regression (Miniatures under 12 moves regress toward baseline)
    if (moveCount < 12) {
      const weight = Math.max(0.4, moveCount / 12);
      baseElo = baseElo * weight + 1300 * (1 - weight);
    }

    // 5. Short-loss sanity check
    if (gameOutcome === 'loss' && moveCount < 16) {
      baseElo = Math.min(baseElo, 1850);
    }

    return Math.round(Math.max(450, Math.min(3100, baseElo)));
  }

  private static extractClampedScore(evaluation: PositionEvaluation): number {
    if (!evaluation.lines || evaluation.lines.length === 0) return 0;
    const topLine = evaluation.lines[0];

    if (topLine.type === 'mate') {
      return topLine.score > 0 ? 1000 : -1000;
    }

    return Math.max(-1000, Math.min(1000, topLine.score));
  }
}
