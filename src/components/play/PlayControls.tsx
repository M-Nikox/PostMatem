import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getStockfishElo } from '../../core/engine/stockfishElo';
import { Flag, FileDown, FileUp, Sparkles } from 'lucide-react';
import { getAssetPath } from '../../utils/paths';

export const PlayControls: React.FC = () => {
  const mode = useAppStore((state) => state.mode);
  const engineLevel = useAppStore((state) => state.engineLevel);
  const setEngineLevel = useAppStore((state) => state.setEngineLevel);
  const startNewGame = useAppStore((state) => state.startNewGame);
  const resignGame = useAppStore((state) => state.resignGame);
  const runPostMortemAnalysis = useAppStore((state) => state.runPostMortemAnalysis);
  const exportPgn = useAppStore((state) => state.exportPgn);
  const loadPgn = useAppStore((state) => state.loadPgn);
  const isBatchRunning = useAppStore((state) => state.isBatchRunning);
  const batchProgress = useAppStore((state) => state.batchProgress);

  const [isPgnModalOpen, setIsPgnModalOpen] = useState(false);
  const [pgnInput, setPgnInput] = useState('');

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

  const handleImportPgn = () => {
    if (pgnInput.trim()) {
      loadPgn(pgnInput.trim());
      setIsPgnModalOpen(false);
      setPgnInput('');
    }
  };

  const levelTier =
    engineLevel <= 5 ? 'Beginner' : engineLevel <= 10 ? 'Intermediate' : engineLevel <= 15 ? 'Advanced' : 'Grandmaster';
  const stockfishElo = getStockfishElo(engineLevel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Engine Difficulty */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={getAssetPath('icons/stockfish.webp')}
              alt="Stockfish"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            />
            <span>Stockfish level</span>
          </span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {engineLevel} <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>&middot; {levelTier} ({stockfishElo} Elo)</span>
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={engineLevel}
          onChange={(e) => setEngineLevel(parseInt(e.target.value, 10))}
          className="pm-slider"
        />
      </div>

      {/* New Game — plain word choice, not two competing boxes */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: '14px' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>New game as</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
          <ColorChoice glyph="♔" label="White" onClick={() => startNewGame('white')} />
          <span style={{ color: 'var(--hairline-strong)' }}>/</span>
          <ColorChoice glyph="♚" label="Black" onClick={() => startNewGame('black')} />
        </div>
      </div>

      {/* Review Game — the one true primary action in this panel */}
      <button
        onClick={() => runPostMortemAnalysis(14)}
        disabled={isBatchRunning}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '9px',
          padding: '13px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          backgroundColor: isBatchRunning ? 'var(--bg-wash-strong)' : 'var(--positive)',
          color: isBatchRunning ? 'var(--text-tertiary)' : '#141410',
          fontSize: '15px',
          fontWeight: 700,
          cursor: isBatchRunning ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s ease',
        }}
      >
        <Sparkles size={17} />
        <span>{isBatchRunning ? `Analyzing (${batchProgress}%)...` : 'Review Game'}</span>
      </button>

      {/* Utility row — ghost text links, no boxes */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--hairline)',
          paddingTop: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '22px' }}>
          <UtilityLink icon={<FileDown size={16} />} label="Export PGN" onClick={handleExport} />
          <UtilityLink icon={<FileUp size={16} />} label="Import" onClick={() => setIsPgnModalOpen(true)} />
        </div>

        {mode === 'PLAY' && (
          <UtilityLink icon={<Flag size={16} />} label="Resign" onClick={resignGame} tone="negative" />
        )}
      </div>

      {/* PGN Import Modal Dialog */}
      {isPgnModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setIsPgnModalOpen(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '540px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Import Chess Game (PGN)
            </h3>
            <textarea
              rows={8}
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="Paste PGN here (e.g., 1. e4 e5 2. Nf3 Nc6 3. Bb5...)"
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-inset)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '12px',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsPgnModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--hairline-strong)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportPgn}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Load Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ColorChoice: React.FC<{ glyph: string; label: string; onClick: () => void }> = ({ glyph, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      padding: '2px 0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--text-primary)',
      borderBottom: '1px solid transparent',
      transition: 'border-color 0.15s ease, color 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderBottomColor = 'var(--accent)';
      e.currentTarget.style.color = 'var(--accent-strong)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderBottomColor = 'transparent';
      e.currentTarget.style.color = 'var(--text-primary)';
    }}
  >
    <span style={{ fontSize: '16px' }}>{glyph}</span>
    <span>{label}</span>
  </button>
);

const UtilityLink: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; tone?: 'negative' }> = ({
  icon,
  label,
  onClick,
  tone,
}) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      padding: '4px 0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13.5px',
      fontWeight: 600,
      color: tone === 'negative' ? 'var(--negative)' : 'var(--text-secondary)',
      transition: 'color 0.15s ease',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = tone === 'negative' ? '#C25D4C' : 'var(--text-primary)')}
    onMouseLeave={(e) => (e.currentTarget.style.color = tone === 'negative' ? 'var(--negative)' : 'var(--text-secondary)')}
  >
    {icon}
    <span>{label}</span>
  </button>
);
