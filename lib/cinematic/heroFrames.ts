// Scroll-scrubbed playback of the supplied 451-frame villa visualisation.
// Decoded bitmaps are bounded (LRU by distance); the full sequence only ever
// lives in the HTTP cache as compressed WebP, warmed coarse-to-fine at low priority.
export const HERO_FRAME_COUNT = 451;
export type HeroVariant = 'desktop' | 'mobile';
export const heroVariants = { desktop: { width: 1280, height: 720 }, mobile: { width: 576, height: 720 } } as const;
export function heroFrameUrl(variant: HeroVariant, index: number) {
  return `/cinematic/hero/${variant}/frame_${String(index + 1).padStart(4, '0')}.webp`;
}
export function heroFrameForProgress(progress: number, count = HERO_FRAME_COUNT, stride = 1) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const index = Math.round(p * (count - 1));
  return stride > 1 ? Math.min(count - 1, Math.round(index / stride) * stride) : index;
}
/** Every `stride`-th frame, ordered coarse-to-fine so a fast scrub always finds a nearby frame. */
export function warmOrder(count = HERO_FRAME_COUNT, stride = 1) {
  const seen = new Set<number>(), order: number[] = [];
  for (let step = 64; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step * stride) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  if (!seen.has(count - 1)) order.push(count - 1);
  return order;
}

type Frame = ImageBitmap | HTMLImageElement;
type Options = { capacity: number; concurrency: number; stride: number; onFrame: (index: number) => void };

export class HeroFrameLoader {
  private frames = new Map<number, Frame>();
  private inflight = new Set<number>();
  private queue: number[] = [];
  private focus = 0;
  private warmQueue: number[] = [];
  private warming = 0;
  private paused = false;
  private abort = new AbortController();
  constructor(private url: (index: number) => string, private count: number, private options: Options) {}

  get(index: number) { return this.frames.get(index); }
  /** Closest decoded frame, so scrubbing past the network never shows a blank canvas. */
  nearest(index: number): { index: number; frame: Frame } | undefined {
    let best: number | undefined;
    for (const key of this.frames.keys()) if (best === undefined || Math.abs(key - index) < Math.abs(best - index)) best = key;
    return best === undefined ? undefined : { index: best, frame: this.frames.get(best)! };
  }
  stats() { return { decoded: this.frames.size, inflight: this.inflight.size, warmRemaining: this.warmQueue.length }; }

  request(index: number, direction: number) {
    this.focus = index;
    const step = this.options.stride * (direction < 0 ? -1 : 1), wanted = [index];
    for (let i = 1; i <= 5; i++) wanted.push(index + step * i);
    wanted.push(index - step, index - step * 2);
    this.queue = wanted.filter(i => i >= 0 && i < this.count && !this.frames.has(i) && !this.inflight.has(i));
    this.pump();
  }
  /** Prime the HTTP cache with the whole sequence without decoding it. */
  warm(order: number[]) { this.warmQueue = order.slice(); this.pumpWarm(); }
  setPaused(paused: boolean) { this.paused = paused; if (!paused) { this.pump(); this.pumpWarm(); } }

  private pump() {
    while (!this.paused && this.inflight.size < this.options.concurrency && this.queue.length) {
      const index = this.queue.shift()!;
      if (!this.frames.has(index) && !this.inflight.has(index)) void this.load(index);
    }
  }
  private pumpWarm() {
    while (!this.paused && this.warming < 2 && this.warmQueue.length) {
      const index = this.warmQueue.shift()!;
      if (this.frames.has(index)) continue;
      this.warming++;
      fetch(this.url(index), { signal: this.abort.signal, priority: 'low' } as RequestInit)
        .then(response => response.ok ? response.blob() : undefined).catch(() => undefined)
        .finally(() => { this.warming--; this.pumpWarm(); });
    }
  }
  private async load(index: number) {
    this.inflight.add(index);
    try {
      const response = await fetch(this.url(index), { signal: this.abort.signal });
      if (!response.ok) return;
      const frame = await decode(await response.blob());
      if (this.abort.signal.aborted) { release(frame); return; }
      this.frames.set(index, frame);
      this.evict();
      this.options.onFrame(index);
    } catch { /* A missing frame falls back to its nearest decoded neighbour. */ }
    finally { this.inflight.delete(index); this.pump(); }
  }
  private evict() {
    while (this.frames.size > this.options.capacity) {
      let far = -1;
      for (const key of this.frames.keys()) if (far < 0 || Math.abs(key - this.focus) > Math.abs(far - this.focus)) far = key;
      release(this.frames.get(far)!); this.frames.delete(far);
    }
  }
  dispose() {
    this.abort.abort(); this.queue = []; this.warmQueue = [];
    for (const frame of this.frames.values()) release(frame);
    this.frames.clear();
  }
}

async function decode(blob: Blob): Promise<Frame> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const url = URL.createObjectURL(blob), image = new Image();
  try { image.src = url; await image.decode(); return image; } finally { URL.revokeObjectURL(url); }
}
function release(frame: Frame) { if ('close' in frame) frame.close(); else frame.src = ''; }
