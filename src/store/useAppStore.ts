import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Chess, Square } from 'chess.js';
import { LiveEngine } from '../core/engine/liveEngine';
import { EngineName, PositionEvaluation } from '../core/engine/types';
import { DEFAULT_ENGINE } from '../core/engine/engineConfig';
import { WorkerPool } from '../core/engine/workerPool';
import { getStockfishElo, getEngineDepthForLevel } from '../core/engine/stockfishElo';
import { MoveGraph, MoveTreeState, MoveNode } from '../core/tree/moveGraph';
import { PgnHeaders, PgnParser } from '../core/tree/pgnParser';
import { PgnSerializer } from '../core/tree/pgnSerializer';
import { AnalysisReport, MoveClassification, MoveClassificationType } from '../core/analysis/types';
import { MoveClassifier } from '../core/analysis/moveClassifier';
import { WinRateMath } from '../core/analysis/winRate';
import { AccuracyCalculator } from '../core/analysis/accuracy';
import { EloEstimator } from '../core/analysis/eloEstimator';
import { GameRepository } from '../core/storage/gameRepository';
import { getOpeningForMoves, isPathInBook, isExactBookSequence } from '../core/analysis/openingBook';
import { EvalCache } from '../core/storage/evalCache';
import { PieceSetId } from '../components/board/pieceResolver';
import { BOARD_THEMES, resolveActiveAccent, applyAccentToDom, ThemeMode, applyThemeToDom } from '../components/board/boardThemes';
import { SoundManager } from '../core/sound/soundManager';
import { getStoredUserAvatar, saveStoredUserAvatar } from '../core/storage/avatarHelper';

export type AppMode = 'PLAY' | 'GAME_OVER' | 'BATCH_ANALYSIS' | 'ANALYSIS' | 'LIBRARY';
export type PlayStyle = 'competitive' | 'casual';

export interface MistakeItem {
  nodeId: string;
  parentNodeId: string;
  ply: number;
  moveNumber: number;
  isWhite: boolean;
  sanPlayed: string;
  classification: MoveClassificationType;
  fenBefore: string;
  fenAfter: string;
  bestMoveSan: string;
  bestMoveUci: string;
}

export interface MistakeWorkoutState {
  isActive: boolean;
  mistakes: MistakeItem[];
  currentIndex: number;
  status: 'guessing' | 'solved' | 'incorrect' | 'completed';
  attempts: number;
  hintLevel: number; // 0 = none, 1 = source piece glow, 2 = full arrow
  score: { solvedFirstTry: number; total: number };
}

export interface AppState {
  // Mode & Navigation
  mode: AppMode;
  playStyle: PlayStyle;
  treeState: MoveTreeState;
  headers: PgnHeaders;
  activeGameId: string | null;

  // Board settings
  orientation: 'white' | 'black';
  playerColor: 'white' | 'black';
  engineLevel: number; // 1 to 20
  soundEnabled: boolean;
  showBestMoveArrow: boolean;
  showEvalBar: boolean;
  showCasualClassifications: boolean;

  // Live Engine state
  selectedEngine: EngineName;
  liveEval: PositionEvaluation | null;
  isEngineThinking: boolean;

  // Batch Analysis state
  batchProgress: number; // 0 - 100
  isBatchRunning: boolean;
  analysisReport: AnalysisReport | null;

  // Mistake Workout
  mistakeWorkout: MistakeWorkoutState | null;

  // Actions
  setMode: (mode: AppMode) => void;
  setPlayStyle: (style: PlayStyle) => void;
  takebackMove: () => void;
  flipBoard: () => void;
  toggleSound: () => void;
  toggleEvalBar: () => void;
  toggleBestMoveArrow: () => void;
  toggleCasualClassifications: () => void;
  setEngineLevel: (level: number) => void;
  setSelectedEngine: (engine: EngineName) => void;

  // Move Actions
  playMove: (from: Square, to: Square, promotion?: string) => boolean;
  navigateToNode: (nodeId: string) => void;
  goToNextMove: () => void;
  goToPreviousMove: () => void;
  goToStart: () => void;
  goToEnd: () => void;

  // Board & Piece Appearance
  pieceSet: PieceSetId;
  darkSquareColor: string;
  lightSquareColor: string;
  boardSvg: string | null;
  hideCursorOnDrag: boolean;
  accentColorId: string; // 'auto' or specific preset id
  woodGrainEnabled: boolean;
  woodGrainOpacity: number;
  woodGrainTexture: string;

  setPieceSet: (pieceSet: PieceSetId) => void;
  setBoardColors: (dark: string, light: string) => void;
  setBoardThemePreset: (presetId: string) => void;
  setBoardSvg: (svg: string | null) => void;
  setHideCursorOnDrag: (hide: boolean) => void;
  toggleHideCursorOnDrag: () => void;
  setAccentColorId: (id: string) => void;
  setWoodGrainEnabled: (enabled: boolean) => void;
  setWoodGrainOpacity: (opacity: number) => void;
  setWoodGrainTexture: (texture: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  userAvatar: string | null;
  setUserAvatar: (avatar: string | null) => void;

  // Game Lifecycle & Import
  initEngine: () => Promise<void>;
  startNewGame: (playerColor?: 'white' | 'black', engineLevel?: number) => void;
  resignGame: () => void;
  loadPgn: (pgn: string) => boolean;
  loadFen: (fen: string) => boolean;
  loadOpeningLine: (name: string, eco: string, moves: string[]) => boolean;
  exportPgn: () => string;
  runPostMortemAnalysis: (targetDepth?: number) => Promise<void>;
  loadGameFromStorage: (id: string) => Promise<void>;

  // Mistake Workout Actions
  startMistakeWorkout: (targetColor?: 'white' | 'black') => boolean;
  submitWorkoutMove: (from: string, to: string, promotion?: string) => boolean;
  retryCurrentMistake: () => void;
  nextMistake: () => void;
  previousMistake: () => void;
  requestWorkoutHint: () => void;
  exitMistakeWorkout: () => void;
}

// Global engine instances
let liveEngineInstance: LiveEngine | null = null;
let playEngineInstance: LiveEngine | null = null;
let batchPoolInstance: WorkerPool | null = null;
let navEvalDebounceTimer: any = null;

function getEffectiveEngine(): EngineName {
  let selected =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('postmatem_selected_engine') as EngineName)) ||
    DEFAULT_ENGINE;
  // Reset any temporary Stockfish 17 fallback back to Stockfish 19 Default
  if (!selected || selected === EngineName.Stockfish17LiteSingle) {
    selected = DEFAULT_ENGINE;
    if (typeof window !== 'undefined') {
      localStorage.setItem('postmatem_selected_engine', DEFAULT_ENGINE);
    }
  }
  return selected;
}

function getLiveEngine(): LiveEngine {
  if (!liveEngineInstance) {
    liveEngineInstance = new LiveEngine(getEffectiveEngine());
  }
  return liveEngineInstance;
}

/**
 * Dedicated engine instance strictly for generating bot reply moves in PLAY mode.
 * Decoupled from liveEngine so background eval and UI navigation can never preempt an in-flight move!
 */
function getPlayEngine(): LiveEngine {
  if (!playEngineInstance) {
    playEngineInstance = new LiveEngine(getEffectiveEngine());
  }
  return playEngineInstance;
}

function getBatchPool(): WorkerPool {
  if (!batchPoolInstance) {
    batchPoolInstance = new WorkerPool(getEffectiveEngine());
  }
  return batchPoolInstance;
}

/**
 * Detects FIDE threefold repetition along the active branch from current node to root.
 */
function isThreefoldRepetitionDraw(treeState: MoveTreeState, currentNodeId: string): boolean {
  const positionCounts: Record<string, number> = {};
  let curr: string | null = currentNodeId;

  while (curr) {
    const node: MoveNode | undefined = treeState.nodes[curr];
    if (!node) break;
    // Repetition key: piece placement, side to move, castling rights, and en passant square
    const posKey = node.fen.split(' ').slice(0, 4).join(' ');
    positionCounts[posKey] = (positionCounts[posKey] || 0) + 1;
    if (positionCounts[posKey] >= 3) {
      return true;
    }
    curr = node.parentId;
  }
  return false;
}

// Initialize accent in DOM on module load
if (typeof window !== 'undefined') {
  try {
    const initAccentId = localStorage.getItem('postmatem_accent_color') || 'auto';
    const initSvg = localStorage.getItem('postmatem_board_svg');
    const initDark = localStorage.getItem('postmatem_dark_square') || '#7C5A3E';
    const initLight = localStorage.getItem('postmatem_light_square') || '#D8CBB3';
    const initialPreset = resolveActiveAccent(initAccentId, initSvg, initDark, initLight);
    applyAccentToDom(initialPreset);
  } catch {}
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    mode: 'PLAY',
    playStyle: (typeof window !== 'undefined' && (localStorage.getItem('postmatem_play_style') as PlayStyle)) || 'competitive',
    treeState: MoveGraph.createInitial(),
    headers: {
      White: 'You',
      Black: 'Stockfish',
      WhiteElo: '1500',
      BlackElo: '1750',
      Event: 'PostMatem Game',
      Date: new Date().toISOString().split('T')[0],
      Result: '*',
    },
    activeGameId: null,

    orientation: 'white',
    playerColor: 'white',
    engineLevel: 10,
    soundEnabled: true,
    showBestMoveArrow: true,
    showEvalBar: true,
    showCasualClassifications:
      typeof window !== 'undefined'
        ? localStorage.getItem('postmatem_casual_classifications') !== 'false'
        : true,

    pieceSet: (typeof window !== 'undefined' && (localStorage.getItem('postmatem_piece_set') as PieceSetId)) || 'default',
    darkSquareColor: (typeof window !== 'undefined' && localStorage.getItem('postmatem_dark_square')) || '#7C5A3E',
    lightSquareColor: (typeof window !== 'undefined' && localStorage.getItem('postmatem_light_square')) || '#D8CBB3',
    boardSvg: (typeof window !== 'undefined' && localStorage.getItem('postmatem_board_svg')) || null,
    hideCursorOnDrag: typeof window !== 'undefined' && localStorage.getItem('postmatem_hide_cursor_drag') === 'true',
    accentColorId: (typeof window !== 'undefined' && localStorage.getItem('postmatem_accent_color')) || 'auto',
    woodGrainEnabled: typeof window !== 'undefined' && localStorage.getItem('postmatem_wood_grain_enabled') === 'true',
    woodGrainOpacity:
      typeof window !== 'undefined'
        ? parseFloat(localStorage.getItem('postmatem_wood_grain_opacity') || '0.45')
        : 0.45,
    woodGrainTexture:
      (() => {
        if (typeof window === 'undefined') return 'wood-grain-natural.jpg';
        const stored = localStorage.getItem('postmatem_wood_grain_texture');
        if (!stored || stored.endsWith('.svg')) {
          localStorage.setItem('postmatem_wood_grain_texture', 'wood-grain-natural.jpg');
          return 'wood-grain-natural.jpg';
        }
        return stored;
      })(),
    themeMode:
      (typeof window !== 'undefined' &&
        (localStorage.getItem('postmatem_theme_mode') as ThemeMode)) ||
      'dark',
    userAvatar: getStoredUserAvatar(),

    selectedEngine: getEffectiveEngine(),
    liveEval: null,
    isEngineThinking: false,

    batchProgress: 0,
    isBatchRunning: false,
    analysisReport: null,
    mistakeWorkout: null,

    setMode: (mode) => {
      set((state) => {
        state.mode = mode;
      });
      if (mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS' || (mode === 'PLAY' && get().playStyle === 'casual')) {
        const currentNode = get().treeState.nodes[get().treeState.currentNodeId];
        if (currentNode) {
          getLiveEngine()
            .evaluate(currentNode.fen, mode === 'PLAY' ? 14 : 18, mode === 'PLAY' ? 1 : 3, (partial) => {
              set((s) => {
                s.liveEval = partial;
              });
            })
            .then((res) => {
              set((s) => {
                s.liveEval = res;
              });
              EvalCache.set(res);
            })
            .catch(() => {});
        }
      }
    },

    setPlayStyle: (style) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_play_style', style);
      }
      set((state) => {
        state.playStyle = style;
      });
      if (style === 'competitive') {
        getLiveEngine().stop().catch(() => {});
        set((s) => {
          s.liveEval = null;
        });
      } else if (style === 'casual' && get().mode === 'PLAY') {
        const currentNode = get().treeState.nodes[get().treeState.currentNodeId];
        if (currentNode) {
          getLiveEngine()
            .evaluate(currentNode.fen, 14, 1, (partial) => {
              set((s) => {
                s.liveEval = partial;
              });
            })
            .then((res) => {
              set((s) => {
                s.liveEval = res;
              });
              EvalCache.set(res);
            })
            .catch(() => {});
        }
      }
    },

    takebackMove: () => {
      const { mode, isEngineThinking, playStyle, treeState, playerColor } = get();
      if (mode !== 'PLAY' || isEngineThinking || playStyle === 'competitive') return;

      const currentNode = treeState.nodes[treeState.currentNodeId];
      if (!currentNode || currentNode.id === treeState.rootId) return;

      // Cleanly preempt any ongoing calculation on both engines
      getLiveEngine().stop().catch(() => {});
      getPlayEngine().stop().catch(() => {});

      // Find the last position where it was the user's turn
      let targetNodeId: string | null = null;
      const isWhiteTurn = currentNode.fen.includes(' w ');
      const userTurn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;

      if (userTurn) {
        // Roll back 2 plies if possible (opponent move + user move)
        if (currentNode.parentId) {
          const parentNode = treeState.nodes[currentNode.parentId];
          if (parentNode && parentNode.parentId) {
            targetNodeId = parentNode.parentId;
          } else {
            targetNodeId = treeState.rootId;
          }
        }
      } else {
        // Opponent's turn (user just played and engine hasn't moved yet or opening)
        if (currentNode.parentId) {
          targetNodeId = currentNode.parentId;
        }
      }

      if (targetNodeId && treeState.nodes[targetNodeId]) {
        // Prune the undone child branches so future moves become the clean active mainline
        set((state) => {
          const targetNode = state.treeState.nodes[targetNodeId!];
          if (targetNode) {
            const nodesToDelete: string[] = [];
            const collectDescendants = (nId: string) => {
              const n = state.treeState.nodes[nId];
              if (n) {
                for (const c of n.children) {
                  nodesToDelete.push(c);
                  collectDescendants(c);
                }
              }
            };
            for (const c of targetNode.children) {
              nodesToDelete.push(c);
              collectDescendants(c);
            }
            for (const dId of nodesToDelete) {
              delete state.treeState.nodes[dId];
            }
            targetNode.children = [];
          }

          // Truncate mainlineIds up to targetNodeId
          const targetIdx = state.treeState.mainlineIds.indexOf(targetNodeId!);
          if (targetIdx !== -1) {
            state.treeState.mainlineIds = state.treeState.mainlineIds.slice(0, targetIdx + 1);
          }

          state.treeState.currentNodeId = targetNodeId!;
          state.liveEval = null;
          state.isEngineThinking = false;
        });

        const targetNode = get().treeState.nodes[targetNodeId];
        if (targetNode && get().playStyle === 'casual') {
          const liveEngine = getLiveEngine();
          liveEngine
            .evaluate(targetNode.fen, 14, 1, (partial) => {
              set((state) => {
                state.liveEval = partial;
              });
            })
            .then((res) => {
              set((state) => {
                state.liveEval = res;
              });
            })
            .catch(() => {});
        }

        SoundManager.play('move', get().soundEnabled);
      }
    },

    flipBoard: () =>
      set((state) => {
        state.orientation = state.orientation === 'white' ? 'black' : 'white';
      }),

    toggleSound: () =>
      set((state) => {
        state.soundEnabled = !state.soundEnabled;
      }),

    toggleEvalBar: () =>
      set((state) => {
        state.showEvalBar = !state.showEvalBar;
      }),

    toggleBestMoveArrow: () =>
      set((state) => {
        state.showBestMoveArrow = !state.showBestMoveArrow;
      }),

    toggleCasualClassifications: () =>
      set((state) => {
        const nextVal = !state.showCasualClassifications;
        state.showCasualClassifications = nextVal;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('postmatem_casual_classifications', String(nextVal));
          } catch {}
        }
      }),

    setEngineLevel: (level) =>
      set((state) => {
        state.engineLevel = Math.max(1, Math.min(20, level));
      }),

    setSelectedEngine: (engine) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('postmatem_selected_engine', engine);
        } catch {}
      }

      if (liveEngineInstance) {
        liveEngineInstance.terminate();
        liveEngineInstance = null;
      }
      if (playEngineInstance) {
        playEngineInstance.terminate();
        playEngineInstance = null;
      }
      if (batchPoolInstance) {
        batchPoolInstance.terminate();
        batchPoolInstance = null;
      }

      set((state) => {
        state.selectedEngine = engine;
        state.liveEval = null;
        state.isEngineThinking = false;
      });

      // Re-trigger live evaluation for active position in Analysis or Casual Play
      const { mode, playStyle, treeState } = get();
      if (mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS' || (mode === 'PLAY' && playStyle === 'casual')) {
        const currentNode = treeState.nodes[treeState.currentNodeId];
        if (currentNode) {
          getLiveEngine()
            .evaluate(
              currentNode.fen,
              mode === 'PLAY' ? 14 : 18,
              mode === 'PLAY' ? 1 : 3,
              (partial) => {
                set((s) => {
                  s.liveEval = partial;
                });
              }
            )
            .then((res) => {
              set((s) => {
                s.liveEval = res;
              });
              EvalCache.set(res);
            })
            .catch((err) => {
              if (err?.name !== 'AbortError' && !err?.message?.includes('Aborted')) {
                console.warn('[LiveEngine] Re-eval error after engine switch:', err);
              }
            });
        }
      }
    },

    setPieceSet: (pieceSet) => {
      if (typeof window !== 'undefined') localStorage.setItem('postmatem_piece_set', pieceSet);
      set((state) => {
        state.pieceSet = pieceSet;
      });
    },

    setBoardColors: (dark, light) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_dark_square', dark);
        localStorage.setItem('postmatem_light_square', light);
        localStorage.removeItem('postmatem_board_svg');
      }
      set((state) => {
        state.darkSquareColor = dark;
        state.lightSquareColor = light;
        state.boardSvg = null;
      });
      const s = get();
      if (s.accentColorId === 'auto') {
        const activePreset = resolveActiveAccent('auto', null, dark, light);
        applyAccentToDom(activePreset);
      }
    },

    setBoardThemePreset: (presetId) => {
      const preset = BOARD_THEMES.find((p) => p.id === presetId);
      if (!preset) return;
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_dark_square', preset.darkSquare);
        localStorage.setItem('postmatem_light_square', preset.lightSquare);
        if (preset.svgFile) {
          localStorage.setItem('postmatem_board_svg', preset.svgFile);
        } else {
          localStorage.removeItem('postmatem_board_svg');
        }
      }
      set((state) => {
        state.darkSquareColor = preset.darkSquare;
        state.lightSquareColor = preset.lightSquare;
        state.boardSvg = preset.svgFile || null;
      });
      const s = get();
      if (s.accentColorId === 'auto') {
        const activePreset = resolveActiveAccent('auto', preset.svgFile || null, preset.darkSquare, preset.lightSquare);
        applyAccentToDom(activePreset);
      }
    },

    setBoardSvg: (svg) => {
      if (typeof window !== 'undefined') {
        if (svg) localStorage.setItem('postmatem_board_svg', svg);
        else localStorage.removeItem('postmatem_board_svg');
      }
      set((state) => {
        state.boardSvg = svg;
      });
      const s = get();
      if (s.accentColorId === 'auto') {
        const activePreset = resolveActiveAccent('auto', svg, s.darkSquareColor, s.lightSquareColor);
        applyAccentToDom(activePreset);
      }
    },

    setHideCursorOnDrag: (hide) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_hide_cursor_drag', String(hide));
      }
      set((state) => {
        state.hideCursorOnDrag = hide;
      });
    },

    toggleHideCursorOnDrag: () => {
      const next = !get().hideCursorOnDrag;
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_hide_cursor_drag', String(next));
      }
      set((state) => {
        state.hideCursorOnDrag = next;
      });
    },

    setAccentColorId: (id) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_accent_color', id);
      }
      set((state) => {
        state.accentColorId = id;
      });
      const s = get();
      const preset = resolveActiveAccent(id, s.boardSvg, s.darkSquareColor, s.lightSquareColor);
      applyAccentToDom(preset);
    },

    setUserAvatar: (avatar) => {
      saveStoredUserAvatar(avatar);
      set((state) => {
        state.userAvatar = avatar;
      });
    },

    setWoodGrainEnabled: (enabled) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_wood_grain_enabled', String(enabled));
      }
      set((state) => {
        state.woodGrainEnabled = enabled;
      });
    },

    setWoodGrainOpacity: (opacity) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_wood_grain_opacity', String(opacity));
      }
      set((state) => {
        state.woodGrainOpacity = opacity;
      });
    },

    setWoodGrainTexture: (texture) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_wood_grain_texture', texture);
      }
      set((state) => {
        state.woodGrainTexture = texture;
      });
    },

    setThemeMode: (mode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('postmatem_theme_mode', mode);
      }
      set((state) => {
        state.themeMode = mode;
      });
      const s = get();
      const activePreset = resolveActiveAccent(
        s.accentColorId,
        s.boardSvg,
        s.darkSquareColor,
        s.lightSquareColor
      );
      applyThemeToDom(mode, activePreset);
    },

    toggleThemeMode: () => {
      const current = get().themeMode;
      const next = current === 'light' ? 'dark' : 'light';
      get().setThemeMode(next);
    },

    playMove: (from, to, promotion) => {
      const { treeState, mode, playerColor, isEngineThinking } = get();
      if (mode === 'PLAY' && isEngineThinking) return false;

      const currentNode = treeState.nodes[treeState.currentNodeId];
      if (!currentNode) return false;

      // Validate turn in play mode
      const isWhiteTurn = currentNode.fen.includes(' w ');
      const userTurn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      if (mode === 'PLAY' && !userTurn) return false;

      // Pre-validate move legality before modifying graph to avoid noisy invalid move exceptions
      try {
        const testBoard = new Chess(currentNode.fen);
        const legalMoves = testBoard.moves({ square: from as Square, verbose: true });
        const isLegal = legalMoves.some(
          (m) => m.to === to && (!promotion || m.promotion === promotion)
        );
        if (!isLegal) {
          SoundManager.play('error', get().soundEnabled);
          return false;
        }
      } catch {
        return false;
      }

      try {
        const moveInput: { from: string; to: string; promotion?: string } = { from, to };
        if (promotion) {
          moveInput.promotion = promotion;
        }

        const { newState, newNodeId, move: playedMoveObj } = MoveGraph.addMove(treeState, treeState.currentNodeId, moveInput);

        const newNode = newState.nodes[newNodeId];

        set((state) => {
          state.treeState = newState;
        });

        // Trigger move sound
        const tempBoard = new Chess(newNode.fen);
        if (tempBoard.isGameOver()) {
          if (tempBoard.isCheckmate()) {
            const isUserWhite = get().playerColor === 'white';
            const winnerIsWhite = !newNode.fen.includes(' w ');
            const userWon = isUserWhite ? winnerIsWhite : !winnerIsWhite;
            SoundManager.play(mode === 'PLAY' ? (userWon ? 'victory' : 'defeat') : 'victory', get().soundEnabled);
          } else if (tempBoard.isDraw()) {
            SoundManager.play('draw', get().soundEnabled);
          } else {
            SoundManager.play('game-end', get().soundEnabled);
          }
        } else if (tempBoard.inCheck()) {
          SoundManager.play('check', get().soundEnabled);
        } else if (playedMoveObj.captured) {
          SoundManager.play('capture', get().soundEnabled);
        } else if (playedMoveObj.flags.includes('k') || playedMoveObj.flags.includes('q')) {
          SoundManager.play('castle', get().soundEnabled);
        } else if (playedMoveObj.promotion) {
          SoundManager.play('promote', get().soundEnabled);
        } else {
          SoundManager.play('move', get().soundEnabled);
        }

        // In ANALYSIS mode, trigger deep multi-line evaluation
        if (mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS') {
          const liveEngine = getLiveEngine();
          liveEngine
            .evaluate(newNode.fen, 18, 3, (partial) => {
              set((state) => {
                state.liveEval = partial;
              });
            })
            .then(async (finalEval) => {
              set((state) => {
                state.liveEval = finalEval;
              });
              EvalCache.set(finalEval);

              // In Analysis mode, compute live classification for user's move if possible
              const liveNode = get().treeState.nodes[newNodeId];
              if (liveNode && !liveNode.classification) {
                try {
                  const prevEval = currentNode.eval || (await EvalCache.get(currentNode.fen));
                  if (prevEval) {
                    const path = MoveGraph.getPathToNode(get().treeState, newNodeId);
                    const sanMoves = path.map((n) => n.san);
                    const isBook = isPathInBook(sanMoves);
                    const openingName = isBook ? getOpeningForMoves(sanMoves)?.name : undefined;

                    const liveClassification = MoveClassifier.classifyMove({
                      prevEval,
                      currEval: finalEval,
                      playedUci: newNode.uci,
                      playedSan: newNode.san,
                      prevFen: currentNode.fen,
                      currFen: newNode.fen,
                      isBook,
                      openingName,
                    });
                    set((state) => {
                      state.treeState = MoveGraph.setNodeEval(
                        state.treeState,
                        newNodeId,
                        finalEval,
                        liveClassification
                      );
                    });
                  }
                } catch (classErr) {
                  console.warn('[LiveEngine] Live classification error:', classErr);
                }
              }
            })
            .catch((err) => {
              if (err?.name !== 'AbortError' && !err?.message?.includes('Aborted')) {
                console.warn('[LiveEngine] Analysis eval error:', err);
              }
            });
        }

        // Check if game ended (only in PLAY mode against engine)
        const board = new Chess(newNode.fen);
        const isRepetition = isThreefoldRepetitionDraw(newState, newNodeId);
        const isGameEnded = board.isGameOver() || isRepetition;

        if (mode === 'PLAY' && isGameEnded) {
          let result = '1/2-1/2';
          const isCheckmate = board.isCheckmate();
          if (isCheckmate) {
            result = isWhiteTurn ? '1-0' : '0-1';
            SoundManager.play(isWhiteTurn ? 'victory' : 'defeat', get().soundEnabled);
          } else if (board.isDraw() || isRepetition) {
            SoundManager.play('draw', get().soundEnabled);
          }

          set((state) => {
            state.mode = 'GAME_OVER';
            state.headers.Result = result;
            state.isEngineThinking = false;
            // Set terminal evaluation so eval bar and arrows reflect final position immediately
            state.liveEval = {
              fen: newNode.fen,
              depth: 0,
              lines: [{
                id: 1,
                depth: 0,
                score: isCheckmate ? (isWhiteTurn ? 10000 : -10000) : 0,
                type: isCheckmate ? 'mate' : 'cp',
                uciMove: '',
                pv: [],
              }],
              bestMove: '(none)',
              engineName: 'Stockfish',
            };
          });

          // Save game to local-first IndexedDB
          const gameId = get().activeGameId || `game_${Date.now()}`;
          set((state) => {
            state.activeGameId = gameId;
          });
          const currentPgn = PgnSerializer.serialize(newState, get().headers);
          GameRepository.saveGame({
            id: gameId,
            pgn: currentPgn,
            date: new Date().toISOString(),
            headers: get().headers,
            result,
            white: { name: get().headers.White || 'White' },
            black: { name: get().headers.Black || 'Black' },
            moveCount: Math.ceil(newNode.ply / 2),
          });

          return true;
        }

        // If in PLAY mode against engine, trigger Stockfish reply move via dedicated playEngine
        if (mode === 'PLAY' && !isGameEnded) {
          set((state) => {
            state.isEngineThinking = true;
          });

          const currentLevel = get().engineLevel;
          const engineSearchDepth = getEngineDepthForLevel(currentLevel);
          const playEngine = getPlayEngine();
          playEngine
            .evaluate(
              newNode.fen,
              engineSearchDepth,
              1,
              (partial) => {
                if (get().playStyle === 'casual') {
                  set((state) => {
                    state.liveEval = partial;
                  });
                }
              },
              currentLevel
            )
            .then(async (engineResult) => {
              set((state) => {
                state.isEngineThinking = false;
              });

              // Ensure evaluation matches the position Stockfish was asked to calculate
              const norm = (f?: string | null) => (f ? f.trim().split(/\s+/).slice(0, 4).join(' ') : '');
              if (engineResult.fen !== newNode.fen && norm(engineResult.fen) !== norm(newNode.fen)) {
                return;
              }

              EvalCache.set(engineResult);

              let currentTree = get().treeState;

              // In CASUAL play mode, classify the user's played move
              if (get().playStyle === 'casual' && currentTree.nodes[newNodeId]) {
                try {
                  const prevEval =
                    currentNode.eval ||
                    (await EvalCache.get(currentNode.fen)) || {
                      fen: currentNode.fen,
                      depth: 1,
                      lines: [{ id: 1, depth: 1, score: 0, type: 'cp', uciMove: '', pv: [] }],
                      bestMove: '',
                      engineName: 'Stockfish',
                    };

                  const path = MoveGraph.getPathToNode(currentTree, newNodeId);
                  const sanMoves = path.map((n) => n.san);
                  const isBook = isPathInBook(sanMoves);
                  const openingName = isBook ? getOpeningForMoves(sanMoves)?.name : undefined;

                  const userMoveClassification = MoveClassifier.classifyMove({
                    prevEval,
                    currEval: engineResult,
                    playedUci: newNode.uci,
                    playedSan: newNode.san,
                    prevFen: currentNode.fen,
                    currFen: newNode.fen,
                    isBook,
                    openingName,
                  });
                  currentTree = MoveGraph.setNodeEval(currentTree, newNodeId, engineResult, userMoveClassification);
                  set((state) => {
                    state.treeState = currentTree;
                  });
                } catch (classErr) {
                  console.warn('[PlayEngine] Casual move classification warning:', classErr);
                }
              }

              if (engineResult.bestMove && engineResult.bestMove !== '(none)') {
                const engFrom = engineResult.bestMove.slice(0, 2) as Square;
                const engTo = engineResult.bestMove.slice(2, 4) as Square;
                const engPromo = (engineResult.bestMove.slice(4, 5) || undefined) as any;

                if (!currentTree.nodes[newNodeId]) {
                  return;
                }

                // Verify move legality with chess.js before applying to graph
                let verifyMove: any = null;
                try {
                  const verifyChess = new Chess(newNode.fen);
                  verifyMove = verifyChess.move({
                    from: engFrom,
                    to: engTo,
                    promotion: engPromo,
                  });
                } catch {
                  verifyMove = null;
                }

                if (!verifyMove) {
                  console.warn('[PlayEngine] Stale or illegal move discarded:', engineResult.bestMove, 'for fen:', newNode.fen);
                  // Auto-recover: re-evaluate Stockfish cleanly on the true current position via playEngine
                  const retryLevel = get().engineLevel;
                  getPlayEngine()
                    .evaluate(
                      newNode.fen,
                      getEngineDepthForLevel(retryLevel),
                      1,
                      undefined,
                      retryLevel
                    )
                    .then((retryResult) => {
                      if (retryResult.bestMove && retryResult.bestMove !== '(none)') {
                        const retryFrom = retryResult.bestMove.slice(0, 2) as Square;
                        const retryTo = retryResult.bestMove.slice(2, 4) as Square;
                        const retryPromo = (retryResult.bestMove.slice(4, 5) || undefined) as any;
                        try {
                          const retryChess = new Chess(newNode.fen);
                          if (retryChess.move({ from: retryFrom, to: retryTo, promotion: retryPromo })) {
                            const retryReply = MoveGraph.addMove(get().treeState, newNodeId, {
                              from: retryFrom,
                              to: retryTo,
                              promotion: retryPromo,
                            });
                            set((state) => {
                              state.treeState = retryReply.newState;
                              if (state.treeState.currentNodeId === newNodeId) {
                                state.treeState.currentNodeId = retryReply.newNodeId;
                              }
                            });
                            SoundManager.play('move', get().soundEnabled);
                          }
                        } catch {}
                      }
                    })
                    .catch(() => {});
                  return;
                }

                const reply = MoveGraph.addMove(currentTree, newNodeId, {
                  from: engFrom,
                  to: engTo,
                  promotion: engPromo,
                });

                set((state) => {
                  state.treeState = reply.newState;
                  // If viewing the move Stockfish just replied to, advance view to Stockfish's move
                  if (state.treeState.currentNodeId === newNodeId) {
                    state.treeState.currentNodeId = reply.newNodeId;
                  }
                });

                const replyNode = reply.newState.nodes[reply.newNodeId];
                const replyBoard = new Chess(replyNode.fen);
                const isReplyRepetition = isThreefoldRepetitionDraw(reply.newState, reply.newNodeId);
                const isReplyGameEnded = replyBoard.isGameOver() || isReplyRepetition;

                if (isReplyGameEnded) {
                  let replyResult = '1/2-1/2';
                  const isCheckmate = replyBoard.isCheckmate();
                  if (isCheckmate) {
                    const isWhiteMated = replyBoard.turn() === 'w';
                    replyResult = isWhiteMated ? '0-1' : '1-0';
                    SoundManager.play('defeat', get().soundEnabled);
                  } else if (replyBoard.isDraw() || isReplyRepetition) {
                    SoundManager.play('draw', get().soundEnabled);
                  } else {
                    SoundManager.play('game-end', get().soundEnabled);
                  }
                  set((state) => {
                    state.mode = 'GAME_OVER';
                    state.headers.Result = replyResult;
                    // Terminal eval for Stockfish's winning move
                    state.liveEval = {
                      fen: replyNode.fen,
                      depth: 0,
                      lines: [{
                        id: 1,
                        depth: 0,
                        score: isCheckmate ? (replyBoard.turn() === 'w' ? -10000 : 10000) : 0,
                        type: isCheckmate ? 'mate' : 'cp',
                        uciMove: '',
                        pv: [],
                      }],
                      bestMove: '(none)',
                      engineName: 'Stockfish',
                    };
                  });

                  // Save game to local-first IndexedDB
                  const gameId = get().activeGameId || `game_${Date.now()}`;
                  set((state) => {
                    state.activeGameId = gameId;
                  });
                  const currentPgn = PgnSerializer.serialize(reply.newState, get().headers);
                  GameRepository.saveGame({
                    id: gameId,
                    pgn: currentPgn,
                    date: new Date().toISOString(),
                    headers: get().headers,
                    result: replyResult,
                    white: { name: get().headers.White || 'White' },
                    black: { name: get().headers.Black || 'Black' },
                    moveCount: Math.ceil(replyNode.ply / 2),
                  });
                } else {
                  if (replyBoard.inCheck()) {
                    SoundManager.play('check', get().soundEnabled);
                  } else if (reply.move.captured) {
                    SoundManager.play('capture', get().soundEnabled);
                  } else if (reply.move.flags.includes('k') || reply.move.flags.includes('q')) {
                    SoundManager.play('castle', get().soundEnabled);
                  } else {
                    SoundManager.play('move', get().soundEnabled);
                  }

                  // In CASUAL play mode, evaluate resulting position after reply move so eval bar reflects the user's turn!
                  if (get().playStyle === 'casual') {
                    const userTurnEngine = getLiveEngine();
                    userTurnEngine
                      .evaluate(replyNode.fen, 14, 1, (partial) => {
                        set((state) => {
                          state.liveEval = partial;
                        });
                      })
                      .then((userTurnEval) => {
                        set((state) => {
                          state.liveEval = userTurnEval;
                        });
                        EvalCache.set(userTurnEval);

                        // In CASUAL play mode, classify Stockfish's reply move as well
                        if (get().playStyle === 'casual') {
                          const path = MoveGraph.getPathToNode(get().treeState, replyNode.id);
                          const sanMoves = path.map((n) => n.san);
                          const isBook = isPathInBook(sanMoves);
                          const openingName = isBook ? getOpeningForMoves(sanMoves)?.name : undefined;

                          const replyClassification = MoveClassifier.classifyMove({
                            prevEval: engineResult,
                            currEval: userTurnEval,
                            playedUci: replyNode.uci,
                            playedSan: replyNode.san,
                            prevFen: newNode.fen,
                            currFen: replyNode.fen,
                            isBook,
                            openingName,
                          });
                          set((state) => {
                            state.treeState = MoveGraph.setNodeEval(
                              state.treeState,
                              replyNode.id,
                              userTurnEval,
                              replyClassification
                            );
                          });
                        }
                      })
                      .catch((err) => {
                        if (err?.name !== 'AbortError' && !err?.message?.includes('Aborted')) {
                          console.warn('[LiveEngine] Post-reply eval error:', err);
                        }
                      });
                  }
                }
              }
            })
            .catch((err) => {
              set((state) => {
                state.isEngineThinking = false;
              });
              if (err?.name !== 'AbortError' && !err?.message?.includes('Aborted')) {
                console.warn('[PlayEngine] Reply move error:', err);
              }
            });
        }

        return true;
      } catch (err) {
        SoundManager.play('error', get().soundEnabled);
        console.warn('[Store] Illegal move attempted:', err);
        return false;
      }
    },

    navigateToNode: (nodeId) => {
      const { treeState, mode: currentMode, isEngineThinking: engineBusy, playStyle: currentPlayStyle, soundEnabled } = get();
      const targetNode = treeState.nodes[nodeId];
      if (!targetNode) return;

      // In competitive play mode, strictly prevent rewinding/navigating away from current live move
      if (currentMode === 'PLAY' && (engineBusy || currentPlayStyle === 'competitive')) {
        return;
      }

      const isDifferentNode = treeState.currentNodeId !== nodeId;

      set((state) => {
        state.treeState.currentNodeId = nodeId;
        if (targetNode.eval) {
          state.liveEval = targetNode.eval;
        } else if (state.liveEval && state.liveEval.fen !== targetNode.fen) {
          state.liveEval = null;
        }
      });

      // Play sound when navigating between moves
      if (isDifferentNode && soundEnabled) {
        if (nodeId === treeState.rootId) {
          SoundManager.play('move', soundEnabled);
        } else if (targetNode.san) {
          if (targetNode.san.includes('#')) {
            SoundManager.play('checkmate', soundEnabled);
          } else if (targetNode.san.includes('+')) {
            SoundManager.play('check', soundEnabled);
          } else if (targetNode.san.includes('O-O')) {
            SoundManager.play('castle', soundEnabled);
          } else if (targetNode.san.includes('=')) {
            SoundManager.play('promote', soundEnabled);
          } else if (targetNode.san.includes('x')) {
            SoundManager.play('capture', soundEnabled);
          } else {
            SoundManager.play('move', soundEnabled);
          }
        }
      }

      // Clear any pending debounced navigation evaluation
      if (navEvalDebounceTimer) {
        clearTimeout(navEvalDebounceTimer);
        navEvalDebounceTimer = null;
      }

      // In competitive mode, no background evaluation needed
      if (currentMode === 'PLAY' && currentPlayStyle === 'competitive') {
        return;
      }

      // Debounce live engine evaluation by 100ms during navigation
      // This prevents rapid arrow key or click navigation from spamming Stockfish WASM
      navEvalDebounceTimer = setTimeout(() => {
        navEvalDebounceTimer = null;
        const liveEngine = getLiveEngine();
        liveEngine
          .evaluate(targetNode.fen, 18, 3, (partial) => {
            set((state) => {
              state.liveEval = partial;
            });
          })
          .then((finalEval) => {
            set((state) => {
              state.liveEval = finalEval;
            });
          })
          .catch((err) => {
            if (
              err?.name !== 'AbortError' &&
              !err?.message?.includes('Aborted') &&
              !err?.message?.includes('recovering')
            ) {
              console.warn('[LiveEngine] Navigation eval error:', err);
            }
          });
      }, 100);
    },

    goToNextMove: () => {
      const next = MoveGraph.getNextNode(get().treeState);
      if (next) get().navigateToNode(next.id);
    },

    goToPreviousMove: () => {
      const prev = MoveGraph.getPreviousNode(get().treeState);
      if (prev) get().navigateToNode(prev.id);
    },

    goToStart: () => {
      get().navigateToNode(get().treeState.rootId);
    },

    goToEnd: () => {
      const mainline = MoveGraph.getMainlineNodes(get().treeState);
      if (mainline.length > 0) {
        get().navigateToNode(mainline[mainline.length - 1].id);
      }
    },

    initEngine: async () => {
      try {
        await getLiveEngine().init();
        const state = get();
        if (state.mode === 'ANALYSIS' || (state.mode === 'PLAY' && state.playStyle === 'casual')) {
          const currentNode = state.treeState.nodes[state.treeState.currentNodeId];
          if (currentNode) {
            getLiveEngine()
              .evaluate(currentNode.fen, state.mode === 'PLAY' ? 14 : 18, state.mode === 'PLAY' ? 1 : 3, (partial) => {
                set((s) => {
                  s.liveEval = partial;
                });
              })
              .then((res) => {
                set((s) => {
                  s.liveEval = res;
                });
                EvalCache.set(res);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[AppStore] LiveEngine init error:', err);
      }
    },

    startNewGame: (playerColor = 'white', engineLevel = 10) => {
      getLiveEngine().stop().catch(() => {});
      getPlayEngine().stop().catch(() => {});
      const tree = MoveGraph.createInitial();
      set((state) => {
        state.mode = 'PLAY';
        state.treeState = tree;
        state.playerColor = playerColor;
        state.orientation = playerColor;
        state.engineLevel = engineLevel;
        state.activeGameId = `game_${Date.now()}`;
        state.liveEval = null;
        state.analysisReport = null;
        const sfElo = String(getStockfishElo(engineLevel));
        state.headers = {
          White: playerColor === 'white' ? 'You' : 'Stockfish',
          Black: playerColor === 'black' ? 'You' : 'Stockfish',
          WhiteElo: playerColor === 'white' ? '1500' : sfElo,
          BlackElo: playerColor === 'black' ? '1500' : sfElo,
          Event: 'PostMatem Match',
          Date: new Date().toISOString().split('T')[0],
          Result: '*',
        };
      });

      // If user plays as Black, engine makes the opening move via dedicated playEngine
      if (playerColor === 'black') {
        set((state) => {
          state.isEngineThinking = true;
        });

        const playEngine = getPlayEngine();
        const searchDepth = getEngineDepthForLevel(engineLevel);
        playEngine
          .evaluate(MoveGraph.DEFAULT_FEN, searchDepth, 1, undefined, engineLevel)
          .then((res) => {
            set((state) => {
              state.isEngineThinking = false;
            });
            if (res.bestMove && res.bestMove !== '(none)') {
              const from = res.bestMove.slice(0, 2) as Square;
              const to = res.bestMove.slice(2, 4) as Square;
              const { newState, newNodeId } = MoveGraph.addMove(get().treeState, 'root', { from, to });
              set((state) => {
                state.treeState = newState;
              });
              SoundManager.play('move', get().soundEnabled);

              if (get().playStyle === 'casual') {
                const node = newState.nodes[newNodeId];
                if (node) {
                  const liveEngine = getLiveEngine();
                  liveEngine
                    .evaluate(node.fen, 14, 1, (partial: PositionEvaluation) => {
                      set((s) => {
                        s.liveEval = partial;
                      });
                    })
                    .then((postEval: PositionEvaluation) => {
                      set((s) => {
                        s.liveEval = postEval;
                      });
                      EvalCache.set(postEval);
                    })
                    .catch(() => {});
                }
              }
            }
          })
          .catch((err) => {
            set((state) => {
              state.isEngineThinking = false;
            });
            console.error('[LiveEngine] Opening move error:', err);
          });
      } else if (get().playStyle === 'casual') {
        const liveEngine = getLiveEngine();
        liveEngine
          .evaluate(MoveGraph.DEFAULT_FEN, 14, 1, (partial) => {
            set((state) => {
              state.liveEval = partial;
            });
          })
          .then((res) => {
            set((state) => {
              state.liveEval = res;
            });
            EvalCache.set(res);
          })
          .catch(() => {});
      }
    },

    resignGame: () => {
      SoundManager.play('defeat', get().soundEnabled);
      const result = get().playerColor === 'white' ? '0-1' : '1-0';
      const gameId = get().activeGameId || `game_${Date.now()}`;
      set((state) => {
        state.mode = 'GAME_OVER';
        state.headers.Result = result;
        state.activeGameId = gameId;
      });

      const currentNode = get().treeState.nodes[get().treeState.currentNodeId];
      const currentPgn = PgnSerializer.serialize(get().treeState, get().headers);
      GameRepository.saveGame({
        id: gameId,
        pgn: currentPgn,
        date: new Date().toISOString(),
        headers: get().headers,
        result,
        white: { name: get().headers.White || 'White' },
        black: { name: get().headers.Black || 'Black' },
        moveCount: Math.ceil((currentNode?.ply || 0) / 2),
      });
    },

    loadPgn: (pgn) => {
      try {
        const parsed = PgnParser.parse(pgn);
        set((state) => {
          state.mode = 'ANALYSIS';
          state.treeState = parsed.treeState;
          state.headers = parsed.headers;
          state.activeGameId = `pgn_${Date.now()}`;
          state.analysisReport = null;
          state.liveEval = null;
          state.mistakeWorkout = null;
        });
        const rootNode = parsed.treeState.nodes[parsed.treeState.currentNodeId];
        if (rootNode) {
          getLiveEngine()
            .evaluate(rootNode.fen, 18, 3, (partial) => {
              set((s) => {
                s.liveEval = partial;
              });
            })
            .then((res) => {
              set((s) => {
                s.liveEval = res;
              });
            })
            .catch(() => {});
        }
        return true;
      } catch (err) {
        console.warn('[Store] PGN parsing rejected:', err);
        return false;
      }
    },

    loadFen: (fen: string) => {
      try {
        const chess = new Chess(fen.trim());
        const tree = MoveGraph.createInitial(chess.fen());
        set((state) => {
          state.mode = 'ANALYSIS';
          state.treeState = tree;
          state.headers = {
            White: chess.turn() === 'w' ? 'White to move' : 'Black to move',
            Black: '',
            Event: 'FEN Board Setup',
            Date: new Date().toISOString().split('T')[0],
            Result: '*',
            FEN: chess.fen(),
          };
          state.activeGameId = `fen_${Date.now()}`;
          state.analysisReport = null;
          state.liveEval = null;
          state.mistakeWorkout = null;
        });

        getLiveEngine()
          .evaluate(chess.fen(), 18, 3, (partial) => {
            set((s) => {
              s.liveEval = partial;
            });
          })
          .then((res) => {
            set((s) => {
              s.liveEval = res;
            });
          })
          .catch(() => {});

        return true;
      } catch (err) {
        console.warn('[Store] Invalid FEN passed to loadFen:', err);
        return false;
      }
    },

    loadOpeningLine: (name: string, eco: string, moves: string[]) => {
      let moveText = '';
      for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) {
          moveText += `${Math.floor(i / 2) + 1}. `;
        }
        moveText += `${moves[i]} `;
      }
      const pgn = `[Event "${name}"]\n[Site "PostMatem Opening Study"]\n[ECO "${eco}"]\n[Opening "${name}"]\n\n${moveText.trim()} *`;
      const ok = get().loadPgn(pgn);
      if (ok) {
        get().goToEnd();
      }
      return ok;
    },

    startMistakeWorkout: (targetColor) => {
      const { treeState, playerColor, orientation, mode } = get();
      const mainline = MoveGraph.getMainlineNodes(treeState);
      let effectiveColor = targetColor || (mode === 'PLAY' ? playerColor : orientation);

      const mistakeTypes = new Set([
        MoveClassificationType.BLUNDER,
        MoveClassificationType.MISTAKE,
        MoveClassificationType.MISS,
        MoveClassificationType.INACCURACY,
      ]);

      const collectForColor = (color: 'white' | 'black') => {
        const isWhite = color === 'white';
        const list: MistakeItem[] = [];
        for (let i = 1; i < mainline.length; i++) {
          const node = mainline[i];
          if (node.isWhite !== isWhite) continue;
          if (!node.classification || !mistakeTypes.has(node.classification.type)) continue;

          const parentNode = node.parentId ? treeState.nodes[node.parentId] : null;
          const fenBefore = parentNode ? parentNode.fen : MoveGraph.DEFAULT_FEN;
          const evalBefore = parentNode?.eval;
          const bestMoveUci = evalBefore?.lines?.[0]?.uciMove || '';
          const bestMoveSan = evalBefore?.lines?.[0]?.pv?.[0] || (bestMoveUci ? bestMoveUci : 'Best move');

          list.push({
            nodeId: node.id,
            parentNodeId: node.parentId || '',
            ply: node.ply,
            moveNumber: node.moveNumber,
            isWhite: node.isWhite,
            sanPlayed: node.san,
            classification: node.classification.type,
            fenBefore,
            fenAfter: node.fen,
            bestMoveSan,
            bestMoveUci,
          });
        }
        return list;
      };

      let mistakes = collectForColor(effectiveColor);
      if (mistakes.length === 0) {
        const otherColor = effectiveColor === 'white' ? 'black' : 'white';
        const otherMistakes = collectForColor(otherColor);
        if (otherMistakes.length > 0) {
          mistakes = otherMistakes;
          effectiveColor = otherColor;
        }
      }

      if (mistakes.length === 0) {
        return false;
      }

      set((state) => {
        state.mistakeWorkout = {
          isActive: true,
          mistakes,
          currentIndex: 0,
          status: 'guessing',
          attempts: 0,
          hintLevel: 0,
          score: { solvedFirstTry: 0, total: mistakes.length },
        };
        state.treeState.currentNodeId = mistakes[0].parentNodeId;
        state.orientation = effectiveColor;
      });

      SoundManager.play('move', get().soundEnabled);
      return true;
    },

    submitWorkoutMove: (from, to, promotion) => {
      const { mistakeWorkout } = get();
      if (!mistakeWorkout || !mistakeWorkout.isActive) return false;
      const current = mistakeWorkout.mistakes[mistakeWorkout.currentIndex];
      if (!current) return false;

      const playedUci = `${from}${to}${promotion || ''}`;

      let isCorrect = playedUci === current.bestMoveUci;

      if (!isCorrect) {
        try {
          const testBoard = new Chess(current.fenBefore);
          const moveObj = testBoard.move({
            from: from as Square,
            to: to as Square,
            promotion: promotion as any,
          });
          if (!moveObj) return false;
          if (moveObj.san === current.bestMoveSan) {
            isCorrect = true;
          }
        } catch {
          return false;
        }
      }

      if (isCorrect) {
        // Execute the correct move into the game graph from parentNodeId
        try {
          const moveInput: { from: string; to: string; promotion?: string } = { from, to };
          if (promotion) moveInput.promotion = promotion;

          const { newState, newNodeId, move: playedMoveObj } = MoveGraph.addMove(
            get().treeState,
            current.parentNodeId,
            moveInput
          );

          const bestClassification: MoveClassification = {
            type: MoveClassificationType.BEST,
            label: 'Best',
            glyph: '★',
            color: '#7C9A5C',
            accuracyScore: 100,
            centipawnLoss: 0,
            winRateBefore: 50,
            winRateAfter: 50,
            winRateLoss: 0,
            comment: 'You found the best continuation!',
          };

          const updatedTree = MoveGraph.setNodeEval(
            newState,
            newNodeId,
            undefined,
            bestClassification
          );

          set((state) => {
            state.treeState = updatedTree;
            if (state.mistakeWorkout) {
              state.mistakeWorkout.status = 'solved';
              if (state.mistakeWorkout.attempts === 0) {
                state.mistakeWorkout.score.solvedFirstTry++;
              }
            }
          });

          // Play tactile piece move sounds, then victory chime
          if (playedMoveObj.captured) {
            SoundManager.play('capture', get().soundEnabled);
          } else if (playedMoveObj.san.includes('+')) {
            SoundManager.play('check', get().soundEnabled);
          } else {
            SoundManager.play('move', get().soundEnabled);
          }
          setTimeout(() => {
            SoundManager.play('victory', get().soundEnabled);
          }, 180);

          return true;
        } catch (err) {
          console.error('[Store] Error executing workout move:', err);
          return false;
        }
      } else {
        SoundManager.play('error', get().soundEnabled);
        set((state) => {
          if (state.mistakeWorkout) {
            state.mistakeWorkout.attempts++;
            state.mistakeWorkout.status = 'incorrect';
          }
        });
        return false;
      }
    },

    retryCurrentMistake: () => {
      const { mistakeWorkout } = get();
      if (!mistakeWorkout || !mistakeWorkout.isActive) return;
      const current = mistakeWorkout.mistakes[mistakeWorkout.currentIndex];
      if (!current) return;

      set((state) => {
        if (state.mistakeWorkout) {
          state.mistakeWorkout.status = 'guessing';
          state.mistakeWorkout.attempts = 0;
          state.mistakeWorkout.hintLevel = 0;
          state.treeState.currentNodeId = current.parentNodeId;
        }
      });
      SoundManager.play('move', get().soundEnabled);
    },

    nextMistake: () => {
      const { mistakeWorkout } = get();
      if (!mistakeWorkout) return;
      const nextIdx = mistakeWorkout.currentIndex + 1;
      if (nextIdx >= mistakeWorkout.mistakes.length) {
        set((state) => {
          if (state.mistakeWorkout) {
            state.mistakeWorkout.status = 'completed';
          }
        });
        SoundManager.play('victory', get().soundEnabled);
      } else {
        const nextItem = mistakeWorkout.mistakes[nextIdx];
        set((state) => {
          if (state.mistakeWorkout) {
            state.mistakeWorkout.currentIndex = nextIdx;
            state.mistakeWorkout.status = 'guessing';
            state.mistakeWorkout.attempts = 0;
            state.mistakeWorkout.hintLevel = 0;
            state.treeState.currentNodeId = nextItem.parentNodeId;
          }
        });
        SoundManager.play('move', get().soundEnabled);
      }
    },

    previousMistake: () => {
      const { mistakeWorkout } = get();
      if (!mistakeWorkout || mistakeWorkout.currentIndex <= 0) return;
      const prevIdx = mistakeWorkout.currentIndex - 1;
      const prevItem = mistakeWorkout.mistakes[prevIdx];
      set((state) => {
        if (state.mistakeWorkout) {
          state.mistakeWorkout.currentIndex = prevIdx;
          state.mistakeWorkout.status = 'guessing';
          state.mistakeWorkout.attempts = 0;
          state.mistakeWorkout.hintLevel = 0;
          state.treeState.currentNodeId = prevItem.parentNodeId;
        }
      });
      SoundManager.play('move', get().soundEnabled);
    },

    requestWorkoutHint: () => {
      set((state) => {
        if (state.mistakeWorkout) {
          state.mistakeWorkout.hintLevel = Math.min(2, state.mistakeWorkout.hintLevel + 1);
        }
      });
      SoundManager.play('move', get().soundEnabled);
    },

    exitMistakeWorkout: () => {
      set((state) => {
        state.mistakeWorkout = null;
      });
    },

    exportPgn: () => {
      const { treeState, headers, analysisReport } = get();
      const enrichedHeaders = { ...headers };
      if (analysisReport) {
        enrichedHeaders.WhiteAccuracy = analysisReport.whiteAccuracy.toFixed(1);
        enrichedHeaders.BlackAccuracy = analysisReport.blackAccuracy.toFixed(1);
        if (analysisReport.whiteEstimatedElo) {
          enrichedHeaders.WhiteEstimatedElo = String(analysisReport.whiteEstimatedElo);
        }
        if (analysisReport.blackEstimatedElo) {
          enrichedHeaders.BlackEstimatedElo = String(analysisReport.blackEstimatedElo);
        }
        enrichedHeaders.Annotator = 'PostMatem Analysis • Stockfish 19';
      }
      return PgnSerializer.serialize(treeState, enrichedHeaders);
    },

    runPostMortemAnalysis: async (targetDepth?: number) => {
      const { treeState, activeGameId } = get();
      const targetGameId = activeGameId;
      const targetTreeRootId = treeState.rootId;

      const mainline = MoveGraph.getMainlineNodes(treeState);
      if (mainline.length <= 1) return;

      const analysisDepth = targetDepth || 16;

      set((state) => {
        state.mode = 'BATCH_ANALYSIS';
        state.isBatchRunning = true;
        state.batchProgress = 0;
      });

      try {
        const fens = mainline.map((node) => node.fen);
        const batchPool = getBatchPool();

        // Check cache first for existing evaluations (ensuring minimum target depth)
        const cachedEvals = await Promise.all(fens.map((fen) => EvalCache.get(fen, analysisDepth, 1)));
        const missingIndexes: number[] = [];
        const fensToEvaluate: string[] = [];

        cachedEvals.forEach((cached, idx) => {
          if (!cached) {
            missingIndexes.push(idx);
            fensToEvaluate.push(fens[idx]);
          }
        });

        let completedEvals = [...cachedEvals] as (PositionEvaluation | null)[];

        if (fensToEvaluate.length > 0) {
          const calculated = await batchPool.batchEvaluate(
            fensToEvaluate,
            analysisDepth,
            (percent) => {
              // Only update progress if still viewing the same target game
              if (get().activeGameId === targetGameId) {
                set((state) => {
                  state.batchProgress = percent;
                });
              }
            }
          );

          // Discard results if user switched games while analysis was computing
          if (get().activeGameId !== targetGameId || get().treeState.rootId !== targetTreeRootId) {
            return;
          }

          // Store new calculations into cache and array
          for (let i = 0; i < missingIndexes.length; i++) {
            const idx = missingIndexes[i];
            const evaluation = calculated[i];
            completedEvals[idx] = evaluation;
            EvalCache.set(evaluation);
          }
        }

        // Check again before committing report
        if (get().activeGameId !== targetGameId || get().treeState.rootId !== targetTreeRootId) {
          return;
        }

        const fullEvals = completedEvals as PositionEvaluation[];

        // Classify all moves
        let currentTree = get().treeState;
        const whiteCounts: Record<MoveClassificationType, number> = Object.values(
          MoveClassificationType
        ).reduce((acc, t) => ({ ...acc, [t]: 0 }), {} as Record<MoveClassificationType, number>);

        const blackCounts: Record<MoveClassificationType, number> = Object.values(
          MoveClassificationType
        ).reduce((acc, t) => ({ ...acc, [t]: 0 }), {} as Record<MoveClassificationType, number>);

        const winPercentages = fullEvals.map((ev, i) => WinRateMath.getPositionWhiteWinRate(ev, mainline[i]?.fen));

        let stillInBook = true;

        for (let i = 1; i < mainline.length; i++) {
          const node = mainline[i];
          const prevNode = mainline[i - 1];
          const prevEval = fullEvals[i - 1];
          const currEval = fullEvals[i];

          const sanSoFar = mainline.slice(1, i + 1).map((m) => m.san);
          let isBook = false;
          let bookOpeningName: string | undefined;

          // Opening book moves must be in the opening phase (<= 16 plies) and uninterrupted
          if (stillInBook && i <= 16) {
            if (i <= 2 || isExactBookSequence(sanSoFar)) {
              isBook = true;
              bookOpeningName = getOpeningForMoves(sanSoFar)?.name;
            } else {
              stillInBook = false;
            }
          } else {
            stillInBook = false;
          }

          const classification = MoveClassifier.classifyMove({
            prevEval,
            currEval,
            playedUci: node.uci,
            playedSan: node.san,
            prevFen: prevNode.fen,
            currFen: node.fen,
            isBook,
            openingName: bookOpeningName,
          });

          currentTree = MoveGraph.setNodeEval(currentTree, node.id, currEval, classification);

          if (node.isWhite) {
            whiteCounts[classification.type] = (whiteCounts[classification.type] || 0) + 1;
          } else {
            blackCounts[classification.type] = (blackCounts[classification.type] || 0) + 1;
          }
        }

        // Compute aggregate accuracy and ACPL / estimated Elo
        const { whiteAccuracy, blackAccuracy } = AccuracyCalculator.computeGameAccuracy(winPercentages);
        const { whiteAcpl, blackAcpl } = EloEstimator.computeAverageCpl(fullEvals);

        const totalWhiteMoves = Math.ceil((mainline.length - 1) / 2);
        const totalBlackMoves = Math.floor((mainline.length - 1) / 2);

        // Determine game outcome if checkmate or result header
        const lastNode = mainline[mainline.length - 1];
        const isCheckmate = lastNode?.san?.includes('#');
        let whiteOutcome: 'win' | 'loss' | 'draw' | undefined;
        let blackOutcome: 'win' | 'loss' | 'draw' | undefined;

        const gameResult = get().headers.Result;
        if (isCheckmate) {
          if (lastNode.isWhite) {
            whiteOutcome = 'win';
            blackOutcome = 'loss';
          } else {
            whiteOutcome = 'loss';
            blackOutcome = 'win';
          }
        } else if (gameResult === '1-0') {
          whiteOutcome = 'win';
          blackOutcome = 'loss';
        } else if (gameResult === '0-1') {
          whiteOutcome = 'loss';
          blackOutcome = 'win';
        } else if (gameResult === '1/2-1/2') {
          whiteOutcome = 'draw';
          blackOutcome = 'draw';
        }

        const whiteEstimatedElo = EloEstimator.estimatePerformanceRating({
          acpl: whiteAcpl,
          accuracy: whiteAccuracy,
          blunders: whiteCounts[MoveClassificationType.BLUNDER],
          mistakes: whiteCounts[MoveClassificationType.MISTAKE],
          inaccuracies: whiteCounts[MoveClassificationType.INACCURACY],
          moveCount: totalWhiteMoves,
          gameOutcome: whiteOutcome,
        });

        const blackEstimatedElo = EloEstimator.estimatePerformanceRating({
          acpl: blackAcpl,
          accuracy: blackAccuracy,
          blunders: blackCounts[MoveClassificationType.BLUNDER],
          mistakes: blackCounts[MoveClassificationType.MISTAKE],
          inaccuracies: blackCounts[MoveClassificationType.INACCURACY],
          moveCount: totalBlackMoves,
          gameOutcome: blackOutcome,
        });

        const report: AnalysisReport = {
          whiteAccuracy,
          blackAccuracy,
          whiteEstimatedElo,
          blackEstimatedElo,
          whiteAcpl,
          blackAcpl,
          classificationCounts: {
            white: whiteCounts,
            black: blackCounts,
          },
          phases: {
            opening: {
              accuracy: { white: whiteAccuracy, black: blackAccuracy },
              brilliantCount: { white: whiteCounts[MoveClassificationType.BRILLIANT], black: blackCounts[MoveClassificationType.BRILLIANT] },
              blunderCount: { white: whiteCounts[MoveClassificationType.BLUNDER], black: blackCounts[MoveClassificationType.BLUNDER] },
            },
            middlegame: {
              accuracy: { white: whiteAccuracy, black: blackAccuracy },
              brilliantCount: { white: whiteCounts[MoveClassificationType.BRILLIANT], black: blackCounts[MoveClassificationType.BRILLIANT] },
              blunderCount: { white: whiteCounts[MoveClassificationType.BLUNDER], black: blackCounts[MoveClassificationType.BLUNDER] },
            },
          },
          evaluations: fullEvals,
        };

        set((state) => {
          state.treeState = currentTree;
          state.analysisReport = report;
          state.batchProgress = 100;
          state.mode = 'ANALYSIS';
        });

        // Persist completed analysis report & full annotated tree to IndexedDB
        if (targetGameId) {
          GameRepository.getGame(targetGameId).then((existing) => {
            if (existing) {
              existing.analysisReport = report;
              existing.treeState = currentTree;
              GameRepository.saveGame(existing);
            }
          }).catch(() => {});
        }

        SoundManager.play('genericnotify', get().soundEnabled);
      } finally {
        set((state) => {
          state.isBatchRunning = false;
        });
      }
    },

    loadGameFromStorage: async (id) => {
      const stored = await GameRepository.getGame(id);
      if (stored) {
        if (stored.treeState) {
          set((state) => {
            state.treeState = stored.treeState!;
            state.headers = stored.headers || {};
            state.activeGameId = stored.id;
            state.mode = 'ANALYSIS';
            state.analysisReport = stored.analysisReport || null;
            state.liveEval = null;
          });
        } else {
          get().loadPgn(stored.pgn);
          if (stored.analysisReport) {
            set((state) => {
              state.analysisReport = stored.analysisReport || null;
            });
          }
        }
      }
    },
  }))
);
