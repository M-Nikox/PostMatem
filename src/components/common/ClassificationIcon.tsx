import React from 'react';
import { MoveClassificationType } from '../../core/analysis/types';
import { getAssetPath } from '../../utils/paths';

interface ClassificationIconProps {
  type: MoveClassificationType | string;
  size?: number;
  title?: string;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const TYPE_TO_FILE: Record<string, string> = {
  [MoveClassificationType.BRILLIANT]: 'brilliant.svg',
  [MoveClassificationType.GREAT]: 'great.svg',
  [MoveClassificationType.BEST]: 'best.svg',
  [MoveClassificationType.EXCELLENT]: 'excellent.svg',
  [MoveClassificationType.GOOD]: 'good.svg',
  [MoveClassificationType.INACCURACY]: 'inaccuracy.svg',
  [MoveClassificationType.MISTAKE]: 'mistake.svg',
  [MoveClassificationType.BLUNDER]: 'blunder.svg',
  [MoveClassificationType.FORCED]: 'forced.svg',
  [MoveClassificationType.BOOK]: 'book.svg',
  [MoveClassificationType.MISS]: 'miss.svg',
  // Aliases
  theory: 'book.svg',
  perfect: 'best.svg',
};

export const ClassificationIcon: React.FC<ClassificationIconProps> = ({
  type,
  size = 20,
  title,
  animate = false,
  className = '',
  style = {},
}) => {
  const normalizedKey = (type || '').toLowerCase();
  const fileName = TYPE_TO_FILE[normalizedKey] || `${normalizedKey}.svg`;
  const iconSrc = getAssetPath(`icons/classifications/${fileName}`);

  return (
    <img
      src={iconSrc}
      alt={type}
      title={title || type}
      width={size}
      height={size}
      loading="eager"
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        userSelect: 'none',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))',
        animation: animate ? 'badgePopIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : undefined,
        ...style,
      }}
      onError={(e) => {
        // Hide if missing to avoid broken image icon
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  );
};
