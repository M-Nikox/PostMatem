import { PositionEvaluation, ScoreType, UciLine } from './types';

/**
 * High-speed UCI protocol string parser.
 * Converts raw Stockfish stdout strings into typed PositionEvaluation structures.
 */
export class UciParser {
  /**
   * Parses an array of raw UCI info lines returned by Stockfish into structured MultiPV lines.
   * Automatically normalizes scores so that:
   *   Positive (+) = White Advantage
   *   Negative (-) = Black Advantage
   */
  public static parseLines(
    rawLines: string[],
    fen: string,
    targetDepth: number,
    engineName = 'Stockfish'
  ): PositionEvaluation {
    const isBlackToMove = fen.split(' ')[1] === 'b';
    const lineMap = new Map<number, UciLine>();
    let maxDepthFound = 0;
    let nps: number | undefined = undefined;
    let timeMs: number | undefined = undefined;
    let bestMove: string | undefined = undefined;

    // Process lines in reverse to grab the latest info depth lines first
    for (let i = rawLines.length - 1; i >= 0; i--) {
      const line = rawLines[i].trim();

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        if (parts[1] && parts[1] !== '(none)') {
          bestMove = parts[1];
        }
        continue;
      }

      if (!line.startsWith('info depth')) {
        continue;
      }

      // Extract depth
      const depthMatch = line.match(/(?:depth )(\d+)/);
      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
      if (depth > maxDepthFound) maxDepthFound = depth;

      // Extract MultiPV index (defaults to 1 if not present)
      const multipvMatch = line.match(/(?:multipv )(\d+)/);
      const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

      // Extract NPS and Time if available
      if (nps === undefined) {
        const npsMatch = line.match(/(?:nps )(\d+)/);
        if (npsMatch) nps = parseInt(npsMatch[1], 10);
      }
      if (timeMs === undefined) {
        const timeMatch = line.match(/(?:time )(\d+)/);
        if (timeMatch) timeMs = parseInt(timeMatch[1], 10);
      }

      // If we already captured a line for this multipv index at target or highest depth, skip older info
      if (lineMap.has(multipv)) {
        continue;
      }

      // Extract PV (Principal Variation)
      const pvIndex = line.indexOf(' pv ');
      if (pvIndex === -1) continue;

      const pvString = line.substring(pvIndex + 4).trim();
      const pv = pvString.split(/\s+/).filter(Boolean);
      if (pv.length === 0) continue;

      const uciMove = pv[0];

      // Extract Score: either 'cp <score>' or 'mate <score>'
      let score = 0;
      let scoreType: ScoreType = 'cp';

      const scoreCpMatch = line.match(/(?:score cp )(-?\d+)/);
      if (scoreCpMatch) {
        scoreType = 'cp';
        const rawScore = parseInt(scoreCpMatch[1], 10);
        // Invert for Black to normalize: positive = White advantage
        score = isBlackToMove ? -rawScore : rawScore;
      } else {
        const scoreMateMatch = line.match(/(?:score mate )(-?\d+)/);
        if (scoreMateMatch) {
          scoreType = 'mate';
          const rawMate = parseInt(scoreMateMatch[1], 10);
          score = isBlackToMove ? -rawMate : rawMate;
        }
      }

      lineMap.set(multipv, {
        id: multipv,
        depth,
        score,
        type: scoreType,
        uciMove,
        pv,
      });
    }

    const lines = Array.from(lineMap.values()).sort((a, b) => a.id - b.id);
    if (!bestMove && lines.length > 0) {
      bestMove = lines[0].uciMove;
    }

    return {
      fen,
      depth: maxDepthFound || targetDepth,
      lines,
      bestMove,
      nps,
      timeMs,
      engineName,
    };
  }

  /**
   * Helper to extract bestmove from raw engine line
   */
  public static extractBestMove(line: string): string | null {
    if (!line.startsWith('bestmove')) return null;
    const parts = line.split(' ');
    return parts[1] && parts[1] !== '(none)' ? parts[1] : null;
  }
}
