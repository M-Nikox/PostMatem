import { getAssetPath } from '../../utils/paths';

export type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'chekmate'
  | 'castle'
  | 'promote'
  | 'game-end'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'lowtime'
  | 'genericnotify'
  | 'error'
  | 'illegal';

export class SoundManager {
  private static bufferCache = new Map<string, AudioBuffer>();
  private static loadingPromises = new Map<string, Promise<AudioBuffer | null>>();
  private static missingFiles = new Set<string>();
  private static audioCtx: AudioContext | null = null;

  private static readonly EXTENSIONS = ['.mp3', '.ogg', '.opus', '.wav'];

  /**
   * Sound aliases and fallback hierarchy
   */
  private static readonly FALLBACKS: Record<string, string[]> = {
    castle: ['castle', 'move'],
    promote: ['promote', 'move'],
    chekmate: ['chekmate', 'checkmate', 'victory', 'game-end'],
    checkmate: ['checkmate', 'chekmate', 'victory', 'game-end'],
    victory: ['victory', 'chekmate', 'checkmate', 'game-end'],
    defeat: ['defeat', 'chekmate', 'checkmate', 'game-end'],
    draw: ['draw', 'game-end'],
    'game-end': ['game-end', 'chekmate', 'checkmate', 'victory', 'defeat', 'draw'],
    error: ['error', 'illegal'],
    illegal: ['illegal', 'error'],
  };

  /**
   * Automatically initializes or resumes the Web Audio context.
   */
  public static initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Preloads an audio file into Web Audio buffer cache for instant 0ms playback.
   */
  public static async loadAudioBuffer(path: string): Promise<AudioBuffer | null> {
    if (this.missingFiles.has(path)) return null;
    if (this.bufferCache.has(path)) return this.bufferCache.get(path)!;
    if (this.loadingPromises.has(path)) return this.loadingPromises.get(path)!;

    const promise = (async () => {
      try {
        const res = await fetch(path);
        if (!res.ok) {
          this.missingFiles.add(path);
          return null;
        }
        const arrayBuf = await res.arrayBuffer();
        const ctx = this.initContext();
        if (!ctx) return null;
        const decoded = await ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(path, decoded);
        return decoded;
      } catch {
        this.missingFiles.add(path);
        return null;
      } finally {
        this.loadingPromises.delete(path);
      }
    })();

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * Plays a chess sound effect.
   * Priority:
   * 1. Plays custom audio file placed in /sounds/ (e.g. move.mp3, capture.mp3) with zero latency via Web Audio.
   * 2. Falls back gracefully to the procedural synthesizer if the audio file is missing or still loading.
   */
  public static play(type: SoundType, enabled = true): void {
    if (!enabled || typeof window === 'undefined') return;

    const ctx = this.initContext();
    if (!ctx) return;

    const baseNames = this.FALLBACKS[type] || [type];
    const candidatePaths: string[] = [];

    for (const name of baseNames) {
      for (const ext of this.EXTENSIONS) {
        candidatePaths.push(getAssetPath(`sounds/${name}${ext}`));
      }
    }

    // 1. Check if an audio file is already cached in memory
    for (const path of candidatePaths) {
      const cached = this.bufferCache.get(path);
      if (cached) {
        this.playBuffer(cached, ctx);
        return;
      }
    }

    // 2. If candidate exists on disk, load and play it
    const candidate = candidatePaths.find((p) => !this.missingFiles.has(p));
    if (candidate) {
      this.loadAudioBuffer(candidate).then((buf) => {
        if (buf && this.audioCtx) {
          this.playBuffer(buf, this.audioCtx);
        } else {
          this.playSynthetic(type);
        }
      });
      return;
    }

    // 3. Fallback to procedural synthetic audio
    this.playSynthetic(type);
  }

  private static playBuffer(buffer: AudioBuffer, ctx: AudioContext): void {
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Audio buffer playback error fallback
    }
  }

  /**
   * Rustic, relaxing, wooden clacky synthesizer using Web Audio API.
   * Uses low-pass acoustic filtering, warm wood fundamentals, and gentle gains.
   */
  private static playSynthetic(type: SoundType): void {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master warm acoustic low-pass filter to remove any harsh digital highs
      const masterFilter = ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.setValueAtTime(1100, now);
      masterFilter.Q.setValueAtTime(1.2, now);
      masterFilter.connect(ctx.destination);

      switch (type) {
        case 'move': {
          // Warm, solid wooden piece clack
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(75, now + 0.04);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

          osc.connect(gain);
          gain.connect(masterFilter);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        case 'capture': {
          // Heavier double wooden knock (piece strike)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(210, now);
          osc1.frequency.exponentialRampToValueAtTime(65, now + 0.05);
          gain1.gain.setValueAtTime(0.2, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc1.connect(gain1);
          gain1.connect(masterFilter);
          osc1.start(now);
          osc1.stop(now + 0.05);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(320, now + 0.015);
          osc2.frequency.exponentialRampToValueAtTime(80, now + 0.06);
          gain2.gain.setValueAtTime(0.16, now + 0.015);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
          osc2.connect(gain2);
          gain2.connect(masterFilter);
          osc2.start(now + 0.015);
          osc2.stop(now + 0.065);
          break;
        }

        case 'check': {
          // Soft tactile wooden knock + gentle hollow acoustic undertone
          // 1. Initial soft wood clack
          const knockOsc = ctx.createOscillator();
          const knockGain = ctx.createGain();
          knockOsc.type = 'triangle';
          knockOsc.frequency.setValueAtTime(240, now);
          knockOsc.frequency.exponentialRampToValueAtTime(90, now + 0.035);
          knockGain.gain.setValueAtTime(0.15, now);
          knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          knockOsc.connect(knockGain);
          knockGain.connect(masterFilter);
          knockOsc.start(now);
          knockOsc.stop(now + 0.04);

          // 2. Warm, mellow acoustic marimba resonance (relaxing, not piercing)
          [261.63, 392.0].forEach((freq, i) => {
            const toneOsc = ctx.createOscillator();
            const toneGain = ctx.createGain();
            toneOsc.type = 'sine';
            toneOsc.frequency.setValueAtTime(freq, now + 0.01);
            toneGain.gain.setValueAtTime(0.09 - i * 0.02, now + 0.01);
            toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            toneOsc.connect(toneGain);
            toneGain.connect(masterFilter);
            toneOsc.start(now + 0.01);
            toneOsc.stop(now + 0.18);
          });
          break;
        }

        case 'castle': {
          // Double acoustic slide-tap (king + rook)
          [0, 0.06].forEach((delay, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(idx === 0 ? 250 : 200, now + delay);
            osc.frequency.exponentialRampToValueAtTime(65, now + delay + 0.045);
            gain.gain.setValueAtTime(0.16, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + delay);
            osc.stop(now + delay + 0.05);
          });
          break;
        }

        case 'promote': {
          // Warm ascending wooden marimba notes
          [261.63, 329.63, 392.0].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.045);
            gain.gain.setValueAtTime(0.1, now + idx * 0.045);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.15);
            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + idx * 0.045);
            osc.stop(now + idx * 0.045 + 0.15);
          });
          break;
        }

        case 'victory': {
          // Peaceful, relaxing acoustic lo-fi chord (warm wooden kalimba / Rhodes feel)
          [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            // Soft 12ms attack, smooth relaxing decay
            gain.gain.setValueAtTime(0.001, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.06 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.38);

            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.38);
          });
          break;
        }

        case 'defeat': {
          // Gentle, soothing minor resolution (calm and quiet, never harsh or loud)
          [329.63, 261.63, 220.0].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.001, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.08 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.4);
          });
          break;
        }

        case 'draw': {
          // Tranquil, ambient acoustic unison
          [293.66, 440.0].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.001, now + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.05 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.32);

            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.32);
          });
          break;
        }

        case 'checkmate':
        case 'chekmate':
        case 'game-end': {
          // Rich, resonant wooden acoustic knock with deep low-end warmth
          // Wooden impact
          const impact = ctx.createOscillator();
          const impactGain = ctx.createGain();
          impact.type = 'triangle';
          impact.frequency.setValueAtTime(220, now);
          impact.frequency.exponentialRampToValueAtTime(60, now + 0.05);
          impactGain.gain.setValueAtTime(0.16, now);
          impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
          impact.connect(impactGain);
          impactGain.connect(masterFilter);
          impact.start(now);
          impact.stop(now + 0.055);

          // Warm lo-fi resonant body
          [130.81, 196.0, 261.63].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now);
            osc.stop(now + 0.4);
          });
          break;
        }

        case 'genericnotify': {
          // Gentle wooden chime notification
          [392.0, 523.25].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.08, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
            osc.connect(gain);
            gain.connect(masterFilter);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.22);
          });
          break;
        }

        case 'error':
        case 'illegal': {
          // Very soft, muffled wooden thud (like a piece tapping the board border)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
          osc.connect(gain);
          gain.connect(masterFilter);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        case 'lowtime': {
          // Soft wooden tick
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.connect(gain);
          gain.connect(masterFilter);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
      }
    } catch {
      // AudioContext blocked or unsupported
    }
  }
}

// Automatically unlock Web Audio on first user interaction and preload downloaded sound files
if (typeof window !== 'undefined') {
  let isUnlocked = false;

  const commonSoundList = [
    'sounds/move.mp3',
    'sounds/capture.mp3',
    'sounds/error.mp3',
    'sounds/genericnotify.mp3',
    'sounds/lowtime.mp3',
  ];

  const preloadCommonSounds = () => {
    commonSoundList.forEach((p) => {
      SoundManager.loadAudioBuffer(getAssetPath(p));
    });
  };

  const unlockAudio = () => {
    if (isUnlocked) return;
    isUnlocked = true;
    SoundManager.initContext();
    preloadCommonSounds();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });

  // Early idle prefetch: fetch sound files into browser network cache without triggering AudioContext autoplay restrictions
  const prefetchNetworkOnly = () => {
    if (isUnlocked) return;
    commonSoundList.forEach((p) => {
      fetch(getAssetPath(p), { cache: 'force-cache' }).catch(() => {});
    });
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(prefetchNetworkOnly);
  } else {
    setTimeout(prefetchNetworkOnly, 300);
  }
}


