import React from 'react';
import { X, Info, ExternalLink, Heart, Keyboard } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          width: '90%',
          maxWidth: '560px',
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
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Info size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  About PostMatem
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    letterSpacing: '0.02em',
                  }}
                >
                  v1.0.1
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Offline-First Chess Review & Analysis
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

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Intro Box */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            <strong>PostMatem</strong> is a private, client-side chess workstation. All Stockfish NNUE evaluations,
            post-mortem reviews, and blunder workouts execute 100% locally in your browser via WebAssembly without
            sending moves to any external server.
          </div>

          {/* Credits & Attributions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Heart size={13} style={{ color: 'var(--accent)' }} />
              Credits & Acknowledgements
            </h3>

            {/* Piece Artwork */}
            <CreditCard
              title="Themed Pieces & Boards"
              author="RhosGFX"
              desc="Artistic vector chess piece sets and board illustrations."
              link="https://rhosgfx.itch.io/vector-chess-pieces"
            />

            {/* Colin Burnett */}
            <CreditCard
              title="Classic Staunton Vectors (cburnett)"
              author="Colin M.L. Burnett"
              badge="CC BY-SA 3.0"
              desc="Standard SVG chess pieces used across Wikimedia, Lichess, and react-chessboard."
              link="https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces"
            />

            {/* CentiChess */}
            <CreditCard
              title="CentiChess"
              author="Cooper Ross"
              badge="CC0 1.0 Universal"
              desc="Reference architecture for client-side WebAssembly Stockfish worker pools and move classification heuristics."
              link="https://github.com/cooper-ross/centichess"
            />

            {/* Chesskit */}
            <CreditCard
              title="Chesskit"
              author="GuillaumeSD"
              desc="Architectural inspiration and reference for modular browser chess utilities."
              link="https://github.com/GuillaumeSD/Chesskit"
            />

            {/* Stockfish */}
            <CreditCard
              title="Stockfish Chess Engine"
              author="The Stockfish Developers"
              badge="GPLv3"
              desc="World-class NNUE evaluation engine running locally via WebAssembly."
              link="https://stockfishchess.org"
            />

            {/* Lichess */}
            <CreditCard
              title="Lichess"
              author="Thibault Duplessis & Lichess Community"
              badge="AGPLv3 / CC0"
              desc="Sigmoidal centipawn-to-win-percentage mathematical curve and opening book database."
              link="https://lichess.org"
            />

            {/* Libraries */}
            <CreditCard
              title="Core Open-Source Libraries"
              author="chess.js (BSD-2) • react-chessboard (MIT) • Lucide (ISC) • Zustand (MIT)"
              desc="Special thanks to the authors of chess.js, react-chessboard, Lucide icons, and Zustand."
            />
          </div>

          {/* Hotkey Cheatsheet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Keyboard size={13} />
              Navigation Shortcuts
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <ShortcutRow keys="→ / Space" action="Next Move" />
              <ShortcutRow keys="←" action="Previous Move" />
              <ShortcutRow keys="↑ / ↓" action="Start / End of Game" />
              <ShortcutRow keys="Z / Ctrl+Z" action="Takeback Move" />
              <ShortcutRow keys="F" action="Flip Board" />
              <ShortcutRow keys="E" action="Toggle Eval Bar" />
              <ShortcutRow keys="H" action="Toggle Best Move Arrow" />
              <ShortcutRow keys="B" action="Toggle Move Badges" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            PostMatem v1.0.1 • Created by{' '}
            <a
              href="https://github.com/M-Nikox"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              @M-Nikox
            </a>
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

interface CreditCardProps {
  title: string;
  author: string;
  desc: string;
  badge?: string;
  link?: string;
}

const CreditCard: React.FC<CreditCardProps> = ({ title, author, desc, badge, link }) => (
  <div
    style={{
      padding: '10px 12px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-tertiary)',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '11px',
            textDecoration: 'none',
          }}
        >
          <span>Link</span>
          <ExternalLink size={11} />
        </a>
      )}
    </div>
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>By {author}</span>
    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
      {desc}
    </p>
  </div>
);

const ShortcutRow: React.FC<{ keys: string; action: string }> = ({ keys, action }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 8px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '4px',
      border: '1px solid var(--hairline)',
    }}
  >
    <span style={{ color: 'var(--text-secondary)' }}>{action}</span>
    <kbd
      style={{
        padding: '1px 5px',
        fontSize: '10px',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '3px',
        border: '1px solid var(--hairline-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {keys}
    </kbd>
  </div>
);
