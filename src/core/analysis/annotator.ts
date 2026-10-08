import { Chess, Square } from 'chess.js';
import { TacticsDetector } from './tacticsDetector';
import { MoveClassificationType, SacrificedPiece } from './types';

export interface MoveAnnotatorDetails {
  san?: string;
  playedUci?: string;
  bestSan?: string;
  bestUci?: string;
  sacrificedPieces?: SacrificedPiece[];
  mateIn?: number;
  isWhiteMove?: boolean;
  prevFen?: string;
  currFen?: string;
  centipawnLoss?: number;
  winRateBefore?: number;
  winRateAfter?: number;
  winRateLoss?: number;
  greatReason?: 'only_move' | 'game_saver' | 'breakthrough' | 'checkmate';
  openingName?: string;
}

/**
 * Natural language commentary generator for chess moves.
 * Formulates instructive, Grandmaster-level chess feedback with dynamic phrasing pools.
 */
export class MoveAnnotator {
  public static generateComment(
    type: MoveClassificationType,
    details?: MoveAnnotatorDetails
  ): string {
    const rawSan = details?.san || 'This move';
    const san = `**${rawSan}**`;

    // 1. Checkmate ends the game immediately
    if (rawSan.endsWith('#') || details?.greatReason === 'checkmate') {
      const mateOptions = [
        `${san} delivers checkmate to finish the game!`,
        `${san} seals the victory with checkmate!`,
        `${san} is checkmate! An unstoppable attack on the enemy king.`,
      ];
      return this.pickVariant(mateOptions, rawSan);
    }

    // 2. Forced Checkmate on the board
    if (details?.mateIn) {
      const mateCount = Math.abs(details.mateIn);
      if (type === MoveClassificationType.BLUNDER) {
        if (details.bestSan) {
          return `${san} is a fatal blunder that allows a forced mate in ${mateCount}! **${details.bestSan}** was required.`;
        }
        return `${san} is a fatal blunder that allows a forced mate in ${mateCount}!`;
      }
      if (type === MoveClassificationType.MISS && details.bestSan) {
        return `Missed a forced checkmate sequence! Playing **${details.bestSan}** would have forced mate in ${mateCount}.`;
      }
      if (type === MoveClassificationType.BEST || type === MoveClassificationType.GREAT) {
        return `${san} sets up an unstoppable forced checkmate in ${mateCount}!`;
      }
    }

    // 3. Special move mechanics (Castling & Promotions)
    if (rawSan === 'O-O' || rawSan === 'O-O-O') {
      const castleOptions = [
        `${san} secures king safety and activates the rook along the file.`,
        `${san} castles to safety, completing development of the king and connecting the rooks.`,
      ];
      return this.pickVariant(castleOptions, rawSan);
    }

    if (rawSan.includes('=')) {
      if (rawSan.includes('=N') || rawSan.includes('=B') || rawSan.includes('=R')) {
        return `${san} is a sharp tactical underpromotion!`;
      }
      return `${san} promotes the pawn to a queen, tilting the material balance decisively.`;
    }

    // 4. Classification-specific commentary
    switch (type) {
      case MoveClassificationType.BRILLIANT: {
        if (details?.sacrificedPieces && details.sacrificedPieces.length > 0) {
          const sac = details.sacrificedPieces[0];
          const name = this.getPieceName(sac.type);
          return `${san} is brilliant! You intentionally sacrificed your ${name} on ${sac.square} to seize a decisive tactical advantage.`;
        }
        return `${san} is a brilliant tactical sacrifice that shatters the opponent's position!`;
      }

      case MoveClassificationType.GREAT: {
        if (details?.greatReason === 'game_saver') {
          return `${san} is a clutch defensive resource, holding the balance in a difficult position!`;
        }
        if (details?.greatReason === 'breakthrough') {
          return `${san} is a decisive breakthrough, blowing open the position in your favor!`;
        }
        if (details?.greatReason === 'only_move') {
          return `${san} was the only move that maintains the advantage in this sharp position!`;
        }
        return `${san} was an exceptional, critical move found under tactical pressure!`;
      }

      case MoveClassificationType.BEST: {
        if (rawSan.endsWith('+')) {
          return `${san} delivers check, maintaining the initiative and forcing the king to react.`;
        }
        const bestPool = [
          `${san} is the top computer engine recommendation.`,
          `${san} finds the most active and principled continuation.`,
          `${san} maintains optimal piece coordination and board control.`,
          `${san} applies maximum pressure according to the engine.`,
        ];
        return this.pickVariant(bestPool, rawSan + (details?.playedUci || ''));
      }

      case MoveClassificationType.EXCELLENT: {
        const excellentPool = [
          `${san} is an excellent move, keeping solid control of the board.`,
          `${san} is a very strong choice, continuing the plan smoothly.`,
          `${san} maintains a firm grip on the position with active piece play.`,
        ];
        return this.pickVariant(excellentPool, rawSan + (details?.playedUci || ''));
      }

      case MoveClassificationType.GOOD: {
        const goodPool = [
          `${san} is a solid, playable continuation.`,
          `${san} is a steady and sensible choice.`,
          `${san} keeps the position balanced and playable.`,
        ];
        return this.pickVariant(goodPool, rawSan + (details?.playedUci || ''));
      }

      case MoveClassificationType.BOOK: {
        if (details?.openingName) {
          return `${san} follows standard opening theory in the ${details.openingName}.`;
        }
        const bookPool = [
          `${san} is standard opening theory.`,
          `${san} develops naturally according to established opening principles.`,
        ];
        return this.pickVariant(bookPool, rawSan);
      }

      case MoveClassificationType.FORCED:
        return `${san} was the only legal or strictly forced response.`;

      case MoveClassificationType.INACCURACY: {
        if (details?.bestSan) {
          return `${san} is slightly imprecise. **${details.bestSan}** was a more active choice.`;
        }
        return `${san} is a slight inaccuracy that relinquishes some of your initiative.`;
      }

      case MoveClassificationType.MISTAKE: {
        if (details?.bestSan) {
          return `${san} is a mistake. The engine preferred **${details.bestSan}**, maintaining better control.`;
        }
        return `${san} is a mistake that loses significant advantage or initiative.`;
      }

      case MoveClassificationType.BLUNDER: {
        // Check if piece was left hanging directly
        if (details?.currFen && details?.playedUci) {
          const toSquare = details.playedUci.slice(2, 4) as Square;
          try {
            if (TacticsDetector.isPieceHanging(details.currFen, toSquare)) {
              const movedPiece = new Chess(details.currFen).get(toSquare);
              const pieceName = movedPiece ? this.getPieceName(movedPiece.type) : 'piece';
              if (details.bestSan) {
                return `${san} is a blunder: leaves the ${pieceName} on ${toSquare} hanging. Better was **${details.bestSan}**.`;
              }
              return `${san} is a blunder: leaves the ${pieceName} on ${toSquare} hanging without compensation.`;
            }
          } catch {}
        }

        if (details?.bestSan) {
          return `${san} is a critical blunder. Playing **${details.bestSan}** was necessary to hold the position.`;
        }
        return `${san} is a severe blunder that dramatically swings the evaluation.`;
      }

      case MoveClassificationType.MISS: {
        if (details?.bestSan) {
          return `Missed opportunity! Playing **${details.bestSan}** would have seized a winning tactical advantage.`;
        }
        return `${san} misses a decisive winning tactic or forced sequence.`;
      }

      default:
        return '';
    }
  }

  private static pickVariant(pool: string[], seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % pool.length;
    return pool[idx];
  }

  private static getPieceName(type: string): string {
    switch (type.toLowerCase()) {
      case 'q': return 'queen';
      case 'r': return 'rook';
      case 'b': return 'bishop';
      case 'n': return 'knight';
      case 'p': return 'pawn';
      default: return 'piece';
    }
  }
}
