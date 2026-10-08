import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { SacrificedPiece } from './types';

export interface MoveSacrificeResult {
  isSacrifice: boolean;
  sacrificedPieces: SacrificedPiece[];
  isDamageControl: boolean;
  hasSafeCapture: boolean;
  netMaterialSacrificed: number;
}

/**
 * Tactical exchange, piece hanging, and tactical sacrifice validation engine.
 * Calibrated against Chess.com Classification V2 specifications.
 */
export class TacticsDetector {
  public static readonly PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 1000,
  };

  /**
   * Checks whether a piece on a given square can be captured with net positive/neutral material gain.
   * Evaluates legal static captures without fragile FEN string manipulation.
   */
  public static isPieceHanging(fen: string, square: Square): boolean {
    const chess = new Chess(fen);
    const piece = chess.get(square);
    if (!piece) return false;

    const pieceColor = piece.color;
    const enemyColor: Color = pieceColor === 'w' ? 'b' : 'w';

    if (chess.turn() === enemyColor) {
      return this.canEnemyWinMaterialOnSquare(chess, square, piece);
    }

    return false;
  }

  /**
   * High-precision sacrifice detector for a specific played move.
   * Checks:
   * 1. Direct Sacrifice: The moved piece lands on an attacked square where the opponent can capture it
   *    with net material gain (free piece or exchange sacrifice).
   * 2. Clearance / Deflection: The moved piece vacates a square, deliberately leaving behind
   *    a friendly piece that is now hanging.
   */
  public static detectMoveSacrifice({
    prevFen,
    currFen,
    playedUci,
  }: {
    prevFen: string;
    currFen: string;
    playedUci: string;
  }): MoveSacrificeResult {
    const fromSquare = playedUci.slice(0, 2) as Square;
    const toSquare = playedUci.slice(2, 4) as Square;

    const prevChess = new Chess(prevFen);
    const currChess = new Chess(currFen);

    const movedPiece = currChess.get(toSquare);
    if (!movedPiece) {
      return this.emptySacrificeResult();
    }

    // Chess.com Rule: Pawns and Kings CANNOT be brilliant piece sacrifices
    if (movedPiece.type === 'p' || movedPiece.type === 'k') {
      return this.emptySacrificeResult();
    }

    const movedValue = this.PIECE_VALUES[movedPiece.type];
    const capturedOnMove = prevChess.get(toSquare);
    const capturedValue = capturedOnMove ? this.PIECE_VALUES[capturedOnMove.type] : 0;

    // If the move captured equal or greater material (e.g. QxQ or RxR or NxB),
    // it is an exchange or favorable trade, NOT a sacrifice.
    if (capturedValue >= movedValue) {
      return this.emptySacrificeResult();
    }

    // --- CASE 1: DIRECT SACRIFICE (The moved piece itself is hanging on toSquare) ---
    const enemyCapturesOnTo = currChess
      .moves({ verbose: true })
      .filter((m) => m.to === toSquare);

    if (enemyCapturesOnTo.length > 0) {
      // Sort captures so enemy takes with the cheapest available piece
      const sortedCaptures = [...enemyCapturesOnTo].sort(
        (a, b) => this.PIECE_VALUES[a.piece] - this.PIECE_VALUES[b.piece]
      );
      const cheapestEnemyMove = sortedCaptures[0];
      const cheapestEnemyPieceValue = this.PIECE_VALUES[cheapestEnemyMove.piece];

      // Simulate opponent capture
      const simChess = new Chess(currFen);
      simChess.move(cheapestEnemyMove);

      // In this simulated board, does the player have a recapture on toSquare?
      const playerRecaptures = simChess
        .moves({ verbose: true })
        .filter((m) => m.to === toSquare);

      let isDirectSacrifice = false;
      let netSacrificeValue = 0;

      if (playerRecaptures.length === 0) {
        // Player has ZERO recaptures on toSquare! The piece is completely undefended.
        netSacrificeValue = movedValue - capturedValue;
        // Minor piece (3), Rook (5), Queen (9), or Exchange (e.g. 5 - 1 = 4)
        if (netSacrificeValue >= 2) {
          isDirectSacrifice = true;
        }
      } else {
        // Player CAN recapture on toSquare.
        // Check if player still loses net material on the trade (Exchange sacrifice).
        // e.g. White Rook (5) captured by Black Bishop (3) -> net exchange loss of 2 points.
        // e.g. White Queen (9) captured by Black pawn (1) or minor (3).
        if (cheapestEnemyPieceValue < movedValue) {
          const netExchangeLoss = movedValue - capturedValue - cheapestEnemyPieceValue;
          if (netExchangeLoss >= 2) {
            isDirectSacrifice = true;
            netSacrificeValue = netExchangeLoss;
          }
        }
      }

      if (isDirectSacrifice) {
        // Check if the opponent taking the piece walks into an immediate mate-in-1
        const opponentIsImmediatelyMated = simChess
          .moves({ verbose: true })
          .some((m) => m.san.includes('#'));

        return {
          isSacrifice: true,
          sacrificedPieces: [
            {
              type: movedPiece.type,
              square: toSquare,
              value: netSacrificeValue,
            },
          ],
          isDamageControl: false,
          hasSafeCapture: !opponentIsImmediatelyMated,
          netMaterialSacrificed: netSacrificeValue,
        };
      }
    }

    // --- CASE 2: CLEARANCE / DEFLECTION SACRIFICE ---
    // Moving the piece uncovered or abandoned a friendly minor/major piece that is now hanging.
    // Check friendly pieces on the board (Knights, Bishops, Rooks, Queens)
    for (const row of currChess.board()) {
      for (const piece of row) {
        if (!piece) continue;
        if (piece.color !== movedPiece.color) continue;
        if (piece.square === toSquare) continue;
        if (piece.type === 'p' || piece.type === 'k') continue;

        // Check if this piece is hanging in currFen
        if (this.canEnemyWinMaterialOnSquare(currChess, piece.square as Square, piece)) {
          // Verify that it was NOT already hanging in prevFen (must be move-initiated!)
          const wasHangingBefore = this.isPieceHangingInPlayerTurn(prevChess, piece.square as Square, piece);
          if (!wasHangingBefore) {
            const pieceVal = this.PIECE_VALUES[piece.type];

            // Verify not damage control:
            const isDamageControl = this.isDamageControlMove(
              movedPiece.type,
              [{ type: piece.type, square: piece.square, value: pieceVal }],
              fromSquare,
              prevFen
            );

            if (!isDamageControl) {
              return {
                isSacrifice: true,
                sacrificedPieces: [
                  {
                    type: piece.type,
                    square: piece.square,
                    value: pieceVal,
                  },
                ],
                isDamageControl: false,
                hasSafeCapture: true,
                netMaterialSacrificed: pieceVal,
              };
            }
          }
        }
      }
    }

    return this.emptySacrificeResult();
  }

  /**
   * Distinguishes a genuine tactical sacrifice from damage control
   * (e.g. Queen moves away to save herself from an attack, leaving a minor piece hanging).
   */
  public static isDamageControlMove(
    movedPieceType: PieceSymbol,
    sacrificedPieces: SacrificedPiece[],
    fromSquare: Square,
    previousFen: string
  ): boolean {
    if (sacrificedPieces.length === 0) return false;

    const movedValue = this.PIECE_VALUES[movedPieceType];
    const maxSacrificeValue = Math.max(...sacrificedPieces.map((p) => p.value));

    // If the moved piece is more valuable than what was left behind,
    // check if the moved piece was under attack on fromSquare in the previous position
    if (movedValue > maxSacrificeValue) {
      const prevChess = new Chess(previousFen);
      const piece = prevChess.get(fromSquare);
      if (piece && this.isPieceHangingInPlayerTurn(prevChess, fromSquare, piece)) {
        return true; // Damage control: saved Queen/Rook, left minor piece to die
      }
    }

    return false;
  }

  /**
   * Legacy adapter for findSacrificedPieces.
   */
  public static findSacrificedPieces(
    currentFen: string,
    isBlackMoved: boolean,
    capturedPieceType: PieceSymbol | null
  ): SacrificedPiece[] {
    const chess = new Chess(currentFen);
    const playerColor: Color = isBlackMoved ? 'b' : 'w';
    const sacrifices: SacrificedPiece[] = [];
    const capturedValue = capturedPieceType ? this.PIECE_VALUES[capturedPieceType] : 0;

    for (const row of chess.board()) {
      for (const piece of row) {
        if (!piece) continue;
        if (piece.color !== playerColor) continue;
        if (piece.type === 'p' || piece.type === 'k') continue;

        const pieceValue = this.PIECE_VALUES[piece.type];
        if (capturedValue >= pieceValue) continue;

        if (this.canEnemyWinMaterialOnSquare(chess, piece.square as Square, piece)) {
          sacrifices.push({
            type: piece.type,
            square: piece.square,
            value: pieceValue,
          });
        }
      }
    }

    return sacrifices;
  }

  /**
   * Legacy adapter for canOpponentSafelyCapture.
   */
  public static canOpponentSafelyCapture(
    currentFen: string,
    sacrifices: SacrificedPiece[]
  ): boolean {
    const chess = new Chess(currentFen);

    for (const sac of sacrifices) {
      const movesToSquare = chess
        .moves({ verbose: true })
        .filter((m) => m.to === sac.square);

      for (const move of movesToSquare) {
        chess.move(move);
        const canOpponentBeMatedImmediately = chess
          .moves({ verbose: true })
          .some((m) => m.san.includes('#'));
        chess.undo();

        if (!canOpponentBeMatedImmediately) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Evaluates if the active enemy can win material by capturing on target square.
   */
  private static canEnemyWinMaterialOnSquare(
    chess: Chess,
    square: Square,
    piece: { type: PieceSymbol; color: Color }
  ): boolean {
    const enemyAttacks = chess.moves({ verbose: true }).filter((m) => m.to === square);
    if (enemyAttacks.length === 0) return false;

    const targetValue = this.PIECE_VALUES[piece.type];

    // Sort attackers by lowest value
    const sortedAttacks = [...enemyAttacks].sort(
      (a, b) => this.PIECE_VALUES[a.piece] - this.PIECE_VALUES[b.piece]
    );
    const cheapestAttacker = sortedAttacks[0];
    const cheapestValue = this.PIECE_VALUES[cheapestAttacker.piece];

    // If cheapest attacker is strictly less valuable than target (e.g. pawn takes minor/major),
    // it is an immediately winning capture regardless of defenders
    if (cheapestValue < targetValue) {
      return true;
    }

    // Simulate cheapest capture
    const sim = new Chess(chess.fen());
    sim.move(cheapestAttacker);

    // Look for friendly recaptures
    const recaptures = sim.moves({ verbose: true }).filter((m) => m.to === square);
    if (recaptures.length === 0) {
      // Undefended!
      return true;
    }

    // If enemy has more attackers than friendly defenders
    if (enemyAttacks.length > recaptures.length) {
      return true;
    }

    return false;
  }

  /**
   * Checks if a friendly piece was hanging in prevFen (when it was friendly's turn to move).
   */
  private static isPieceHangingInPlayerTurn(
    chess: Chess,
    square: Square,
    piece: { type: PieceSymbol; color: Color }
  ): boolean {
    // Generate opponent moves by passing the turn safely
    const fenTokens = chess.fen().split(' ');
    const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
    fenTokens[1] = enemyColor;
    fenTokens[3] = '-'; // En-passant square cannot belong to the opposite side; clearing avoids FEN parse errors

    try {
      const enemyBoard = new Chess(fenTokens.join(' '));
      return this.canEnemyWinMaterialOnSquare(enemyBoard, square, piece);
    } catch {
      return false;
    }
  }

  private static emptySacrificeResult(): MoveSacrificeResult {
    return {
      isSacrifice: false,
      sacrificedPieces: [],
      isDamageControl: false,
      hasSafeCapture: false,
      netMaterialSacrificed: 0,
    };
  }
}
