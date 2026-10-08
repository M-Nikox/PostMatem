import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from './store/useAppStore';
import { ChessBoardView } from './components/board/ChessBoardView';
import { GameReviewHeader } from './components/analysis/GameReviewHeader';
import { CoachCard } from './components/analysis/CoachCard';
import { MoveTreeViewer } from './components/analysis/MoveTreeViewer';
import { EngineLineViewer } from './components/analysis/EngineLineViewer';
import { MatchConsole } from './components/play/MatchConsole';
import { PlayControls } from './components/play/PlayControls';
import { GameOverModal } from './components/play/GameOverModal';
import { GameLibraryModal } from './components/library/GameLibraryModal';
import { OnlineImportModal } from './components/library/OnlineImportModal';
import { AppearanceModal } from './components/board/AppearanceModal';
import { MoveGraph } from './core/tree/moveGraph';
import { getOpeningForMoves, loadOpeningBook } from './core/analysis/openingBook';
import { resolveActiveAccent, applyAccentToDom, applyThemeToDom } from './components/board/boardThemes';
import { FolderClock, Palette, Swords, Compass, BookOpen, Sparkles, Info, Globe } from 'lucide-react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GlobalDropZone } from './components/common/GlobalDropZone';
import { MistakeWorkoutBanner } from './components/analysis/MistakeWorkoutBanner';
import { AboutModal } from './components/common/AboutModal';
import { OpeningExplorerModal } from './components/library/OpeningExplorerModal';
import { SELECTABLE_ENGINES } from './core/engine/engineConfig';
import { getAssetPath } from './utils/paths';

export const App: React.FC = () => {
  useKeyboardShortcuts();
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const selectedEngine = useAppStore((state) => state.selectedEngine);
  const mistakeWorkout = useAppStore((state) => state.mistakeWorkout);
  const analysisReport = useAppStore((state) => state.analysisReport);
  const isBatchRunning = useAppStore((state) => state.isBatchRunning);
  const batchProgress = useAppStore((state) => state.batchProgress);
  const runPostMortemAnalysis = useAppStore((state) => state.runPostMortemAnalysis);
  const initEngine = useAppStore((state) => state.initEngine);
  const treeState = useAppStore((state) => state.treeState);
  const accentColorId = useAppStore((state) => state.accentColorId);
  const boardSvg = useAppStore((state) => state.boardSvg);
  const darkSquareColor = useAppStore((state) => state.darkSquareColor);
  const lightSquareColor = useAppStore((state) => state.lightSquareColor);
  const themeMode = useAppStore((state) => state.themeMode);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isOnlineImportOpen, setIsOnlineImportOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isOpeningExplorerOpen, setIsOpeningExplorerOpen] = useState(false);
  const [rightTab, setRightTab] = useState<'moves' | 'review' | 'engine'>('moves');
  const [openingBookReady, setOpeningBookReady] = useState(false);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  useEffect(() => {
    loadOpeningBook().then(() => setOpeningBookReady(true));
  }, []);

  useEffect(() => {
    const activePreset = resolveActiveAccent(accentColorId, boardSvg, darkSquareColor, lightSquareColor);
    applyAccentToDom(activePreset);
  }, [accentColorId, boardSvg, darkSquareColor, lightSquareColor]);

  useEffect(() => {
    applyThemeToDom(themeMode);
    if (themeMode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDom('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [themeMode]);

  useEffect(() => {
    if (analysisReport) {
      setRightTab('review');
    }
  }, [analysisReport]);

  // Opening name for the current position — deepest known book line matching the
  // moves played from the start of the game up to wherever the person is looking.
  const opening = useMemo(() => {
    if (!openingBookReady) return null;
    const path = MoveGraph.getPathToNode(treeState, treeState.currentNodeId);
    const sanMoves = path.map((node) => node.san);
    return getOpeningForMoves(sanMoves);
  }, [treeState, openingBookReady]);

  return (
    <div
      className="pm-app-container"
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Vertical rail — trades width we have plenty of for height we don't */}
      <aside
        className="pm-rail"
        style={{
          width: '76px',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          borderRight: '1px solid var(--hairline)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '18px 0',
          gap: '6px',
        }}
      >
        {/* Wordmark — icon only; full name on hover */}
        <div
          className="pm-rail-logo"
          title="PostMatem"
          style={{
            width: '30px',
            height: '30px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              backgroundColor: 'var(--accent-strong)',
              WebkitMaskImage: `url('${getAssetPath('pieces/White/Knight White.svg')}')`,
              maskImage: `url('${getAssetPath('pieces/White/Knight White.svg')}')`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          />
        </div>

        <RailTab
          active={mode === 'PLAY' || mode === 'GAME_OVER'}
          onClick={() => setMode('PLAY')}
          icon={<Swords size={19} />}
          label="Play"
        />
        <RailTab
          active={mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS'}
          onClick={() => setMode('ANALYSIS')}
          icon={<Compass size={19} />}
          label="Analysis"
        />

        <div className="pm-rail-divider" style={{ width: '32px', height: '1px', backgroundColor: 'var(--hairline-strong)', margin: '10px 0' }} />

        <RailTab active={isOpeningExplorerOpen} onClick={() => setIsOpeningExplorerOpen(true)} icon={<BookOpen size={19} />} label="Openings" />
        <RailTab active={isOnlineImportOpen} onClick={() => setIsOnlineImportOpen(true)} icon={<Globe size={19} />} label="Import" />
        <RailTab active={isLibraryOpen} onClick={() => setIsLibraryOpen(true)} icon={<FolderClock size={19} />} label="Games" />
        <RailTab active={isAppearanceOpen} onClick={() => setIsAppearanceOpen(true)} icon={<Palette size={19} />} label="Theme" />

        <div className="pm-rail-spacer" style={{ marginTop: 'auto' }} />
        <RailTab active={isAboutOpen} onClick={() => setIsAboutOpen(true)} icon={<Info size={19} />} label="About" />
      </aside>

      {/* Main Interactive Stage — big board, big panel, fills the screen without window scrollbars */}
      <main
        className="pm-stage"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px',
          height: '100vh',
          maxHeight: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          className="pm-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(400px, 480px)',
            gap: '32px',
            alignItems: 'center',
            maxHeight: '100%',
          }}
        >
        {/* Left Column: Chessboard */}
        <section
          className="pm-board-col"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <ChessBoardView onOpenAppearance={() => setIsAppearanceOpen(true)} />
        </section>

        {/* Right Column: dense analysis console — set off by a single rule */}
        <section
          className="pm-console-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--hairline)',
            paddingLeft: '28px',
            maxHeight: 'calc(100vh - 36px)',
            overflowY: 'auto',
          }}
        >
          {/* Batch Progress Banner */}
          {isBatchRunning && (
            <div
              style={{
                paddingBottom: '10px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ color: 'var(--positive)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <img
                    src={getAssetPath('icons/stockfish.webp')}
                    alt="Stockfish"
                    style={{ width: '15px', height: '15px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <span>
                    Analyzing full game with{' '}
                    {SELECTABLE_ENGINES.find((e) => e.id === selectedEngine)?.name || 'Stockfish'}&hellip;
                  </span>
                </span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {batchProgress}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'var(--hairline-strong)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${batchProgress}%`,
                    backgroundColor: 'var(--positive)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {mistakeWorkout?.isActive ? (
            /* DEDICATED MISTAKE WORKOUT RETRY SUITE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <MistakeWorkoutBanner />
              <MoveTreeViewer height="260px" />
            </div>
          ) : mode === 'PLAY' ? (
            /* DEDICATED PLAY / COMPETITION & CASUAL MATCH CONSOLE */
            <MatchConsole />
          ) : (
            /* DEDICATED ANALYSIS STUDIO DESK */
            <>
              {/* Console Tabs — text weight & underline carry the state */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '22px',
                  marginBottom: '18px',
                }}
              >
                <ConsoleTab active={rightTab === 'review'} onClick={() => setRightTab('review')}>
                  Review
                  {analysisReport && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--positive)',
                        marginLeft: '5px',
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                </ConsoleTab>
                <ConsoleTab active={rightTab === 'moves'} onClick={() => setRightTab('moves')}>
                  Explorer
                </ConsoleTab>
                <ConsoleTab active={rightTab === 'engine'} onClick={() => setRightTab('engine')}>
                  Engine
                </ConsoleTab>
              </div>

              {/* Opening name — deepest known book line matching position */}
              {opening && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13.5px',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  <BookOpen size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{opening.name}</strong>{' '}
                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {opening.eco}
                    </span>
                  </span>
                </div>
              )}

              {/* Console Tab Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {rightTab === 'review' && (
                  <>
                    {analysisReport ? (
                      <>
                        <GameReviewHeader />
                        <CoachCard />
                        <MoveTreeViewer height="240px" />
                      </>
                    ) : (
                      <div
                        style={{
                          padding: '24px 2px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          No Game Review yet
                        </div>
                        <div style={{ fontSize: '13.5px', maxWidth: '340px', lineHeight: 1.6 }}>
                          Play or import a match, then run <strong style={{ color: 'var(--text-primary)' }}>Review Game</strong> to see accuracy percentages, Brilliant/Blunder assessments, and AI coach commentary.
                        </div>
                        <button
                          onClick={() => runPostMortemAnalysis(14)}
                          disabled={isBatchRunning}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '11px 18px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: 'var(--positive)',
                            color: '#141410',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            width: 'fit-content',
                            marginTop: '4px',
                          }}
                        >
                          <Sparkles size={16} />
                          <span>Review Game</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {rightTab === 'moves' && (
                  <>
                    <CoachCard />
                    <MoveTreeViewer height="260px" />
                    <PlayControls />
                  </>
                )}

                {rightTab === 'engine' && (
                  <>
                    <EngineLineViewer />
                    <CoachCard />
                    <MoveTreeViewer height="220px" />
                  </>
                )}
              </div>
            </>
          )}
        </section>
        </div>
      </main>

      {/* Global Drag & Drop & Smart Clipboard Handler */}
      <GlobalDropZone />

      {/* Modals */}
      <GameOverModal />
      <GameLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onOpenImport={() => setIsOnlineImportOpen(true)}
      />
      <OnlineImportModal isOpen={isOnlineImportOpen} onClose={() => setIsOnlineImportOpen(false)} />
      <OpeningExplorerModal isOpen={isOpeningExplorerOpen} onClose={() => setIsOpeningExplorerOpen(false)} />
      <AppearanceModal isOpen={isAppearanceOpen} onClose={() => setIsAppearanceOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};

const RailTab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    className="pm-rail-tab"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      width: '58px',
      background: active ? 'var(--accent-wash)' : 'none',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      padding: '9px 4px',
      cursor: 'pointer',
      color: active ? 'var(--accent-strong)' : 'var(--text-secondary)',
      transition: 'background-color 0.15s ease, color 0.15s ease',
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-wash)';
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    {icon}
    <span style={{ fontSize: '10.5px', fontWeight: 600 }}>{label}</span>
  </button>
);

const ConsoleTab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: 0,
      fontSize: '15px',
      fontWeight: active ? 700 : 500,
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      transition: 'color 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = 'var(--text-primary)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = active ? 'var(--text-primary)' : 'var(--text-secondary)';
    }}
  >
    {children}
  </button>
);
