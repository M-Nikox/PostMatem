export interface OnlinePlayerInfo {
  username: string;
  rating?: number;
  title?: string;
}

export interface OnlineGameItem {
  id: string;
  platform: 'lichess' | 'chesscom';
  url: string;
  date: string; // Formatted date string (e.g. "2026-09-28" or "Sep 28, 2026")
  timestamp: number; // Unix ms
  timeControl: string; // e.g. "3+0 Blitz", "10 min Rapid"
  speed: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'daily' | 'other';
  white: OnlinePlayerInfo;
  black: OnlinePlayerInfo;
  userColor?: 'white' | 'black';
  userOutcome?: 'win' | 'loss' | 'draw';
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  movesCount?: number;
  openingName?: string;
  pgn: string;
}

export class OnlineGameService {
  /**
   * Fetches recent standard chess games for a given username from Lichess.
   */
  public static async fetchLichessGames(username: string, maxGames = 15): Promise<OnlineGameItem[]> {
    const cleanUser = username.trim();
    if (!cleanUser) throw new Error('Please enter a Lichess username.');

    const url = `https://lichess.org/api/games/user/${encodeURIComponent(
      cleanUser
    )}?max=${maxGames}&pgnInJson=true&clocks=false&evals=false&opening=true`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    if (res.status === 404) {
      throw new Error(`User "${cleanUser}" was not found on Lichess.`);
    }
    if (res.status === 429) {
      throw new Error('Lichess rate limit reached. Please wait a few seconds before trying again.');
    }
    if (!res.ok) {
      throw new Error(`Lichess API returned status ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      return [];
    }

    const lines = text.trim().split('\n').filter(Boolean);
    const lowerUser = cleanUser.toLowerCase();
    const items: OnlineGameItem[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        // Only include standard chess games (skip atomic, horde, etc.)
        if (data.variant && data.variant !== 'standard') {
          continue;
        }

        const whiteUser = data.players?.white?.user?.name || data.players?.white?.name || 'Anonymous';
        const blackUser = data.players?.black?.user?.name || data.players?.black?.name || 'Anonymous';
        const isWhite = whiteUser.toLowerCase() === lowerUser;
        const isBlack = blackUser.toLowerCase() === lowerUser;
        const userColor = isWhite ? 'white' : isBlack ? 'black' : undefined;

        let userOutcome: 'win' | 'loss' | 'draw' | undefined;
        let resultString: '1-0' | '0-1' | '1/2-1/2' | '*' = '*';

        if (data.winner === 'white') {
          resultString = '1-0';
          if (userColor) userOutcome = userColor === 'white' ? 'win' : 'loss';
        } else if (data.winner === 'black') {
          resultString = '0-1';
          if (userColor) userOutcome = userColor === 'black' ? 'win' : 'loss';
        } else if (data.status === 'draw' || data.status === 'stalemate' || !data.winner) {
          resultString = '1/2-1/2';
          if (userColor) userOutcome = 'draw';
        }

        const speed: OnlineGameItem['speed'] = ['bullet', 'blitz', 'rapid', 'classical', 'daily'].includes(data.speed)
          ? data.speed
          : 'other';

        const speedLabel = speed.charAt(0).toUpperCase() + speed.slice(1);
        let timeControlStr = speedLabel;
        if (data.clock) {
          const initialMin = Math.round(data.clock.initial / 60);
          timeControlStr = `${initialMin}+${data.clock.increment} ${speedLabel}`;
        }

        const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

        items.push({
          id: data.id || `lichess_${Date.now()}_${Math.random()}`,
          platform: 'lichess',
          url: `https://lichess.org/${data.id}`,
          date: createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          timestamp: createdAt.getTime(),
          timeControl: timeControlStr,
          speed,
          white: {
            username: whiteUser,
            rating: data.players?.white?.rating,
            title: data.players?.white?.user?.title,
          },
          black: {
            username: blackUser,
            rating: data.players?.black?.rating,
            title: data.players?.black?.user?.title,
          },
          userColor,
          userOutcome,
          result: resultString,
          openingName: data.opening?.name,
          pgn: data.pgn || '',
        });
      } catch (err) {
        console.warn('[OnlineGameService] Failed to parse Lichess NDJSON line:', err);
      }
    }

    return items;
  }

  /**
   * Fetches recent standard chess games for a given username from Chess.com.
   */
  public static async fetchChessComGames(username: string, maxGames = 15): Promise<OnlineGameItem[]> {
    const cleanUser = username.trim();
    if (!cleanUser) throw new Error('Please enter a Chess.com username.');

    // Step 1: Query archives list
    const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(cleanUser.toLowerCase())}/games/archives`;
    const archRes = await fetch(archivesUrl);

    if (archRes.status === 404) {
      throw new Error(`Player "${cleanUser}" was not found on Chess.com.`);
    }
    if (archRes.status === 429) {
      throw new Error('Chess.com rate limit reached. Please wait a few seconds before trying again.');
    }
    if (!archRes.ok) {
      throw new Error(`Chess.com API error: ${archRes.status} ${archRes.statusText}`);
    }

    const archData = await archRes.json();
    const archives: string[] = archData?.archives || [];
    if (archives.length === 0) {
      return [];
    }

    // Step 2: Fetch the latest monthly archive, and previous if needed to satisfy maxGames
    const rawGames: any[] = [];
    for (let i = archives.length - 1; i >= 0 && rawGames.length < maxGames; i--) {
      const monthRes = await fetch(archives[i]);
      if (monthRes.ok) {
        const monthData = await monthRes.json();
        if (Array.isArray(monthData?.games)) {
          // Newest games in the month are at the end, so prepend or reverse
          rawGames.push(...monthData.games.slice().reverse());
        }
      }
    }

    const lowerUser = cleanUser.toLowerCase();
    const items: OnlineGameItem[] = [];

    for (const g of rawGames) {
      if (items.length >= maxGames) break;

      // Filter standard chess games (rules === 'chess')
      if (g.rules && g.rules !== 'chess') continue;

      const whiteUser = g.white?.username || 'Anonymous';
      const blackUser = g.black?.username || 'Anonymous';
      const isWhite = whiteUser.toLowerCase() === lowerUser;
      const isBlack = blackUser.toLowerCase() === lowerUser;
      const userColor = isWhite ? 'white' : isBlack ? 'black' : undefined;

      const whiteResult = g.white?.result || '';
      const blackResult = g.black?.result || '';

      let resultString: '1-0' | '0-1' | '1/2-1/2' | '*' = '*';
      let userOutcome: 'win' | 'loss' | 'draw' | undefined;

      if (whiteResult === 'win') {
        resultString = '1-0';
        if (userColor) userOutcome = userColor === 'white' ? 'win' : 'loss';
      } else if (blackResult === 'win') {
        resultString = '0-1';
        if (userColor) userOutcome = userColor === 'black' ? 'win' : 'loss';
      } else {
        const drawReasons = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];
        if (drawReasons.includes(whiteResult) || drawReasons.includes(blackResult)) {
          resultString = '1/2-1/2';
          if (userColor) userOutcome = 'draw';
        }
      }

      const speedMap: Record<string, OnlineGameItem['speed']> = {
        bullet: 'bullet',
        blitz: 'blitz',
        rapid: 'rapid',
        classical: 'classical',
        daily: 'daily',
      };
      const speed: OnlineGameItem['speed'] = speedMap[g.time_class] || 'other';
      const speedLabel = speed.charAt(0).toUpperCase() + speed.slice(1);

      let timeControlStr = speedLabel;
      if (g.time_control) {
        if (g.time_control.includes('+')) {
          const parts = g.time_control.split('+');
          const baseSec = parseInt(parts[0], 10);
          const incSec = parts[1];
          timeControlStr = `${Math.round(baseSec / 60)}+${incSec} ${speedLabel}`;
        } else if (!isNaN(Number(g.time_control))) {
          const min = Math.round(Number(g.time_control) / 60);
          timeControlStr = `${min} min ${speedLabel}`;
        }
      }

      const playedAt = g.end_time ? new Date(g.end_time * 1000) : new Date();

      // Extract opening from PGN header if available
      let openingName: string | undefined;
      if (g.pgn) {
        const ecoMatch = g.pgn.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/([^"]+)"\]/);
        if (ecoMatch && ecoMatch[1]) {
          openingName = ecoMatch[1].replace(/-/g, ' ');
        }
      }

      items.push({
        id: g.url ? g.url.split('/').pop() || `chesscom_${Date.now()}` : `chesscom_${Date.now()}_${Math.random()}`,
        platform: 'chesscom',
        url: g.url || '',
        date: playedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: playedAt.getTime(),
        timeControl: timeControlStr,
        speed,
        white: {
          username: whiteUser,
          rating: g.white?.rating,
        },
        black: {
          username: blackUser,
          rating: g.black?.rating,
        },
        userColor,
        userOutcome,
        result: resultString,
        openingName,
        pgn: g.pgn || '',
      });
    }

    return items;
  }
}
