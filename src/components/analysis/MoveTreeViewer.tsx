import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MoveGraph, MoveNode } from '../../core/tree/moveGraph';
import { ClassificationIcon } from '../common/ClassificationIcon';
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from 'lucide-react';

export interface MoveTreeViewerProps {
  hideClassifications?: boolean;
  height?: string;
}

export const MoveTreeViewer: React.FC<MoveTreeViewerProps> = ({ hideClassifications = false, height = '270px' }) => {
  const treeState = useAppStore((state) => state.treeState);
  const navigateToNode = useAppStore((state) => state.navigateToNode);
  const goToStart = useAppStore((state) => state.goToStart);
  const goToPreviousMove = useAppStore((state) => state.goToPreviousMove);
  const goToNextMove = useAppStore((state) => state.goToNextMove);
  const goToEnd = useAppStore((state) => state.goToEnd);

  const activeRef = useRef<HTMLButtonElement | null>(null);

  const mainline = MoveGraph.getMainlineNodes(treeState).slice(1); // Exclude root

  // Group moves into turns (White move + Black move)
  const turns: { moveNumber: number; whiteNode?: MoveNode; blackNode?: MoveNode }[] = [];

  for (let i = 0; i < mainline.length; i++) {
    const node = mainline[i];
    if (node.isWhite) {
      turns.push({ moveNumber: node.moveNumber, whiteNode: node });
    } else {
      if (turns.length > 0 && turns[turns.length - 1].moveNumber === node.moveNumber) {
        turns[turns.length - 1].blackNode = node;
      } else {
        turns.push({ moveNumber: node.moveNumber, blackNode: node });
      }
    }
  }

  // Scroll active move into view smoothly
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [treeState.currentNodeId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height,
        backgroundColor: 'var(--bg-inset)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable Move Table */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {turns.length === 0 ? (
          <div
            style={{
              color: 'var(--text-tertiary)',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            No moves played yet.
          </div>
        ) : (
          turns.map((turn, index) => (
            <div
              key={turn.moveNumber}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 1fr',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14.5px',
                backgroundColor: index % 2 === 0 ? 'var(--bg-wash)' : 'transparent',
                borderRadius: 'var(--radius-xs)',
                padding: '1px 2px',
              }}
            >
              {/* Turn Number */}
              <span
                style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  fontSize: '13px',
                  paddingLeft: '4px',
                }}
              >
                {turn.moveNumber}.
              </span>

              {/* White Move Button */}
              {turn.whiteNode ? (
                <button
                  ref={treeState.currentNodeId === turn.whiteNode.id ? activeRef : null}
                  onClick={() => navigateToNode(turn.whiteNode!.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    backgroundColor:
                      treeState.currentNodeId === turn.whiteNode.id
                        ? 'var(--accent-wash-strong)'
                        : 'transparent',
                    color:
                      treeState.currentNodeId === turn.whiteNode.id
                        ? 'var(--accent-strong)'
                        : 'var(--text-primary)',
                    fontWeight: treeState.currentNodeId === turn.whiteNode.id ? 700 : 600,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (treeState.currentNodeId !== turn.whiteNode?.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (treeState.currentNodeId !== turn.whiteNode?.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{turn.whiteNode.san}</span>
                  {!hideClassifications && turn.whiteNode.classification && (
                    <ClassificationIcon
                      type={turn.whiteNode.classification.type}
                      size={15}
                      title={`${turn.whiteNode.classification.label}: ${turn.whiteNode.classification.comment || turn.whiteNode.san}`}
                    />
                  )}
                </button>
              ) : (
                <span />
              )}

              {/* Black Move Button */}
              {turn.blackNode ? (
                <button
                  ref={treeState.currentNodeId === turn.blackNode.id ? activeRef : null}
                  onClick={() => navigateToNode(turn.blackNode!.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    backgroundColor:
                      treeState.currentNodeId === turn.blackNode.id
                        ? 'var(--accent-wash-strong)'
                        : 'transparent',
                    color:
                      treeState.currentNodeId === turn.blackNode.id
                        ? 'var(--accent-strong)'
                        : 'var(--text-primary)',
                    fontWeight: treeState.currentNodeId === turn.blackNode.id ? 700 : 600,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (treeState.currentNodeId !== turn.blackNode?.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (treeState.currentNodeId !== turn.blackNode?.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{turn.blackNode.san}</span>
                  {!hideClassifications && turn.blackNode.classification && (
                    <ClassificationIcon
                      type={turn.blackNode.classification.type}
                      size={15}
                      title={`${turn.blackNode.classification.label}: ${turn.blackNode.classification.comment || turn.blackNode.san}`}
                    />
                  )}
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          padding: '6px 8px',
          borderTop: '1px solid var(--hairline)',
          backgroundColor: 'var(--bg-surface-2)',
        }}
      >
        <button
          onClick={goToStart}
          style={navButtonStyle}
          title="Start of Game (Home)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ChevronFirst size={19} />
        </button>
        <button
          onClick={goToPreviousMove}
          style={navButtonStyle}
          title="Previous Move (Left Arrow)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          onClick={goToNextMove}
          style={navButtonStyle}
          title="Next Move (Right Arrow)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ChevronRight size={19} />
        </button>
        <button
          onClick={goToEnd}
          style={navButtonStyle}
          title="Latest Move (End)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ChevronLast size={19} />
        </button>
      </div>
    </div>
  );
};

const navButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '6px 16px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};
