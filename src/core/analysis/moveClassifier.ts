import { Chess, Square } from 'chess.js';
import { PositionEvaluation } from '../engine/types';
import { AccuracyCalculator } from './accuracy';
import { MoveAnnotator, MoveAnnotatorDetails } from './annotator';
import { TacticsDetector } from './tacticsDetector';
import { MoveClassification, MoveClassificationType, SacrificedPiece } from './types';
import { WinRateMath } from './winRate';

export interface ClassifyMoveParams {
  prevEval: PositionEvaluation;
  currEval: PositionEvaluation;
  playedUci: string;
  playedSan: string;
  prevFen: string;
  currFen: string;
  isBook?: boolean;
  openingName?: string;
}

export class MoveClassifier {
  public static readonly CLASSIFICATION_METADATA: Record<
    MoveClassificationType,
    { label: string; glyph: string; color: string }
  > = {
    [MoveClassificationType.BRILLIANT]: { label: 'Brilliant', glyph: '!!', color: '#4FA8A0' },
    [MoveClassificationType.GREAT]: { label: 'Great', glyph: '!', color: '#6E8FBF' },
    [MoveClassificationType.BEST]: { label: 'Best', glyph: '★', color: '#7C9A5C' },
    [MoveClassificationType.EXCELLENT]: { label: 'Excellent', glyph: '✓', color: '#8FA873' },
    [MoveClassificationType.GOOD]: { label: 'Good', glyph: '·', color: '#9A948A' },
    [MoveClassificationType.INACCURACY]: { label: 'Inaccuracy', glyph: '?', color: '#C99A3E' },
    [MoveClassificationType.MISTAKE]: { label: 'Mistake', glyph: '?!', color: '#C97D3E' },
    [MoveClassificationType.BLUNDER]: { label: 'Blunder', glyph: '??', color: '#B0483A' },
    [MoveClassificationType.FORCED]: { label: 'Forced', glyph: '□', color: '#9A948A' },
    [MoveClassificationType.BOOK]: { label: 'Book', glyph: '📖', color: '#A68A5B' },
    [MoveClassificationType.MISS]: { label: 'Miss', glyph: '✕', color: '#A8402F' },
  };

  /**
   * Classifies a single played move using Chess.com Classification V2 Expected Points
   * and strict tactical sacrifice validation.
   */
  public static classifyMove({
    prevEval,
    currEval,
    playedUci,
    playedSan,
    prevFen,
    currFen,
    isBook = false,
    openingName,
  }: ClassifyMoveParams): MoveClassification {
    const isWhiteMoved = prevFen.includes(' w ');

    // Extract best engine move SAN from prevBestLine
    const prevBestLine = prevEval?.lines?.[0];
    const prevSecondLine = prevEval?.lines?.[1];
    let bestSan: string | undefined;
    if (prevBestLine?.uciMove) {
      try {
        const b = new Chess(prevFen);
        const m = b.move({
          from: prevBestLine.uciMove.slice(0, 2),
          to: prevBestLine.uciMove.slice(2, 4),
          promotion: prevBestLine.uciMove.slice(4, 5) || undefined,
        });
        if (m) bestSan = m.san;
      } catch {}
    }

    // 1. Opening Book
    if (isBook) {
      return this.buildResult(MoveClassificationType.BOOK, 0, 50, 50, 0, {
        san: playedSan,
        playedUci,
        openingName,
      });
    }

    // 2. Forced Move (Only 1 legal move in position)
    const prevBoard = new Chess(prevFen);
    const legalMoves = prevBoard.moves();
    if (legalMoves.length === 1) {
      return this.buildResult(MoveClassificationType.FORCED, 0, 50, 50, 0, {
        san: playedSan,
        playedUci,
      });
    }

    // 3. Extract Win Rates and Scores
    const prevWhiteWin = WinRateMath.getPositionWhiteWinRate(prevEval, prevFen);
    const currWhiteWin = WinRateMath.getPositionWhiteWinRate(currEval, currFen);

    const { prevWin, currWin, winLoss } = WinRateMath.calculateWinRateLoss(
      prevWhiteWin,
      currWhiteWin,
      isWhiteMoved
    );

    const prevScore = prevBestLine?.score ?? 0;
    const currScore = currEval?.lines?.[0]?.score ?? 0;
    const centipawnLoss = isWhiteMoved
      ? Math.max(0, prevScore - currScore)
      : Math.max(0, currScore - prevScore);

    const isTopEngineMove = prevBestLine?.uciMove === playedUci;
    const isCheckmate = playedSan.endsWith('#');

    // 4. Immediate Checkmate Detection
    if (isCheckmate) {
      // Check if it was a sound sacrifice leading to checkmate
      const sacrifice = TacticsDetector.detectMoveSacrifice({
        prevFen,
        currFen,
        playedUci,
      });
      if (sacrifice.isSacrifice && !sacrifice.isDamageControl) {
        return this.buildResult(
          MoveClassificationType.BRILLIANT,
          0,
          prevWin,
          currWin,
          0,
          {
            san: playedSan,
            playedUci,
            greatReason: 'checkmate',
            sacrificedPieces: sacrifice.sacrificedPieces,
          }
        );
      }

      return this.buildResult(
        MoveClassificationType.BEST,
        0,
        prevWin,
        100,
        0,
        {
          san: playedSan,
          playedUci,
          greatReason: 'checkmate',
        }
      );
    }

    // 5. Missed Win / Missed Mate (✕)
    const hadDecisiveAdvantage =
      prevWin >= 65 ||
      (prevBestLine?.type === 'mate' &&
        ((isWhiteMoved && prevBestLine.score > 0) || (!isWhiteMoved && prevBestLine.score < 0)));

    const lostAdvantage = currWin <= 52 || winLoss >= 18;

    if (hadDecisiveAdvantage && lostAdvantage && !isTopEngineMove) {
      return this.buildResult(
        MoveClassificationType.MISS,
        centipawnLoss,
        prevWin,
        currWin,
        winLoss,
        {
          san: playedSan,
          playedUci,
          bestSan,
          mateIn: prevBestLine?.type === 'mate' ? prevBestLine.score : undefined,
        }
      );
    }

    // 6. Strict Brilliant Move (!!) Validation
    if (isTopEngineMove || winLoss <= 1.0) {
      const sacrifice = TacticsDetector.detectMoveSacrifice({
        prevFen,
        currFen,
        playedUci,
      });

      if (sacrifice.isSacrifice && !sacrifice.isDamageControl && sacrifice.hasSafeCapture) {
        // Resulting position must be sound (win rate >= 48% or eval >= -0.20)
        const isSound = currWin >= 48;

        // Must NOT already be a completely decided blowout
        const notAlreadyBlowingOut = prevWin <= 88 && Math.abs(prevScore) < 450;

        if (isSound && notAlreadyBlowingOut) {
          return this.buildResult(
            MoveClassificationType.BRILLIANT,
            0,
            prevWin,
            currWin,
            0,
            {
              san: playedSan,
              playedUci,
              sacrificedPieces: sacrifice.sacrificedPieces,
            }
          );
        }
      }
    }

    // 7. Great Move (!) Validation — "The Only Move" & Game Savers
    if (isTopEngineMove && prevBestLine && prevSecondLine) {
      const evalDiff = Math.abs(prevBestLine.score - prevSecondLine.score);
      const toSquare = playedUci.slice(2, 4) as Square;

      // Condition A: "The Only Move" (Contested position and alternative drops significantly)
      const isOnlyMove = evalDiff >= 150 && Math.abs(prevScore) < 400;

      // Condition B: "Game-Saving Resource" (Saved lost game < 35% back to >= 48%)
      const isGameSaver = prevWin < 35 && currWin >= 48;

      // Condition C: "Decisive Breakthrough" (From equality ~50% to overwhelming win >= 75%)
      const isBreakthrough = prevWin >= 44 && prevWin <= 56 && currWin >= 75;

      // Filter: Cannot be an obvious recapture of an already hanging piece
      const wasHangingRecapture = TacticsDetector.isPieceHanging(prevFen, toSquare);

      if ((isOnlyMove || isGameSaver || isBreakthrough) && !wasHangingRecapture) {
        const greatReason = isGameSaver
          ? 'game_saver'
          : isBreakthrough
          ? 'breakthrough'
          : 'only_move';

        return this.buildResult(
          MoveClassificationType.GREAT,
          0,
          prevWin,
          currWin,
          0,
          { san: playedSan, playedUci, greatReason }
        );
      }
    }

    // 8. Chess.com Classification V2 Expected Points Cutoffs + Centipawn Loss Safety Net
    let classification: MoveClassificationType;

    // A drop in a contested game (prevWin 15% - 88%) losing > 175cp is an unconditional blunder
    const isContested = prevWin >= 15 && prevWin <= 88;
    const isHardBlunder = isContested && (centipawnLoss >= 175 || winLoss > 20.0);
    const isHardMistake = isContested && (centipawnLoss >= 100 || winLoss > 10.0);

    if (isTopEngineMove || winLoss <= 0.8) {
      classification = MoveClassificationType.BEST;
    } else if (winLoss <= 2.0 && centipawnLoss < 35) {
      classification = MoveClassificationType.EXCELLENT;
    } else if (winLoss <= 5.0 && centipawnLoss < 75) {
      classification = MoveClassificationType.GOOD;
    } else if (!isHardMistake && winLoss <= 10.0 && centipawnLoss < 100) {
      classification = MoveClassificationType.INACCURACY;
    } else if (!isHardBlunder && (winLoss <= 20.0 || centipawnLoss < 175)) {
      classification = MoveClassificationType.MISTAKE;
    } else {
      // Blunder (> 20.0% Expected Points drop or >= 175cp loss)
      // Garbage-time filter: Only if position was already hopelessly lost (prevWin < 8%),
      // downgrade to Inaccuracy so players aren't spammed with trivial blunders.
      if (prevWin < 8) {
        classification = MoveClassificationType.INACCURACY;
      } else {
        classification = MoveClassificationType.BLUNDER;
      }
    }

    return this.buildResult(
      classification,
      centipawnLoss,
      prevWin,
      currWin,
      winLoss,
      {
        san: playedSan,
        playedUci,
        bestSan,
        prevFen,
        currFen,
        centipawnLoss,
        winRateBefore: prevWin,
        winRateAfter: currWin,
        winRateLoss: winLoss,
        mateIn: currEval?.lines?.[0]?.type === 'mate' ? currEval.lines[0].score : undefined,
      }
    );
  }

  private static buildResult(
    type: MoveClassificationType,
    centipawnLoss: number,
    winRateBefore: number,
    winRateAfter: number,
    winRateLoss: number,
    details?: MoveAnnotatorDetails
  ): MoveClassification {
    const meta = this.CLASSIFICATION_METADATA[type];
    const accuracyScore = AccuracyCalculator.calculateMoveAccuracy(winRateLoss);
    const comment = MoveAnnotator.generateComment(type, details);

    return {
      type,
      label: meta.label,
      glyph: meta.glyph,
      color: meta.color,
      accuracyScore,
      centipawnLoss,
      winRateBefore: Math.round(winRateBefore * 10) / 10,
      winRateAfter: Math.round(winRateAfter * 10) / 10,
      winRateLoss: Math.round(winRateLoss * 10) / 10,
      comment,
      sacrificedPieces: details?.sacrificedPieces,
    };
  }
}
