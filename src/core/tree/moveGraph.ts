import { Chess, Move } from 'chess.js';
import { MoveClassification } from '../analysis/types';
import { PositionEvaluation } from '../engine/types';

export interface MoveNode {
  id: string;                          // Unique identifier (e.g. "root", "m_1_w_e4")
  parentId: string | null;             // Parent node ID
  ply: number;                         // 0 for root, 1 for 1.e4, 2 for 1...e5
  moveNumber: number;                  // 1, 2, 3...
  isWhite: boolean;                    // True if White played this move
  san: string;                         // Standard Algebraic Notation ("Nf3")
  uci: string;                         // UCI coordinate notation ("g1f3")
  fen: string;                         // Resulting FEN position
  children: string[];                  // Child node IDs (index 0 = mainline, >0 = variations)
  isMainline: boolean;                 // True if node belongs to game mainline
  clock?: string;                      // Clock time if available (e.g. "0:05:00")
  comment?: string;                    // Coach comment or annotation
  eval?: PositionEvaluation;           // Engine evaluation
  classification?: MoveClassification; // Move classification
}

export interface MoveTreeState {
  nodes: Record<string, MoveNode>;
  rootId: string;
  currentNodeId: string;
  mainlineIds: string[];
}

export class MoveGraph {
  public static readonly DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  /**
   * Initializes an empty MoveGraph at the starting chess position.
   */
  public static createInitial(startFen: string = this.DEFAULT_FEN): MoveTreeState {
    const rootNode: MoveNode = {
      id: 'root',
      parentId: null,
      ply: 0,
      moveNumber: 0,
      isWhite: false,
      san: '',
      uci: '',
      fen: startFen,
      children: [],
      isMainline: true,
    };

    return {
      nodes: { root: rootNode },
      rootId: 'root',
      currentNodeId: 'root',
      mainlineIds: ['root'],
    };
  }

  /**
   * Appends or branches a move from a parent node.
   * If the move already exists as a child, navigates to it without duplicating.
   */
  public static addMove(
    state: MoveTreeState,
    parentId: string,
    moveInput: string | { from: string; to: string; promotion?: string }
  ): { newState: MoveTreeState; newNodeId: string; move: Move } {
    const parent = state.nodes[parentId];
    if (!parent) {
      throw new Error(`[MoveGraph] Parent node ${parentId} not found.`);
    }

    const chess = new Chess(parent.fen);
    let sanitizedInput: any = moveInput;
    if (typeof moveInput === 'object' && moveInput !== null) {
      sanitizedInput = {
        from: moveInput.from,
        to: moveInput.to,
        ...(moveInput.promotion ? { promotion: moveInput.promotion } : {}),
      };
    }
    const moveResult = chess.move(sanitizedInput);
    if (!moveResult) {
      throw new Error(`[MoveGraph] Illegal move: ${JSON.stringify(moveInput)} from FEN ${parent.fen}`);
    }

    const uci = `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`;

    // 1. Check if this exact move already exists among children
    for (const childId of parent.children) {
      const child = state.nodes[childId];
      if (child && child.uci === uci) {
        return {
          newState: { ...state, currentNodeId: childId },
          newNodeId: childId,
          move: moveResult,
        };
      }
    }

    // 2. Create new node
    const newPly = parent.ply + 1;
    const isWhite = parent.fen.includes(' w ');
    const moveNumber = Math.ceil(newPly / 2);
    const newNodeId = `m_${newPly}_${isWhite ? 'w' : 'b'}_${moveResult.san.replace(/[+#]/g, (m) => (m === '+' ? '_ck' : '_mt'))}_${Math.random().toString(36).substring(2, 6)}`;

    const isMainline = parent.isMainline && parent.children.length === 0;

    const newNode: MoveNode = {
      id: newNodeId,
      parentId,
      ply: newPly,
      moveNumber,
      isWhite,
      san: moveResult.san,
      uci,
      fen: chess.fen(),
      children: [],
      isMainline,
    };

    const updatedParent: MoveNode = {
      ...parent,
      children: [...parent.children, newNodeId],
    };

    const newNodes = {
      ...state.nodes,
      [parentId]: updatedParent,
      [newNodeId]: newNode,
    };

    const newMainlineIds = isMainline
      ? [...state.mainlineIds, newNodeId]
      : state.mainlineIds;

    return {
      newState: {
        nodes: newNodes,
        rootId: state.rootId,
        currentNodeId: newNodeId,
        mainlineIds: newMainlineIds,
      },
      newNodeId,
      move: moveResult,
    };
  }

  /**
   * Attaches an evaluation and classification to a node.
   */
  public static setNodeEval(
    state: MoveTreeState,
    nodeId: string,
    evaluation: PositionEvaluation,
    classification?: MoveClassification
  ): MoveTreeState {
    const node = state.nodes[nodeId];
    if (!node) return state;

    const updatedNode: MoveNode = {
      ...node,
      eval: evaluation,
      classification: classification || node.classification,
    };

    return {
      ...state,
      nodes: {
        ...state.nodes,
        [nodeId]: updatedNode,
      },
    };
  }

  /**
   * Gets the sequence of nodes along the mainline from root to end.
   */
  public static getMainlineNodes(state: MoveTreeState): MoveNode[] {
    return state.mainlineIds.map((id) => state.nodes[id]).filter(Boolean);
  }

  /**
   * Gets the path of nodes leading from root to the specified node ID.
   */
  public static getPathToNode(state: MoveTreeState, nodeId: string): MoveNode[] {
    const path: MoveNode[] = [];
    let current: MoveNode | undefined = state.nodes[nodeId];

    while (current && current.id !== state.rootId) {
      path.unshift(current);
      current = current.parentId ? state.nodes[current.parentId] : undefined;
    }

    return path;
  }

  /**
   * Alias for getPathToNode for compatibility.
   */
  public static getPathToRoot(state: MoveTreeState, nodeId: string): MoveNode[] {
    return this.getPathToNode(state, nodeId);
  }

  /**
   * Navigates to the next move along the mainline or primary variation.
   */
  public static getNextNode(state: MoveTreeState): MoveNode | null {
    const current = state.nodes[state.currentNodeId];
    if (!current || current.children.length === 0) return null;
    return state.nodes[current.children[0]] || null;
  }

  /**
   * Navigates to the parent move.
   */
  public static getPreviousNode(state: MoveTreeState): MoveNode | null {
    const current = state.nodes[state.currentNodeId];
    if (!current || !current.parentId) return null;
    return state.nodes[current.parentId] || null;
  }
}
