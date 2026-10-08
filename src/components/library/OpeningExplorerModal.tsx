import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  searchOpenings,
  getAllOpenings,
  loadOpeningBook,
  EcoEntry,
} from '../../core/analysis/openingBook';
import { X, Search, BookOpen, ArrowRight, Sparkles, Compass } from 'lucide-react';

interface OpeningExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Openings' },
  { id: 'e4', label: '1. e4 Openings' },
  { id: 'sicilian', label: 'Sicilian Defense' },
  { id: 'french-caro', label: 'French & Caro-Kann' },
  { id: 'd4', label: '1. d4 Openings' },
  { id: 'indian', label: 'Indian Defenses' },
  { id: 'gambit', label: 'Gambits' },
  { id: 'flank', label: 'Flank & English' },
];

export const OpeningExplorerModal: React.FC<OpeningExplorerModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [results, setResults] = useState<EcoEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadOpeningLine = useAppStore((state) => state.loadOpeningLine);

  useEffect(() => {
    if (isOpen) {
      loadOpeningBook().then(() => {
        setIsLoaded(true);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const items = searchOpenings(searchQuery, activeCategory, 60);
    setResults(items);
  }, [isOpen, searchQuery, activeCategory, isLoaded]);

  if (!isOpen) return null;

  const handleStudy = (entry: EcoEntry) => {
    loadOpeningLine(entry.name, entry.eco, entry.moves);
    onClose();
  };

  const formatMoveSequence = (moves: string[]): string => {
    let str = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        str += `${Math.floor(i / 2) + 1}. `;
      }
      str += `${moves[i]} `;
    }
    return str.trim();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
          maxWidth: '680px',
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
        {/* Modal Header */}
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
              <BookOpen size={18} />
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
                Opening Explorer & Study Book
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                3,000+ ECO opening variations • Study lines against Stockfish
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by opening name (e.g. Najdorf, London, French) or ECO code (B90, C50)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '2px',
              scrollbarWidth: 'none',
            }}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: active ? 600 : 500,
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: active ? 'var(--accent)' : 'var(--hairline)',
                    backgroundColor: active ? 'var(--accent-wash)' : 'rgba(255, 255, 255, 0.03)',
                    color: active ? 'var(--accent-strong)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Scrollable List */}
        <div
          style={{
            padding: '12px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
              }}
            >
              No opening lines found matching &ldquo;{searchQuery}&rdquo;. Try another name or ECO code.
            </div>
          ) : (
            results.map((entry, idx) => (
              <div
                key={`${entry.eco}-${entry.name}-${idx}`}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-wash)';
                  e.currentTarget.style.borderColor = 'var(--hairline-strong)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'var(--hairline)';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '1px 6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid var(--hairline-strong)',
                        borderRadius: '3px',
                        color: 'var(--accent-strong)',
                      }}
                    >
                      {entry.eco}
                    </span>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatMoveSequence(entry.moves)}
                  </span>
                </div>

                <button
                  onClick={() => handleStudy(entry)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--hairline)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'var(--hairline)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  title="Load opening line onto the analysis board"
                >
                  <span>Study</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '11px 20px',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Showing {results.length} lines • Selecting a line opens it in Analysis mode
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
