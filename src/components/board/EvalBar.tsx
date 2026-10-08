import React from 'react';
import { Chess } from 'chess.js';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { WinRateMath } from '../../core/analysis/winRate';

interface EvalBarProps {
  height?: number | null;
}

export const EvalBar: React.FC<EvalBarProps> = ({ height }) => {
  // Narrow selector: only the three fields EvalBar reads from liveEval.
  // Prevents re-renders on bestMove changes or any other field the engine updates frequently.
  const liveEval = useAppStore(
    useShallow((state) =>
      state.liveEval
        ? { fen: state.liveEval.fen, lines: state.liveEval.lines, depth: state.liveEval.depth }
        : null
    )
  );
  const showEvalBar = useAppStore((state) => state.showEvalBar);
  const orientation = useAppStore((state) => state.orientation);
  // Narrow treeState selector: only the current node (by identity), not the entire node map.
  const currentNode = useAppStore(
    useShallow((state) => state.treeState.nodes[state.treeState.currentNodeId] ?? null)
  );
  let whiteWinPercent = 50;

  if (!showEvalBar) return null;

  let scoreLabel = '0.0';
  let isMate = false;

  // 1. Check if the active position on the board is a terminal game over (Checkmate or Draw)
  let isTerminal = false;
  if (currentNode) {
    try {
      const chess = new Chess(currentNode.fen);
      if (chess.isGameOver()) {
        isTerminal = true;
        if (chess.isCheckmate()) {
          const isWhiteMated = chess.turn() === 'w';
          whiteWinPercent = isWhiteMated ? 0 : 100;
          scoreLabel = isWhiteMated ? '-M' : '+M';
          isMate = true;
        } else {
          whiteWinPercent = 50;
          scoreLabel = '0.0';
        }
      }
    } catch {}
  }

  // 2. If not game over, extract score from matching liveEval or node eval
  if (!isTerminal) {
    const normalizeFen = (f?: string | null) => (f ? f.trim().split(/\s+/).slice(0, 4).join(' ') : '');
    const isMatchingFen =
      liveEval && currentNode && (liveEval.fen === currentNode.fen || normalizeFen(liveEval.fen) === normalizeFen(currentNode.fen));

    // Only use liveEval if it matches the current node's FEN, or fallback to currentNode.eval
    const activeEval =
      (currentNode && currentNode.eval) ||
      (isMatchingFen ? liveEval : null) ||
      (liveEval && !currentNode ? liveEval : null);

    if (activeEval && activeEval.lines && activeEval.lines.length > 0) {
      const topLine = activeEval.lines[0];
      whiteWinPercent = WinRateMath.calculateWhiteWinRate(topLine.score, topLine.type);

      if (topLine.type === 'mate') {
        isMate = true;
        const mateDist = Math.abs(topLine.score);
        scoreLabel = topLine.score > 0 ? (mateDist === 0 ? '+M' : `+M${mateDist}`) : (mateDist === 0 ? '-M' : `-M${mateDist}`);
      } else {
        const pawns = (Math.abs(topLine.score) / 100).toFixed(1);
        scoreLabel = topLine.score > 0 ? `+${pawns}` : topLine.score < 0 ? `-${pawns}` : '0.0';
      }
    }
  }

  // Determine bottom player color based on orientation
  const isBottomWhite = orientation === 'white';
  const bottomWinPercent = isBottomWhite ? whiteWinPercent : 100 - whiteWinPercent;
  const clampedBottomPercent = Math.max(4, Math.min(96, bottomWinPercent));
  const isBottomFavored = bottomWinPercent >= 50;
  const favoredIsWhite = isBottomWhite ? isBottomFavored : !isBottomFavored;

  // Matte warm tones: chalk for White's advantage, basalt for Black's — no gradients, no glow.
  const whiteFill = '#DCD3C2';
  const blackFill = '#2A2725';

  return (
    <div
      className="pm-evalbar-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '30px',
        height: height ? `${height}px` : '100%',
        minHeight: height ? `${height}px` : '100%',
        maxHeight: height ? `${height}px` : '100%',
        alignSelf: 'stretch',
        backgroundColor: 'var(--bg-inset)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'var(--shadow-board-inset)',
        userSelect: 'none',
        flexShrink: 0,
      }}
      title={`Evaluation: ${scoreLabel} (White Win: ${Math.round(whiteWinPercent)}%)`}
    >
      {/* 50% Neutral Equilibrium Tick Line */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* Top Player Advantage Fill */}
      <div
        style={{
          flex: 1,
          backgroundColor: isBottomWhite ? blackFill : whiteFill,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease',
        }}
      >
        {!isBottomFavored && (
          <span
            style={{
              position: 'absolute',
              top: '7px',
              fontSize: '9.5px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: favoredIsWhite ? '#1A1A1A' : (isMate ? '#B0483A' : '#C9C3B8'),
              letterSpacing: '-0.2px',
              zIndex: 6,
            }}
          >
            {scoreLabel}
          </span>
        )}
      </div>

      {/* Bottom Player Advantage Fill */}
      <div
        className="eval-bar-fill"
        style={{
          height: `${clampedBottomPercent}%`,
          backgroundColor: isBottomWhite ? whiteFill : blackFill,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          transition: 'height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {isBottomFavored && (
          <span
            style={{
              position: 'absolute',
              bottom: '7px',
              fontSize: '9.5px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: favoredIsWhite ? '#1A1A1A' : (isMate ? '#B0483A' : '#C9C3B8'),
              letterSpacing: '-0.2px',
              zIndex: 6,
            }}
          >
            {scoreLabel}
          </span>
        )}
      </div>
    </div>
  );
};
