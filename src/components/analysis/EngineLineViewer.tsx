import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { EngineSelector } from '../common/EngineSelector';
import { Loader2 } from 'lucide-react';

export const EngineLineViewer: React.FC = () => {
  // Narrow selector: only lines and depth. bestMove and fen change on every engine tick
  // but EngineLineViewer doesn't use them — this prevents spurious re-renders at ~16 fps.
  const liveEval = useAppStore(
    useShallow((state) =>
      state.liveEval
        ? { lines: state.liveEval.lines, depth: state.liveEval.depth }
        : null
    )
  );
  const isEngineThinking = useAppStore((state) => state.isEngineThinking);

  const hasLines = liveEval && liveEval.lines && liveEval.lines.length > 0;

  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        backgroundColor: 'var(--bg-inset)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Header: Engine Selector & Search Depth */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12.5px',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--hairline)',
          paddingBottom: '10px',
        }}
      >
        <EngineSelector variant="compact" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {liveEval?.depth ? `Depth ${liveEval.depth}` : 'Ready'}
        </span>
      </div>

      {/* Body: Lines or Idle/Calculating State */}
      {!hasLines ? (
        <div
          style={{
            padding: '16px 12px',
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {isEngineThinking ? (
            <>
              <Loader2 size={14} className="animate-spin" color="var(--accent-strong)" />
              <span>Engine is calculating&hellip;</span>
            </>
          ) : (
            <span>Engine ready. Select or play a move to analyze.</span>
          )}
        </div>
      ) : (

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {liveEval.lines.map((line) => {
          let scoreText = '0.0';
          if (line.type === 'mate') {
            const mateDist = Math.abs(line.score);
            scoreText = line.score > 0 ? (mateDist === 0 ? '+M' : `+M${mateDist}`) : (mateDist === 0 ? '-M' : `-M${mateDist}`);
          } else {
            const pawns = (Math.abs(line.score) / 100).toFixed(1);
            scoreText = line.score > 0 ? `+${pawns}` : line.score < 0 ? `-${pawns}` : '0.0';
          }

          const isPositive = line.score > 0;

          return (
            <div
              key={line.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13.5px',
                padding: '7px 9px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-wash)',
                border: '1px solid var(--hairline)',
              }}
            >
              {/* Score Badge */}
              <span
                style={{
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: isPositive ? 'var(--positive-wash)' : 'var(--negative-wash)',
                  color: isPositive ? 'var(--positive)' : 'var(--negative)',
                  border: isPositive ? '1px solid var(--positive-border)' : '1px solid var(--negative-border)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  flexShrink: 0,
                  minWidth: '46px',
                  textAlign: 'center',
                }}
              >
                {scoreText}
              </span>

              {/* Principal Variation moves string */}
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                  wordBreak: 'break-all',
                }}
              >
                {line.pv.slice(0, 7).join(' ')}
              </span>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
