import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { InstantChessBackend } from './instantChessBackend';
import { Chess, Square } from 'chess.js';
import { useAppStore } from '../../store/useAppStore';
import { getCustomPieces, getPieceSvg, PieceSetId } from './pieceResolver';
import { PieceIcon } from './PieceIcon';
import { ClassificationIcon } from '../common/ClassificationIcon';
import { EvalBar } from './EvalBar';
import { CapturedPieces } from './CapturedPieces';
import { resolveActiveAccent } from './boardThemes';
import { getStockfishElo } from '../../core/engine/stockfishElo';
import { User, Loader2, RotateCcw, Volume2, VolumeX, Palette, Camera, X } from 'lucide-react';
import { processAvatarFile } from '../../core/storage/avatarHelper';
import { getAssetPath } from '../../utils/paths';

const EMPTY_ARROWS: [Square, Square, string?][] = [];
const isValidSquare = (s: string): s is Square => /^[a-h][1-8]$/.test(s);

// Values that CustomSquareRenderer reads at render time, written by ChessBoardView each render.
// Stored in a ref so the component identity never changes, avoiding 64-square unmount/remount.
interface SquareRendererContext {
  orientation: 'white' | 'black';
  woodGrainEnabled: boolean;
  woodGrainOpacity: number;
  optimisticMove: { from: string; to: string; piece: string } | null;
  pieceSet: string;
}

/**
 * Creates a single stable FC that closes over `ctxRef` once and never changes identity.
 * ChessBoardView calls this exactly once (empty-dep useMemo) and updates ctxRef each render.
 */
function createCustomSquareRenderer(
  ctxRef: React.RefObject<SquareRendererContext>
): React.FC<any> {
  const Component = React.forwardRef<HTMLDivElement, any>(({ children, square, style }, ref) => {
    const ctx = ctxRef.current!;
    const { orientation, woodGrainEnabled, woodGrainOpacity, optimisticMove, pieceSet } = ctx;

    const fileIdx = square.charCodeAt(0) - 97;
    const rankIdx = parseInt(square[1], 10) - 1;
    const col = orientation === 'white' ? fileIdx : 7 - fileIdx;
    const row = orientation === 'white' ? 7 - rankIdx : rankIdx;

    const isSourceOfOptimisticMove = optimisticMove?.from === square;
    const isTargetOfOptimisticMove = optimisticMove?.to === square;

    // Filter out moving piece from source square if react-chessboard hasn't cleared it yet,
    // or filter out any old/captured piece from the target square until react-chessboard catches up.
    const renderedChildren = isSourceOfOptimisticMove
      ? React.Children.toArray(children).filter((child) => {
          if (!React.isValidElement(child)) return true;
          return !(child.props as any)?.piece;
        })
      : isTargetOfOptimisticMove
      ? React.Children.toArray(children).filter((child) => {
          if (!React.isValidElement(child)) return true;
          return (child.props as any)?.piece === optimisticMove?.piece || !(child.props as any)?.piece;
        })
      : children;

    // Check if target square already has the correct new Piece rendered by react-chessboard
    const targetHasNewPiece = isTargetOfOptimisticMove && React.Children.toArray(children).some((child) => {
      if (!React.isValidElement(child)) return false;
      return (child.props as any)?.piece === optimisticMove?.piece;
    });

    return (
      <div
        ref={ref}
        style={{
          ...style,
          position: 'relative',
        }}
      >
        {/* Hardware-accelerated wood grain raster texture strictly at zIndex 1 behind piece */}
        {woodGrainEnabled && (
          <div
            className="pm-wood-grain-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url('${getAssetPath('textures/wood-grain-natural.jpg')}')`,
              backgroundSize: '800% 800%',
              backgroundPosition: `${(col / 7) * 100}% ${(row / 7) * 100}%`,
              opacity: woodGrainOpacity,
              mixBlendMode: 'multiply',
              pointerEvents: 'none',
              contain: 'paint',
              willChange: 'opacity',
              zIndex: 1,
            }}
          />
        )}

        {/* Direct children (piece) rendered without overflow clipping so animations glide smoothly across squares */}
        {renderedChildren}

        {/* Seamless optimistic piece on target square: prevents the piece from vanishing between drag release and react-chessboard position commit */}
        {isTargetOfOptimisticMove && !targetHasNewPiece && optimisticMove && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 5,
            }}
          >
            <div className="pm-piece">
              <img
                src={getPieceSvg(optimisticMove.piece, pieceSet as PieceSetId)}
                alt={optimisticMove.piece}
                draggable={false}
                style={{
                  width: '90%',
                  height: '90%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  });

  Component.displayName = 'CustomSquareRenderer';
  return Component as unknown as React.FC<any>;
}

const getModifierColors = (e: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
  if (e.shiftKey) {
    return {
      arrow: 'rgb(74, 222, 128)', // Emerald green
      squareBg: 'rgba(34, 197, 94, 0.55)',
      squareBorder: 'rgba(74, 222, 128, 0.85)',
    };
  }
  if (e.altKey) {
    return {
      arrow: 'rgb(56, 189, 248)', // Sky blue
      squareBg: 'rgba(56, 189, 248, 0.55)',
      squareBorder: 'rgba(125, 211, 252, 0.85)',
    };
  }
  if (e.ctrlKey || e.metaKey) {
    return {
      arrow: 'rgb(250, 204, 21)', // Amber yellow
      squareBg: 'rgba(234, 179, 8, 0.55)',
      squareBorder: 'rgba(250, 204, 21, 0.85)',
    };
  }
  return {
    arrow: 'rgb(255, 170, 0)', // Default warm orange
    squareBg: 'rgba(235, 97, 80, 0.6)', // Coral red
    squareBorder: 'rgba(245, 110, 90, 0.85)',
  };
};

interface ChessBoardViewProps {
  onOpenAppearance?: () => void;
}

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({ onOpenAppearance }) => {
  const treeState = useAppStore((state) => state.treeState);
  const currentNode = treeState.nodes[treeState.currentNodeId];
  const fen = currentNode ? currentNode.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const orientation = useAppStore((state) => state.orientation);
  const playerColor = useAppStore((state) => state.playerColor);
  const showBestMoveArrow = useAppStore((state) => state.showBestMoveArrow);
  const showEvalBar = useAppStore((state) => state.showEvalBar);
  const showCasualClassifications = useAppStore((state) => state.showCasualClassifications);
  // Narrow selectors: only subscribe to the two scalar fields ChessBoardView actually reads.
  // This prevents re-renders on every engine depth/score/lines update (which fire at ~16 fps).
  const liveEvalFen = useAppStore((state) => state.liveEval?.fen ?? null);
  const liveEvalBestMove = useAppStore((state) => state.liveEval?.bestMove ?? null);
  const playMove = useAppStore((state) => state.playMove);
  const mistakeWorkout = useAppStore((state) => state.mistakeWorkout);
  const submitWorkoutMove = useAppStore((state) => state.submitWorkoutMove);
  const flipBoard = useAppStore((state) => state.flipBoard);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const mode = useAppStore((state) => state.mode);
  const playStyle = useAppStore((state) => state.playStyle);
  const engineLevel = useAppStore((state) => state.engineLevel);
  const isEngineThinking = useAppStore((state) => state.isEngineThinking);
  const headers = useAppStore((state) => state.headers);
  const userAvatar = useAppStore((state) => state.userAvatar);
  const setUserAvatar = useAppStore((state) => state.setUserAvatar);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processAvatarFile(file);
      setUserAvatar(dataUrl);
    } catch (err) {
      console.error('[Avatar] Failed to process avatar image:', err);
    }
    e.target.value = '';
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserAvatar(null);
  };

  // In Competition mode, strictly suppress aids during the match
  const isCompetitiveMatch = mode === 'PLAY' && playStyle === 'competitive';
  const effectiveShowEvalBar = showEvalBar && !isCompetitiveMatch;
  const effectiveShowBestMoveArrow =
    showBestMoveArrow && !isCompetitiveMatch && (mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS' || (mode === 'PLAY' && playStyle === 'casual'));
  const effectiveShowClassifications =
    !isCompetitiveMatch &&
    (mode === 'ANALYSIS' || mode === 'BATCH_ANALYSIS' || (mode === 'PLAY' && playStyle === 'casual' && showCasualClassifications));

  const pieceSet = useAppStore((state) => state.pieceSet);
  const darkSquareColor = useAppStore((state) => state.darkSquareColor);
  const lightSquareColor = useAppStore((state) => state.lightSquareColor);
  const boardSvg = useAppStore((state) => state.boardSvg);
  const hideCursorOnDrag = useAppStore((state) => state.hideCursorOnDrag);
  const accentColorId = useAppStore((state) => state.accentColorId);
  const woodGrainEnabled = useAppStore((state) => state.woodGrainEnabled);
  const woodGrainOpacity = useAppStore((state) => state.woodGrainOpacity);

  const activeAccent = useMemo(
    () => resolveActiveAccent(accentColorId, boardSvg, darkSquareColor, lightSquareColor),
    [accentColorId, boardSvg, darkSquareColor, lightSquareColor]
  );

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [captureSquares, setCaptureSquares] = useState<Set<Square>>(new Set());
  const isHoldingRef = useRef(false);
  const wasSelectedBeforeDragRef = useRef<boolean>(false);
  const lastReleasedSquareRef = useRef<Square | null>(null);
  const dragEndTimeRef = useRef<number>(0);

  // User marked squares (Right-click highlights) and arrow colors
  const [markedSquares, setMarkedSquares] = useState<Map<Square, { color: string; borderColor: string }>>(new Map());
  const [arrowColor, setArrowColor] = useState<string>('rgb(255, 170, 0)');
  const isRightMouseDownRef = useRef(false);
  const lastRightClickModifiersRef = useRef({ shift: false, alt: false, ctrl: false });

  // Optimistic placed piece tracking to completely eliminate piece disappearance on drop
  const [optimisticMove, setOptimisticMove] = useState<{ from: Square; to: Square; piece: string } | null>(null);
  const [isManualDropActive, setIsManualDropActive] = useState(false);
  const manualDropTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear optimistic piece when node changes
  useEffect(() => {
    setOptimisticMove(null);
  }, [currentNode?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (manualDropTimeoutRef.current) clearTimeout(manualDropTimeoutRef.current);
    };
  }, []);

  // Promotion choice state
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: 'w' | 'b';
  } | null>(null);

  const checkIsPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      try {
        const chess = new Chess(fen);
        const piece = chess.get(from);
        if (!piece || piece.type !== 'p') return false;
        return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');
      } catch {
        return false;
      }
    },
    [fen]
  );

  const handleSelectPromotion = (promoChar: 'q' | 'n' | 'r' | 'b') => {
    if (!pendingPromotion) return;
    const { from, to, color } = pendingPromotion;
    const promoPiece = `${color}${promoChar.toUpperCase()}`;
    setOptimisticMove({ from, to, piece: promoPiece });
    setIsManualDropActive(true);
    if (manualDropTimeoutRef.current) clearTimeout(manualDropTimeoutRef.current);
    manualDropTimeoutRef.current = setTimeout(() => {
      setIsManualDropActive(false);
      setOptimisticMove(null);
    }, 250);

    if (mistakeWorkout?.isActive) {
      submitWorkoutMove(from, to, promoChar);
    } else {
      playMove(from, to, promoChar);
    }
    setPendingPromotion(null);
  };

  // Close promotion modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingPromotion) {
        setPendingPromotion(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingPromotion]);

  // Custom DnD backend options: TouchBackend with mouse events and touchSlop: 0
  // ensures instant pickup: the piece follows the pointer immediately even inside its own square
  const dndBackendOptions = useMemo(
    () => ({
      enableMouseEvents: true,
      delayTouchStart: 0,
      delayMouseStart: 0,
      touchSlop: 0,
      ignoreContextMenu: true,
    }),
    []
  );

  // Direct DOM cursor toggle when holding/dragging a piece (0 React re-renders for buttery 60 FPS pickup)
  const setHoldingState = useCallback(
    (holding: boolean) => {
      if (isHoldingRef.current === holding) return;
      isHoldingRef.current = holding;
      if (holding) {
        document.body.classList.add('pm-holding-piece');
        if (hideCursorOnDrag) {
          document.body.classList.add('pm-hide-cursor');
        }
        boardContainerRef.current?.classList.add('pm-board-holding');
      } else {
        document.body.classList.remove('pm-holding-piece');
        document.body.classList.remove('pm-hide-cursor');
        boardContainerRef.current?.classList.remove('pm-board-holding');
      }
    },
    [hideCursorOnDrag]
  );

  // Clean up global classes on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('pm-holding-piece');
      document.body.classList.remove('pm-hide-cursor');
    };
  }, []);

  // Fail-safe cleanup: restore cursor on mouseup/touchend anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setHoldingState(false);
    };
    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('blur', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('blur', handleGlobalPointerUp);
    };
  }, [setHoldingState]);

  // Board container ref and height sync for exact 100% EvalBar height
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.clientHeight > 0) {
        setBoardHeight(el.clientHeight);
      }
    };

    updateHeight();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (h > 0) {
          setBoardHeight(Math.round(h));
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear move hints and user-marked squares when active node changes
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setCaptureSquares(new Set());
    setMarkedSquares(new Map());
  }, [currentNode?.id]);

  // Window listeners for mouseup and modifier keys during arrow/square drawing
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDownRef.current = false;
      }
    };
    const handleKeyChange = (e: KeyboardEvent) => {
      if (isRightMouseDownRef.current) {
        lastRightClickModifiersRef.current = {
          shift: e.shiftKey,
          alt: e.altKey,
          ctrl: e.ctrlKey || e.metaKey,
        };
        setArrowColor(getModifierColors(e).arrow);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, []);

  // Click-to-move handling (Chess.com style)
  const handleSquareClick = useCallback(
    (square: Square) => {
      // Clear user markings on any left click
      if (markedSquares.size > 0) {
        setMarkedSquares(new Map());
      }

      // If this click event was generated immediately on mouseup / tap release of the piece on the same square, ignore it
      if (lastReleasedSquareRef.current === square && Date.now() - dragEndTimeRef.current < 400) {
        return;
      }

      // 0. If clicking the already selected square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        setCaptureSquares(new Set());
        return;
      }

      // Freeze board interaction when current mistake is already solved or workout finished
      if (mistakeWorkout?.isActive && (mistakeWorkout.status === 'solved' || mistakeWorkout.status === 'completed')) {
        return;
      }

      // 1. If clicking a highlighted legal destination -> execute move!
      if (selectedSquare && possibleMoves.includes(square)) {
        if (checkIsPromotion(selectedSquare, square)) {
          const chess = new Chess(fen);
          setPendingPromotion({
            from: selectedSquare,
            to: square,
            color: chess.turn(),
          });
          setSelectedSquare(null);
          setPossibleMoves([]);
          setCaptureSquares(new Set());
          return;
        }

        if (mistakeWorkout?.isActive) {
          submitWorkoutMove(selectedSquare, square);
        } else {
          playMove(selectedSquare, square);
        }

        setSelectedSquare(null);
        setPossibleMoves([]);
        setCaptureSquares(new Set());
        return;
      }

      // 2. Check if clicked square has a piece of the active player
      try {
        const chess = new Chess(fen);
        const piece = chess.get(square);
        const isPlayerTurn = mode !== 'PLAY' || (chess.turn() === (playerColor === 'white' ? 'w' : 'b'));

        if (piece && piece.color === chess.turn() && isPlayerTurn) {
          setSelectedSquare(square);
          const moves = chess.moves({ square, verbose: true });
          setPossibleMoves(moves.map((m) => m.to as Square));
          setCaptureSquares(
            new Set(
              moves
                .filter((m) => m.captured || m.flags.includes('e'))
                .map((m) => m.to as Square)
            )
          );
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
          setCaptureSquares(new Set());
        }
      } catch {
        setSelectedSquare(null);
        setPossibleMoves([]);
        setCaptureSquares(new Set());
      }
    },
    [markedSquares.size, selectedSquare, possibleMoves, checkIsPromotion, fen, mistakeWorkout, submitWorkoutMove, playMove, mode, playerColor]
  );

  const handlePieceClick = useCallback(
    (_piece: string, square: Square) => {
      handleSquareClick(square);
    },
    [handleSquareClick]
  );

  // Only allow dragging of the active player's own pieces
  const isPieceDraggable = useCallback(
    ({ piece }: { piece: string }) => {
      if (mistakeWorkout?.isActive && (mistakeWorkout.status === 'solved' || mistakeWorkout.status === 'completed')) {
        return false;
      }
      try {
        const chess = new Chess(fen);
        const isPlayerTurn = mode !== 'PLAY' || (chess.turn() === (playerColor === 'white' ? 'w' : 'b'));
        return piece[0] === chess.turn() && isPlayerTurn;
      } catch {
        return false;
      }
    },
    [fen, mode, playerColor, mistakeWorkout]
  );

  const handlePieceDragBegin = useCallback(
    (_piece: string, sourceSquare: Square) => {
      if (markedSquares.size > 0) {
        setMarkedSquares(new Map());
      }
      if (mistakeWorkout?.isActive && (mistakeWorkout.status === 'solved' || mistakeWorkout.status === 'completed')) {
        return;
      }
      setHoldingState(true);
      lastReleasedSquareRef.current = null;
      wasSelectedBeforeDragRef.current = selectedSquare === sourceSquare;

      try {
        const chess = new Chess(fen);
        const piece = chess.get(sourceSquare);
        const isPlayerTurn = mode !== 'PLAY' || (chess.turn() === (playerColor === 'white' ? 'w' : 'b'));

        if (piece && piece.color === chess.turn() && isPlayerTurn) {
          setSelectedSquare(sourceSquare);
          const moves = chess.moves({ square: sourceSquare, verbose: true });
          setPossibleMoves(moves.map((m) => m.to as Square));
          setCaptureSquares(
            new Set(
              moves
                .filter((m) => m.captured || m.flags.includes('e'))
                .map((m) => m.to as Square)
            )
          );
        }
      } catch {}
    },
    [markedSquares.size, mistakeWorkout, setHoldingState, selectedSquare, fen, mode, playerColor]
  );

  const handlePieceDragEnd = useCallback(
    (_piece?: any, square?: Square) => {
      setHoldingState(false);
      lastReleasedSquareRef.current = square || null;
      dragEndTimeRef.current = Date.now();

      // If the square was already selected prior to this click, and the user released in place, deselect it
      if (wasSelectedBeforeDragRef.current) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        setCaptureSquares(new Set());
      }
      wasSelectedBeforeDragRef.current = false;
    },
    [setHoldingState]
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece: string): boolean => {
      setHoldingState(false);
      wasSelectedBeforeDragRef.current = false;
      lastReleasedSquareRef.current = targetSquare || sourceSquare;
      dragEndTimeRef.current = Date.now();

      if (markedSquares.size > 0) {
        setMarkedSquares(new Map());
      }

      if (!targetSquare || sourceSquare === targetSquare) {
        return false;
      }

      if (mistakeWorkout?.isActive && (mistakeWorkout.status === 'solved' || mistakeWorkout.status === 'completed')) {
        return false;
      }

      setSelectedSquare(null);
      setPossibleMoves([]);
      setCaptureSquares(new Set());

      if (checkIsPromotion(sourceSquare, targetSquare)) {
        const chess = new Chess(fen);
        setPendingPromotion({
          from: sourceSquare,
          to: targetSquare,
          color: chess.turn(),
        });
        return false;
      }

      if (mistakeWorkout?.isActive) {
        const success = submitWorkoutMove(sourceSquare, targetSquare);
        if (success) {
          setOptimisticMove({ from: sourceSquare, to: targetSquare, piece });
          setIsManualDropActive(true);
          if (manualDropTimeoutRef.current) clearTimeout(manualDropTimeoutRef.current);
          manualDropTimeoutRef.current = setTimeout(() => {
            setIsManualDropActive(false);
            setOptimisticMove(null);
          }, 250);
        }
        return success;
      }

      const success = playMove(sourceSquare, targetSquare);
      if (success) {
        setOptimisticMove({ from: sourceSquare, to: targetSquare, piece });
        setIsManualDropActive(true);
        if (manualDropTimeoutRef.current) clearTimeout(manualDropTimeoutRef.current);
        manualDropTimeoutRef.current = setTimeout(() => {
          setIsManualDropActive(false);
          setOptimisticMove(null);
        }, 250);
      }
      return success;
    },
    [setHoldingState, markedSquares.size, mistakeWorkout, checkIsPromotion, fen, submitWorkoutMove, playMove]
  );

  const handleSquareRightClick = useCallback((square: Square) => {
    const mods = lastRightClickModifiersRef.current;
    const { squareBg, squareBorder } = getModifierColors({
      shiftKey: mods.shift,
      altKey: mods.alt,
      ctrlKey: mods.ctrl,
    });

    setMarkedSquares((prev) => {
      const next = new Map(prev);
      const existing = next.get(square);
      if (existing && existing.color === squareBg) {
        next.delete(square);
      } else {
        next.set(square, { color: squareBg, borderColor: squareBorder });
      }
      return next;
    });
  }, []);

  // Custom arrows for engine suggestion (or workout hint arrow)
  // Memoized with EMPTY_ARROWS fallback so its reference does NOT change on re-render,
  // preventing react-chessboard from resetting user-drawn arrows.
  const normalizeFen = (f?: string | null) => (f ? f.trim().split(/\s+/).slice(0, 4).join(' ') : '');
  const isMatchingEvalFen =
    liveEvalFen != null && currentNode &&
    (liveEvalFen === currentNode.fen || normalizeFen(liveEvalFen) === normalizeFen(currentNode.fen));
  const activeEvalBestMove =
    (currentNode?.eval?.bestMove) ||
    (isMatchingEvalFen ? liveEvalBestMove : null);

  const isWorkoutActive = mistakeWorkout?.isActive;
  const currentWorkoutMistake = isWorkoutActive && mistakeWorkout.mistakes ? mistakeWorkout.mistakes[mistakeWorkout.currentIndex] : null;

  const workoutBestMove = isWorkoutActive && currentWorkoutMistake && mistakeWorkout.hintLevel >= 2 ? currentWorkoutMistake.bestMoveUci : null;
  const engineBestMove =
    !isWorkoutActive &&
    effectiveShowBestMoveArrow &&
    activeEvalBestMove &&
    activeEvalBestMove !== '(none)'
      ? activeEvalBestMove
      : null;

  const customArrows = useMemo<[Square, Square, string?][]>(() => {
    if (workoutBestMove) {
      const from = workoutBestMove.slice(0, 2);
      const to = workoutBestMove.slice(2, 4);
      if (isValidSquare(from) && isValidSquare(to)) {
        return [[from as Square, to as Square, 'rgba(34, 197, 94, 0.88)']];
      }
    }
    if (engineBestMove) {
      const from = engineBestMove.slice(0, 2);
      const to = engineBestMove.slice(2, 4);
      if (isValidSquare(from) && isValidSquare(to)) {
        return [[from as Square, to as Square, activeAccent.accentStrong]];
      }
    }
    return EMPTY_ARROWS;
  }, [workoutBestMove, engineBestMove, activeAccent.accentStrong]);

  // King-in-check detection: isolated to [fen] so it never runs on clicks, right-clicks, or
  // drag events — only when the actual board position changes.
  const checkSquareStyle = useMemo<{ square: Square; style: React.CSSProperties } | null>(() => {
    try {
      const chess = new Chess(fen);
      if (!chess.inCheck()) return null;
      const turn = chess.turn();
      for (const r of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
          const sq = `${f}${r}` as Square;
          const p = chess.get(sq);
          if (p && p.type === 'k' && p.color === turn) {
            return {
              square: sq,
              style: {
                background: 'radial-gradient(circle, rgba(176, 72, 58, 0.9) 0%, rgba(176, 72, 58, 0.45) 45%, transparent 75%)',
              },
            };
          }
        }
      }
    } catch {}
    return null;
  }, [fen]);

  // Calculate Square Styles (Highlights, Dots, Rings, Check aura) - Memoized for 60 FPS piece dragging
  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 1. Last played move highlight
    if (!isWorkoutActive && currentNode && currentNode.uci && currentNode.uci.length >= 4) {
      const from = currentNode.uci.slice(0, 2);
      const to = currentNode.uci.slice(2, 4);
      styles[from] = {
        backgroundColor: 'rgba(184, 146, 74, 0.22)',
      };
      styles[to] = {
        backgroundColor: 'rgba(184, 146, 74, 0.32)',
      };
    }

    // Workout Hint Level 1: Highlight piece to move with a luminous cyan glow
    if (isWorkoutActive && currentWorkoutMistake && mistakeWorkout.hintLevel >= 1 && currentWorkoutMistake.bestMoveUci) {
      const from = currentWorkoutMistake.bestMoveUci.slice(0, 2);
      if (isValidSquare(from)) {
        styles[from] = {
          boxShadow: 'inset 0 0 0 3px #38bdf8, 0 0 18px rgba(56, 189, 248, 0.65)',
          backgroundColor: 'rgba(56, 189, 248, 0.28)',
        };
      }
    }

    // 2. King in check highlight (pre-computed per-fen, not re-run on every click)
    if (checkSquareStyle) {
      const { square: checkSq, style: checkStyle } = checkSquareStyle;
      styles[checkSq] = checkStyle;
    }

    // 3. Selected Square highlight (Chess.com glowing tint + inset border)
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'var(--accent-wash-strong)',
        boxShadow: 'inset 0 0 0 3px var(--accent)',
      };
    }

    // 4. Legal Move Indicators (Centered dots on empty squares, hollow rings framing enemy pieces on captures)
    for (const moveSq of possibleMoves) {
      if (captureSquares.has(moveSq)) {
        // Hollow circular ring framing enemy piece
        styles[moveSq] = {
          background: 'radial-gradient(circle, transparent 52%, rgba(176, 72, 58, 0.85) 54%, rgba(176, 72, 58, 0.85) 68%, transparent 70%)',
          cursor: 'pointer',
        };
      } else {
        // Sleek centered glowing dot
        styles[moveSq] = {
          background: 'radial-gradient(circle, var(--accent) 18%, var(--accent-wash) 20%, transparent 22%)',
          cursor: 'pointer',
        };
      }
    }

    // 5. User-drawn marked squares (Right-click highlights)
    markedSquares.forEach(({ color, borderColor }, sq) => {
      styles[sq] = {
        ...styles[sq],
        backgroundColor: color,
        boxShadow: `inset 0 0 0 2.5px ${borderColor}, inset 0 0 10px ${color}`,
      };
    });

    return styles;
  }, [
    isWorkoutActive,
    currentNode?.uci,
    currentWorkoutMistake?.bestMoveUci,
    mistakeWorkout?.hintLevel,
    checkSquareStyle,
    selectedSquare,
    possibleMoves,
    captureSquares,
    markedSquares,
  ]);

  const customPieces = useMemo(() => getCustomPieces(pieceSet), [pieceSet]);

  // Mutable context ref — updated synchronously every render so the stable component always reads
  // current values without needing to re-create the component (which would force 64-square remounts).
  const squareContextRef = useRef<SquareRendererContext>({
    orientation,
    woodGrainEnabled,
    woodGrainOpacity,
    optimisticMove,
    pieceSet,
  });
  squareContextRef.current = { orientation, woodGrainEnabled, woodGrainOpacity, optimisticMove, pieceSet };

  // Stable component identity: created once, never recreated. react-chessboard uses this as a JSX
  // element type, so any identity change would cause all 64 squares to unmount and remount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const CustomSquareRenderer = useMemo(() => createCustomSquareRenderer(squareContextRef), []);

  const safeBoardSvg = boardSvg ? boardSvg.replace(/[^a-zA-Z0-9_.-]/g, '') : null;
  const boardStyle: Record<string, string | number> = useMemo(() => {
    const style: Record<string, string | number> = {};
    if (safeBoardSvg) {
      style.backgroundImage = `url('${getAssetPath(`boards/${safeBoardSvg}`)}')`;
      style.backgroundSize = 'cover';
    }
    return style;
  }, [safeBoardSvg]);

  const customDarkSquareStyle = useMemo(
    () => ({
      backgroundColor: boardSvg ? 'transparent' : darkSquareColor,
    }),
    [boardSvg, darkSquareColor]
  );

  const customLightSquareStyle = useMemo(
    () => ({
      backgroundColor: boardSvg ? 'transparent' : lightSquareColor,
    }),
    [boardSvg, lightSquareColor]
  );

  const handlePromotionCheck = useCallback(() => false, []);

  const opponentColor = orientation === 'white' ? 'black' : 'white';
  const rawOpponentName = mode === 'PLAY' ? 'Stockfish' : (headers[opponentColor === 'black' ? 'Black' : 'White'] || 'Opponent');
  const opponentDisplayName = rawOpponentName.replace(/\s*\(Lvl\s*\d+\)$/i, '').trim();

  const userColor = orientation;
  const rawUserName = mode === 'PLAY' ? 'You' : (headers[userColor === 'white' ? 'White' : 'Black'] || 'You');
  const userDisplayName = rawUserName.replace(/\s*\(Lvl\s*\d+\)$/i, '').trim();

  const opponentElo = mode === 'PLAY'
    ? String(getStockfishElo(engineLevel))
    : headers[opponentColor === 'black' ? 'BlackElo' : 'WhiteElo'];

  const userElo = mode === 'PLAY'
    ? (headers.WhiteElo && orientation === 'white' ? headers.WhiteElo : headers.BlackElo && orientation === 'black' ? headers.BlackElo : '1500')
    : headers[userColor === 'white' ? 'WhiteElo' : 'BlackElo'];

  const isOpponentStockfish = mode === 'PLAY' || opponentDisplayName.toLowerCase().includes('stockfish') || opponentDisplayName.toLowerCase().includes('bot');
  const isUserStockfish = userDisplayName.toLowerCase().includes('stockfish') || userDisplayName.toLowerCase().includes('bot');
  const opponentInitials = getPlayerInitials(opponentDisplayName);
  const userInitials = getPlayerInitials(userDisplayName);

  return (
    <div
      className="pm-board-outer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {/* EvalBar — stands alongside the chessboard, matching chessboard height */}
      {effectiveShowEvalBar && (
        <div className="pm-evalbar-col" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <EvalBar height={boardHeight} />
        </div>
      )}

      {/* Board & Player Shelves Column */}
      <div
        className="pm-board-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: 'min(calc(100vh - 128px), 740px)',
          maxWidth: '100%',
        }}
      >
        {/* Opponent Player Header — aligned with board */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            minHeight: '40px',
            flexShrink: 0,
            backgroundColor: 'var(--bg-wash-strong)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-panel)',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {isOpponentStockfish ? (
              <img
                src={getAssetPath('icons/stockfish.webp')}
                alt="Stockfish"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  display: 'block',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--hairline)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-wash-strong)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                }}
              >
                {opponentInitials ? (
                  <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
                    {opponentInitials}
                  </span>
                ) : (
                  <User size={16} />
                )}
              </div>
            )}

            {/* Dynamic-width Player Identity Anchor */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
                flex: '0 1 auto',
              }}
            >
              <span
                title={opponentDisplayName}
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: '18px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {opponentDisplayName}
              </span>
              {opponentElo && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-wash-strong)',
                    border: '1px solid var(--hairline)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    lineHeight: '14px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opponentElo}
                </span>
              )}
              {isEngineThinking && mode === 'PLAY' && (
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-strong)', flexShrink: 0 }} title="Engine thinking">
                  <Loader2 size={13} className="animate-spin" />
                </span>
              )}
            </div>

            {/* Captured Pieces tray (includes leading divider if pieces are captured) */}
            <CapturedPieces playerColor={opponentColor} fen={fen} pieceSet={pieceSet} />
          </div>
        </div>

        {/* Square board container */}
        <div
          ref={boardContainerRef}
          className="pm-board-container"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            position: 'relative',
            boxShadow: 'var(--shadow-board-inset), 0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--hairline)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
          onClick={() => {
            if (markedSquares.size > 0) {
              setMarkedSquares(new Map());
            }
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              const target = e.target as HTMLElement | null;
              if (target?.closest('[data-piece]') || target?.closest('.pm-piece')) {
                setHoldingState(true);
              }
            } else if (e.button === 2) {
              isRightMouseDownRef.current = true;
              lastRightClickModifiersRef.current = {
                shift: e.shiftKey,
                alt: e.altKey,
                ctrl: e.ctrlKey || e.metaKey,
              };
              setArrowColor(getModifierColors(e).arrow);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedSquare(null);
            setPossibleMoves([]);
            setCaptureSquares(new Set());
          }}
        >
          <Chessboard
            position={fen}
            boardOrientation={orientation}
            onPieceDrop={handlePieceDrop}
            onPieceClick={handlePieceClick}
            onSquareClick={handleSquareClick}
            onSquareRightClick={handleSquareRightClick}
            onPieceDragBegin={handlePieceDragBegin}
            onPieceDragEnd={handlePieceDragEnd}
            isDraggablePiece={isPieceDraggable}
            autoPromoteToQueen={false}
            onPromotionCheck={handlePromotionCheck}
            customDndBackend={InstantChessBackend}
            customDndBackendOptions={dndBackendOptions}
            customPieces={customPieces}
            customSquare={CustomSquareRenderer}
            customBoardStyle={boardStyle}
            customArrows={customArrows}
            customArrowColor={arrowColor}
            customSquareStyles={customSquareStyles}
            customDarkSquareStyle={customDarkSquareStyle}
            customLightSquareStyle={customLightSquareStyle}
            animationDuration={isManualDropActive ? 0 : 180}
            arePiecesDraggable={true}
          />

          {/* In-Board Target Square Classification Marker (Chess.com / Lichess style) */}
          {currentNode?.classification && effectiveShowClassifications && currentNode.uci && (() => {
            const to = currentNode.uci.slice(2, 4);
            if (to.length !== 2) return null;
            const fileIdx = to.charCodeAt(0) - 'a'.charCodeAt(0);
            const col = orientation === 'white' ? fileIdx : 7 - fileIdx;
            const rankIdx = parseInt(to[1], 10) - 1;
            const row = orientation === 'white' ? 7 - rankIdx : rankIdx;
            if (col < 0 || col > 7 || row < 0 || row > 7) return null;

            return (
              <div
                key={`badge_${currentNode.id}_${to}`}
                style={{
                  position: 'absolute',
                  top: `${row * 12.5}%`,
                  left: `${col * 12.5}%`,
                  width: '12.5%',
                  height: '12.5%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingTop: '3px',
                  paddingRight: '3px',
                  pointerEvents: 'none',
                  zIndex: 12,
                }}
              >
                <ClassificationIcon
                  type={currentNode.classification.type}
                  size={26}
                  title={`${currentNode.classification.label}: ${currentNode.classification.comment || currentNode.san}`}
                  animate
                />
              </div>
            );
          })()}

          {/* Floating Top-Right Badge for current move classification */}
          {currentNode?.classification && effectiveShowClassifications && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(20, 20, 21, 0.92)',
                border: `1px solid ${currentNode.classification.color}`,
                animation: 'fadeIn 0.2s ease-out',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                zIndex: 10,
                backdropFilter: 'blur(4px)',
              }}
            >
              <ClassificationIcon type={currentNode.classification.type} size={22} animate />
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                {currentNode.classification.label}
              </span>
            </div>
          )}

          {/* Square-Aligned In-Board Promotion Strip (Bullet-Optimized, Chess.com / Lichess Style) */}
          {pendingPromotion && (() => {
            const to = pendingPromotion.to;
            const fileIdx = to.charCodeAt(0) - 'a'.charCodeAt(0);
            const col = orientation === 'white' ? fileIdx : 7 - fileIdx;
            const rankIdx = parseInt(to[1], 10) - 1;
            const row = orientation === 'white' ? 7 - rankIdx : rankIdx;

            const isTop = row < 4;
            const topPercent = isTop ? row * 12.5 : (row - 3) * 12.5;

            const promoPieces: { key: 'q' | 'n' | 'r' | 'b'; label: string }[] = [
              { key: 'q', label: 'Queen' },
              { key: 'n', label: 'Knight' },
              { key: 'r', label: 'Rook' },
              { key: 'b', label: 'Bishop' },
            ];

            const squarePx = (boardHeight || 560) / 8;
            const pieceSize = Math.max(30, Math.round(squarePx * 0.78));

            return (
              <>
                {/* Board-wide cancel backdrop: clicking anywhere else on the board cancels promotion */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.38)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 90,
                    cursor: 'pointer',
                  }}
                  onClick={() => setPendingPromotion(null)}
                  title="Click outside to cancel promotion"
                />

                {/* 4-Piece Vertical Strip anchored directly on the promotion square's file */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${col * 12.5}%`,
                    top: `${topPercent}%`,
                    width: '12.5%',
                    height: '50%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '2px solid var(--accent-strong)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), 0 0 16px rgba(0, 0, 0, 0.5)',
                    zIndex: 95,
                    display: 'flex',
                    flexDirection: isTop ? 'column' : 'column-reverse',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    animation: 'fadeIn 0.12s ease-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {promoPieces.map(({ key, label }, idx) => {
                    const pieceKey = `${pendingPromotion.color}${key.toUpperCase()}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectPromotion(key)}
                        title={`Promote to ${label}`}
                        style={{
                          width: '100%',
                          height: '25%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          borderBottom: isTop && idx < 3 ? '1px solid var(--hairline-strong)' : 'none',
                          borderTop: !isTop && idx > 0 ? '1px solid var(--hairline-strong)' : 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'background-color 0.12s ease, transform 0.1s ease',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--accent-wash-strong)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <PieceIcon pieceKey={pieceKey} pieceSet={pieceSet} size={pieceSize} />
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* User Player Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          minHeight: '40px',
          flexShrink: 0,
          backgroundColor: 'var(--bg-wash-strong)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-panel)',
          marginTop: '2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          {isUserStockfish ? (
            <img
              src={getAssetPath('icons/stockfish.webp')}
              alt="Stockfish"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'cover',
                display: 'block',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--hairline)',
              }}
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={handleAvatarClick}
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
              title={userAvatar ? 'Click to change profile picture • Right-click to remove' : 'Click to choose profile picture'}
              onContextMenu={(e) => {
                if (userAvatar) {
                  e.preventDefault();
                  setUserAvatar(null);
                }
              }}
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                flexShrink: 0,
                overflow: 'hidden',
                outline: 'none',
                boxShadow: isAvatarHovered
                  ? '0 0 0 2px var(--accent-border), 0 2px 8px rgba(0, 0, 0, 0.5)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--hairline)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Player Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'var(--accent-wash)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                  }}
                >
                  {userInitials ? (
                    <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)', letterSpacing: '0.4px' }}>
                      {userInitials}
                    </span>
                  ) : (
                    <User size={16} />
                  )}
                </div>
              )}

              {/* Hover overlay with camera icon */}
              {isAvatarHovered && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.58)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <Camera size={14} />
                </div>
              )}

              {/* Quick remove button if avatar is set */}
              {userAvatar && isAvatarHovered && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Remove profile picture"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    padding: 0,
                    cursor: 'pointer',
                    zIndex: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}
                >
                  <X size={9} strokeWidth={3} />
                </button>
              )}
            </div>
          )}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarFileSelect}
          />

          {/* Dynamic-width Player Identity Anchor */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: 0,
              flex: '0 1 auto',
            }}
          >
            <span
              title={userDisplayName}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: '18px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {userDisplayName}
            </span>
            {userElo && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-wash-strong)',
                  border: '1px solid var(--hairline)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  lineHeight: '14px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {userElo}
              </span>
            )}
          </div>

          {/* Captured Pieces tray (includes leading divider if pieces are captured) */}
          <CapturedPieces playerColor={userColor} fen={fen} pieceSet={pieceSet} />
        </div>

        {/* Quick Board Tools — icon-only, no boxes; tooltips carry the label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={flipBoard}
            title="Flip board"
            style={ghostIconBtn}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RotateCcw size={19} />
          </button>
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            style={{ ...ghostIconBtn, color: soundEnabled ? 'var(--accent-strong)' : 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          {onOpenAppearance && (
            <button
              onClick={onOpenAppearance}
              title="Board & piece appearance"
              style={ghostIconBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Palette size={19} />
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

const ghostIconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  padding: '6px 8px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};

// Player initials helper (e.g. "Magnus Carlsen" -> "MC", "Hikaru Nakamura" -> "HN")
function getPlayerInitials(name: string): string | null {
  if (!name || name === 'You' || name === 'Opponent' || name.toLowerCase().includes('stockfish') || name.toLowerCase().includes('bot')) {
    return null;
  }
  const cleanName = name.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  if (cleanName.includes(',')) {
    const [last, first] = cleanName.split(',').map((s) => s.trim());
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    return last ? last.slice(0, 2).toUpperCase() : null;
  }
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return null;
}
