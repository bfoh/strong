export type CameraKnot = { progress: number; position: number[]; target: number[] };
export function frameForProgress(progress: number, count: number) {
  return Math.round(Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * Math.max(0, count - 1));
}
// Time-weighted cubic Hermite interpolation: a shared, continuous position and
// target path for both the blocking renderer and the external Blender export.
export function cameraAt(knots: CameraKnot[], progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  let i = 0;
  while (i < knots.length - 2 && p > knots[i + 1].progress) i++;
  const a = knots[i], b = knots[i + 1], before = knots[Math.max(0, i - 1)], after = knots[Math.min(knots.length - 1, i + 2)];
  const dt = b.progress - a.progress, t = (p - a.progress) / dt;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
  const sample = (key: 'position' | 'target') => a[key].map((value, axis) => {
    const m0 = i === 0 ? 0 : (b[key][axis] - before[key][axis]) / (b.progress - before.progress);
    const m1 = i === knots.length - 2 ? 0 : (after[key][axis] - a[key][axis]) / (after.progress - a.progress);
    return h00 * value + h10 * dt * m0 + h01 * b[key][axis] + h11 * dt * m1;
  });
  return { position: sample('position'), target: sample('target') };
}
