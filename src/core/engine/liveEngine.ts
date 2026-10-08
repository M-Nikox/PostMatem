import { DEFAULT_ENGINE, ENGINE_CONFIGS } from './engineConfig';
import { EngineName, PositionEvaluation } from './types';
import { UciParser } from './uciParser';

/**
 * Dedicated Tier 1 Interactive Engine.
 * Responsible exclusively for real-time live evaluation of the active board.
 * Optimized for sub-10ms responsiveness, instant preemption on move change,
 * 60ms throttled UI updates, strict UCI command synchronization,
 * and resilient self-healing auto-recovery on worker errors.
 */
export class LiveEngine {
  private worker: Worker | null = null;
  private engineName: EngineName;
  private isReady = false;
  private isEvaluating = false;
  private isStopping = false;
  private currentFen = '';
  private currentTargetDepth = 18;
  private appliedMultiPv = 0;
  private appliedSkillLevel = -1;
  private messagesBuffer: string[] = [];
  private lastStreamTime = 0;
  private readonly THROTTLE_MS = 60; // 60ms = ~16 updates/sec, eliminating UI jank
  private latestRequestId = 0;
  private currentResolve: ((result: PositionEvaluation) => void) | null = null;
  private currentReject: ((err: any) => void) | null = null;
  private pendingSyncResolve: (() => void) | null = null;
  private pendingSyncPromise: Promise<void> | null = null;

  private initPromise: Promise<void> | null = null;
  private _onProgress: ((partial: PositionEvaluation) => void) | null = null;

  // Resilience & crash tracking
  private crashTimestamps: number[] = [];
  private isRecovering = false;

  constructor(engineName: EngineName = DEFAULT_ENGINE) {
    this.engineName = engineName;
  }

  public getActiveEngineName(): EngineName {
    return this.engineName;
  }

  public async init(): Promise<void> {
    if (this.isReady && this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const config = ENGINE_CONFIGS[this.engineName];
      try {
        this.worker = new Worker(config.path);
      } catch (err) {
        console.error(`[LiveEngine] Failed to spawn worker from ${config.path}:`, err);
        // Fallback to stockfish 11 pure js if worker creation fails
        if (this.engineName !== EngineName.Stockfish11) {
          console.warn('[LiveEngine] Falling back to Stockfish 11 pure JS worker');
          this.engineName = EngineName.Stockfish11;
          try {
            this.worker = new Worker(ENGINE_CONFIGS[EngineName.Stockfish11].path);
          } catch (fallbackErr) {
            this.initPromise = null;
            return reject(fallbackErr);
          }
        } else {
          this.initPromise = null;
          return reject(err);
        }
      }

      this.worker.onerror = (e) => {
        console.error('[LiveEngine] Worker error event:', e);
        if (!this.isReady) {
          this.initPromise = null;
          // Try fallback if primary engine worker errored during startup
          if (this.engineName !== EngineName.Stockfish11) {
            console.warn('[LiveEngine] Falling back to Stockfish 11 after startup error');
            this.engineName = EngineName.Stockfish11;
            this.worker?.terminate();
            this.worker = null;
            try {
              this.worker = new Worker(ENGINE_CONFIGS[EngineName.Stockfish11].path);
              this.worker.addEventListener('message', initHandler);
              this.worker.onerror = (err) => this.handleWorkerCrash(err);
              this.worker.postMessage('uci');
              this.worker.postMessage('isready');
            } catch (fallbackErr) {
              reject(fallbackErr);
            }
          } else {
            reject(new Error('[LiveEngine] Worker failed to initialize.'));
          }
        } else {
          // Worker crashed while active: self-heal and respawn fresh worker
          this.handleWorkerCrash(e);
        }
      };

      const initTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.warn(`[LiveEngine] Initialization timeout for ${config.displayName}`);
          this.initPromise = null;
          reject(new Error(`[LiveEngine] Engine initialization timed out for ${config.displayName}`));
        }
      }, 10000);

      let uciReceived = false;
      const initHandler = (event: MessageEvent<string>) => {
        const msg = typeof event.data === 'string' ? event.data : '';
        if (!uciReceived && (msg === 'uciok' || msg.includes('uciok'))) {
          uciReceived = true;
          this.worker?.postMessage(`setoption name MultiPV value ${config.multiPv}`);
          this.worker?.postMessage(`setoption name Hash value ${config.hashSizeMb}`);
          this.worker?.postMessage('isready');
        } else if (msg === 'readyok' || msg.includes('readyok')) {
          clearTimeout(initTimeout);
          this.worker?.removeEventListener('message', initHandler);
          this.worker?.addEventListener('message', this.handleWorkerMessage.bind(this));
          this.isReady = true;
          this.appliedMultiPv = config.multiPv;
          resolve();
        }
      };

      this.worker.addEventListener('message', initHandler);

      // Initialize UCI engine
      this.worker.postMessage('uci');
    });

    return this.initPromise;
  }

  /**
   * Resilient crash handler. Terminates dead WASM workers, prevents cascaded errors,
   * falls back to rock-solid engine builds if necessary, and auto-spawns a clean instance.
   */
  private handleWorkerCrash(err: any): void {
    console.warn('[LiveEngine] Web Worker runtime exception caught. Auto-recovering...', err);
    const now = Date.now();
    this.crashTimestamps = this.crashTimestamps.filter((t) => now - t < 45000);
    this.crashTimestamps.push(now);

    // 1. Settle current active promise so caller doesn't hang
    if (this.currentReject) {
      const rej = this.currentReject;
      this.currentResolve = null;
      this.currentReject = null;
      try {
        rej(new Error('[LiveEngine] Engine crashed and is recovering.'));
      } catch {}
    } else {
      this.currentResolve = null;
    }

    if (this.pendingSyncResolve) {
      const sync = this.pendingSyncResolve;
      this.pendingSyncResolve = null;
      this.pendingSyncPromise = null;
      try {
        sync();
      } catch {}
    }

    // 2. Kill the dead worker instance completely
    try {
      this.worker?.terminate();
    } catch {}
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    this.isEvaluating = false;
    this.isStopping = false;
    this.appliedMultiPv = 0;
    this.appliedSkillLevel = -1;

    // 3. Fallback progression if crashing repeatedly (>= 2 crashes in 45s)
    if (this.crashTimestamps.length >= 2) {
      if (
        this.engineName === EngineName.Stockfish19LiteSingle ||
        this.engineName === EngineName.Stockfish19Lite
      ) {
        console.warn('[LiveEngine] Repeated crashes with Stockfish 19. Automatically switching to rock-solid Stockfish 17 Lite.');
        this.engineName = EngineName.Stockfish17LiteSingle;
      } else if (
        this.engineName === EngineName.Stockfish17LiteSingle ||
        this.engineName === EngineName.Stockfish17Lite
      ) {
        console.warn('[LiveEngine] Switching to Stockfish 16 NNUE.');
        this.engineName = EngineName.Stockfish16NNUE;
      } else if (this.engineName !== EngineName.Stockfish11) {
        console.warn('[LiveEngine] Switching to pure JS fallback Stockfish 11.');
        this.engineName = EngineName.Stockfish11;
      }
    }

    // 4. Auto-respawn fresh worker immediately
    if (!this.isRecovering) {
      this.isRecovering = true;
      setTimeout(() => {
        this.isRecovering = false;
        this.init().catch((spawnErr) => {
          console.error('[LiveEngine] Auto-recovery worker spawn failed:', spawnErr);
        });
      }, 50);
    }
  }

  /**
   * Evaluates a position with streaming progress.
   * Auto-initializes the engine if not yet ready.
   * If a search is already active, it is cleanly halted and synchronized before starting.
   */
  public async evaluate(
    fen: string,
    depth = 18,
    multiPv = 3,
    onProgress?: (partial: PositionEvaluation) => void,
    skillLevel?: number
  ): Promise<PositionEvaluation> {
    const reqId = ++this.latestRequestId;

    if (!this.isReady || !this.worker) {
      await this.init();
    }

    if (!this.worker || !this.isReady) {
      throw new Error('[LiveEngine] Engine worker failed to initialize.');
    }

    // If currently evaluating or waiting for worker sync, cleanly halt and wait for readyok sync
    if (this.isEvaluating || this.pendingSyncPromise) {
      await this.stop();
    }

    if (reqId !== this.latestRequestId) {
      throw new DOMException('Aborted', 'AbortError');
    }

    this.currentFen = fen;
    this.currentTargetDepth = depth;
    this.isEvaluating = true;
    this.messagesBuffer = [];
    this.lastStreamTime = 0;
    this._onProgress = onProgress || null;

    // Configure Stockfish Skill Level ONLY when changed (avoids unnecessary command spam)
    if (skillLevel !== undefined) {
      const uciSkill = Math.max(0, Math.min(20, Math.round((skillLevel - 1) * (20 / 19))));
      if (this.appliedSkillLevel !== uciSkill) {
        this.appliedSkillLevel = uciSkill;
        this.worker.postMessage(`setoption name Skill Level value ${uciSkill}`);
      }
    } else if (this.appliedSkillLevel !== 20) {
      this.appliedSkillLevel = 20;
      this.worker.postMessage('setoption name Skill Level value 20');
    }

    // Configure MultiPV ONLY when changed (preventing C++ PV buffer reallocation during search!)
    if (this.appliedMultiPv !== multiPv) {
      this.appliedMultiPv = multiPv;
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
    }

    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);

    return new Promise<PositionEvaluation>((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
    });
  }

  private handleWorkerMessage(event: MessageEvent<string>) {
    const rawData = typeof event.data === 'string' ? event.data : '';
    const lines = rawData.split('\n');

    for (const rawLine of lines) {
      const data = rawLine.trim();
      if (!data) continue;

      // Handle isready sync confirmation
      if (data.includes('readyok')) {
        // If we were waiting for stop sync and bestmove has already been drained (or wasn't searching)
        if (this.isStopping && !this.isEvaluating && this.pendingSyncResolve) {
          this.isStopping = false;
          const resolve = this.pendingSyncResolve;
          this.pendingSyncResolve = null;
          this.pendingSyncPromise = null;
          resolve();
        }
        continue;
      }

      // If engine was told to stop, discard any trailing bestmove or info from the aborted search
      if (this.isStopping) {
        if (data.startsWith('bestmove')) {
          this.isStopping = false;
          if (this.pendingSyncResolve) {
            const resolve = this.pendingSyncResolve;
            this.pendingSyncResolve = null;
            this.pendingSyncPromise = null;
            resolve();
          }
        }
        continue;
      }

      if (!this.isEvaluating) continue;

      this.messagesBuffer.push(data);

      // Stream throttled partial updates to UI
      if (this._onProgress && data.startsWith('info depth')) {
        const now = performance.now();
        if (now - this.lastStreamTime >= this.THROTTLE_MS) {
          this.lastStreamTime = now;
          const partial = UciParser.parseLines(
            this.messagesBuffer,
            this.currentFen,
            this.currentTargetDepth,
            ENGINE_CONFIGS[this.engineName].displayName
          );
          this._onProgress(partial);
        }
      }

      // When engine completes search
      if (data.startsWith('bestmove')) {
        const finalEval = UciParser.parseLines(
          this.messagesBuffer,
          this.currentFen,
          this.currentTargetDepth,
          ENGINE_CONFIGS[this.engineName].displayName
        );

        const resolve = this.currentResolve;
        this.currentResolve = null;
        this.currentReject = null;
        this._onProgress = null;
        this.isEvaluating = false;

        if (resolve) {
          resolve(finalEval);
        }
      }
    }
  }

  /**
   * Preempts and stops current calculation immediately, waiting for the search to unwind
   * and emit its trailing bestmove token (as UCI specifies) before declaring the engine idle.
   */
  public stop(): Promise<void> {
    if (!this.worker || !this.isReady) {
      this.isEvaluating = false;
      this.isStopping = false;
      return Promise.resolve();
    }

    // Invalidate any ongoing request so that late callbacks are dropped
    this.latestRequestId++;

    // Settle existing search promise with AbortError so caller is not left hanging
    if (this.currentReject) {
      const reject = this.currentReject;
      this.currentResolve = null;
      this.currentReject = null;
      try {
        reject(new DOMException('Aborted', 'AbortError'));
      } catch {}
    } else {
      this.currentResolve = null;
    }

    this._onProgress = null;
    this.messagesBuffer = [];

    // If neither evaluating nor currently stopping, engine is already idle
    if (!this.isEvaluating && !this.isStopping) {
      return Promise.resolve();
    }

    // If already waiting for stop sync, return the existing pending promise
    if (this.pendingSyncPromise) {
      return this.pendingSyncPromise;
    }

    this.isStopping = true;
    this.isEvaluating = false;

    this.pendingSyncPromise = new Promise<void>((resolve) => {
      this.pendingSyncResolve = resolve;

      try {
        this.worker?.postMessage('stop');
        this.worker?.postMessage('isready');
      } catch {
        this.pendingSyncResolve = null;
        this.pendingSyncPromise = null;
        this.isStopping = false;
        resolve();
        return;
      }

      // Hard timeout fallback: if engine fails to drain bestmove or readyok within 350ms,
      // terminate the wedged worker and self-heal so the app never hangs indefinitely.
      setTimeout(() => {
        if (this.pendingSyncResolve === resolve) {
          console.warn('[LiveEngine] Stop sync timeout (no bestmove/readyok within 350ms). Recycling worker.');
          this.pendingSyncResolve = null;
          this.pendingSyncPromise = null;
          this.isStopping = false;
          this.isEvaluating = false;
          // Recycle worker to clear wedged WASM state
          try {
            this.worker?.terminate();
          } catch {}
          this.worker = null;
          this.isReady = false;
          this.initPromise = null;
          this.init().catch(() => {});
          resolve();
        }
      }, 350);
    });

    return this.pendingSyncPromise;
  }

  /**
   * Shuts down worker completely and cleans up all state promises.
   */
  public terminate(): void {
    if (this.currentReject) {
      try {
        this.currentReject(new DOMException('Aborted', 'AbortError'));
      } catch {}
      this.currentReject = null;
      this.currentResolve = null;
    }
    if (this.pendingSyncResolve) {
      try {
        this.pendingSyncResolve();
      } catch {}
      this.pendingSyncResolve = null;
      this.pendingSyncPromise = null;
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.isReady = false;
    this.isEvaluating = false;
    this.isStopping = false;
    this.initPromise = null;
    this.appliedMultiPv = 0;
    this.appliedSkillLevel = -1;
  }
}
