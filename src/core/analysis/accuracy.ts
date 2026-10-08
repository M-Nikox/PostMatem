/**
 * Chess Accuracy Model calibrated against Chess.com CAPS2 and Lichess volatility models.
 * Balances statistical precision with honest, realistic feedback for tactical blunders and mistakes.
 */
export class AccuracyCalculator {
  /**
   * Computes individual move accuracy (0 to 100) from win-percentage drop.
   */
  public static calculateMoveAccuracy(winDiff: number): number {
    const rawAccuracy =
      103.1668100711649 * Math.exp(-0.04354415386753951 * Math.max(0, winDiff)) -
      3.166924740191411;

    return Math.min(100, Math.max(0, rawAccuracy + 1));
  }

  /**
   * Computes aggregate accuracy for White and Black across all game positions.
   * Uses a combination of Volatility-Weighted Mean, Harmonic Mean, and an unforced error penalty.
   */
  public static computeGameAccuracy(
    movesWinPercentages: number[]
  ): { whiteAccuracy: number; blackAccuracy: number } {
    if (movesWinPercentages.length <= 1) {
      return { whiteAccuracy: 100, blackAccuracy: 100 };
    }

    const weights = this.getAccuracyWeights(movesWinPercentages);
    const movesAccuracy = this.getMovesAccuracy(movesWinPercentages);

    const whiteAccuracy = this.getPlayerAccuracy(movesAccuracy, weights, 'white');
    const blackAccuracy = this.getPlayerAccuracy(movesAccuracy, weights, 'black');

    return {
      whiteAccuracy: Math.round(whiteAccuracy * 10) / 10,
      blackAccuracy: Math.round(blackAccuracy * 10) / 10,
    };
  }

  private static getPlayerAccuracy(
    movesAccuracy: number[],
    weights: number[],
    player: 'white' | 'black'
  ): number {
    const remainder = player === 'white' ? 0 : 1;
    const playerAccuracies = movesAccuracy.filter((_, idx) => idx % 2 === remainder);
    const playerWeights = weights.filter((_, idx) => idx % 2 === remainder);

    if (playerAccuracies.length === 0) return 100;

    const weightedMean = this.getWeightedMean(playerAccuracies, playerWeights);
    const harmonicMean = this.getHarmonicMean(playerAccuracies.map((a) => Math.max(a, 5)));

    // CAPS2 Calibration: Harmonic mean captures the cost of low-accuracy moves better than arithmetic mean
    const blended = weightedMean * 0.45 + harmonicMean * 0.55;

    // Error Drag: A game with multiple mistakes and blunders should realistically reflect that loss of control
    const errorCount = playerAccuracies.filter((a) => a < 70).length;
    const majorErrorCount = playerAccuracies.filter((a) => a < 45).length;
    const moveCount = playerAccuracies.length;

    // Scale error penalty relative to game length so short games aren't over-penalized
    const errorRatio = (errorCount * 1.5 + majorErrorCount * 2.8) / Math.max(10, moveCount);
    const penalty = errorRatio * 32;

    const finalAccuracy = Math.max(15, Math.min(100, blended - penalty));
    return Math.round(finalAccuracy * 10) / 10;
  }

  private static getAccuracyWeights(movesWinPercentage: number[]): number[] {
    const windowSize = Math.max(2, Math.min(8, Math.ceil(movesWinPercentage.length / 10)));
    const halfWindowSize = Math.round(windowSize / 2);
    const windows: number[][] = [];

    for (let i = 1; i < movesWinPercentage.length; i++) {
      const startIdx = i - halfWindowSize;
      const endIdx = i + halfWindowSize;

      if (startIdx < 0) {
        windows.push(movesWinPercentage.slice(0, windowSize));
        continue;
      }

      if (endIdx > movesWinPercentage.length) {
        windows.push(movesWinPercentage.slice(-windowSize));
        continue;
      }

      windows.push(movesWinPercentage.slice(startIdx, endIdx));
    }

    return windows.map((window) => {
      const std = this.getStandardDeviation(window);
      return Math.max(0.5, Math.min(12, std));
    });
  }

  private static getMovesAccuracy(movesWinPercentage: number[]): number[] {
    return movesWinPercentage.slice(1).map((winPercent, index) => {
      const lastWinPercent = movesWinPercentage[index];
      const isWhiteMove = index % 2 === 0;
      const winDiff = isWhiteMove
        ? Math.max(0, lastWinPercent - winPercent)
        : Math.max(0, winPercent - lastWinPercent);

      return this.calculateMoveAccuracy(winDiff);
    });
  }

  private static getStandardDeviation(arr: number[]): number {
    if (arr.length <= 1) return 0;
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private static getWeightedMean(values: number[], weights: number[]): number {
    if (values.length === 0) return 0;
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return values.reduce((sum, v) => sum + v, 0) / values.length;
    const weightedSum = values.reduce((sum, v, idx) => sum + v * (weights[idx] ?? 1), 0);
    return weightedSum / totalWeight;
  }

  private static getHarmonicMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sumInverse = values.reduce((sum, v) => sum + 1 / (v || 0.0001), 0);
    return values.length / sumInverse;
  }
}
