import { DEFAULT_ENGINE, ENGINE_CONFIGS, getRecommendedWorkerCount } from './engineConfig';
import { EngineName, PositionEvaluation } from './types';
import { UciParser } from './uciParser';

interface PoolWorker {
  id: number;
  worker: Worker;
  isReady: boolean;
  isBusy: boolean;
  currentHandler?: (event: MessageEvent<string>) => void;
  currentTimeout?: any;
}

/**
 * Dedicated Tier 2 Parallel Batch Worker Pool.
 * Used for full-game post-mortem reviews without blocking interactive gameplay or UI rendering.
 */
export class WorkerPool {
  private workers: PoolWorker[] = [];
  private engineName: EngineName;
  private workerCount: number;
  private isInitialized = false;
  private isAborted = false;

  constructor(
    engineName: EngineName = DEFAULT_ENGINE,
    workerCount: number = getRecommendedWorkerCount()
  ) {
    this.engineName = engineName;
    this.workerCount = Math.max(1, workerCount);
  }

  private initPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const config = ENGINE_CONFIGS[this.engineName];
      const spawnPromises: Promise<PoolWorker>[] = [];

      for (let i = 0; i < this.workerCount; i++) {
        spawnPromises.push(this.spawnWorker(i, config.path, config.hashSizeMb));
      }

      this.workers = await Promise.all(spawnPromises);
      this.isInitialized = true;
    })();

    return this.initPromise;
  }

  private spawnWorker(id: number, scriptPath: string, hashSizeMb: number): Promise<PoolWorker> {
    return new Promise((resolve) => {
      const trySpawn = (targetPath: string, isFallback = false) => {
        try {
          const worker = new Worker(targetPath);
          const poolWorker: PoolWorker = {
            id,
            worker,
            isReady: false,
            isBusy: false,
          };

          let uciReceived = false;
          const initHandler = (event: MessageEvent<string>) => {
            const msg = typeof event.data === 'string' ? event.data : '';
            if (!uciReceived && (msg === 'uciok' || msg.includes('uciok'))) {
              uciReceived = true;
              worker.postMessage('setoption name MultiPV value 2');
              worker.postMessage(`setoption name Hash value ${Math.max(8, Math.floor(hashSizeMb / this.workerCount))}`);
              worker.postMessage('isready');
            } else if (msg === 'readyok' || msg.includes('readyok')) {
              worker.removeEventListener('message', initHandler);
              poolWorker.isReady = true;
              resolve(poolWorker);
            }
          };

          worker.addEventListener('message', initHandler);
          worker.onerror = (err) => {
            console.warn(`[WorkerPool] Worker #${id} encountered error on ${targetPath}:`, err);
            if (!poolWorker.isReady && !isFallback) {
              console.warn(`[WorkerPool] Auto-recovering worker #${id} with stable Stockfish 17 fallback.`);
              try {
                worker.terminate();
              } catch {}
              trySpawn(ENGINE_CONFIGS[EngineName.Stockfish17LiteSingle].path, true);
            }
          };

          worker.postMessage('uci');
        } catch (err) {
          if (!isFallback) {
            trySpawn(ENGINE_CONFIGS[EngineName.Stockfish17LiteSingle].path, true);
          } else {
            console.error(`[WorkerPool] Fatal: Failed to spawn worker #${id}:`, err);
          }
        }
      };

      trySpawn(scriptPath);
    });
  }

  private activeBatchResolve: ((results: PositionEvaluation[]) => void) | null = null;

  /**
   * Evaluates an entire list of FENs concurrently across available workers.
   */
  public async batchEvaluate(
    fens: string[],
    depth = 16,
    onProgress?: (percent: number, completed: number, total: number) => void
  ): Promise<PositionEvaluation[]> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.isAborted = false;
    const total = fens.length;
    if (total === 0) return [];

    const results: PositionEvaluation[] = new Array(total);
    let completed = 0;

    // Queue of index and FEN
    const queue = fens.map((fen, index) => ({ fen, index }));

    return new Promise((resolve) => {
      this.activeBatchResolve = resolve;

      const finishBatch = () => {
        if (this.activeBatchResolve === resolve) {
          this.activeBatchResolve = null;
          resolve(results);
        }
      };

      const processNext = (poolWorker: PoolWorker) => {
        if (this.isAborted || queue.length === 0) {
          poolWorker.isBusy = false;

          // Check if all positions have finished or batch was aborted
          if (completed >= total || this.isAborted) {
            finishBatch();
          }
          return;
        }

        const task = queue.shift();
        if (!task) return;

        poolWorker.isBusy = true;
        this.evaluateSingle(poolWorker, task.fen, depth)
          .then((res) => {
            results[task.index] = res;
            completed++;
            const percent = Math.round((completed / total) * 100);
            onProgress?.(percent, completed, total);
            processNext(poolWorker);
          })
          .catch((err) => {
            console.error(`[WorkerPool] Error evaluating index ${task.index}:`, err);
            results[task.index] = {
              fen: task.fen,
              depth: 0,
              lines: [],
              engineName: ENGINE_CONFIGS[this.engineName].displayName,
            };
            completed++;
            processNext(poolWorker);
          });
      };

      // Launch all available workers
      for (const worker of this.workers) {
        processNext(worker);
      }
    });
  }

  private evaluateSingle(
    poolWorker: PoolWorker,
    fen: string,
    depth: number
  ): Promise<PositionEvaluation> {
    return new Promise((resolve) => {
      const messages: string[] = [];

      const cleanup = () => {
        if (poolWorker.currentTimeout) {
          clearTimeout(poolWorker.currentTimeout);
          poolWorker.currentTimeout = undefined;
        }
        if (poolWorker.currentHandler) {
          poolWorker.worker.removeEventListener('message', poolWorker.currentHandler);
          poolWorker.currentHandler = undefined;
        }
      };

      const handler = (event: MessageEvent<string>) => {
        const line = typeof event.data === 'string' ? event.data : '';
        messages.push(line);

        if (line.startsWith('bestmove')) {
          cleanup();
          const evaluation = UciParser.parseLines(
            messages,
            fen,
            depth,
            ENGINE_CONFIGS[this.engineName].displayName
          );
          resolve(evaluation);
        }
      };

      // Safety timeout: 15s max per position to avoid stalled batch worker hangs
      poolWorker.currentTimeout = setTimeout(() => {
        cleanup();
        try {
          poolWorker.worker.postMessage('stop');
        } catch {}
        const evaluation = UciParser.parseLines(
          messages,
          fen,
          depth,
          ENGINE_CONFIGS[this.engineName].displayName
        );
        resolve(evaluation);
      }, 15000);

      poolWorker.currentHandler = handler;
      poolWorker.worker.addEventListener('message', handler);
      poolWorker.worker.postMessage(`position fen ${fen}`);
      poolWorker.worker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Immediately cancels any running batch evaluation and settles active promise.
   */
  public abort(): void {
    this.isAborted = true;
    for (const pw of this.workers) {
      if (pw.currentTimeout) {
        clearTimeout(pw.currentTimeout);
        pw.currentTimeout = undefined;
      }
      if (pw.currentHandler) {
        pw.worker.removeEventListener('message', pw.currentHandler);
        pw.currentHandler = undefined;
      }
      if (pw.isBusy) {
        try {
          pw.worker.postMessage('stop');
        } catch {}
        pw.isBusy = false;
      }
    }
    if (this.activeBatchResolve) {
      const resolve = this.activeBatchResolve;
      this.activeBatchResolve = null;
      resolve([]);
    }
  }

  /**
   * Terminates all workers in the pool and resets initialization state.
   */
  public terminate(): void {
    this.abort();
    for (const pw of this.workers) {
      try {
        pw.worker.terminate();
      } catch {}
    }
    this.workers = [];
    this.isInitialized = false;
    this.initPromise = null;
    this.activeBatchResolve = null;
  }
}
