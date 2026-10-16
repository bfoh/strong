import type { SequenceVariant } from './manifest';
type Decoded = { source: CanvasImageSource; bytes: number; release: () => void };
type Options = { maxFrames: number; maxBytes: number; onFrame: (index: number) => void; onError: () => void };
export class FrameCache {
  private cache = new Map<number, Decoded>();
  private jobs = new Map<number, AbortController>();
  private pending: number[] = [];
  private desired = 0;
  private disposed = false;
  private active = true;
  private bytes = 0;
  private peakBytes = 0;
  private peakFrames = 0;
  constructor(private variant: SequenceVariant, private options: Options) {}
  get(index: number) { return this.cache.get(index)?.source; }
  stats() { return { cachedFrames: this.cache.size, decodedBytes: this.bytes, peakDecodedBytes: this.peakBytes, peakCachedFrames: this.peakFrames, inFlight: this.jobs.size }; }
  setActive(active: boolean) {
    this.active = active;
    if (!active) { this.pending = []; for (const job of this.jobs.values()) job.abort(); }
    else this.request(this.desired);
  }
  request(index: number) {
    this.desired = index;
    if (this.disposed || !this.active) return;
    const window = [index, index + 1, index - 1, index + 2, index - 2].filter(i => i >= 0 && i < this.variant.frameCount);
    for (const [i, job] of this.jobs) if (!window.includes(i)) job.abort();
    this.pending = window.filter(i => !this.cache.has(i) && !this.jobs.has(i));
    if (this.cache.has(index)) { const frame = this.cache.get(index)!; this.cache.delete(index); this.cache.set(index, frame); this.options.onFrame(index); }
    this.pump();
  }
  private pump() {
    while (!this.disposed && this.active && this.jobs.size < 2 && this.pending.length) {
      const index = this.pending.shift()!;
      if (this.cache.has(index) || this.jobs.has(index)) continue;
      const controller = new AbortController(); this.jobs.set(index, controller);
      void this.load(index, controller);
    }
  }
  private async load(index: number, controller: AbortController) {
    let decoded: Decoded | undefined;
    const timeout = setTimeout(() => controller.abort(new Error('Frame timeout')), 15000);
    try {
      const response = await fetch(this.variant.frames[index], { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Frame unavailable');
      const blob = await response.blob();
      if (blob.size > 2 * 1024 * 1024) throw new Error('Frame exceeds delivery budget');
      if (typeof createImageBitmap === 'function') {
        const image = await createImageBitmap(blob);
        decoded = { source: image, bytes: image.width * image.height * 4, release: () => image.close() };
      } else {
        const url = URL.createObjectURL(blob), image = new Image();
        try { image.src = url; await image.decode(); } catch (error) { URL.revokeObjectURL(url); throw error; }
        decoded = { source: image, bytes: image.naturalWidth * image.naturalHeight * 4, release: () => { image.src = ''; } }; URL.revokeObjectURL(url);
      }
      const image = decoded.source as { width: number; height: number };
      if (image.width !== this.variant.width || image.height !== this.variant.height) throw new Error('Frame dimensions mismatch');
      if (this.disposed || controller.signal.aborted) { decoded.release(); decoded = undefined; return; }
      if (decoded.bytes > this.options.maxBytes) throw new Error('Decoded frame exceeds budget');
      while (this.cache.size && (this.cache.size >= this.options.maxFrames || this.bytes + decoded.bytes > this.options.maxBytes)) {
        const oldest = [...this.cache.keys()].find(i => i !== this.desired) ?? this.cache.keys().next().value!;
        const evicted = this.cache.get(oldest)!; this.bytes -= evicted.bytes; evicted.release(); this.cache.delete(oldest);
      }
      this.cache.set(index, decoded); this.bytes += decoded.bytes; decoded = undefined;
      this.peakBytes = Math.max(this.peakBytes, this.bytes); this.peakFrames = Math.max(this.peakFrames, this.cache.size);
      if (index === this.desired) this.options.onFrame(index);
    } catch {
      decoded?.release();
      if (!this.disposed && index === this.desired && (!controller.signal.aborted || controller.signal.reason instanceof Error && controller.signal.reason.name !== 'AbortError')) this.options.onError();
    } finally { clearTimeout(timeout); this.jobs.delete(index); if (controller.signal.aborted && !this.disposed && this.active && !this.cache.has(this.desired) && !this.jobs.has(this.desired) && !this.pending.includes(this.desired)) this.pending.unshift(this.desired); this.pump(); }
  }
  dispose() {
    this.disposed = true; this.pending = [];
    for (const job of this.jobs.values()) job.abort();
    for (const image of this.cache.values()) image.release();
    this.cache.clear(); this.bytes = 0;
  }
}
