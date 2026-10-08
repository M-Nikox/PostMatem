export interface BoardThemePreset {
  id: string;
  name: string;
  darkSquare: string;
  lightSquare: string;
  svgFile?: string; // Optional direct SVG board file
  accentId: string;
}

export interface AccentPreset {
  id: string;
  name: string;
  accent: string;
  accentStrong: string;
  accentWash: string;
  accentWashStrong: string;
  accentBorder: string;
  light?: {
    accent: string;
    accentStrong: string;
    accentWash: string;
    accentWashStrong: string;
    accentBorder: string;
  };
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'terracotta',
    name: 'Burnt Terracotta',
    accent: '#C1502E',
    accentStrong: '#D9683F',
    accentWash: 'rgba(193, 80, 46, 0.14)',
    accentWashStrong: 'rgba(193, 80, 46, 0.26)',
    accentBorder: 'rgba(193, 80, 46, 0.4)',
    light: {
      accent: '#A83B1B',
      accentStrong: '#8C2B10',
      accentWash: 'rgba(168, 59, 27, 0.10)',
      accentWashStrong: 'rgba(168, 59, 27, 0.18)',
      accentBorder: 'rgba(168, 59, 27, 0.35)',
    },
  },
  {
    id: 'amber',
    name: 'Honey Amber',
    accent: '#D47A32',
    accentStrong: '#EB8C40',
    accentWash: 'rgba(212, 122, 50, 0.15)',
    accentWashStrong: 'rgba(212, 122, 50, 0.28)',
    accentBorder: 'rgba(212, 122, 50, 0.42)',
    light: {
      accent: '#B05915',
      accentStrong: '#944409',
      accentWash: 'rgba(176, 89, 21, 0.10)',
      accentWashStrong: 'rgba(176, 89, 21, 0.18)',
      accentBorder: 'rgba(176, 89, 21, 0.35)',
    },
  },
  {
    id: 'sage',
    name: 'Sage Olive',
    accent: '#6E8A54',
    accentStrong: '#84A566',
    accentWash: 'rgba(110, 138, 84, 0.15)',
    accentWashStrong: 'rgba(110, 138, 84, 0.28)',
    accentBorder: 'rgba(110, 138, 84, 0.42)',
    light: {
      accent: '#4C6B32',
      accentStrong: '#3A5424',
      accentWash: 'rgba(76, 107, 50, 0.10)',
      accentWashStrong: 'rgba(76, 107, 50, 0.18)',
      accentBorder: 'rgba(76, 107, 50, 0.35)',
    },
  },
  {
    id: 'tournament',
    name: 'Tournament Pine',
    accent: '#559632',
    accentStrong: '#6BB540',
    accentWash: 'rgba(85, 150, 50, 0.15)',
    accentWashStrong: 'rgba(85, 150, 50, 0.28)',
    accentBorder: 'rgba(85, 150, 50, 0.42)',
    light: {
      accent: '#3E7520',
      accentStrong: '#2E5B16',
      accentWash: 'rgba(62, 117, 32, 0.10)',
      accentWashStrong: 'rgba(62, 117, 32, 0.18)',
      accentBorder: 'rgba(62, 117, 32, 0.35)',
    },
  },
  {
    id: 'glacier',
    name: 'Glacier Steel',
    accent: '#5288B0',
    accentStrong: '#68A0CB',
    accentWash: 'rgba(82, 136, 176, 0.15)',
    accentWashStrong: 'rgba(82, 136, 176, 0.28)',
    accentBorder: 'rgba(82, 136, 176, 0.42)',
    light: {
      accent: '#2B658E',
      accentStrong: '#1F4F72',
      accentWash: 'rgba(43, 101, 142, 0.10)',
      accentWashStrong: 'rgba(43, 101, 142, 0.18)',
      accentBorder: 'rgba(43, 101, 142, 0.35)',
    },
  },
  {
    id: 'ochre',
    name: 'Desert Ochre',
    accent: '#BA8E48',
    accentStrong: '#D4A559',
    accentWash: 'rgba(186, 142, 72, 0.15)',
    accentWashStrong: 'rgba(186, 142, 72, 0.28)',
    accentBorder: 'rgba(186, 142, 72, 0.42)',
    light: {
      accent: '#916723',
      accentStrong: '#755015',
      accentWash: 'rgba(145, 103, 35, 0.10)',
      accentWashStrong: 'rgba(145, 103, 35, 0.18)',
      accentBorder: 'rgba(145, 103, 35, 0.35)',
    },
  },
  {
    id: 'cyan',
    name: 'Arctic Cyan',
    accent: '#3B9BB2',
    accentStrong: '#4DB2CC',
    accentWash: 'rgba(59, 155, 178, 0.15)',
    accentWashStrong: 'rgba(59, 155, 178, 0.28)',
    accentBorder: 'rgba(59, 155, 178, 0.42)',
    light: {
      accent: '#1F758A',
      accentStrong: '#145A6B',
      accentWash: 'rgba(31, 117, 138, 0.10)',
      accentWashStrong: 'rgba(31, 117, 138, 0.18)',
      accentBorder: 'rgba(31, 117, 138, 0.35)',
    },
  },
];

export const BOARD_THEMES: BoardThemePreset[] = [
  {
    id: 'walnut',
    name: 'Walnut (Default)',
    darkSquare: '#7C5A3E',
    lightSquare: '#D8CBB3',
    accentId: 'terracotta',
  },
  {
    id: 'warm-timber',
    name: 'Warm Timber',
    darkSquare: '#de925a',
    lightSquare: '#fff2d4',
    svgFile: 'board-1.svg',
    accentId: 'amber',
  },
  {
    id: 'sage-study',
    name: 'Sage Study',
    darkSquare: '#7C8A5C',
    lightSquare: '#EDE7D9',
    accentId: 'sage',
  },
  {
    id: 'tournament-green',
    name: 'Tournament Green',
    darkSquare: '#8cc936',
    lightSquare: '#fff2d4',
    svgFile: 'board-3.svg',
    accentId: 'tournament',
  },
  {
    id: 'slate-stone',
    name: 'Slate Stone',
    darkSquare: '#4A4642',
    lightSquare: '#8C877E',
    accentId: 'glacier',
  },
  {
    id: 'chalk-linen',
    name: 'Chalk Linen',
    darkSquare: '#B7A98D',
    lightSquare: '#F9F6F0',
    accentId: 'ochre',
  },
];

/**
 * Resolves the active accent preset based on user preference or active board theme.
 */
export function resolveActiveAccent(
  accentColorId?: string | null,
  boardSvg?: string | null,
  darkSquare?: string | null,
  lightSquare?: string | null
): AccentPreset {
  // If user selected a specific manual accent preset
  if (accentColorId && accentColorId !== 'auto') {
    const manualPreset = ACCENT_PRESETS.find((p) => p.id === accentColorId);
    if (manualPreset) return manualPreset;
  }

  // Automatic mode: derive from active board
  if (boardSvg) {
    if (boardSvg.includes('board-1')) return ACCENT_PRESETS.find((p) => p.id === 'amber')!;
    if (boardSvg.includes('board-2')) return ACCENT_PRESETS.find((p) => p.id === 'cyan')!;
    if (boardSvg.includes('board-3')) return ACCENT_PRESETS.find((p) => p.id === 'tournament')!;
  }

  // Check matching board preset
  if (darkSquare && lightSquare) {
    const ds = String(darkSquare).toLowerCase();
    const ls = String(lightSquare).toLowerCase();
    const matchedBoard = BOARD_THEMES.find(
      (b) =>
        b.darkSquare?.toLowerCase() === ds &&
        b.lightSquare?.toLowerCase() === ls
    );
    if (matchedBoard && matchedBoard.accentId) {
      const preset = ACCENT_PRESETS.find((p) => p.id === matchedBoard.accentId);
      if (preset) return preset;
    }
  }

  // Fallback to terracotta (default PostMatem accent)
  return ACCENT_PRESETS[0];
}

/**
 * Updates the browser tab favicon in real time to match the active accent color.
 */
export function updateFaviconAccent(preset: AccentPreset): void {
  if (typeof document === 'undefined') return;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <defs>
    <style>
      .body { fill: #FFFFFF; }
      .accent { fill: ${preset.accent}; }
      .accent-eye { fill: ${preset.accentStrong}; }
    </style>
    <filter id="sh" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <g filter="url(#sh)">
    <path class="body" d="M55.23,57.62l-3.27-3.14H22.89l-3.27,3.14c-.05,.05-.09,.11-.13,.16H55.37c-.05-.05-.08-.11-.13-.16Z"/>
    <path class="accent" d="M18.9,62.17c0,.65,.53,1.17,1.17,1.17H54.78c.65,0,1.17-.53,1.17-1.17v-2.85c0-.57-.22-1.11-.59-1.54H19.49c-.37,.43-.59,.97-.59,1.54v2.85Z"/>
    <path class="body" d="M46.74,17.39c-5.47-4.62-13.9-3.84-19.2-.42h0c-2.97,1.93-3.59,5.09-3.59,5.09l-1.32,4.29c-.33,1.06-.9,2.02-1.67,2.81l-3.85,3.93c-1.67,1.71-1.32,4.52,.71,5.77l.78,.42c1.56,.86,3.46,.83,5-.06,.81-.55,1.82-.67,2.76-.39,5.27,1.56,9.52-2.67,9.52-2.67-.45,4.76-2.94,6.05-4.83,7.04-8.29,4.32-8.15,11.29-8.15,11.29h29.07c6.1-21.19,1.05-31.8-5.23-37.09Z"/>
    <path class="body" d="M32.6,9.32c-.58-.81-1.76-.89-2.43-.14-1.36,1.51-2.93,4.35-.96,8.45l8.8-.72-5.41-7.58Z"/>
    <path class="accent-eye" d="M33.74,23.98c-.04-.53-.47-.96-1-1-1.04-.09-2.15,.29-2.99,1.13-.84,.84-1.22,1.94-1.13,2.99,.04,.53,.47,.96,1,1,1.04,.09,2.15-.29,2.99-1.13,.84-.84,1.22-1.94,1.13-2.99Z"/>
    <path class="accent" d="M37.43,50.81c-4.37,0-8.46-1.11-11.97-3.04-2.63,3.45-2.57,6.72-2.57,6.72h29.07c1.07-3.72,1.79-7.12,2.23-10.21-4.27,4.03-10.2,6.54-16.77,6.54Z"/>
  </g>
</svg>`;

  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
// Internal cache for the currently applied accent preset
let lastActiveAccentPreset: AccentPreset = ACCENT_PRESETS[0];

/**
 * Injects CSS custom properties into :root to update the interface accent dynamically
 * and synchronizes the browser tab favicon. Automatically chooses the light or dark
 * color profile based on active theme.
 */
export function applyAccentToDom(preset: AccentPreset, isLightOverride?: boolean): void {
  if (typeof document === 'undefined') return;
  lastActiveAccentPreset = preset;

  const root = document.documentElement;
  const isLight =
    isLightOverride !== undefined
      ? isLightOverride
      : root.classList.contains('light') || root.getAttribute('data-theme') === 'light';

  const values = isLight && preset.light ? preset.light : preset;

  root.style.setProperty('--accent', values.accent);
  root.style.setProperty('--accent-strong', values.accentStrong);
  root.style.setProperty('--accent-wash', values.accentWash);
  root.style.setProperty('--accent-wash-strong', values.accentWashStrong);
  root.style.setProperty('--accent-border', values.accentBorder);

  updateFaviconAccent(preset);
}

export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Applies the interface theme (dark basalt vs parchment linen) to the DOM
 * and immediately re-evaluates the active accent preset for the chosen mode.
 */
export function applyThemeToDom(mode: ThemeMode, activeAccentPreset?: AccentPreset): void {
  if (typeof document === 'undefined') return;
  const isLight =
    mode === 'light' ||
    (mode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      !window.matchMedia('(prefers-color-scheme: dark)').matches);

  const root = document.documentElement;
  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  }

  // Re-synchronize accent variables with proper contrast for the new mode
  const presetToApply = activeAccentPreset || lastActiveAccentPreset;
  if (presetToApply) {
    applyAccentToDom(presetToApply, isLight);
  }
}

