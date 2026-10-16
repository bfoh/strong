export type SequenceVariant = {
  width: number; height: number; frameCount: number; fps: number;
  poster: string; frames: string[];
};
export type SequenceManifest = {
  version: 1; id: string; status: 'blocking-preview' | 'production';
  description: string; provenance: string;
  variants: { desktop: SequenceVariant; mobile: SequenceVariant };
};
export function validSequenceManifest(value: unknown): value is SequenceManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as SequenceManifest;
  const local = (s: unknown) => typeof s === 'string' && /^\/cinematic\/[a-zA-Z0-9/_-]+\.(webp|avif|jpg|png)$/.test(s);
  return m.version === 1 && ['blocking-preview', 'production'].includes(m.status) && typeof m.id === 'string' &&
    typeof m.description === 'string' && typeof m.provenance === 'string' &&
    ['desktop', 'mobile'].every(key => {
      const v = m.variants?.[key as keyof typeof m.variants];
      return v && Number.isInteger(v.width) && v.width > 0 && v.width <= 3840 && Number.isInteger(v.height) && v.height > 0 && v.height <= 3840 &&
        Number.isInteger(v.frameCount) && v.frameCount >= 2 && v.frameCount <= 360 && Number.isFinite(v.fps) && v.fps > 0 &&
        local(v.poster) && Array.isArray(v.frames) && v.frames.length === v.frameCount && v.frames.every(local);
    });
}
