import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { GameRepository } from '../../core/storage/gameRepository';
import { StoredGame } from '../../core/storage/db';
import { X, Trash2, Calendar, User, Globe } from 'lucide-react';

interface GameLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
}

export const GameLibraryModal: React.FC<GameLibraryModalProps> = ({ isOpen, onClose, onOpenImport }) => {
  const [games, setGames] = useState<StoredGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadGameFromStorage = useAppStore((state) => state.loadGameFromStorage);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const all = await GameRepository.getAllGames();
      setGames(all);
    } catch (err) {
      console.error('[Library] Failed to fetch games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGames();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectGame = async (id: string) => {
    await loadGameFromStorage(id);
    onClose();
  };

  const handleDeleteGame = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await GameRepository.deleteGame(id);
    setGames((prev) => prev.filter((g) => g.id !== id));
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '560px',
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--hairline)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Saved Games Library
            </h3>
            {onOpenImport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--hairline-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Globe size={12} style={{ color: 'var(--accent)' }} />
                <span>Import Online</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Game List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>Loading games...</div>
          ) : games.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                padding: '32px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span>No games saved yet. Play a match or import from Lichess / Chess.com!</span>
              {onOpenImport && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenImport();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Globe size={14} />
                  <span>Import Online Games</span>
                </button>
              )}
            </div>
          ) : (
            games.map((game, idx) => (
              <div
                key={game.id}
                onClick={() => handleSelectGame(game.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '13px 10px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--hairline)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-wash)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <User size={14} color="var(--accent-strong)" />
                    <span>{game.white.name} vs {game.black.name}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>({game.result})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {new Date(game.date).toLocaleDateString()}
                    </span>
                    <span>&middot; {game.moveCount} moves</span>
                    {game.analysisReport && (
                      <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
                        &middot; {game.analysisReport.whiteAccuracy}% / {game.analysisReport.blackAccuracy}% Acc
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteGame(e, game.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: 'var(--radius-xs)',
                  }}
                  title="Delete game"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
