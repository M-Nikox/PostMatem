import { Chess } from 'chess.js';
import { MoveGraph, MoveTreeState } from './moveGraph';

export interface PgnHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: string;
  WhiteElo?: string;
  BlackElo?: string;
  TimeControl?: string;
  Termination?: string;
  ECO?: string;
  Opening?: string;
  [key: string]: string | undefined;
}

export interface ParsedPgnResult {
  headers: PgnHeaders;
  treeState: MoveTreeState;
  fens: string[];
  uciMoves: string[];
}

export class PgnParser {
  /**
   * Parses a standard PGN string into PgnHeaders, FEN timeline, and a populated MoveTreeState.
   */
  public static parse(pgnString: string): ParsedPgnResult {
    const trimmedPgn = pgnString.trim();
    if (
      trimmedPgn.startsWith('<') ||
      trimmedPgn.includes('<svg') ||
      trimmedPgn.includes('</svg>') ||
      trimmedPgn.includes('<?xml')
    ) {
      throw new Error('Dropped or pasted file is an SVG/XML image, not a valid PGN game.');
    }

    let singlePgn = trimmedPgn;
    // If multi-game PGN detected (contains subsequent [Event tag), isolate the first game
    const multiGameSplit = trimmedPgn.split(/\n\s*\n(?=\[Event\s)/i);
    if (multiGameSplit.length > 1) {
      singlePgn = multiGameSplit[0].trim();
    }

    const headers: PgnHeaders = {};
    const lines = singlePgn.split('\n');

    // 1. Extract headers [Key "Value"]
    let moveTextStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[')) {
        const match = line.match(/^\[([a-zA-Z0-9_]+)\s+"(.*)"\]$/);
        if (match) {
          const key = match[1];
          if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
            headers[key] = match[2];
          }
        }
      } else if (line.length > 0) {
        moveTextStartIndex = i;
        break;
      }
    }

    // 2. Extract move text and clocks
    const moveText = lines.slice(moveTextStartIndex).join(' ').trim();

    // Use chess.js to replay moves and extract LAN / SAN
    const initialFen = headers.FEN || MoveGraph.DEFAULT_FEN;
    const chess = new Chess(initialFen);
    try {
      chess.loadPgn(pgnString);
    } catch {
      // If full PGN load fails due to custom comments, try loading raw moveText
      try {
        const cleanMoves = moveText
          .replace(/\{[^}]*\}/g, '') // remove comments
          .replace(/\d+\.\.\./g, '')  // remove continuation dots
          .replace(/\$\d+/g, '')       // remove NAGs
          .trim();
        chess.loadPgn(cleanMoves);
      } catch (err) {
        console.error('[PgnParser] Failed to parse moves from PGN:', err);
      }
    }

    const verboseHistory = chess.history({ verbose: true });
    let treeState = MoveGraph.createInitial(initialFen);

    const fens: string[] = [initialFen];
    const uciMoves: string[] = [];

    // Replay moves into MoveGraph
    for (const move of verboseHistory) {
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      uciMoves.push(uci);

      const { newState, newNodeId } = MoveGraph.addMove(
        treeState,
        treeState.currentNodeId,
        {
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        }
      );

      treeState = newState;
      fens.push(treeState.nodes[newNodeId].fen);
    }

    // Reset current node to root for navigation
    treeState = {
      ...treeState,
      currentNodeId: treeState.rootId,
    };

    if (uciMoves.length === 0) {
      const rawTokens = moveText.replace(/[0-9.\s\-\/\*]+/g, '').trim();
      if (rawTokens.length > 0) {
        throw new Error('Failed to parse moves from PGN. Please verify move notation.');
      }
      if (Object.keys(headers).length === 0) {
        throw new Error('No valid PGN moves or headers recognized in provided input.');
      }
    }

    return {
      headers,
      treeState,
      fens,
      uciMoves,
    };
  }
}
