import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OnlineGameService, OnlineGameItem } from '../../core/online/onlineGameService';
import { GameRepository } from '../../core/storage/gameRepository';
import { StoredGame } from '../../core/storage/db';
import {
  X,
  Globe,
  Search,
  Loader2,
  Sparkles,
  Compass,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Swords,
  AlertCircle,
} from 'lucide-react';

interface OnlineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Platform = 'lichess' | 'chesscom';

const QUICK_PICKS: Record<Platform, string[]> = {
  lichess: ['MagnusCarlsen', 'DrNykterstein', 'penguingm1', 'RebeccaHarris'],
  chesscom: ['MagnusCarlsen', 'Hikaru', 'DanielNaroditsky', 'GothamChess'],
};

export const OnlineImportModal: React.FC<OnlineImportModalProps> = ({ isOpen, onClose }) => {
  const [platform, setPlatform] = useState<Platform>(() => {
    return (localStorage.getItem('pm_import_platform') as Platform) || 'lichess';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('pm_import_username') || '';
  });
  const [games, setGames] = useState<OnlineGameItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadPgn = useAppStore((state) => state.loadPgn);
  const runPostMortemAnalysis = useAppStore((state) => state.runPostMortemAnalysis);
  const setMode = useAppStore((state) => state.setMode);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pm_import_platform', platform);
  }, [platform]);

  useEffect(() => {
    if (username.trim()) {
      localStorage.setItem('pm_import_username', username.trim());
    }
  }, [username]);

  // Reset or re-fetch when opened if games are empty and username exists
  useEffect(() => {
    if (isOpen && games.length === 0 && username.trim()) {
      handleFetchGames(username.trim(), platform);
    }
  }, [isOpen]);

  const handleFetchGames = async (userToFetch: string, plat: Platform) => {
    const targetUser = userToFetch.trim();
    if (!targetUser) {
      setError(`Please enter a ${plat === 'lichess' ? 'Lichess' : 'Chess.com'} username.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setGames([]);

    try {
      let fetched: OnlineGameItem[] = [];
      if (plat === 'lichess') {
        fetched = await OnlineGameService.fetchLichessGames(targetUser, 15);
      } else {
        fetched = await OnlineGameService.fetchChessComGames(targetUser, 15);
      }

      if (fetched.length === 0) {
        setError(`No recent standard games found for "${targetUser}".`);
      } else {
        setGames(fetched);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch online games.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewGame = async (game: OnlineGameItem) => {
    if (!game.pgn) return;
    const ok = loadPgn(game.pgn);
    if (ok) {
      onClose();
      // Kicks off post-mortem batch analysis immediately
      setTimeout(() => {
        runPostMortemAnalysis();
      }, 50);
    }
  };

  const handleAnalyzeGame = (game: OnlineGameItem) => {
    if (!game.pgn) return;
    const ok = loadPgn(game.pgn);
    if (ok) {
      setMode('ANALYSIS');
      onClose();
    }
  };

  const handleSaveToLibrary = async (game: OnlineGameItem) => {
    if (!game.pgn) return;
    try {
      const storedGame: StoredGame = {
        id: `online_${game.platform}_${game.id}`,
        pgn: game.pgn,
        date: new Date(game.timestamp).toISOString(),
        headers: {
          Event: `${game.platform === 'lichess' ? 'Lichess' : 'Chess.com'} Game`,
          Site: game.url,
          Date: game.date,
          White: game.white.username,
          Black: game.black.username,
          WhiteElo: game.white.rating ? String(game.white.rating) : undefined,
          BlackElo: game.black.rating ? String(game.black.rating) : undefined,
          Result: game.result,
          TimeControl: game.timeControl,
        },
        result: game.result,
        white: {
          name: game.white.username,
          elo: game.white.rating,
        },
        black: {
          name: game.black.username,
          elo: game.black.rating,
        },
        moveCount: 0,
      };

      await GameRepository.saveGame(storedGame);
      setSavedIds((prev) => new Set(prev).add(game.id));
    } catch (err) {
      console.warn('[OnlineImportModal] Failed to save game to local library:', err);
    }
  };

  const handleCopyPgn = (game: OnlineGameItem) => {
    if (!game.pgn) return;
    navigator.clipboard.writeText(game.pgn);
    setCopiedId(game.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === game.id ? null : curr));
    }, 2000);
  };

  const handleQuickPick = (quickUser: string) => {
    setUsername(quickUser);
    handleFetchGames(quickUser, platform);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '92%',
          maxWidth: '720px',
          maxHeight: '88vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Globe size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Import Online Games
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Fetch recent matches from Lichess or Chess.com for 1-click Post-Mortem review
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls: Platform selector, Username input, Quick Picks */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Platform Tabs & Username Search */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Platform pills */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-surface)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
              }}
            >
              <button
                onClick={() => {
                  setPlatform('lichess');
                  if (username.trim()) handleFetchGames(username.trim(), 'lichess');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: platform === 'lichess' ? 600 : 500,
                  color: platform === 'lichess' ? '#fff' : 'var(--text-secondary)',
                  backgroundColor: platform === 'lichess' ? 'var(--accent)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Lichess.org</span>
              </button>
              <button
                onClick={() => {
                  setPlatform('chesscom');
                  if (username.trim()) handleFetchGames(username.trim(), 'chesscom');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: platform === 'chesscom' ? 600 : 500,
                  color: platform === 'chesscom' ? '#fff' : 'var(--text-secondary)',
                  backgroundColor: platform === 'chesscom' ? '#81b64c' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Chess.com</span>
              </button>
            </div>

            {/* Username Input & Fetch Button */}
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '8px' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--hairline-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px',
                }}
              >
                <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={`Enter ${platform === 'lichess' ? 'Lichess' : 'Chess.com'} username...`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFetchGames(username, platform);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    padding: '8px 0',
                  }}
                />
              </div>

              <button
                onClick={() => handleFetchGames(username, platform)}
                disabled={isLoading || !username.trim()}
                style={{
                  padding: '0 16px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLoading || !username.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !username.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Fetch Games</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Picks Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Try:</span>
            {QUICK_PICKS[platform].map((user) => (
              <button
                key={user}
                onClick={() => handleQuickPick(user)}
                style={{
                  background: 'none',
                  border: '1px solid var(--hairline)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--hairline)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {user}
              </button>
            ))}
          </div>
        </div>

        {/* Content: Error, Loading, or Games Feed */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                gap: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px' }}>
                Connecting to {platform === 'lichess' ? 'Lichess' : 'Chess.com'} and fetching games&hellip;
              </span>
            </div>
          ) : games.length === 0 && !error ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                gap: '8px',
                color: 'var(--text-tertiary)',
              }}
            >
              <Swords size={32} style={{ opacity: 0.3, marginBottom: '6px' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                No games loaded yet
              </span>
              <span style={{ fontSize: '12px', maxWidth: '320px', textAlign: 'center' }}>
                Enter any public username above or click one of the suggestions to browse and review recent matches.
              </span>
            </div>
          ) : (
            games.map((game) => {
              const isSaved = savedIds.has(game.id);
              const isCopied = copiedId === game.id;

              return (
                <div
                  key={game.id}
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--hairline-strong)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--hairline)';
                  }}
                >
                  {/* Left: Outcome badge & Match Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    {/* Outcome pill */}
                    <div
                      style={{
                        width: '54px',
                        padding: '4px 0',
                        textAlign: 'center',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                        backgroundColor:
                          game.userOutcome === 'win'
                            ? 'rgba(52, 211, 153, 0.15)'
                            : game.userOutcome === 'loss'
                            ? 'rgba(244, 63, 94, 0.15)'
                            : 'rgba(148, 163, 184, 0.15)',
                        color:
                          game.userOutcome === 'win'
                            ? 'var(--positive)'
                            : game.userOutcome === 'loss'
                            ? 'var(--negative)'
                            : 'var(--text-secondary)',
                        border:
                          game.userOutcome === 'win'
                            ? '1px solid rgba(52, 211, 153, 0.3)'
                            : game.userOutcome === 'loss'
                            ? '1px solid rgba(244, 63, 94, 0.3)'
                            : '1px solid rgba(148, 163, 184, 0.3)',
                      }}
                    >
                      {game.userOutcome === 'win'
                        ? 'WIN'
                        : game.userOutcome === 'loss'
                        ? 'LOSS'
                        : game.userOutcome === 'draw'
                        ? 'DRAW'
                        : game.result}
                    </div>

                    {/* Players & details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {/* White */}
                        <span
                          style={{
                            fontWeight: game.userColor === 'white' ? 700 : 500,
                            color: game.userColor === 'white' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {game.white.title ? `${game.white.title} ` : ''}
                          {game.white.username}
                          {game.white.rating ? ` (${game.white.rating})` : ''}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>vs</span>
                        {/* Black */}
                        <span
                          style={{
                            fontWeight: game.userColor === 'black' ? 700 : 500,
                            color: game.userColor === 'black' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {game.black.title ? `${game.black.title} ` : ''}
                          {game.black.username}
                          {game.black.rating ? ` (${game.black.rating})` : ''}
                        </span>
                      </div>

                      {/* Subtitle: Speed, Opening, Date */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '11px',
                          color: 'var(--text-tertiary)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Clock size={10} />
                          {game.timeControl}
                        </span>

                        {game.openingName && (
                          <span
                            title={game.openingName}
                            style={{
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {game.openingName}
                          </span>
                        )}

                        <span>•</span>
                        <span>{game.date}</span>

                        {game.url && (
                          <a
                            href={game.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              color: 'var(--text-tertiary)',
                              textDecoration: 'none',
                            }}
                            title="Open on platform"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Copy PGN */}
                    <button
                      onClick={() => handleCopyPgn(game)}
                      title={isCopied ? 'PGN Copied!' : 'Copy PGN'}
                      style={{
                        padding: '6px',
                        background: 'none',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: isCopied ? 'var(--positive)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>

                    {/* Save to library */}
                    <button
                      onClick={() => handleSaveToLibrary(game)}
                      title={isSaved ? 'Saved in Library' : 'Save to Library'}
                      style={{
                        padding: '6px',
                        background: 'none',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: isSaved ? 'var(--positive)' : 'var(--text-secondary)',
                        cursor: isSaved ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>

                    {/* Analyze */}
                    <button
                      onClick={() => handleAnalyzeGame(game)}
                      style={{
                        padding: '6px 10px',
                        background: 'none',
                        border: '1px solid var(--hairline-strong)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Compass size={13} />
                      <span>Analyze</span>
                    </button>

                    {/* Review Game (Primary Action) */}
                    <button
                      onClick={() => handleReviewGame(game)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--accent)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Review</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
