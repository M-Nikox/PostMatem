import { PositionEvaluation } from '../engine/types';
import { getDatabase } from './db';

export class EvalCache {
  /**
   * Retrieves a cached evaluation for a FEN if it exists and meets minimum depth / line requirements.
   */
  public static async get(
    fen: string,
    minDepth = 1,
    minMultiPv = 1
  ): Promise<PositionEvaluation | null> {
    try {
      const db = await getDatabase();
      const cached: PositionEvaluation | undefined = await db.get('eval_cache', fen);
      if (!cached) return null;
      // Do not return shallow or incomplete evaluations if caller needs deeper search
      if (cached.depth < minDepth) return null;
      if ((cached.lines?.length || 0) < minMultiPv) return null;
      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Caches an evaluation by its FEN position if it contains valid lines and positive depth.
   */
  public static async set(evaluation: PositionEvaluation): Promise<void> {
    // Never poison the cache with empty or failed zero-depth evals
    if (!evaluation || !evaluation.lines || evaluation.lines.length === 0 || evaluation.depth <= 0) {
      return;
    }
    try {
      const db = await getDatabase();
      await db.put('eval_cache', evaluation);
    } catch (err) {
      console.warn('[EvalCache] Failed to cache FEN evaluation:', err);
    }
  }
}
