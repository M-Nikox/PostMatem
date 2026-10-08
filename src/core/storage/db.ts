import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AnalysisReport } from '../analysis/types';
import { PositionEvaluation } from '../engine/types';
import { PgnHeaders } from '../tree/pgnParser';
import { MoveTreeState } from '../tree/moveGraph';

export interface StoredGame {
  id: string;
  pgn: string;
  date: string;
  headers: PgnHeaders;
  result: string;
  white: { name: string; elo?: number };
  black: { name: string; elo?: number };
  analysisReport?: AnalysisReport;
  moveCount: number;
  treeState?: MoveTreeState;
}

export interface PostMatemDBSchema extends DBSchema {
  games: {
    key: string;
    value: StoredGame;
    indexes: {
      'by-date': string;
      'by-result': string;
    };
  };
  eval_cache: {
    key: string; // FEN
    value: PositionEvaluation;
  };
}

let dbPromise: Promise<IDBPDatabase<PostMatemDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<PostMatemDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PostMatemDBSchema>('postmatem_db', 1, {
      upgrade(db) {
        // Games store
        if (!db.objectStoreNames.contains('games')) {
          const gameStore = db.createObjectStore('games', { keyPath: 'id' });
          gameStore.createIndex('by-date', 'date');
          gameStore.createIndex('by-result', 'result');
        }

        // FEN Evaluation Cache store
        if (!db.objectStoreNames.contains('eval_cache')) {
          db.createObjectStore('eval_cache', { keyPath: 'fen' });
        }
      },
    });
  }
  return dbPromise;
}
