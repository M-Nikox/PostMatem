import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getStockfishElo } from '../../core/engine/stockfishElo';
import { MoveGraph } from '../../core/tree/moveGraph';
import { getOpeningForMoves } from '../../core/analysis/openingBook';
import { MoveTreeViewer } from '../analysis/MoveTreeViewer';
import { EngineSelector } from '../common/EngineSelector';
import {
  Trophy,
  Swords,
  Sparkles,
  Flag,
  Undo2,
  Lock,
  BookOpen,
  FileDown,
  FileUp,
  BarChart2,
  Navigation,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { getAssetPath } from '../../utils/paths';

export const MatchConsole: React.FC = () => {
  const mode = useAppStore((state) => state.mode);
  const playStyle = useAppStore((state) => state.playStyle);
  const setPlayStyle = useAppStore((state) => state.setPlayStyle);
  const engineLevel = useAppStore((state) => state.engineLevel);
  const setEngineLevel = useAppStore((state) => state.setEngineLevel);
  const startNewGame = useAppStore((state) => state.startNewGame);
  const resignGame = useAppStore((state) => state.resignGame);
  const takebackMove = useAppStore((state) => state.takebackMove);
  const showEvalBar = useAppStore((state) => state.showEvalBar);
  const toggleEvalBar = useAppStore((state) => state.toggleEvalBar);
  const showBestMoveArrow = useAppStore((state) => state.showBestMoveArrow);
  const toggleBestMoveArrow = useAppStore((state) => state.toggleBestMoveArrow);
  const showCasualClassifications = useAppStore((state) => state.showCasualClassifications);
  const toggleCasualClassifications = useAppStore((state) => state.toggleCasualClassifications);
  const runPostMortemAnalysis = useAppStore((state) => state.runPostMortemAnalysis);
  const exportPgn = useAppStore((state) => state.exportPgn);
  const loadPgn = useAppStore((state) => state.loadPgn);
  const isBatchRunning = useAppStore((state) => state.isBatchRunning);
  const batchProgress = useAppStore((state) => state.batchProgress);
  const treeState = useAppStore((state) => state.treeState);
  const playerColor = useAppStore((state) => state.playerColor);
  const isEngineThinking = useAppStore((state) => state.isEngineThinking);
  const headers = useAppStore((state) => state.headers);

  const [confirmResign, setConfirmResign] = useState(false);
  const [isPgnModalOpen, setIsPgnModalOpen] = useState(false);
  const [pgnInput, setPgnInput] = useState('');

  const currentNode = treeState.nodes[treeState.currentNodeId];
  const mainline = MoveGraph.getMainlineNodes(treeState);
  const moveCount = mainline.length - 1; // excluding root
  const hasGameStarted = moveCount > 0;

  // Opening book lookup
  const opening = useMemo(() => {
    const path = MoveGraph.getPathToNode(treeState, treeState.currentNodeId);
    const sanMoves = path.map((node) => node.san);
    return getOpeningForMoves(sanMoves);
  }, [treeState]);

  // Turn status
  const isWhiteTurn = currentNode ? currentNode.fen.includes(' w ') : true;
  const isUserTurn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
  const isGameOver = mode === 'GAME_OVER';

  const stockfishElo = getStockfishElo(engineLevel);
  const levelTier =
    engineLevel <= 5 ? 'Beginner' : engineLevel <= 10 ? 'Intermediate' : engineLevel <= 15 ? 'Advanced' : 'Grandmaster';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* 1. Sub-mode Segmented Control (Competition vs Casual) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--bg-inset)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            gap: '3px',
          }}
        >
          <button
            onClick={() => setPlayStyle('competitive')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: playStyle === 'competitive' ? '1px solid var(--accent-border)' : '1px solid transparent',
              backgroundColor: playStyle === 'competitive' ? 'var(--accent-wash)' : 'transparent',
              color: playStyle === 'competitive' ? 'var(--accent-strong)' : 'var(--text-secondary)',
              fontSize: '13.5px',
              fontWeight: playStyle === 'competitive' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Trophy size={15} />
            <span>Competition</span>
          </button>

          <button
            onClick={() => setPlayStyle('casual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: playStyle === 'casual' ? '1px solid var(--accent-border)' : '1px solid transparent',
              backgroundColor: playStyle === 'casual' ? 'var(--accent-wash)' : 'transparent',
              color: playStyle === 'casual' ? 'var(--accent-strong)' : 'var(--text-secondary)',
              fontSize: '13.5px',
              fontWeight: playStyle === 'casual' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Swords size={15} />
            <span>Casual Sparring</span>
          </button>
        </div>

        {/* Subtitle describing the active philosophy */}
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '0 4px', lineHeight: 1.4 }}>
          {playStyle === 'competitive' ? (
            <span>🏆 <strong>Tournament match</strong>: unassisted, clean scoresheet, locked difficulty.</span>
          ) : (
            <span>⚔️ <strong>Sparring sandbox</strong>: live difficulty slider, hints, and takebacks enabled.</span>
          )}
        </div>
      </div>

      {/* 2. Match Status & Turn Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-wash)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isGameOver ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: 'var(--positive)' }}>
              <CheckCircle2 size={16} />
              <span>Match Finished ({headers.Result || '*'})</span>
            </span>
          ) : isEngineThinking ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 600, color: 'var(--accent-strong)' }}>
              <Loader2 size={15} className="animate-spin" />
              <span>Stockfish is calculating&hellip;</span>
            </span>
          ) : isUserTurn ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--positive)',
                  boxShadow: '0 0 8px var(--positive)',
                }}
              />
              <span>Your Turn ({playerColor === 'white' ? 'White' : 'Black'})</span>
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-strong)',
                }}
              />
              <span>Stockfish's Turn</span>
            </span>
          )}
        </div>

        {/* Elo anchor */}
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface-2)',
            padding: '2px 7px',
            borderRadius: '4px',
            border: '1px solid var(--hairline-strong)',
          }}
        >
          {stockfishElo} Elo
        </span>
      </div>

      {/* 3. Deepest Identified Opening Pill */}
      {opening && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-inset)',
            border: '1px solid var(--hairline)',
          }}
        >
          <BookOpen size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{opening.name}</strong>{' '}
            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
              {opening.eco}
            </span>
          </span>
        </div>
      )}

      {/* 4. Scoresheet Notation Table */}
      <MoveTreeViewer hideClassifications={playStyle === 'competitive' || (playStyle === 'casual' && !showCasualClassifications)} height="210px" />

      {/* 5. Mode-Specific Options */}
      {playStyle === 'competitive' ? (
        /* Competition Mode Controls */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Difficulty Setting: Editable only before moves are played, locked once game starts */}
          {!hasGameStarted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={getAssetPath('icons/stockfish.webp')} alt="Stockfish" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                  <span>Match Difficulty</span>
                </span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Lvl {engineLevel} &middot; {levelTier} ({stockfishElo} Elo)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Engine</span>
                <EngineSelector variant="compact" align="right" />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-wash)',
                border: '1px solid var(--hairline)',
                fontSize: '12.5px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={getAssetPath('icons/stockfish.webp')} alt="Stockfish" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                <span>Opponent: Lvl {engineLevel}</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EngineSelector variant="compact" disabled={true} disabledTooltip="Engine locked for tournament match" align="right" />
                <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  <span>{stockfishElo} Elo</span>
                  <span title="Locked for tournament match" style={{ display: 'inline-flex' }}>
                    <Lock size={12} color="var(--text-tertiary)" />
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Casual Sparring Mode Controls */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Live Difficulty Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={getAssetPath('icons/stockfish.webp')} alt="Stockfish" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                <span>Live Difficulty</span>
              </span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Lvl {engineLevel} &middot; {levelTier} ({stockfishElo} Elo)
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Opponent Engine</span>
              <EngineSelector variant="compact" align="right" />
            </div>
          </div>

          {/* Sparring Assistance Bar (Takeback, Eval Bar, Hints, Badges) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button
              onClick={takebackMove}
              disabled={!hasGameStarted || isEngineThinking}
              title="Takeback last move"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--hairline-strong)',
                backgroundColor: 'var(--bg-surface-2)',
                color: !hasGameStarted || isEngineThinking ? 'var(--text-tertiary)' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: !hasGameStarted || isEngineThinking ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Undo2 size={13} />
              <span>Takeback</span>
            </button>

            <button
              onClick={toggleEvalBar}
              title={showEvalBar ? 'Hide evaluation bar' : 'Show evaluation bar'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 4px',
                borderRadius: 'var(--radius-sm)',
                border: showEvalBar ? '1px solid var(--accent-border)' : '1px solid var(--hairline-strong)',
                backgroundColor: showEvalBar ? 'var(--accent-wash)' : 'var(--bg-surface-2)',
                color: showEvalBar ? 'var(--accent-strong)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart2 size={13} />
              <span>Eval Bar</span>
            </button>

            <button
              onClick={toggleBestMoveArrow}
              title={showBestMoveArrow ? 'Hide hint arrows' : 'Show hint arrows'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 4px',
                borderRadius: 'var(--radius-sm)',
                border: showBestMoveArrow ? '1px solid var(--accent-border)' : '1px solid var(--hairline-strong)',
                backgroundColor: showBestMoveArrow ? 'var(--accent-wash)' : 'var(--bg-surface-2)',
                color: showBestMoveArrow ? 'var(--accent-strong)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Navigation size={13} />
              <span>Hints</span>
            </button>

            <button
              onClick={toggleCasualClassifications}
              title={showCasualClassifications ? 'Hide classification badges' : 'Show classification badges'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 4px',
                borderRadius: 'var(--radius-sm)',
                border: showCasualClassifications ? '1px solid var(--accent-border)' : '1px solid var(--hairline-strong)',
                backgroundColor: showCasualClassifications ? 'var(--accent-wash)' : 'var(--bg-surface-2)',
                color: showCasualClassifications ? 'var(--accent-strong)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={13} />
              <span>Badges</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Primary Action: Post-Mortem Analysis */}
      <button
        onClick={() => runPostMortemAnalysis(14)}
        disabled={isBatchRunning || !hasGameStarted}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '11px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          backgroundColor: isBatchRunning || !hasGameStarted ? 'var(--bg-wash-strong)' : 'var(--positive)',
          color: isBatchRunning || !hasGameStarted ? 'var(--text-tertiary)' : '#141410',
          fontSize: '14px',
          fontWeight: 700,
          cursor: isBatchRunning || !hasGameStarted ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s ease',
        }}
      >
        <Sparkles size={16} />
        <span>{isBatchRunning ? `Analyzing Match (${batchProgress}%)...` : 'Analyze Match (Post-Mortem)'}</span>
      </button>

      {/* 7. Match Utilities & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--hairline)',
          paddingTop: '12px',
          fontSize: '13px',
        }}
      >
        {/* New match color selection */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>New:</span>
          <button
            onClick={() => {
              setConfirmResign(false);
              startNewGame('white', engineLevel);
            }}
            style={textLinkStyle}
          >
            White
          </button>
          <span style={{ color: 'var(--hairline-strong)' }}>/</span>
          <button
            onClick={() => {
              setConfirmResign(false);
              startNewGame('black', engineLevel);
            }}
            style={textLinkStyle}
          >
            Black
          </button>
        </div>

        {/* Resign / Confirm Resign button */}
        {mode === 'PLAY' && hasGameStarted && (
          <div>
            {confirmResign ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--negative)' }}>Resign?</span>
                <button
                  onClick={() => {
                    resignGame();
                    setConfirmResign(false);
                  }}
                  style={{
                    backgroundColor: 'var(--negative)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmResign(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '2px 6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmResign(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--negative)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                <Flag size={14} />
                <span>Resign</span>
              </button>
            )}
          </div>
        )}

        {/* PGN Tools */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport} style={ghostIconTextBtn} title="Export PGN">
            <FileDown size={14} />
            <span>PGN</span>
          </button>
          <button onClick={() => setIsPgnModalOpen(true)} style={ghostIconTextBtn} title="Import PGN">
            <FileUp size={14} />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* PGN Import Modal Dialog */}
      {isPgnModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
              maxWidth: '520px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Import Chess Game (PGN)
            </h3>
            <textarea
              rows={7}
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="Paste PGN here (e.g., 1. e4 e5 2. Nf3 Nc6 3. Bb5...)"
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-inset)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '10px',
                fontSize: '13.5px',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsPgnModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--hairline-strong)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportPgn}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  fontSize: '13px',
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

const textLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  transition: 'color 0.15s ease',
};

const ghostIconTextBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  transition: 'color 0.15s ease',
};
