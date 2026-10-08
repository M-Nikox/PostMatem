import React, { useMemo, useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { useAppStore } from '../../store/useAppStore';
import { MoveClassificationType } from '../../core/analysis/types';
import { WinRateMath } from '../../core/analysis/winRate';
import { ClassificationIcon } from '../common/ClassificationIcon';
import { MoveGraph } from '../../core/tree/moveGraph';
import { Sparkles, Share2, Download } from 'lucide-react';
import { ShareCardModal } from './ShareCardModal';

export const GameReviewHeader: React.FC = () => {
  const analysisReport = useAppStore((state) => state.analysisReport);
  const headers = useAppStore((state) => state.headers);
  const mistakeWorkout = useAppStore((state) => state.mistakeWorkout);
  const startMistakeWorkout = useAppStore((state) => state.startMistakeWorkout);
  const orientation = useAppStore((state) => state.orientation);
  const playerColor = useAppStore((state) => state.playerColor);
  const mode = useAppStore((state) => state.mode);
  const treeState = useAppStore((state) => state.treeState);
  const navigateToNode = useAppStore((state) => state.navigateToNode);
  const exportPgn = useAppStore((state) => state.exportPgn);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const mainline = useMemo(() => MoveGraph.getMainlineNodes(treeState), [treeState]);
  const currentPlyIndex = useMemo(
    () => mainline.findIndex((n) => n.id === treeState.currentNodeId),
    [mainline, treeState.currentNodeId]
  );

  const targetColor = mode === 'PLAY' ? playerColor : orientation;
  const userCounts = analysisReport?.classificationCounts?.[targetColor];
  const userMistakes = userCounts
    ? (userCounts[MoveClassificationType.BLUNDER] || 0) +
      (userCounts[MoveClassificationType.MISS] || 0) +
      (userCounts[MoveClassificationType.MISTAKE] || 0) +
      (userCounts[MoveClassificationType.INACCURACY] || 0)
    : 0;

  const totalMistakes = analysisReport
    ? (analysisReport.classificationCounts.white[MoveClassificationType.BLUNDER] || 0) +
      (analysisReport.classificationCounts.white[MoveClassificationType.MISS] || 0) +
      (analysisReport.classificationCounts.white[MoveClassificationType.MISTAKE] || 0) +
      (analysisReport.classificationCounts.white[MoveClassificationType.INACCURACY] || 0) +
      (analysisReport.classificationCounts.black[MoveClassificationType.BLUNDER] || 0) +
      (analysisReport.classificationCounts.black[MoveClassificationType.MISS] || 0) +
      (analysisReport.classificationCounts.black[MoveClassificationType.MISTAKE] || 0) +
      (analysisReport.classificationCounts.black[MoveClassificationType.INACCURACY] || 0)
    : 0;

  const mistakeCount = userMistakes > 0 ? userMistakes : totalMistakes;

  // Calibrated Advantage Graph (0..1000 X, 0..100 Y, Centerline at Y=50)
  const chartData = useMemo(() => {
    if (!analysisReport || !analysisReport.evaluations?.length) return null;
    const evals = analysisReport.evaluations;
    const n = Math.min(evals.length, mainline.length);
    if (n < 2) return null;

    const points = [];

    for (let i = 0; i < n; i++) {
      const ev = evals[i];
      const node = mainline[i];
      const line = ev?.lines?.[0];

      let scoreLabel = '0.0';
      let winRate = 50;

      // Check if this position is terminal checkmate (Stockfish outputs 0 lines on checkmate)
      const targetFen = node?.fen || ev?.fen;
      let isTerminalCheckmate = false;
      let isWhiteMated = false;

      if (targetFen) {
        try {
          const chess = new Chess(targetFen);
          if (chess.isCheckmate()) {
            isTerminalCheckmate = true;
            isWhiteMated = chess.turn() === 'w';
          }
        } catch {}
      }

      if (isTerminalCheckmate) {
        winRate = isWhiteMated ? 0 : 100;
        scoreLabel = isWhiteMated ? '-M' : '+M';
      } else if (line) {
        winRate = WinRateMath.calculateWhiteWinRate(line.score, line.type);
        if (line.type === 'mate') {
          const m = Math.abs(line.score);
          scoreLabel = line.score > 0 ? (m === 0 ? '+M' : `+M${m}`) : (m === 0 ? '-M' : `-M${m}`);
        } else {
          const pawns = (Math.abs(line.score) / 100).toFixed(1);
          scoreLabel = line.score > 0 ? `+${pawns}` : line.score < 0 ? `-${pawns}` : '0.0';
        }
      }

      // X: 0 to 1000
      const x = (i / Math.max(1, n - 1)) * 1000;
      // Y: 50 is center (0.0). WinRate 100 -> Y=8 (top). WinRate 0 -> Y=92 (bottom).
      const y = 50 - ((winRate - 50) / 50) * 42;

      points.push({
        x,
        y,
        scoreLabel,
        winRate,
        san: node?.san || (i === 0 ? 'Start' : ''),
        moveNumber: node?.moveNumber || 0,
        isWhite: node?.isWhite ?? false,
        nodeId: node?.id || '',
      });
    }

    const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    // Polygon starts at (0, 50), traces points, and returns to (1000, 50)
    const polygon = `0,50 ${polyline} 1000,50`;

    return { points, polyline, polygon };
  }, [analysisReport, mainline]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartData || chartData.points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0, Math.min(1, relX));
    const idx = Math.round(clampedX * (chartData.points.length - 1));
    setHoverIdx(idx);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
  };

  const handleClick = () => {
    if (hoverIdx !== null && chartData?.points[hoverIdx]) {
      navigateToNode(chartData.points[hoverIdx].nodeId);
    }
  };

  const handleDownloadPgn = () => {
    try {
      const pgn = exportPgn();
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const white = (headers.White || 'White').replace(/\s+/g, '_');
      const black = (headers.Black || 'Black').replace(/\s+/g, '_');
      a.href = url;
      a.download = `PostMatem_${white}_vs_${black}_Annotated.pgn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[GameReviewHeader] Failed to export PGN:', err);
    }
  };

  if (!analysisReport) return null;

  const activePoint =
    chartData && currentPlyIndex >= 0 && currentPlyIndex < chartData.points.length
      ? chartData.points[currentPlyIndex]
      : null;
  const hoverPoint =
    chartData && hoverIdx !== null && hoverIdx < chartData.points.length
      ? chartData.points[hoverIdx]
      : null;
  const displayPoint = hoverPoint || activePoint;

  const white = headers.White || 'White';
  const black = headers.Black || 'Black';

  const rows: { type: MoveClassificationType; label: string; glyph: string; color: string }[] = [
    { type: MoveClassificationType.BRILLIANT, label: 'Brilliant', glyph: '!!', color: '#4FA8A0' },
    { type: MoveClassificationType.GREAT, label: 'Great', glyph: '!', color: '#6E8FBF' },
    { type: MoveClassificationType.BEST, label: 'Best', glyph: '\u2605', color: '#7C9A5C' },
    { type: MoveClassificationType.EXCELLENT, label: 'Excellent', glyph: '\u2713', color: '#8FA873' },
    { type: MoveClassificationType.GOOD, label: 'Good', glyph: '\u2022', color: '#9A948A' },
    { type: MoveClassificationType.BOOK, label: 'Book', glyph: '📖', color: '#A68A5B' },
    { type: MoveClassificationType.INACCURACY, label: 'Inaccuracy', glyph: '?', color: '#C99A3E' },
    { type: MoveClassificationType.MISTAKE, label: 'Mistake', glyph: '?!', color: '#C97D3E' },
    { type: MoveClassificationType.MISS, label: 'Miss', glyph: '✕', color: '#A8402F' },
    { type: MoveClassificationType.BLUNDER, label: 'Blunder', glyph: '??', color: '#B0483A' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
      {/* Interactive Pro-Grade Advantage Graph */}
      {chartData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              padding: '0 2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                Advantage
              </span>
              {displayPoint && (
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {displayPoint.moveNumber > 0
                    ? `${displayPoint.moveNumber}${displayPoint.isWhite ? '.' : '...'} ${displayPoint.san}`
                    : 'Start'}{' '}
                  <span
                    style={{
                      color:
                        displayPoint.winRate > 52
                          ? 'var(--positive, #4FA8A0)'
                          : displayPoint.winRate < 48
                          ? 'var(--negative, #B0483A)'
                          : 'var(--text-secondary)',
                      marginLeft: '4px',
                    }}
                  >
                    {displayPoint.scoreLabel}
                  </span>
                </span>
              )}
            </div>
            <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', opacity: 0.8 }}>
              Click to jump
            </span>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 'var(--radius-sm, 6px)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-inset)',
              border: '1px solid var(--hairline-strong)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
            }}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              style={{
                width: '100%',
                height: '66px',
                display: 'block',
                cursor: 'crosshair',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              <defs>
                <linearGradient id="evalAreaGradient" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.35" />
                  <stop offset="45%" stopColor="var(--positive)" stopOpacity="0.08" />
                  <stop offset="50%" stopColor="transparent" />
                  <stop offset="55%" stopColor="var(--negative)" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="var(--negative)" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Faint Background Guide Labels */}
              <text x="12" y="24" fill="var(--text-tertiary)" opacity="0.5" fontSize="18" fontWeight="600" fontFamily="sans-serif">
                + White
              </text>
              <text x="12" y="88" fill="var(--text-tertiary)" opacity="0.5" fontSize="18" fontWeight="600" fontFamily="sans-serif">
                - Black
              </text>

              {/* Equilibrium Centerline (y=50, 0.00 eval) */}
              <line
                x1="0"
                y1="50"
                x2="1000"
                y2="50"
                stroke="var(--hairline-strong)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Advantage Area Fill (fills between centerline and curve) */}
              <polygon points={chartData.polygon} fill="url(#evalAreaGradient)" stroke="none" />

              {/* Main Advantage Polyline */}
              <polyline
                points={chartData.polyline}
                fill="none"
                stroke="var(--text-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Current Move Indicator (Hairline + Dot) */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1="0"
                    x2={activePoint.x}
                    y2="100"
                    stroke="var(--accent-strong)"
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="4"
                    fill="var(--accent-strong)"
                    stroke="var(--bg-app)"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Hover Cursor (when scrubbing with mouse) */}
              {hoverPoint && hoverPoint !== activePoint && (
                <g>
                  <line
                    x1={hoverPoint.x}
                    y1="0"
                    x2={hoverPoint.x}
                    y2="100"
                    stroke="var(--accent)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    strokeOpacity="0.75"
                  />
                  <circle
                    cx={hoverPoint.x}
                    cy={hoverPoint.y}
                    r="4"
                    fill="var(--accent)"
                    stroke="var(--bg-app)"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Accuracy line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '14px', borderBottom: '1px solid var(--hairline)' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{white}</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
            Elo {analysisReport.whiteEstimatedElo || '\u2014'} &middot; ACPL {analysisReport.whiteAcpl}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Result</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {headers.Result || '\u2014'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{black}</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
            Elo {analysisReport.blackEstimatedElo || '\u2014'} &middot; ACPL {analysisReport.blackAcpl}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '-10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '19px', color: 'var(--positive)' }}>
          {analysisReport.whiteAccuracy}%
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '19px', color: 'var(--positive)' }}>
          {analysisReport.blackAccuracy}%
        </span>
      </div>

      {/* Practice / Retry Mistakes Button */}
      {mistakeCount > 0 && !mistakeWorkout?.isActive && (
        <button
          onClick={() => startMistakeWorkout()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--accent-border, rgba(124, 90, 62, 0.35))',
            backgroundColor: 'var(--bg-wash-strong)',
            color: 'var(--accent-strong)',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-wash)';
            e.currentTarget.style.borderColor = 'var(--accent-strong)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
            e.currentTarget.style.borderColor = 'var(--accent-border, rgba(124, 90, 62, 0.35))';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Sparkles size={15} />
          <span>Retry Mistakes ({mistakeCount})</span>
        </button>
      )}

      {/* Share & Export Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          onClick={() => setIsShareModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--hairline-strong)',
            backgroundColor: 'var(--bg-wash-strong)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
        >
          <Share2 size={14} style={{ color: 'var(--positive)' }} />
          <span>Share Card</span>
        </button>

        <button
          onClick={handleDownloadPgn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--hairline-strong)',
            backgroundColor: 'var(--bg-wash-strong)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
        >
          <Download size={14} style={{ color: 'var(--gold)' }} />
          <span>Export PGN</span>
        </button>
      </div>

      {/* Classification breakdown — a plain table, not a grid of stat-cards */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <tbody>
          {rows.map((row) => {
            const wCount = analysisReport.classificationCounts.white[row.type] || 0;
            const bCount = analysisReport.classificationCounts.black[row.type] || 0;
            if (wCount === 0 && bCount === 0) return null;
            return (
              <tr key={row.type} style={{ borderTop: '1px solid var(--hairline)' }}>
                <td style={{ padding: '8px 0', width: '30px', verticalAlign: 'middle' }}>
                  <ClassificationIcon type={row.type} size={18} />
                </td>
                <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>{row.label}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', width: '36px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {wCount}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', width: '18px', color: 'var(--text-tertiary)' }}>/</td>
                <td style={{ padding: '8px 0', textAlign: 'left', width: '36px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {bCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Shareable Summary Card & Annotated PGN Modal */}
      <ShareCardModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
};
