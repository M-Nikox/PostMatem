import React, { useMemo } from 'react';
import { PieceSetId } from './pieceResolver';
import { PieceIcon } from './PieceIcon';

interface CapturedPiecesProps {
  playerColor: 'white' | 'black';
  fen: string;
  pieceSet?: PieceSetId;
  showDivider?: boolean;
}

const INITIAL_PIECES = { p: 8, n: 2, b: 2, r: 2, q: 1 } as const;
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 } as const;
const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q'] as const;

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  playerColor,
  fen,
  pieceSet = 'default',
  showDivider = true,
}) => {
  const { groups, advantage } = useMemo(() => {
    const currentWhite: Record<keyof typeof INITIAL_PIECES, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack: Record<keyof typeof INITIAL_PIECES, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const [piecePlacement] = (fen || '').split(' ');
    if (piecePlacement) {
      for (const char of piecePlacement) {
        if ('pnbrq'.includes(char)) {
          currentBlack[char as keyof typeof INITIAL_PIECES]++;
        } else if ('PNBRQ'.includes(char)) {
          currentWhite[char.toLowerCase() as keyof typeof INITIAL_PIECES]++;
        }
      }
    }

    let whiteMat = 0;
    let blackMat = 0;
    for (const t of PIECE_ORDER) {
      whiteMat += currentWhite[t] * PIECE_VALUES[t];
      blackMat += currentBlack[t] * PIECE_VALUES[t];
    }

    // White captures Black's pieces ('b'); Black captures White's pieces ('w')
    const capturedColor = playerColor === 'white' ? 'b' : 'w';
    const opponentCounts = playerColor === 'white' ? currentBlack : currentWhite;

    const groups: { type: string; pieceKey: string; count: number }[] = [];

    for (const t of PIECE_ORDER) {
      const lost = Math.max(0, INITIAL_PIECES[t] - opponentCounts[t]);
      if (lost > 0) {
        const pieceKey = `${capturedColor}${t.toUpperCase()}`;
        groups.push({ type: t, pieceKey, count: lost });
      }
    }

    const advantage =
      playerColor === 'white'
        ? Math.max(0, whiteMat - blackMat)
        : Math.max(0, blackMat - whiteMat);

    return { groups, advantage };
  }, [fen, playerColor]);

  if (groups.length === 0 && advantage === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        lineHeight: 1,
        userSelect: 'none',
        flexShrink: 0,
      }}
      title={`Material advantage: ${advantage > 0 ? `+${advantage}` : 'equal'}`}
    >
      {showDivider && (
        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--hairline-soft)', flexShrink: 0, marginRight: '2px' }} />
      )}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {groups.map((group) => (
        <div
          key={group.type}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: group.count }).map((_, idx) => (
            <PieceIcon
              key={idx}
              pieceKey={group.pieceKey}
              pieceSet={pieceSet}
              size={22}
              style={{
                marginLeft: idx === 0 ? '0px' : '-11px',
              }}
            />
          ))}
        </div>
      ))}
      </div>

      {advantage > 0 && (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--positive)',
            backgroundColor: 'var(--positive-wash)',
            border: '1px solid var(--positive-border)',
            borderRadius: '4px',
            padding: '1px 6px',
            marginLeft: '4px',
            lineHeight: '15px',
            letterSpacing: '0.2px',
          }}
        >
          +{advantage}
        </span>
      )}
    </div>
  );
};
