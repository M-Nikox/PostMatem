import { MoveClassificationType } from '../analysis/types';
import { MoveTreeState } from './moveGraph';
import { PgnHeaders } from './pgnParser';

export class PgnSerializer {
  private static readonly NAG_MAP: Record<MoveClassificationType, string> = {
    [MoveClassificationType.BRILLIANT]: '$3',  // !! (Very good move)
    [MoveClassificationType.GREAT]: '$1',      // ! (Good move)
    [MoveClassificationType.BEST]: '',         // Best move (can also be $1 or neutral)
    [MoveClassificationType.EXCELLENT]: '',
    [MoveClassificationType.GOOD]: '',
    [MoveClassificationType.INACCURACY]: '$6', // ?! (Inaccuracy / speculative)
    [MoveClassificationType.MISTAKE]: '$2',    // ? (Mistake)
    [MoveClassificationType.BLUNDER]: '$4',    // ?? (Blunder)
    [MoveClassificationType.FORCED]: '',
    [MoveClassificationType.BOOK]: '',
    [MoveClassificationType.MISS]: '$4',       // ?? (Missed win / blunder)
  };

  /**
   * Serializes a MoveTreeState and headers into an annotated standard PGN string.
   */
  public static serialize(treeState: MoveTreeState, headers: PgnHeaders = {}): string {
    const defaultHeaders: PgnHeaders = {
      Event: 'PostMatem Game',
      Site: 'PostMatem Web (Local)',
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Round: '1',
      White: 'White',
      Black: 'Black',
      Result: '*',
      ...headers,
    };

    const root = treeState.nodes[treeState.rootId];
    if (root && root.fen && root.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      defaultHeaders.SetUp = '1';
      defaultHeaders.FEN = root.fen;
    }

    let pgn = '';

    // 1. Output headers
    for (const [key, value] of Object.entries(defaultHeaders)) {
      if (value !== undefined && value !== '') {
        pgn += `[${key} "${value}"]\n`;
      }
    }
    pgn += '\n';

    // 2. Output moves starting from root
    if (root && root.children.length > 0) {
      pgn += this.serializeNodeChildren(treeState, root.children[0], true);
    }

    // 3. Add Result at end
    const result = defaultHeaders.Result || '*';
    pgn += ` ${result}\n`;

    return pgn.trim();
  }

  private static serializeNodeChildren(
    treeState: MoveTreeState,
    nodeId: string,
    isFirstInVariation = false
  ): string {
    const node = treeState.nodes[nodeId];
    if (!node) return '';

    let text = '';

    // Print move number if White move or first move in variation
    if (node.isWhite) {
      text += `${node.moveNumber}. `;
    } else if (isFirstInVariation) {
      text += `${node.moveNumber}... `;
    }

    text += node.san;

    // Append NAG if classification exists
    if (node.classification) {
      const nag = this.NAG_MAP[node.classification.type];
      if (nag) text += ` ${nag}`;
    }

    // Assemble annotations: eval, clock, coach comments
    const annotations: string[] = [];

    // 1. Evaluation comment: [%eval +1.25,18] or [%eval #+3]
    if (node.eval?.lines?.[0]) {
      const topLine = node.eval.lines[0];
      let evalStr = '';
      if (topLine.type === 'mate') {
        const m = Math.abs(topLine.score);
        evalStr = topLine.score > 0 ? `#+${m}` : `#-${m}`;
      } else {
        const pawns = (Math.abs(topLine.score) / 100).toFixed(2);
        evalStr = topLine.score > 0 ? `+${pawns}` : topLine.score < 0 ? `-${pawns}` : '0.00';
      }
      const depthPart = topLine.depth ? `,${topLine.depth}` : '';
      annotations.push(`[%eval ${evalStr}${depthPart}]`);
    }

    // 2. Clock comment: [%clk 0:03:15]
    if (node.clock) {
      annotations.push(`[%clk ${node.clock}]`);
    }

    // 3. Coach commentary or user comment
    if (node.comment) {
      // Clean comment of any curly braces to avoid breaking PGN format
      const sanitizedComment = node.comment.replace(/[{}]/g, '').trim();
      if (sanitizedComment) {
        annotations.push(sanitizedComment);
      }
    }

    if (annotations.length > 0) {
      text += ` { ${annotations.join(' ')} }`;
    }

    // Handle alternative variations (children at index 1, 2...)
    if (node.children.length > 1) {
      for (let i = 1; i < node.children.length; i++) {
        text += ` ( ${this.serializeNodeChildren(treeState, node.children[i], true)} )`;
      }
    }

    // Continue mainline (child 0)
    if (node.children.length > 0) {
      text += ` ${this.serializeNodeChildren(treeState, node.children[0], false)}`;
    }

    return text;
  }
}
