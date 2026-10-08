import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Global Keyboard Navigation & Hotkeys Hook for PostMatem.
 * Enables seamless desktop navigation and sparring controls.
 *
 * Shortcuts:
 * - Left Arrow: Previous move
 * - Right Arrow / Space: Next move
 * - Up Arrow: Jump to start of game
 * - Down Arrow: Jump to end of game
 * - F: Flip board orientation
 * - E: Toggle evaluation bar
 * - H: Toggle best move arrow
 * - B: Toggle classification display
 * - Z (or Ctrl+Z): Takeback move in Casual play mode (or previous move)
 * - N / P: Next / Previous mistake (during Mistake Workout)
 * - Esc: Exit Mistake Workout or close modal
 */
export function useKeyboardShortcuts() {
  const goToNextMove = useAppStore((state) => state.goToNextMove);
  const goToPreviousMove = useAppStore((state) => state.goToPreviousMove);
  const goToStart = useAppStore((state) => state.goToStart);
  const goToEnd = useAppStore((state) => state.goToEnd);
  const flipBoard = useAppStore((state) => state.flipBoard);
  const toggleEvalBar = useAppStore((state) => state.toggleEvalBar);
  const toggleBestMoveArrow = useAppStore((state) => state.toggleBestMoveArrow);
  const toggleCasualClassifications = useAppStore((state) => state.toggleCasualClassifications);
  const takebackMove = useAppStore((state) => state.takebackMove);
  const mode = useAppStore((state) => state.mode);

  // Mistake workout controls
  const mistakeWorkout = useAppStore((state) => state.mistakeWorkout);
  const nextMistake = useAppStore((state) => state.nextMistake);
  const previousMistake = useAppStore((state) => state.previousMistake);
  const requestWorkoutHint = useAppStore((state) => state.requestWorkoutHint);
  const exitMistakeWorkout = useAppStore((state) => state.exitMistakeWorkout);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      // Prevent rapid-fire keyboard repeat spam from crashing the WASM engine
      if (e.repeat) return;

      // Do not swallow Space on buttons or links
      if (e.key === ' ' && activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A')) {
        return;
      }

      // Handle Workout shortcuts if active
      if (mistakeWorkout?.isActive) {
        if (e.key === 'Escape') {
          e.preventDefault();
          exitMistakeWorkout();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          nextMistake();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          previousMistake();
          return;
        }
        if (e.key === 'h' || e.key === 'H') {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            requestWorkoutHint();
          }
          return;
        }
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // Standard Navigation & Play Controls
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousMove();
          break;

        case 'ArrowRight':
          e.preventDefault();
          goToNextMove();
          break;

        case ' ': // Space advances forward in analysis
          if (!hasModifier) {
            e.preventDefault();
            goToNextMove();
          }
          break;

        case 'ArrowUp':
        case 'Home':
          e.preventDefault();
          goToStart();
          break;

        case 'ArrowDown':
        case 'End':
          e.preventDefault();
          goToEnd();
          break;

        case 'f':
        case 'F':
          if (!hasModifier) {
            e.preventDefault();
            flipBoard();
          }
          break;

        case 'e':
        case 'E':
          if (!hasModifier) {
            e.preventDefault();
            toggleEvalBar();
          }
          break;

        case 'h':
        case 'H':
          if (!hasModifier) {
            e.preventDefault();
            toggleBestMoveArrow();
          }
          break;

        case 'b':
        case 'B':
          if (!hasModifier) {
            e.preventDefault();
            toggleCasualClassifications();
          }
          break;

        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey || !e.shiftKey) {
            e.preventDefault();
            if (mode === 'PLAY') {
              takebackMove();
            } else {
              goToPreviousMove();
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    goToNextMove,
    goToPreviousMove,
    goToStart,
    goToEnd,
    flipBoard,
    toggleEvalBar,
    toggleBestMoveArrow,
    toggleCasualClassifications,
    takebackMove,
    mode,
    mistakeWorkout,
    nextMistake,
    previousMistake,
    requestWorkoutHint,
    exitMistakeWorkout,
  ]);
}
