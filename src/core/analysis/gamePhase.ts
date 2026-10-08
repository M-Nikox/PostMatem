import { Chess } from 'chess.js';
import { GamePhaseType } from './types';

/**
 * Game phase transition detector.
 * Identifies Opening, Middlegame, and Endgame boundaries.
 */
export class GamePhaseDetector {
  /**
   * Identifies the game phase for a given board position.
   */
  public static getPhase(fen: string, plyCount: number): GamePhaseType {
    const chess = new Chess(fen);
    const board = chess.board();

    let totalPieces = 0;
    let whiteQueens = 0;
    let blackQueens = 0;
    let nonPawnMaterial = 0;

    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    for (const row of board) {
      for (const piece of row) {
        if (!piece) continue;
        totalPieces++;

        if (piece.type === 'q') {
          if (piece.color === 'w') whiteQueens++;
          else blackQueens++;
        }

        if (piece.type !== 'p' && piece.type !== 'k') {
          nonPawnMaterial += pieceValues[piece.type] || 0;
        }
      }
    }

    // 1. Endgame conditions
    const queensTraded = whiteQueens === 0 && blackQueens === 0;
    const veryLowMaterial = nonPawnMaterial <= 16;
    const fewPiecesLeft = totalPieces <= 12;

    if (queensTraded || veryLowMaterial || fewPiecesLeft) {
      return 'endgame';
    }

    // 2. Middlegame conditions
    const moveNumber = Math.ceil(plyCount / 2);
    if (moveNumber >= 10 || totalPieces <= 26 || (whiteQueens === 0 || blackQueens === 0)) {
      return 'middlegame';
    }

    // 3. Opening default
    return 'opening';
  }
}
