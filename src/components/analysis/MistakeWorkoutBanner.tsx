import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ClassificationIcon } from '../common/ClassificationIcon';
import { Lightbulb, ArrowRight, X, RotateCcw, Trophy, CheckCircle, AlertTriangle } from 'lucide-react';

export const MistakeWorkoutBanner: React.FC = () => {
  const mistakeWorkout = useAppStore((state) => state.mistakeWorkout);
  const nextMistake = useAppStore((state) => state.nextMistake);
  const previousMistake = useAppStore((state) => state.previousMistake);
  const requestWorkoutHint = useAppStore((state) => state.requestWorkoutHint);
  const retryCurrentMistake = useAppStore((state) => state.retryCurrentMistake);
  const exitMistakeWorkout = useAppStore((state) => state.exitMistakeWorkout);
  const startMistakeWorkout = useAppStore((state) => state.startMistakeWorkout);

  if (!mistakeWorkout || !mistakeWorkout.isActive) {
    return null;
  }

  const { mistakes, currentIndex, status, attempts, hintLevel, score } = mistakeWorkout;
  const current = mistakes[currentIndex];

  // 1. Completion Screen
  if (status === 'completed' || !current) {
    const accuracyPercent = Math.round((score.solvedFirstTry / Math.max(1, score.total)) * 100);
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '20px',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '14px',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-wash-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px var(--accent-glow, rgba(124, 90, 62, 0.3))',
          }}
        >
          <Trophy size={28} color="var(--accent-strong)" />
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Workout Complete!
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            You solved <strong style={{ color: 'var(--positive, #4FA8A0)' }}>{score.solvedFirstTry}</strong> of{' '}
            <strong>{score.total}</strong> mistakes on the first try ({accuracyPercent}%).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={() => startMistakeWorkout()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--hairline-strong)',
              backgroundColor: 'var(--bg-wash)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> Retry All
          </button>
          <button
            onClick={exitMistakeWorkout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md, 8px)',
              border: 'none',
              backgroundColor: 'var(--accent-strong)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Review
          </button>
        </div>
      </div>
    );
  }

  // 2. Active Workout Screen
  const hintText =
    hintLevel === 1
      ? `Hint: Look at your piece on ${current.bestMoveUci.slice(0, 2).toUpperCase()}`
      : hintLevel >= 2
      ? `Solution: Play ${current.bestMoveSan}`
      : 'Hint';

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--accent-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-modal)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Top Header: Progress & Exit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-strong)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mistake Workout
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            &middot; {currentIndex + 1} of {mistakes.length}
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {mistakes.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentIndex ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor:
                  i === currentIndex
                    ? 'var(--accent-strong)'
                    : i < currentIndex
                    ? 'var(--positive, #4FA8A0)'
                    : 'var(--hairline-strong)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
          <button
            onClick={exitMistakeWorkout}
            title="Exit Workout (Esc)"
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Task Description */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <ClassificationIcon type={current.classification} size={28} animate />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
            You played <strong style={{ color: 'var(--negative, #B0483A)' }}>{current.sanPlayed}</strong> (
            {current.classification}). Can you find the best continuation?
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            Move {current.moveNumber}{current.isWhite ? '.' : '...'} &middot; {current.isWhite ? 'White to move' : 'Black to move'}
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {status === 'solved' && (
        <div
          style={{
            backgroundColor: 'rgba(79, 168, 160, 0.14)',
            border: '1px solid var(--positive, #4FA8A0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--positive, #4FA8A0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Correct! You found the winning continuation.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={retryCurrentMistake}
              title="Reset position and try again"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'var(--bg-wash)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--hairline-strong)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={nextMistake}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                backgroundColor: 'var(--positive, #4FA8A0)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {status === 'incorrect' && (
        <div
          style={{
            backgroundColor: 'rgba(201, 125, 62, 0.12)',
            border: '1px solid var(--warning, #C97D3E)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <AlertTriangle size={16} color="var(--warning, #C97D3E)" />
          <span style={{ fontSize: '13px', color: 'var(--warning, #C97D3E)', fontWeight: 500 }}>
            That's not the best move (Attempt {attempts}). Give it another try!
          </span>
        </div>
      )}

      {/* Action Footer: Hint & Skip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
        <button
          onClick={requestWorkoutHint}
          disabled={hintLevel >= 2}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--hairline-strong)',
            backgroundColor: hintLevel > 0 ? 'var(--bg-wash-strong)' : 'transparent',
            color: hintLevel > 0 ? 'var(--accent-strong)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: hintLevel >= 2 ? 'default' : 'pointer',
          }}
        >
          <Lightbulb size={15} color={hintLevel > 0 ? 'var(--accent-strong)' : 'var(--text-tertiary)'} />
          <span>{hintText}</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {currentIndex > 0 && (
            <button
              onClick={previousMistake}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '6px 8px',
              }}
            >
              &larr; Prev
            </button>
          )}
          <button
            onClick={nextMistake}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 8px',
            }}
          >
            Skip <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
