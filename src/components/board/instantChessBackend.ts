import { TouchBackendImpl } from 'react-dnd-touch-backend';

/**
 * Custom DnD backend that wraps TouchBackendImpl to provide Chess.com-style instant piece pickup.
 * Rather than waiting for a mousemove distance threshold (> touchSlop),
 * it calls actions.beginDrag() immediately inside handleTopMoveStart (mousedown),
 * snapping the piece directly under the pointer on the very first frame of interaction with 0px movement required.
 */
export const InstantChessBackend = function createBackend(manager: any, context: any = {}, options: any = {}) {
  const mergedOptions = {
    enableMouseEvents: true,
    delayTouchStart: 0,
    delayMouseStart: 0,
    touchSlop: 0,
    ignoreContextMenu: true,
    ...options,
  };

  const backend = new TouchBackendImpl(manager, context, mergedOptions);
  const originalHandleTopMoveStart = backend.handleTopMoveStart;

  // Bypass any async timer delay to ensure synchronous response on mousedown / touchstart
  backend.getTopMoveStartHandler = () => backend.handleTopMoveStart;
  backend.handleTopMoveStartDelay = (e: any) => backend.handleTopMoveStart(e);

  backend.handleTopMoveStart = (e: any) => {
    // Only left-clicks (or touch events where button is undefined) should initiate piece dragging
    if (e.button !== undefined && e.button !== 0) {
      return;
    }
    originalHandleTopMoveStart(e);

    // If a draggable piece was clicked, immediately begin drag on mousedown without waiting for movement
    const sourceIds = (backend as any).moveStartSourceIds;
    if (sourceIds && sourceIds.length > 0 && !backend.monitor.isDragging()) {
      (backend as any).moveStartSourceIds = undefined;
      (backend as any).actions.beginDrag(sourceIds, {
        clientOffset: (backend as any)._mouseClientOffset,
        getSourceClientOffset: (backend as any).getSourceClientOffset,
        publishSource: true,
      });

      if (!backend.monitor.isDragging()) {
        return;
      }

      const sourceId = backend.monitor.getSourceId();
      if (sourceId) {
        const sourceNode = (backend as any).sourceNodes.get(sourceId);
        if (sourceNode) {
          (backend as any).installSourceNodeRemovalObserver(sourceNode);
        }
      }
      (backend as any).actions.publishDragSource();

      // Register initial hover state under pointer so drop targets recognize hover immediately
      const clientOffset = (backend as any)._mouseClientOffset;
      const doc = (backend as any).document || (typeof document !== 'undefined' ? document : null);
      if (doc && clientOffset?.x != null && clientOffset?.y != null) {
        const elementsAtPoint = doc.elementsFromPoint(clientOffset.x, clientOffset.y);
        const orderedDragOverTargetIds: string[] = [];
        for (const el of elementsAtPoint) {
          let curr: any = el;
          while (curr) {
            const targetId = (backend as any)._getDropTargetId(curr);
            if (targetId && !orderedDragOverTargetIds.includes(targetId)) {
              orderedDragOverTargetIds.push(targetId);
            }
            curr = curr.parentElement;
          }
        }
        orderedDragOverTargetIds.reverse();
        (backend as any).actions.hover(orderedDragOverTargetIds, {
          clientOffset,
        });
      }
    }
  };

  return backend;
};
