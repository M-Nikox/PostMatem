import { getAssetPath } from '../../utils/paths';

export interface OpeningInfo {
  eco: string;
  name: string;
}

export interface EcoEntry {
  eco: string;
  name: string;
  moves: string[];
}

// Exact-sequence lookup: key is SAN moves joined by a single space, e.g. "e4 e5 Nf3 Nc6 Bb5"
let bookMap: Map<string, OpeningInfo> | null = null;
let allOpenings: EcoEntry[] = [];
let loadPromise: Promise<void> | null = null;

/**
 * Fetches the ECO opening book (a static asset in /public, not bundled into the
 * main JS chunk — same pattern as the Stockfish engine files) and builds the
 * lookup map. Safe to call multiple times; only fetches once.
 */
export function loadOpeningBook(): Promise<void> {
  if (bookMap && allOpenings.length > 0) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = fetch(getAssetPath('data/eco-openings.json'))
    .then((res) => res.json())
    .then((entries: EcoEntry[]) => {
      allOpenings = entries;
      const map = new Map<string, OpeningInfo>();
      for (const entry of entries) {
        map.set(entry.moves.join(' '), { eco: entry.eco, name: entry.name });
      }
      bookMap = map;
    })
    .catch((err) => {
      console.error('[OpeningBook] Failed to load ECO data:', err);
      bookMap = new Map(); // fail gracefully — opening name just won't show
      allOpenings = [];
    });

  return loadPromise;
}

export function getAllOpenings(): EcoEntry[] {
  return allOpenings;
}

export function searchOpenings(query = '', category = 'all', limit = 100): EcoEntry[] {
  const q = query.toLowerCase().trim();
  const results: EcoEntry[] = [];

  for (let i = 0; i < allOpenings.length; i++) {
    const entry = allOpenings[i];
    const nameLower = entry.name.toLowerCase();
    const firstMove = entry.moves[0] || '';
    const secondMove = entry.moves[1] || '';

    // Category filter
    if (category === 'e4' && firstMove !== 'e4') continue;
    if (category === 'd4' && firstMove !== 'd4') continue;
    if (category === 'sicilian' && !(firstMove === 'e4' && secondMove === 'c5')) continue;
    if (
      category === 'french-caro' &&
      !(firstMove === 'e4' && (secondMove === 'e6' || secondMove === 'c6'))
    )
      continue;
    if (
      category === 'indian' &&
      !(firstMove === 'd4' && secondMove === 'Nf6') &&
      !nameLower.includes('indian') &&
      !nameLower.includes('grünfeld') &&
      !nameLower.includes('benoni')
    )
      continue;
    if (category === 'gambit' && !nameLower.includes('gambit')) continue;
    if (category === 'flank' && !['c4', 'Nf3', 'b3', 'f4', 'g3', 'b4'].includes(firstMove)) continue;

    // Search text query
    if (q) {
      const matchesName = nameLower.includes(q);
      const matchesEco = entry.eco.toLowerCase().startsWith(q);
      const matchesMoves = entry.moves.join(' ').toLowerCase().includes(q);
      if (!matchesName && !matchesEco && !matchesMoves) continue;
    }

    results.push(entry);
    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Given the SAN moves played so far (from the start of the game, mainline order),
 * returns the most specific (deepest) known opening name, or null if the book
 * hasn't loaded yet or the position has left the opening book entirely.
 */
export function getOpeningForMoves(sanMoves: string[]): OpeningInfo | null {
  if (!bookMap) return null;
  for (let k = sanMoves.length; k > 0; k--) {
    const key = sanMoves.slice(0, k).join(' ');
    const hit = bookMap.get(key);
    if (hit) return hit;
  }
  return null;
}

/**
 * Checks if the exact sequence of SAN moves matches a line in the opening book.
 */
export function isExactBookSequence(sanMoves: string[]): boolean {
  if (!bookMap || sanMoves.length === 0) return false;
  return bookMap.has(sanMoves.join(' '));
}

/**
 * Checks if the played path of SAN moves is currently within recognized opening book theory.
 * Opening book moves must be in the first 16 plies (8 moves) and uninterrupted from move 1.
 */
export function isPathInBook(sanMoves: string[]): boolean {
  if (sanMoves.length === 0 || sanMoves.length > 16) return false;
  if (sanMoves.length <= 2) return true;
  for (let k = 3; k <= sanMoves.length; k++) {
    if (!isExactBookSequence(sanMoves.slice(0, k))) {
      return false;
    }
  }
  return true;
}

