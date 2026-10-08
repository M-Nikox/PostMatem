import { Chess } from 'chess.js';
import { PositionEvaluation, ScoreType } from '../engine/types';

/**
 * Standard Lichess Win-Rate Percentage Model.
 * Source: https://github.com/lichess-org/lila/pull/11148
 */
export class WinRateMath {
  private static readonly MULTIPLIER = -0.00368208;

  /**
   * Converts centipawns to White win percentage (0 to 100).
   */
  public static cpToWinPercent(cp: number): number {
    const clampedCp = Math.max(-1000, Math.min(1000, cp));
    const winChances = 2 / (1 + Math.exp(this.MULTIPLIER * clampedCp)) - 1;
    return 50 + 50 * winChances;
  }

  /**
   * Converts moves-to-mate into White win percentage.
   */
  public static mateToWinPercent(mate: number): number {
    if (mate > 0) return 100;
    if (mate < 0) return 0;
    return 50;
  }

  /**
   * Calculates absolute White win rate for a given score & type.
   */
  public static calculateWhiteWinRate(score: number, type: ScoreType): number {
    return type === 'mate' ? this.mateToWinPercent(score) : this.cpToWinPercent(score);
  }

  /**
   * Calculates win rate from the active player's perspective.
   */
  public static getPlayerWinRate(whiteWinRate: number, isWhiteTurn: boolean): number {
    return isWhiteTurn ? whiteWinRate : 100 - whiteWinRate;
  }

  /**
   * Extracts top line White win rate from a PositionEvaluation.
   * Accurately recognizes terminal checkmate positions as 100% or 0% (never defaulting to 50%).
   */
  public static getPositionWhiteWinRate(evalData?: PositionEvaluation | null, fen?: string): number {
    const targetFen = fen || evalData?.fen;
    if (targetFen) {
      try {
        const chess = new Chess(targetFen);
        if (chess.isCheckmate()) {
          // If Black to move, White delivered mate -> 100% White win rate
          // If White to move, Black delivered mate -> 0% White win rate
          return chess.turn() === 'b' ? 100 : 0;
        }
        if (chess.isDraw()) {
          return 50;
        }
      } catch {}
    }

    if (!evalData || !evalData.lines || evalData.lines.length === 0) {
      return 50;
    }
    const topLine = evalData.lines[0];
    return this.calculateWhiteWinRate(topLine.score, topLine.type);
  }

  /**
   * Calculates win rate drop from previous move to current move for the player who just moved.
   */
  public static calculateWinRateLoss(
    prevWhiteWinRate: number,
    currWhiteWinRate: number,
    isWhiteMoved: boolean
  ): { prevWin: number; currWin: number; winLoss: number } {
    const prevWin = this.getPlayerWinRate(prevWhiteWinRate, isWhiteMoved);
    const currWin = this.getPlayerWinRate(currWhiteWinRate, isWhiteMoved);
    const winLoss = Math.max(0, prevWin - currWin);

    return { prevWin, currWin, winLoss };
  }
}
