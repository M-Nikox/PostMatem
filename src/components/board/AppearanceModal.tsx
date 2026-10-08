import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BOARD_THEMES, ACCENT_PRESETS, resolveActiveAccent } from './boardThemes';
import { PIECE_SETS, PieceSetId } from './pieceResolver';
import { PieceIcon } from './PieceIcon';
import { X, Palette, Check, Sparkles, User, Camera, Trash2, Trees, Sun, Moon, Monitor } from 'lucide-react';
import { processAvatarFile } from '../../core/storage/avatarHelper';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const pieceSet = useAppStore((state) => state.pieceSet);
  const darkSquareColor = useAppStore((state) => state.darkSquareColor);
  const lightSquareColor = useAppStore((state) => state.lightSquareColor);
  const boardSvg = useAppStore((state) => state.boardSvg);
  const hideCursorOnDrag = useAppStore((state) => state.hideCursorOnDrag);
  const accentColorId = useAppStore((state) => state.accentColorId);
  const themeMode = useAppStore((state) => state.themeMode);
  const woodGrainEnabled = useAppStore((state) => state.woodGrainEnabled);
  const woodGrainOpacity = useAppStore((state) => state.woodGrainOpacity);

  const setThemeMode = useAppStore((state) => state.setThemeMode);

  const setPieceSet = useAppStore((state) => state.setPieceSet);
  const setBoardColors = useAppStore((state) => state.setBoardColors);
  const setBoardThemePreset = useAppStore((state) => state.setBoardThemePreset);
  const setBoardSvg = useAppStore((state) => state.setBoardSvg);
  const toggleHideCursorOnDrag = useAppStore((state) => state.toggleHideCursorOnDrag);
  const setAccentColorId = useAppStore((state) => state.setAccentColorId);
  const setWoodGrainEnabled = useAppStore((state) => state.setWoodGrainEnabled);
  const setWoodGrainOpacity = useAppStore((state) => state.setWoodGrainOpacity);
  const userAvatar = useAppStore((state) => state.userAvatar);
  const setUserAvatar = useAppStore((state) => state.setUserAvatar);

  const modalAvatarInputRef = React.useRef<HTMLInputElement>(null);

  const activeResolvedAccent = useMemo(
    () => resolveActiveAccent(accentColorId, boardSvg, darkSquareColor, lightSquareColor),
    [accentColorId, boardSvg, darkSquareColor, lightSquareColor]
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '540px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--hairline)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Palette size={19} color="var(--accent-strong)" />
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Board &amp; Piece Appearance
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            paddingRight: '4px',
          }}
        >
          {/* Section 1: Piece Set Selector */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '10px' }}>
              Chess Piece Set
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {PIECE_SETS.map((set) => {
                const isSelected = pieceSet === set.id;
                return (
                  <button
                    key={set.id}
                    onClick={() => setPieceSet(set.id as PieceSetId)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                      backgroundColor: isSelected ? 'var(--accent-wash)' : 'var(--bg-wash)',
                      color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{set.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: isSelected ? 1 : 0.75 }}>
                          <PieceIcon pieceKey="wN" pieceSet={set.id} size={18} />
                          <PieceIcon pieceKey="bP" pieceSet={set.id} size={18} />
                        </div>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {set.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Board Theme Presets */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '10px' }}>
              Board Color Presets
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {BOARD_THEMES.map((theme) => {
                const isSelected = !boardSvg && darkSquareColor === theme.darkSquare && lightSquareColor === theme.lightSquare;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setBoardThemePreset(theme.id)}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                      backgroundColor: isSelected ? 'var(--accent-wash)' : 'var(--bg-wash)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Color Swatch split circle */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        border: '1px solid var(--hairline-strong)',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ width: '50%', height: '100%', backgroundColor: theme.lightSquare }} />
                      <div style={{ width: '50%', height: '100%', backgroundColor: theme.darkSquare }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)' }}>
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: SVG Board Texture Presets */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '10px' }}>
              Direct SVG Board Files
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { file: 'board-1.svg', name: 'Board 1 (Wood)' },
                { file: 'board-2.svg', name: 'Board 2 (Ice)' },
                { file: 'board-3.svg', name: 'Board 3 (Green)' },
              ].map((b) => {
                const isSelected = boardSvg === b.file;
                return (
                  <button
                    key={b.file}
                    onClick={() => setBoardSvg(b.file)}
                    style={{
                      padding: '9px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                      backgroundColor: isSelected ? 'var(--accent-wash)' : 'var(--bg-wash)',
                      color: isSelected ? 'var(--accent-strong)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'center',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Custom Color Pickers */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--hairline)',
            }}
          >
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '12px' }}>
              Custom Tile Colors
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Dark Square Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Dark Squares</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={darkSquareColor}
                    onChange={(e) => setBoardColors(e.target.value, lightSquareColor)}
                    style={{
                      width: '38px',
                      height: '34px',
                      padding: 0,
                      border: '1px solid var(--hairline-strong)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                    }}
                  />
                  <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {darkSquareColor}
                  </span>
                </div>
              </div>

              {/* Light Square Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Light Squares</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={lightSquareColor}
                    onChange={(e) => setBoardColors(darkSquareColor, e.target.value)}
                    style={{
                      width: '38px',
                      height: '34px',
                      padding: 0,
                      border: '1px solid var(--hairline-strong)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                    }}
                  />
                  <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {lightSquareColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4b: Wood Grain Texture Overlay */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trees size={16} color="var(--accent-strong)" />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Wood Grain Overlay
                </span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setWoodGrainEnabled(!woodGrainEnabled)}
                style={{
                  width: '42px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: woodGrainEnabled ? 'var(--accent-strong)' : 'var(--bg-wash-strong)',
                  border: `1px solid ${woodGrainEnabled ? 'var(--accent)' : 'var(--hairline-strong)'}`,
                  position: 'relative',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
                title={woodGrainEnabled ? 'Disable wood grain overlay' : 'Enable wood grain overlay'}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '2px',
                    left: woodGrainEnabled ? '20px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                  }}
                />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
              Overlays organic timber grain over any board theme while keeping pieces crisp and high-contrast.
            </div>

            {woodGrainEnabled && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginTop: '4px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                {/* Opacity Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Grain Intensity</span>
                    <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-strong)' }}>
                      {Math.round(woodGrainOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.95"
                    step="0.05"
                    value={woodGrainOpacity}
                    onChange={(e) => setWoodGrainOpacity(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--accent-strong)',
                      cursor: 'pointer',
                    }}
                  />

                  {/* Quick Presets */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    {[
                      { label: 'Subtle', val: 0.25 },
                      { label: 'Balanced', val: 0.45 },
                      { label: 'Rich', val: 0.70 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setWoodGrainOpacity(preset.val)}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-xs)',
                          border:
                            Math.abs(woodGrainOpacity - preset.val) < 0.04
                              ? '1px solid var(--accent-border)'
                              : '1px solid var(--hairline)',
                          backgroundColor:
                            Math.abs(woodGrainOpacity - preset.val) < 0.04 ? 'var(--accent-wash)' : 'transparent',
                          color:
                            Math.abs(woodGrainOpacity - preset.val) < 0.04 ? 'var(--accent-strong)' : 'var(--text-tertiary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset.label} ({Math.round(preset.val * 100)}%)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4c: Interface Theme */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Interface Theme
              </label>
              <span style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                {themeMode === 'light' ? 'Parchment Linen' : themeMode === 'system' ? 'Auto System' : 'Dark Basalt'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'dark' as const, name: 'Dark Basalt', icon: Moon },
                { id: 'light' as const, name: 'Parchment', icon: Sun },
                { id: 'system' as const, name: 'System', icon: Monitor },
              ].map((t) => {
                const isSelected = themeMode === t.id;
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeMode(t.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                      backgroundColor: isSelected ? 'var(--accent-wash)' : 'var(--bg-wash)',
                      color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <IconComponent size={16} color={isSelected ? 'var(--accent-strong)' : 'var(--text-secondary)'} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.name}</span>
                    {isSelected && <Check size={14} color="var(--accent-strong)" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Interface Accent Colorway */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Interface Accent
              </label>
              <span style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                {accentColorId === 'auto' ? `Auto: ${activeResolvedAccent.name}` : 'Manual selection'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {/* Option: Auto-sync */}
              <button
                onClick={() => setAccentColorId('auto')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: accentColorId === 'auto' ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                  backgroundColor: accentColorId === 'auto' ? 'var(--accent-wash)' : 'var(--bg-wash)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    backgroundColor: activeResolvedAccent.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <Sparkles size={11} color="#ffffff" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: accentColorId === 'auto' ? 'var(--accent-strong)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Auto (Match Board)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeResolvedAccent.name}
                  </span>
                </div>
                {accentColorId === 'auto' && <Check size={14} color="var(--accent-strong)" style={{ flexShrink: 0 }} />}
              </button>

              {/* Manual Accent Presets */}
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = accentColorId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAccentColorId(preset.id)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
                      backgroundColor: isSelected ? 'var(--accent-wash)' : 'var(--bg-wash)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        backgroundColor: preset.accent,
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)', flex: 1 }}>
                      {preset.name}
                    </span>
                    {isSelected && <Check size={14} color="var(--accent-strong)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Player Profile Picture */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--hairline)',
                  backgroundColor: 'var(--accent-wash)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-strong)',
                }}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Player Profile Picture
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.4 }}>
                  Displayed on your player shelf and social game summary exports. Saved in browser storage & cookies.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => modalAvatarInputRef.current?.click()}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-wash)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-strong)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Camera size={14} />
                <span>{userAvatar ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {userAvatar && (
                <button
                  onClick={() => setUserAvatar(null)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background-color 0.15s ease',
                  }}
                  title="Remove custom picture"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
              <input
                type="file"
                ref={modalAvatarInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await processAvatarFile(file);
                    setUserAvatar(dataUrl);
                  } catch (err) {
                    console.error('[Avatar] Failed to process avatar:', err);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Section 7: Piece & Cursor Interaction */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Hide cursor while holding pieces
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.4 }}>
                Hides the mouse pointer so only the floating piece moves under your finger/cursor. Keep off for standard grabbing hand / bullet chess.
              </div>
            </div>
            <button
              onClick={toggleHideCursorOnDrag}
              style={{
                width: '42px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: hideCursorOnDrag ? 'var(--accent)' : 'var(--hairline-strong)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                flexShrink: 0,
                padding: '2px',
              }}
              title={hideCursorOnDrag ? 'Disable cursor hiding' : 'Enable cursor hiding'}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#F2EFEA',
                  transform: hideCursorOnDrag ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
