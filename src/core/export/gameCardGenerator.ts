import { MoveClassificationType } from '../analysis/types';
import { PieceSetId, getPieceSvg } from '../../components/board/pieceResolver';
import { WinRateMath } from '../analysis/winRate';
import { resolveActiveAccent, AccentPreset } from '../../components/board/boardThemes';
import { getAssetPath } from '../../utils/paths';

export interface GameCardData {
  whiteName: string;
  whiteElo?: string | number;
  whiteAcpl?: number;
  whiteAccuracy?: number;
  whiteEstimatedElo?: number;
  blackName: string;
  blackElo?: string | number;
  blackAcpl?: number;
  blackAccuracy?: number;
  blackEstimatedElo?: number;
  result: string; // '1-0', '0-1', '1/2-1/2', '*'
  date?: string;
  openingName?: string;
  openingEco?: string;
  finalFen: string;
  lastMove?: {
    from: string;
    to: string;
    san: string;
    classification?: MoveClassificationType;
    isCheckmate?: boolean;
  };
  moveCount?: number;
  evalScores?: { score: number; type: 'cp' | 'mate' }[];
  classificationCounts?: {
    white: Record<MoveClassificationType, number>;
    black: Record<MoveClassificationType, number>;
  };
  // Theme properties from user store
  pieceSet: PieceSetId;
  darkSquareColor: string;
  lightSquareColor: string;
  boardSvg?: string | null;
  orientation?: 'white' | 'black';
  accentColorId: string; // 'auto' or a specific AccentPreset id
  // Optional player avatars (absolute URLs or public paths)
  whiteAvatar?: string;
  blackAvatar?: string;
}

// ─── Static design tokens (mirrored from globals.css) ────────────────────────
// These never change; the accent is resolved dynamically below.
const BG_APP = '#121212';
const BG_SURFACE = '#1a1a1c';
const BG_SURFACE2 = '#202022';
const BG_INSET = '#0c0c0d';

const HAIRLINE = 'rgba(255, 255, 255, 0.08)';
const HAIRLINE_SOFT = 'rgba(255, 255, 255, 0.045)';

const TEXT_PRIMARY = '#F2EFEA';
const TEXT_SECONDARY = '#ACA69B';
const TEXT_TERTIARY = '#726C62';

const GOLD = '#C99A3E';

// Classification label → accent color (muted, from globals.css)
const CLASS_COLOR: Record<string, string> = {
  brilliant: '#4FA8A0',
  great: '#6E8FBF',
  best: '#7C9A5C',
  excellent: '#8FA873',
  good: '#9A948A',
  inaccuracy: '#C99A3E',
  mistake: '#C97D3E',
  blunder: '#B0483A',
  book: '#A68A5B',
  miss: '#A8402F',
  forced: '#726C62',
};

// ─── Image cache ─────────────────────────────────────────────────────────────

const imageCache: Map<string, HTMLImageElement> = new Map();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => { console.warn(`[GameCardGenerator] Could not load: ${src}`); resolve(null); };
    img.src = src;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function squareToCoords(square: string, orientation: 'white' | 'black' = 'white') {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  return {
    col: orientation === 'white' ? file : 7 - file,
    row: orientation === 'white' ? 7 - rank : rank,
  };
}

/**
 * Formats a raw PGN date (YYYY.MM.DD or YYYY-MM-DD) into "30 Sep 2026".
 */
function formatDate(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw.replace(/\./g, '-'));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Font string helpers — canvas can only use fonts that are already loaded in the
// document. Inter and JetBrains Mono are loaded via the app's CSS.
const SANS = `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
const MONO = `'JetBrains Mono', ui-monospace, monospace`;

// ─── Main class ───────────────────────────────────────────────────────────────

export class GameCardGenerator {

  private static async preloadAssets(data: GameCardData): Promise<void> {
    const urls = new Set<string>();

    urls.add(getAssetPath('icons/chess-knight.svg'));

    const safeBoardSvg = data.boardSvg ? data.boardSvg.replace(/[^a-zA-Z0-9_.-]/g, '') : null;
    if (safeBoardSvg) urls.add(getAssetPath(`boards/${safeBoardSvg}`));
    if (data.whiteAvatar) urls.add(data.whiteAvatar);
    if (data.blackAvatar) urls.add(data.blackAvatar);

    for (const key of ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']) {
      const path = getPieceSvg(key, data.pieceSet);
      if (path) urls.add(path);
    }

    for (const f of ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss', 'forced']) {
      urls.add(getAssetPath(`icons/classifications/${f}.svg`));
    }

    await Promise.all(Array.from(urls).map(loadImage));
  }

  public static async generateCardBlob(data: GameCardData): Promise<Blob> {
    const canvas = await this.drawCard(data);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create PNG blob.'))),
        'image/png', 1.0
      );
    });
  }

  public static async generateDataUrl(data: GameCardData): Promise<string> {
    const canvas = await this.drawCard(data);
    return canvas.toDataURL('image/png', 1.0);
  }

  // ── Entry point ─────────────────────────────────────────────────────────────

  public static async drawCard(data: GameCardData): Promise<HTMLCanvasElement> {
    await this.preloadAssets(data);

    // Resolve the active accent from the user's board/accent choice
    const accent = resolveActiveAccent(
      data.accentColorId,
      data.boardSvg ?? null,
      data.darkSquareColor,
      data.lightSquareColor
    );

    const W = 1200, H = 630, SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // ── Background — flat, no gradient ──────────────────────────────────────
    ctx.fillStyle = BG_APP;
    ctx.fillRect(0, 0, W, H);

    // Single hairline border matching the app's .panel style
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // ── Layout constants ────────────────────────────────────────────────────
    const M = 40;          // horizontal margin
    const HEADER_H = 54;   // header band height
    const BOARD_Y = HEADER_H + 24;
    const BOARD_SZ = 502;  // board square size
    const BOARD_X = M;

    // Header separator
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(M, HEADER_H);
    ctx.lineTo(W - M, HEADER_H);
    ctx.stroke();

    // ── Sections ────────────────────────────────────────────────────────────
    this.drawHeader(ctx, W, M, HEADER_H, data, accent);
    this.drawBoard(ctx, BOARD_X, BOARD_Y, BOARD_SZ, data, accent);

    const RIGHT_X = BOARD_X + BOARD_SZ + 26;
    const RIGHT_W = W - RIGHT_X - M;
    this.drawDashboard(ctx, RIGHT_X, BOARD_Y, RIGHT_W, BOARD_SZ, data, accent);

    return canvas;
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  private static drawHeader(
    ctx: CanvasRenderingContext2D,
    W: number,
    M: number,
    H: number,
    data: GameCardData,
    accent: AccentPreset
  ): void {
    const midY = H / 2;
    ctx.textBaseline = 'middle';

    // Brand: knight icon + "POSTMATEM"
    let lx = M;
    const knight = imageCache.get(getAssetPath('icons/chess-knight.svg'));
    if (knight) {
      ctx.drawImage(knight, lx, midY - 10, 20, 20);
      lx += 28;
    }

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `700 16px ${SANS}`;
    ctx.fillText('POSTMATEM', lx, midY);
    lx += ctx.measureText('POSTMATEM').width + 14;

    // Separator dot
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.beginPath();
    ctx.arc(lx, midY, 2, 0, Math.PI * 2);
    ctx.fill();
    lx += 14;

    // "GAME REVIEW" — plain text, no pill, no color
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.font = `500 11px ${SANS}`;
    ctx.fillText('GAME REVIEW', lx, midY);

    // Right side: book icon + opening | move count · date
    ctx.textAlign = 'right';
    let rx = W - M;

    const dateStr = formatDate(data.date);
    if (dateStr) {
      ctx.fillStyle = TEXT_TERTIARY;
      ctx.font = `400 11.5px ${SANS}`;
      ctx.fillText(dateStr, rx, midY);
      rx -= ctx.measureText(dateStr).width + 16;
    }

    if (data.moveCount) {
      // separator dot
      ctx.fillStyle = TEXT_TERTIARY;
      ctx.font = `400 11.5px ${SANS}`;
      ctx.fillText('·', rx, midY);
      rx -= ctx.measureText('·').width + 8;

      ctx.fillStyle = TEXT_TERTIARY;
      const movesStr = `${data.moveCount} moves`;
      ctx.fillText(movesStr, rx, midY);
      rx -= ctx.measureText(movesStr).width + 16;
    }

    if (data.openingName) {
      const label = data.openingEco
        ? `${data.openingName}  ${data.openingEco}`
        : data.openingName;
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = `500 11.5px ${SANS}`;
      ctx.fillText(label, rx, midY);
      rx -= ctx.measureText(label).width + 4;

      const bookIcon = imageCache.get(getAssetPath('icons/classifications/book.svg'));
      if (bookIcon) {
        ctx.drawImage(bookIcon, rx - 14, midY - 7, 14, 14);
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ── Board ───────────────────────────────────────────────────────────────────

  private static drawBoard(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    size: number,
    data: GameCardData,
    accent: AccentPreset
  ): void {
    const orientation = data.orientation ?? 'white';
    const sq = size / 8;

    ctx.save();

    // Board frame
    ctx.fillStyle = BG_SURFACE2;
    ctx.beginPath();
    ctx.roundRect(bx, by, size, size, 4);
    ctx.fill();
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    // ── Squares ──────────────────────────────────────────────────────────────
    const safeBoardSvg = data.boardSvg ? data.boardSvg.replace(/[^a-zA-Z0-9_.-]/g, '') : null;
    const boardSvgImg = safeBoardSvg ? imageCache.get(getAssetPath(`boards/${safeBoardSvg}`)) : null;
    if (boardSvgImg) {
      ctx.drawImage(boardSvgImg, bx, by, size, size);
    } else {
      const dark = data.darkSquareColor || '#7C5A3E';
      const light = data.lightSquareColor || '#D8CBB3';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          ctx.fillStyle = (r + c) % 2 === 1 ? dark : light;
          ctx.fillRect(bx + c * sq, by + r * sq, sq, sq);
        }
      }
    }

    // ── Last-move highlight (accent wash) ────────────────────────────────────
    if (data.lastMove) {
      const from = squareToCoords(data.lastMove.from, orientation);
      const to = squareToCoords(data.lastMove.to, orientation);

      ctx.fillStyle = accent.accentWash;
      ctx.fillRect(bx + from.col * sq, by + from.row * sq, sq, sq);

      ctx.fillStyle = accent.accentWashStrong;
      ctx.fillRect(bx + to.col * sq, by + to.row * sq, sq, sq);

      ctx.strokeStyle = accent.accentBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + to.col * sq + 1, by + to.row * sq + 1, sq - 2, sq - 2);

      // Checkmate: ring on the mated king
      if (data.lastMove.isCheckmate) {
        const turn = data.finalFen.split(' ')[1] ?? 'w';
        const kingChar = turn === 'w' ? 'K' : 'k';
        const fenRows = data.finalFen.split(' ')[0].split('/');
        outer: for (let r = 0; r < 8; r++) {
          let c = 0;
          for (const ch of fenRows[r] ?? '') {
            if (!isNaN(Number(ch))) { c += Number(ch); continue; }
            if (ch === kingChar) {
              const col = orientation === 'white' ? c : 7 - c;
              const row = orientation === 'white' ? r : 7 - r;
              const kx = bx + col * sq + sq / 2;
              const ky = by + row * sq + sq / 2;
              ctx.strokeStyle = '#B0483A'; // --negative
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(kx, ky, sq * 0.36, 0, Math.PI * 2);
              ctx.stroke();
              break outer;
            }
            c++;
          }
        }
      }
    }

    // ── Coordinates ──────────────────────────────────────────────────────────
    ctx.font = `bold 10px ${SANS}`;
    const dark = data.darkSquareColor || '#7C5A3E';
    const light = data.lightSquareColor || '#D8CBB3';

    ctx.textBaseline = 'top';
    for (let r = 0; r < 8; r++) {
      ctx.fillStyle = (r + 0) % 2 === 1 ? light : dark;
      const rank = orientation === 'white' ? 8 - r : r + 1;
      ctx.fillText(String(rank), bx + 3, by + r * sq + 3);
    }
    ctx.textBaseline = 'bottom';
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (7 + c) % 2 === 1 ? light : dark;
      const file = orientation === 'white'
        ? String.fromCharCode(97 + c)
        : String.fromCharCode(104 - c);
      ctx.fillText(file, bx + c * sq + sq - 10, by + size - 2);
    }
    ctx.textBaseline = 'alphabetic';

    // ── Pieces ───────────────────────────────────────────────────────────────
    const fenRows = data.finalFen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of fenRows[r] ?? '') {
        if (!isNaN(Number(ch))) { c += Number(ch); continue; }
        const key = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
        const col = orientation === 'white' ? c : 7 - c;
        const row = orientation === 'white' ? r : 7 - r;
        const img = imageCache.get(getPieceSvg(key, data.pieceSet));
        if (img) {
          const ps = sq * 0.88;
          const px = bx + col * sq + (sq - ps) / 2;
          const py = by + row * sq + (sq - ps) / 2;
          ctx.shadowColor = 'rgba(0,0,0,0.38)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetY = 2;
          ctx.drawImage(img, px, py, ps, ps);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }
        c++;
      }
    }

    // ── Classification badge on destination square ───────────────────────────
    if (data.lastMove?.classification) {
      const to = squareToCoords(data.lastMove.to, orientation);
      const url = getAssetPath(`icons/classifications/${data.lastMove.classification.toLowerCase()}.svg`);
      const img = imageCache.get(url);
      if (img) {
        const bs = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.drawImage(img, bx + to.col * sq + sq - bs - 3, by + to.row * sq + 3, bs, bs);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  private static drawDashboard(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    totalH: number,
    data: GameCardData,
    accent: AccentPreset
  ): void {
    const GAP = 12;
    const PLAYER_H = 116;
    const GRAPH_H = 90;
    const CLASS_Y = ry + PLAYER_H + GAP + GRAPH_H + GAP;
    const CLASS_H = totalH - PLAYER_H - GAP - GRAPH_H - GAP;

    this.drawPlayerCard(ctx, rx, ry, rw, PLAYER_H, data, accent);
    this.drawAdvantageGraph(ctx, rx, ry + PLAYER_H + GAP, rw, GRAPH_H, data, accent);
    this.drawClassificationTable(ctx, rx, CLASS_Y, rw, CLASS_H, data);
  }

  // ── Player Card ──────────────────────────────────────────────────────────────

  private static drawPlayerCard(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    data: GameCardData,
    accent: AccentPreset
  ): void {
    ctx.fillStyle = BG_SURFACE;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    const wAcc = data.whiteAccuracy !== undefined ? `${data.whiteAccuracy.toFixed(1)}%` : '—';
    const bAcc = data.blackAccuracy !== undefined ? `${data.blackAccuracy.toFixed(1)}%` : '—';
    const midX = rx + rw / 2;
    const AVATAR_SIZE = 20;
    const AVATAR_GAP = 8;
    const PAD = 16;
    const NAME_BASE_Y = ry + 30;
    // Optical vertical center of 14.5px text (cap-height ~10.5px) relative to baseline:
    const avatarY = Math.round(NAME_BASE_Y - 5.25 - AVATAR_SIZE / 2);
    ctx.textBaseline = 'alphabetic';

    // ── White avatar (left of name) ───────────────────────────────────────────
    let wNameX = rx + PAD;
    if (data.whiteAvatar) {
      const img = imageCache.get(data.whiteAvatar);
      if (img) {
        const minDim = Math.min(img.naturalWidth, img.naturalHeight) || 1;
        const sx = (img.naturalWidth - minDim) / 2;
        const sy = (img.naturalHeight - minDim) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(rx + PAD, avatarY, AVATAR_SIZE, AVATAR_SIZE, 3.5);
        ctx.clip();
        ctx.drawImage(img, sx, sy, minDim, minDim, rx + PAD, avatarY, AVATAR_SIZE, AVATAR_SIZE);
        ctx.restore();

        ctx.strokeStyle = HAIRLINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(rx + PAD + 0.5, avatarY + 0.5, AVATAR_SIZE - 1, AVATAR_SIZE - 1, 3);
        ctx.stroke();

        wNameX = rx + PAD + AVATAR_SIZE + AVATAR_GAP;
      }
    }

    // ── White player (left) ───────────────────────────────────────────────────
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `600 14.5px ${SANS}`;
    ctx.fillText(data.whiteName, wNameX, NAME_BASE_Y);

    ctx.fillStyle = TEXT_TERTIARY;
    ctx.font = `400 11px ${SANS}`;
    ctx.fillText(`Elo ${data.whiteElo ?? '—'}  ·  ACPL ${data.whiteAcpl ?? '—'}`, wNameX, ry + 48);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText(wAcc, wNameX, ry + 86);

    if (data.whiteEstimatedElo) {
      const w = ctx.measureText(wAcc).width;
      ctx.fillStyle = accent.accent;
      ctx.font = `600 10.5px ${SANS}`;
      ctx.fillText(`Est. ${data.whiteEstimatedElo}`, wNameX + w + 8, ry + 84);
    }

    // ── Result text (center, no pill) ─────────────────────────────────────────
    const resultText =
      data.result === '1-0'     ? '1 – 0' :
      data.result === '0-1'     ? '0 – 1' :
      data.result === '1/2-1/2' ? '½ – ½' : '–';

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `700 16px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(resultText, midX, ry + 32);

    ctx.fillStyle = TEXT_TERTIARY;
    ctx.font = `500 9.5px ${SANS}`;
    ctx.letterSpacing = '0.05em';
    ctx.fillText('ACCURACY', midX, ry + 80);
    ctx.letterSpacing = '0em';
    ctx.textAlign = 'left';

    // ── Black avatar (right of name) ──────────────────────────────────────────
    ctx.textAlign = 'right';
    let bNameRightX = rx + rw - PAD;
    if (data.blackAvatar) {
      const img = imageCache.get(data.blackAvatar);
      if (img) {
        const ax = rx + rw - PAD - AVATAR_SIZE;
        const minDim = Math.min(img.naturalWidth, img.naturalHeight) || 1;
        const sx = (img.naturalWidth - minDim) / 2;
        const sy = (img.naturalHeight - minDim) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ax, avatarY, AVATAR_SIZE, AVATAR_SIZE, 3.5);
        ctx.clip();
        ctx.drawImage(img, sx, sy, minDim, minDim, ax, avatarY, AVATAR_SIZE, AVATAR_SIZE);
        ctx.restore();

        ctx.strokeStyle = HAIRLINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ax + 0.5, avatarY + 0.5, AVATAR_SIZE - 1, AVATAR_SIZE - 1, 3);
        ctx.stroke();

        bNameRightX = rx + rw - PAD - AVATAR_SIZE - AVATAR_GAP;
      }
    }

    // ── Black player (right) ──────────────────────────────────────────────────
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `600 14.5px ${SANS}`;
    ctx.fillText(data.blackName, bNameRightX, NAME_BASE_Y);

    ctx.fillStyle = TEXT_TERTIARY;
    ctx.font = `400 11px ${SANS}`;
    ctx.fillText(`Elo ${data.blackElo ?? '—'}  ·  ACPL ${data.blackAcpl ?? '—'}`, bNameRightX, ry + 48);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText(bAcc, bNameRightX, ry + 86);

    if (data.blackEstimatedElo) {
      const w = ctx.measureText(bAcc).width;
      ctx.fillStyle = accent.accent;
      ctx.font = `600 10.5px ${SANS}`;
      ctx.fillText(`Est. ${data.blackEstimatedElo}`, bNameRightX - w - 8, ry + 84);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ── Advantage Graph ──────────────────────────────────────────────────────────


  private static drawAdvantageGraph(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    data: GameCardData,
    accent: AccentPreset
  ): void {
    ctx.fillStyle = BG_INSET;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    const px = 12, py = 14;
    const iw = rw - px * 2;
    const ih = rh - py * 2;
    const midY = ry + py + ih / 2;

    // Labels
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.font = `500 9.5px ${SANS}`;
    ctx.textBaseline = 'top';
    ctx.fillText('White', rx + px, ry + py);
    ctx.textBaseline = 'bottom';
    ctx.fillText('Black', rx + px, ry + rh - py);
    ctx.textBaseline = 'alphabetic';

    // Last move annotation (top right)
    if (data.lastMove) {
      const mv = `${data.moveCount ? `${data.moveCount}...` : ''} ${data.lastMove.san}`.trim();
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = `600 10px ${SANS}`;
      ctx.textAlign = 'right';
      ctx.fillText(mv, rx + rw - px, ry + py + 11);
      ctx.textAlign = 'left';
    }

    // Baseline
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rx + px, midY);
    ctx.lineTo(rx + rw - px, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    const evals = data.evalScores ?? [];
    if (evals.length < 2) return;

    const pts = evals.map((e, i) => {
      const wr = WinRateMath.calculateWhiteWinRate(e.score, e.type);
      return {
        x: rx + px + (i / (evals.length - 1)) * iw,
        y: midY - ((wr - 50) / 50) * (ih / 2 - 4),
      };
    });

    // Area fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, midY);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, midY);
    ctx.closePath();

    const ag = ctx.createLinearGradient(0, ry + py, 0, ry + rh - py);
    ag.addColorStop(0, 'rgba(242,239,234,0.26)');
    ag.addColorStop(0.42, 'rgba(242,239,234,0.05)');
    ag.addColorStop(0.5, 'rgba(0,0,0,0)');
    ag.addColorStop(0.58, 'rgba(15,12,10,0.08)');
    ag.addColorStop(1, 'rgba(15,12,10,0.28)');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.restore();

    // Polyline
    ctx.strokeStyle = 'rgba(242,239,234,0.75)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Endpoint dot — uses the user's resolved accent
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = accent.accent;
    ctx.fill();
    ctx.strokeStyle = BG_INSET;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── Classification Table ─────────────────────────────────────────────────────

  private static drawClassificationTable(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    data: GameCardData,
  ): void {
    ctx.fillStyle = BG_SURFACE;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    const allRows = [
      { type: MoveClassificationType.BRILLIANT, label: 'Brilliant', file: 'brilliant.svg' },
      { type: MoveClassificationType.GREAT, label: 'Great', file: 'great.svg' },
      { type: MoveClassificationType.BEST, label: 'Best', file: 'best.svg' },
      { type: MoveClassificationType.EXCELLENT, label: 'Excellent', file: 'excellent.svg' },
      { type: MoveClassificationType.GOOD, label: 'Good', file: 'good.svg' },
      { type: MoveClassificationType.BOOK, label: 'Book', file: 'book.svg' },
      { type: MoveClassificationType.INACCURACY, label: 'Inaccuracy', file: 'inaccuracy.svg' },
      { type: MoveClassificationType.MISTAKE, label: 'Mistake', file: 'mistake.svg' },
      { type: MoveClassificationType.MISS, label: 'Miss', file: 'miss.svg' },
      { type: MoveClassificationType.BLUNDER, label: 'Blunder', file: 'blunder.svg' },
    ];

    const active = allRows.filter((r) => {
      const w = data.classificationCounts?.white[r.type] ?? 0;
      const b = data.classificationCounts?.black[r.type] ?? 0;
      return w > 0 || b > 0;
    });
    const rows = active.length > 0 ? active : allRows.slice(0, 7);

    const isTwoCol = rows.length > 7;
    if (isTwoCol) {
      const half = Math.ceil(rows.length / 2);
      const cw = (rw - 36) / 2;
      this.drawClassCol(ctx, rx + 16, ry + 12, cw, rows.slice(0, half), data, rh - 24);
      this.drawClassCol(ctx, rx + 16 + cw + 16, ry + 12, cw, rows.slice(half), data, rh - 24);
    } else {
      this.drawClassCol(ctx, rx + 16, ry + 12, rw - 32, rows, data, rh - 24);
    }
  }

  private static drawClassCol(
    ctx: CanvasRenderingContext2D,
    colX: number,
    colY: number,
    colW: number,
    rows: { type: MoveClassificationType; label: string; file: string }[],
    data: GameCardData,
    maxH: number
  ): void {
    const rowH = Math.min(30, maxH / rows.length);

    rows.forEach((r, i) => {
      const cy = colY + i * rowH + rowH / 2;
      const w = data.classificationCounts?.white[r.type] ?? 0;
      const b = data.classificationCounts?.black[r.type] ?? 0;
      const hasAny = w > 0 || b > 0;

      // Icon
      const icon = imageCache.get(getAssetPath(`icons/classifications/${r.file}`));
      if (icon) ctx.drawImage(icon, colX, cy - 8, 16, 16);

      // Label — colored if present, muted if zero
      const colorKey = r.label.toLowerCase();
      ctx.fillStyle = hasAny ? (CLASS_COLOR[colorKey] ?? TEXT_SECONDARY) : TEXT_TERTIARY;
      ctx.font = `${hasAny ? 500 : 400} 12px ${SANS}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, colX + 22, cy);

      // Counts — right-aligned, White / Black order
      ctx.textAlign = 'right';
      const cx = colX + colW;

      ctx.fillStyle = b > 0 ? TEXT_SECONDARY : TEXT_TERTIARY;
      ctx.font = `600 12px ${MONO}`;
      ctx.fillText(String(b), cx, cy);

      ctx.fillStyle = TEXT_TERTIARY;
      ctx.font = `400 11px ${SANS}`;
      ctx.fillText('/', cx - 20, cy);

      ctx.fillStyle = w > 0 ? TEXT_PRIMARY : TEXT_TERTIARY;
      ctx.font = `600 12px ${MONO}`;
      ctx.fillText(String(w), cx - 32, cy);

      ctx.textAlign = 'left';

      // Row separator
      if (i < rows.length - 1) {
        ctx.strokeStyle = HAIRLINE_SOFT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colX, colY + (i + 1) * rowH);
        ctx.lineTo(colX + colW, colY + (i + 1) * rowH);
        ctx.stroke();
      }
    });

    ctx.textBaseline = 'alphabetic';
  }
}