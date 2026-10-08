import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  SELECTABLE_ENGINES,
  FULL_ENGINE_ITEM,
  SelectableEngine,
  detectFullEngineAvailability,
  isFullEngineDetected,
} from '../../core/engine/engineConfig';
import { EngineName } from '../../core/engine/types';
import { ChevronDown, Check, Cpu, Lock } from 'lucide-react';
import { getAssetPath } from '../../utils/paths';

export interface EngineSelectorProps {
  variant?: 'compact' | 'pill';
  disabled?: boolean;
  disabledTooltip?: string;
  align?: 'left' | 'right';
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  variant = 'compact',
  disabled = false,
  disabledTooltip,
  align = 'left',
}) => {
  const selectedEngine = useAppStore((state) => state.selectedEngine);
  const setSelectedEngine = useAppStore((state) => state.setSelectedEngine);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const [hasFullEngine, setHasFullEngine] = useState<boolean>(() => isFullEngineDetected());

  useEffect(() => {
    detectFullEngineAvailability().then((avail) => {
      setHasFullEngine(avail);
    });
  }, []);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const availableEngines: SelectableEngine[] = useMemo(() => {
    return hasFullEngine ? [FULL_ENGINE_ITEM, ...SELECTABLE_ENGINES] : SELECTABLE_ENGINES;
  }, [hasFullEngine]);

  const allKnownEngines = useMemo(() => [FULL_ENGINE_ITEM, ...SELECTABLE_ENGINES], []);

  const activeEngineInfo: SelectableEngine =
    allKnownEngines.find((e) => e.id === selectedEngine) || SELECTABLE_ENGINES[0];

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 280;
    const PADDING = 12;

    const spaceBelow = window.innerHeight - rect.bottom - PADDING;
    const spaceAbove = rect.top - PADDING;

    // Flip upwards if room below is tight (< 320px) and there is more room above
    const openUpwards = spaceBelow < 320 && spaceAbove > spaceBelow;

    // Maximum height strictly clamped to available space on screen
    const availableHeight = openUpwards ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(160, Math.min(420, availableHeight));

    let left = align === 'right' ? rect.right - dropdownWidth : rect.left;
    left = Math.max(8, Math.min(window.innerWidth - dropdownWidth - 8, left));

    if (openUpwards) {
      setMenuPos({
        bottom: Math.round(window.innerHeight - rect.top + 4),
        left: Math.round(left),
        maxHeight: Math.round(maxHeight),
      });
    } else {
      setMenuPos({
        top: Math.round(rect.bottom + 4),
        left: Math.round(left),
        maxHeight: Math.round(maxHeight),
      });
    }
  }, [align]);

  // Position recalculation when opening
  useEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }

    updateMenuPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // If user scrolls inside the menu itself, do not close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateMenuPosition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  const handleSelect = (engineId: EngineName) => {
    if (disabled || engineId === selectedEngine) {
      setIsOpen(false);
      return;
    }
    setSelectedEngine(engineId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        title={disabled ? disabledTooltip : `Engine: ${activeEngineInfo.name} (${activeEngineInfo.badge})`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: variant === 'compact' ? '4px 8px' : '5px 10px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isOpen ? 'var(--bg-wash-strong)' : 'var(--bg-surface-2)',
          border: isOpen ? '1px solid var(--accent-border)' : '1px solid var(--hairline-strong)',
          color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <img
          src={getAssetPath('icons/stockfish.webp')}
          alt="Engine"
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '3px',
            objectFit: 'cover',
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
          }}
        />

        <span style={{ whiteSpace: 'nowrap' }}>{activeEngineInfo.name}</span>

        <span
          style={{
            fontSize: '9.5px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: '3px',
            backgroundColor: 'var(--bg-inset)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.2px',
          }}
        >
          {activeEngineInfo.isWasm ? 'WASM' : 'JS'}
        </span>

        {disabled ? (
          <Lock size={11} color="var(--text-tertiary)" />
        ) : (
          <ChevronDown
            size={12}
            color="var(--text-secondary)"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        )}
      </button>

      {/* Dropdown Popover rendered via Portal into document.body to prevent parent scrollbars */}
      {isOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
              left: `${menuPos.left}px`,
              width: '280px',
              maxHeight: `${menuPos.maxHeight}px`,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--hairline-strong) transparent',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-modal)',
              padding: '6px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              animation: 'fadeIn 0.12s ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px 3px 8px',
                borderBottom: '1px solid var(--hairline)',
                marginBottom: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Engine Selector
              </span>
              <Cpu size={12} color="var(--text-tertiary)" />
            </div>

            {/* Engine Option Items */}
            {availableEngines.map((engine) => {
              const isSelected = engine.id === selectedEngine;

              return (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => handleSelect(engine.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'var(--accent-wash)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-wash)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Top line: Name + Badge + Checkmark */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)',
                        }}
                      >
                        {engine.name}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--bg-inset)',
                          color: isSelected ? 'var(--accent-strong)' : 'var(--text-tertiary)',
                          border: '1px solid var(--hairline)',
                        }}
                      >
                        {engine.badge}
                      </span>
                    </div>

                    {isSelected && <Check size={13} color="var(--accent-strong)" style={{ flexShrink: 0 }} />}
                  </div>

                  {/* Bottom line: Brief explanation */}
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.3,
                    }}
                  >
                    {engine.description}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
