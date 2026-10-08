import React, { useMemo, useState, useEffect } from 'react';
import { X, Copy, Download, Check, Share2, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { GameCardData, GameCardGenerator } from '../../core/export/gameCardGenerator';
import { MoveGraph } from '../../core/tree/moveGraph';
import { getOpeningForMoves } from '../../core/analysis/openingBook';
import { getAssetPath } from '../../utils/paths';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ isOpen, onClose }) => {
  const treeState = useAppStore((state) => state.treeState);
  const headers = useAppStore((state) => state.headers);
  const analysisReport = useAppStore((state) => state.analysisReport);
  const exportPgn = useAppStore((state) => state.exportPgn);
  const pieceSet = useAppStore((state) => state.pieceSet);
  const darkSquareColor = useAppStore((state) => state.darkSquareColor);
  const lightSquareColor = useAppStore((state) => state.lightSquareColor);
  const boardSvg = useAppStore((state) => state.boardSvg);
  const orientation = useAppStore((state) => state.orientation);
  const accentColorId = useAppStore((state) => state.accentColorId);
  const userAvatar = useAppStore((state) => state.userAvatar);

  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copyImageError, setCopyImageError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const mainline = useMemo(() => MoveGraph.getMainlineNodes(treeState), [treeState]);

  const opening = useMemo(() => {
    const sanMoves = mainline.map((n) => n.san).filter(Boolean);
    return getOpeningForMoves(sanMoves);
  }, [mainline]);

  const lastNode = mainline[mainline.length - 1];
  const lastMove = useMemo(() => {
    if (!lastNode || !lastNode.uci || lastNode.uci.length < 4) return undefined;
    return {
      from: lastNode.uci.slice(0, 2),
      to: lastNode.uci.slice(2, 4),
      san: lastNode.san,
      classification: lastNode.classification?.type,
      isCheckmate: lastNode.san?.includes('#') ?? false,
    };
  }, [lastNode]);

  const evalScores = useMemo(() => {
    if (!analysisReport?.evaluations) return [];
    return analysisReport.evaluations.map((ev) => {
      const line = ev?.lines?.[0];
      if (line) {
        return { score: line.score, type: line.type };
      }
      return { score: 0, type: 'cp' as const };
    });
  }, [analysisReport]);

  const cardData: GameCardData = useMemo(() => {
    const finalFen = lastNode ? lastNode.fen : MoveGraph.DEFAULT_FEN;
    const moveCount = Math.max(0, Math.ceil((mainline.length - 1) / 2));

    return {
      whiteName: headers.White || 'White',
      whiteElo: headers.WhiteElo,
      whiteAcpl: analysisReport?.whiteAcpl,
      whiteAccuracy: analysisReport?.whiteAccuracy,
      whiteEstimatedElo: analysisReport?.whiteEstimatedElo,
      blackName: headers.Black || 'Black',
      blackElo: headers.BlackElo,
      blackAcpl: analysisReport?.blackAcpl,
      blackAccuracy: analysisReport?.blackAccuracy,
      blackEstimatedElo: analysisReport?.blackEstimatedElo,
      result: headers.Result || '*',
      date: headers.Date || new Date().toISOString().split('T')[0],
      openingName: opening?.name,
      openingEco: opening?.eco,
      finalFen,
      lastMove,
      moveCount,
      evalScores,
      classificationCounts: analysisReport?.classificationCounts,
      pieceSet,
      darkSquareColor,
      lightSquareColor,
      boardSvg,
      orientation,
      accentColorId,
      whiteAvatar: (headers.White || '').toLowerCase().includes('stockfish')
        ? getAssetPath('icons/stockfish.webp')
        : (!((headers.White || '').toLowerCase().includes('stockfish')) && (orientation === 'white' || (headers.White || '').trim().toLowerCase() === 'you')
          ? userAvatar || undefined
          : undefined),
      blackAvatar: (headers.Black || '').toLowerCase().includes('stockfish')
        ? getAssetPath('icons/stockfish.webp')
        : (!((headers.Black || '').toLowerCase().includes('stockfish')) && (orientation === 'black' || (headers.Black || '').trim().toLowerCase() === 'you')
          ? userAvatar || undefined
          : undefined),
    };
  }, [
    headers,
    analysisReport,
    lastNode,
    mainline,
    lastMove,
    opening,
    evalScores,
    pieceSet,
    darkSquareColor,
    lightSquareColor,
    boardSvg,
    orientation,
    accentColorId,
    userAvatar,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    setIsRendering(true);

    GameCardGenerator.generateDataUrl(cardData)
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ShareCardModal] Error generating card preview:', err);
          setIsRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cardData, isOpen]);

  if (!isOpen) return null;

  const handleCopyImage = async () => {
    try {
      setCopyImageError(null);
      const blob = await GameCardGenerator.generateCardBlob(cardData);
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        // Fallback for browsers that don't support ClipboardItem
        handleDownloadImage();
      }
    } catch (err) {
      console.warn('[ShareCardModal] Clipboard image copy failed:', err);
      setCopyImageError('Could not write image to clipboard directly. You can download the PNG instead.');
      setTimeout(() => setCopyImageError(null), 4000);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const blob = await GameCardGenerator.generateCardBlob(cardData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const white = (headers.White || 'White').replace(/\s+/g, '_');
      const black = (headers.Black || 'Black').replace(/\s+/g, '_');
      a.href = url;
      a.download = `PostMatem_${white}_vs_${black}_Summary.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShareCardModal] Download image error:', err);
    }
  };

  const handleDownloadPgn = () => {
    try {
      const pgn = exportPgn();
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const white = (headers.White || 'White').replace(/\s+/g, '_');
      const black = (headers.Black || 'Black').replace(/\s+/g, '_');
      a.href = url;
      a.download = `PostMatem_${white}_vs_${black}_Annotated.pgn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShareCardModal] Download PGN error:', err);
    }
  };

  const handleCopyPgn = async () => {
    try {
      const pgn = exportPgn();
      await navigator.clipboard.writeText(pgn);
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2500);
    } catch (err) {
      console.warn('[ShareCardModal] Copy PGN failed:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-surface, #14171f)',
          border: '1px solid var(--hairline-strong, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-modal, 0 20px 48px rgba(0, 0, 0, 0.6))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--hairline, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'rgba(52, 211, 153, 0.14)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <Share2 size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary, #ffffff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Share Game Summary</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary, #94a3b8)',
                    letterSpacing: '0.03em',
                  }}
                >
                  1200 × 630 • 2x Retina
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #64748b)' }}>
                Export social cards with your active theme, real vector pieces, and annotated PGN
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary, #94a3b8)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Card Preview Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: '#0a0d14',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
              aspectRatio: '1200 / 630',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="PostMatem Game Summary Card"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" /> Rendering high-resolution card...
              </div>
            )}
          </div>

          {copyImageError && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#f43f5e',
                fontSize: '12.5px',
              }}
            >
              {copyImageError}
            </div>
          )}

          {/* Action Button Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {/* Primary: Copy Image Blob */}
            <button
              onClick={handleCopyImage}
              disabled={isRendering || !previewUrl}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 18px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: copiedImage ? 'rgba(52, 211, 153, 0.2)' : '#34d399',
                color: copiedImage ? '#34d399' : '#0a1017',
                border: copiedImage ? '1px solid #34d399' : 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: isRendering ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 10px rgba(52, 211, 153, 0.25)',
                opacity: isRendering ? 0.6 : 1,
              }}
            >
              {copiedImage ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedImage ? 'Copied Image to Clipboard!' : 'Copy Card Image'}</span>
            </button>

            {/* Secondary: Download PNG */}
            <button
              onClick={handleDownloadImage}
              disabled={isRendering || !previewUrl}
              style={{
                flex: '1 1 170px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--bg-wash-strong)',
                color: 'var(--text-primary)',
                border: '1px solid var(--hairline-strong)',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: isRendering ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: isRendering ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isRendering) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
              }}
            >
              <Download size={16} />
              <span>Download PNG</span>
            </button>
          </div>

          {/* PGN Export Section */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-inset)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: '#fbbf24' }} />
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary, #ffffff)' }}>
                  Annotated PGN Export
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary, #94a3b8)', fontFamily: 'var(--font-mono)' }}>
                NAG $1..$6 • [%eval] • [%clk]
              </span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)', lineHeight: 1.5 }}>
              Includes standard Informant glyphs (<code>$1</code> !, <code>$2</code> ?, <code>$3</code> !!, <code>$4</code> ??, <code>$6</code> ?!), signed centipawn & mate evaluations, clock tags, and analysis report headers compatible with Lichess and ChessBase.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
              <button
                onClick={handleDownloadPgn}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.12)';
                }}
              >
                <Download size={14} />
                <span>Download .PGN</span>
              </button>

              <button
                onClick={handleCopyPgn}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  backgroundColor: copiedPgn ? 'rgba(52, 211, 153, 0.14)' : 'var(--bg-wash-strong)',
                  color: copiedPgn ? '#34d399' : 'var(--text-secondary)',
                  border: copiedPgn ? '1px solid #34d399' : '1px solid var(--hairline-strong)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!copiedPgn) e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)';
                }}
                onMouseLeave={(e) => {
                  if (!copiedPgn) e.currentTarget.style.backgroundColor = 'var(--bg-wash-strong)';
                }}
              >
                {copiedPgn ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
