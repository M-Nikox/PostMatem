import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ClassificationIcon } from '../common/ClassificationIcon';
import { Compass } from 'lucide-react';

export const CoachCard: React.FC = () => {
  const treeState = useAppStore((state) => state.treeState);
  const currentNode = treeState.nodes[treeState.currentNodeId];

  if (!currentNode || currentNode.id === treeState.rootId) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Compass size={18} color="var(--text-tertiary)" style={{ marginTop: '1px', flexShrink: 0 }} />
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Tap or drag pieces to play. After playing, use arrow keys or click any move in the list to review tactics.
        </div>
      </div>
    );
  }

  const classification = currentNode.classification;
  const ruleColor = classification ? classification.color : 'var(--hairline-strong)';

  return (
    <div
      style={{
        borderLeft: `3px solid ${ruleColor}`,
        paddingLeft: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {classification ? (
            <>
              <ClassificationIcon type={classification.type} size={20} animate />
              <span style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {classification.label} Move
              </span>
            </>
          ) : (
            <span style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Move {currentNode.moveNumber}{currentNode.isWhite ? '.' : '...'} {currentNode.san}
            </span>
          )}
        </div>

        {currentNode.eval?.lines?.[0] && (
          <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            eval{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {currentNode.eval.lines[0].type === 'mate'
                ? `#${currentNode.eval.lines[0].score}`
                : (currentNode.eval.lines[0].score / 100).toFixed(1)}
            </strong>
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        {classification?.comment || `Played move ${currentNode.san}.`}
      </p>
    </div>
  );
};
