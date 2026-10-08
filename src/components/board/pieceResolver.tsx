import { CustomPieceFn } from 'react-chessboard/dist/chessboard/types';
import { getAssetPath } from '../../utils/paths';

export type PieceSetId = 'classic' | 'outline' | 'wood' | 'flat' | 'default' | 'cburnett';

export interface PieceSetOption {
  id: PieceSetId;
  name: string;
  description: string;
}

export const PIECE_SETS: PieceSetOption[] = [
  { id: 'classic', name: 'Classic Vector', description: 'Clean solid Staunton vectors with subtle shading' },
  { id: 'outline', name: 'Line-Art Outline', description: 'Modern minimalist contour pieces' },
  { id: 'wood', name: 'Wood Grain', description: 'Warm timber-textured pieces' },
  { id: 'flat', name: 'Flat 2D', description: 'Minimalist high-contrast silhouettes' },
  { id: 'default', name: 'Standard Web', description: 'Default @react-chessboard vector pieces' },
];

export const PIECE_PATHS: Record<Exclude<PieceSetId, 'default'>, Record<string, string>> = {
  classic: {
    wP: '/pieces/White/Pawn White.svg',
    wN: '/pieces/White/Knight White.svg',
    wB: '/pieces/White/Bishop White.svg',
    wR: '/pieces/White/Rook White.svg',
    wQ: '/pieces/White/Queen White.svg',
    wK: '/pieces/White/King White.svg',
    bP: '/pieces/Black/Pawn Black.svg',
    bN: '/pieces/Black/Knight Black.svg',
    bB: '/pieces/Black/Bishop Black.svg',
    bR: '/pieces/Black/Rook Black.svg',
    bQ: '/pieces/Black/Queen Black.svg',
    bK: '/pieces/Black/King Black.svg',
  },
  outline: {
    wP: '/pieces/White/Pawn White Outline.svg',
    wN: '/pieces/White/Knight White Outline.svg',
    wB: '/pieces/White/Bishop White Outline.svg',
    wR: '/pieces/White/Rook White Outline.svg',
    wQ: '/pieces/White/Queen White Outline.svg',
    wK: '/pieces/White/King White Outline.svg',
    bP: '/pieces/Black/Pawn Black Outline.svg',
    bN: '/pieces/Black/Knight Black Outline.svg',
    bB: '/pieces/Black/Bishop Black Outline.svg',
    bR: '/pieces/Black/Rook Black Outline.svg',
    bQ: '/pieces/Black/Queen Black Outline.svg',
    bK: '/pieces/Black/King Black Outline.svg',
  },
  wood: {
    wP: '/pieces/WhiteWood/Pawn White Wood.svg',
    wN: '/pieces/WhiteWood/Knight White Wood.svg',
    wB: '/pieces/WhiteWood/Bishop White Wood.svg',
    wR: '/pieces/WhiteWood/Rook White Wood.svg',
    wQ: '/pieces/WhiteWood/Queen White Wood.svg',
    wK: '/pieces/WhiteWood/King White Wood.svg',
    bP: '/pieces/BlackWood/Pawn Black Wood.svg',
    bN: '/pieces/BlackWood/Knight Black Wood.svg',
    bB: '/pieces/BlackWood/Bishop Black Wood.svg',
    bR: '/pieces/BlackWood/Rook Black Wood.svg',
    bQ: '/pieces/BlackWood/Queen Black Wood.svg',
    bK: '/pieces/BlackWood/King Black Wood.svg',
  },
  flat: {
    wP: '/pieces/Flat/Pawn Flat White.svg',
    wN: '/pieces/Flat/Knight Flat White.svg',
    wB: '/pieces/Flat/Bishop Flat White.svg',
    wR: '/pieces/Flat/Rook Flat White.svg',
    wQ: '/pieces/Flat/Queen Flat White.svg',
    wK: '/pieces/Flat/King Flat White.svg',
    bP: '/pieces/Flat/Pawn Flat Black.svg',
    bN: '/pieces/Flat/Knight Flat Black.svg',
    bB: '/pieces/Flat/Bishop Flat Black.svg',
    bR: '/pieces/Flat/Rook Flat Black.svg',
    bQ: '/pieces/Flat/Queen Flat Black.svg',
    bK: '/pieces/Flat/King Flat Black.svg',
  },
  cburnett: {
    wP: '/pieces/cburnett/wp.svg',
    wN: '/pieces/cburnett/wkn.svg',
    wB: '/pieces/cburnett/wb.svg',
    wR: '/pieces/cburnett/wr.svg',
    wQ: '/pieces/cburnett/wq.svg',
    wK: '/pieces/cburnett/wk.svg',
    bP: '/pieces/cburnett/bp.svg',
    bN: '/pieces/cburnett/bkn.svg',
    bB: '/pieces/cburnett/bb.svg',
    bR: '/pieces/cburnett/br.svg',
    bQ: '/pieces/cburnett/bq.svg',
    bK: '/pieces/cburnett/bk.svg',
  },
};


/**
 * Returns the SVG asset path for a piece key (e.g. 'wP', 'bN') and given piece set.
 */
export function getPieceSvg(pieceKey: string, pieceSet: PieceSetId = 'classic'): string {
  // 'default' maps to the cburnett set (react-chessboard's actual default pieces)
  const set = pieceSet === 'default' ? 'cburnett' : pieceSet;
  const rawPath = PIECE_PATHS[set]?.[pieceKey] || PIECE_PATHS.classic[pieceKey] || '';
  return getAssetPath(rawPath);
}

/**
 * Returns a customPieces dictionary compatible with react-chessboard.
 * If pieceSet is 'default', returns undefined to use react-chessboard's built-in SVGs.
 */
export function getCustomPieces(pieceSet: PieceSetId): Record<string, CustomPieceFn> | undefined {
  if (pieceSet === 'default') {
    return undefined;
  }

  const paths = PIECE_PATHS[pieceSet];
  if (!paths) return undefined;

  const customPieces: Record<string, CustomPieceFn> = {};

  for (const [pieceKey, path] of Object.entries(paths)) {
    const resolvedPath = getAssetPath(path);
    customPieces[pieceKey] = ({ squareWidth, isDragging }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {/* Lift micro-interaction: piece scales up + gains a soft diffuse shadow when picked up */}
        <div className={`pm-piece${isDragging ? ' pm-piece--lifted' : ''}`}>
          <img src={resolvedPath} alt={pieceKey} draggable={false} />
        </div>
      </div>
    );
  }

  return customPieces;
}
