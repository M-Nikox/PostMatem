import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trophy, Sparkles, FileDown, RotateCcw } from 'lucide-react';

export const GameOverModal: React.FC = () => {
  const mode = useAppStore((state) => state.mode);
  const headers = useAppStore((state) => state.headers);
  const playerColor = useAppStore((state) => state.playerColor);
  const engineLevel = useAppStore((state) => state.engineLevel);
  const runPostMortemAnalysis = useAppStore((state) => state.runPostMortemAnalysis);
  const exportPgn = useAppStore((state) => state.exportPgn);
  const startNewGame = useAppStore((state) => state.startNewGame);
  const setMode = useAppStore((state) => state.setMode);

  if (mode !== 'GAME_OVER') return null;

  const result = headers.Result || '*';
  let title = 'Game Finished';
  let subtitle = 'A hard-fought game!';
  let isWin = false;

  if (result === '1-0') {
    isWin = playerColor === 'white';
    title = isWin ? 'Victory' : 'Defeat';
    subtitle = 'White won by checkmate or resignation.';
  } else if (result === '0-1') {
    isWin = playerColor === 'black';
    title = isWin ? 'Victory' : 'Defeat';
    subtitle = 'Black won by checkmate or resignation.';
  } else if (result === '1/2-1/2') {
    title = 'Draw';
    subtitle = 'Game ended in a draw.';
  }

  const handleReview = () => {
    runPostMortemAnalysis();
  };

  const handleExport = () => {
    const pgn = exportPgn();
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostMatem_Game_${new Date().toISOString().split('T')[0]}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          padding: '30px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isWin ? 'var(--positive-wash)' : 'var(--accent-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isWin ? 'var(--positive)' : 'var(--accent-strong)',
          }}
        >
          <Trophy size={26} />
        </div>

        <div>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '25px',
              fontWeight: 600,
              
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{subtitle}</p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          {/* Review Game CTA */}
          <button
            onClick={handleReview}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--positive)',
              color: '#141410',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={18} />
            <span>Analyze Game (Game Review)</span>
          </button>

          {/* Export PGN */}
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-wash-strong)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid var(--hairline-strong)',
              cursor: 'pointer',
            }}
          >
            <FileDown size={16} />
            <span>Export PGN</span>
          </button>

          {/* Rematch / Dismiss */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => startNewGame(playerColor, engineLevel)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-3)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              <span>Rematch</span>
            </button>
            <button
              onClick={() => setMode('ANALYSIS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '9px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                border: '1px solid var(--hairline-strong)',
                cursor: 'pointer',
              }}
            >
              Explore Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
