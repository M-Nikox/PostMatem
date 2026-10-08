import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { UploadCloud, CheckCircle2, FileText } from 'lucide-react';

export const GlobalDropZone: React.FC = () => {
  const loadPgn = useAppStore((state) => state.loadPgn);
  const loadFen = useAppStore((state) => state.loadFen);

  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  useEffect(() => {
    // 1. Drag and Drop Listeners
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const fileNameLower = (file.name || '').toLowerCase();
      if (
        fileNameLower.endsWith('.svg') ||
        fileNameLower.endsWith('.png') ||
        fileNameLower.endsWith('.jpg') ||
        fileNameLower.endsWith('.jpeg') ||
        fileNameLower.endsWith('.webp') ||
        file.type.startsWith('image/')
      ) {
        showToast('Image and SVG files cannot be loaded as chess games');
        return;
      }

      try {
        const text = await file.text();
        const trimmed = text.trim();

        if (
          trimmed.startsWith('<') ||
          trimmed.includes('<svg') ||
          trimmed.includes('</svg>') ||
          trimmed.includes('<?xml')
        ) {
          showToast('Image and SVG files cannot be parsed as chess games');
          return;
        }

        // Try FEN first if looks like FEN
        const fenTokens = trimmed.split(/\s+/);
        const isLikelyFen =
          fenTokens.length >= 2 &&
          fenTokens[0].includes('/') &&
          (fenTokens[1] === 'w' || fenTokens[1] === 'b');

        if (isLikelyFen) {
          const success = loadFen(trimmed);
          if (success) {
            showToast('Loaded board from FEN');
            return;
          }
        }

        // Try PGN
        const loaded = loadPgn(trimmed);
        if (loaded) {
          showToast(`Loaded ${file.name || 'game'} successfully`);
        } else {
          // If loadPgn didn't succeed, try FEN as fallback
          const fenLoaded = loadFen(trimmed);
          if (fenLoaded) {
            showToast('Loaded board from FEN');
          } else {
            showToast('Unrecognized chess file format (only .pgn, .fen, or .txt)');
          }
        }
      } catch (err) {
        console.error('[GlobalDropZone] Failed to read dropped file:', err);
        showToast('Error reading dropped file');
      }
    };

    // 2. Global Smart Paste (Ctrl+V / Cmd+V)
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      const text = e.clipboardData?.getData('text') || '';
      const trimmed = text.trim();
      if (!trimmed) return;

      if (
        trimmed.startsWith('<') ||
        trimmed.includes('<svg') ||
        trimmed.includes('</svg>') ||
        trimmed.includes('<?xml')
      ) {
        return;
      }

      // Check if it's a FEN (contains slash separators and turn token)
      const fenTokens = trimmed.split(/\s+/);
      const isLikelyFen =
        fenTokens.length >= 2 &&
        fenTokens[0].includes('/') &&
        (fenTokens[1] === 'w' || fenTokens[1] === 'b');

      if (isLikelyFen) {
        e.preventDefault();
        const success = loadFen(trimmed);
        if (success) {
          showToast('Loaded position from clipboard FEN');
        }
        return;
      }

      // Check if it's a PGN
      if (
        trimmed.startsWith('[') ||
        trimmed.includes('1.') ||
        trimmed.includes('1-0') ||
        trimmed.includes('0-1')
      ) {
        const loaded = loadPgn(trimmed);
        if (loaded) {
          e.preventDefault();
          showToast('Loaded game from clipboard PGN');
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handlePaste);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [loadPgn, loadFen]);

  return (
    <>
      {/* Visual Full-Screen Drag Overlay */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(10, 10, 12, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: '3px dashed var(--accent-strong)',
            margin: '12px',
            borderRadius: 'var(--radius-xl, 16px)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-wash-strong)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 32px var(--accent-glow, rgba(124, 90, 62, 0.35))',
            }}
          >
            <UploadCloud size={36} color="var(--accent-strong)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 6px 0',
                letterSpacing: '-0.01em',
              }}
            >
              Drop PGN or FEN File
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: 0,
                maxWidth: '380px',
              }}
            >
              Release anywhere to immediately parse and start post-mortem tactical review.
            </p>
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(20, 20, 24, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--hairline-strong)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <CheckCircle2 size={18} color="var(--positive, #4FA8A0)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
