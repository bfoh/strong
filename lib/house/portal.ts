export type Rect = { x: number; y: number; width: number; height: number };
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export function coverRect(imageWidth: number, imageHeight: number, box: Rect, focus = { x: 50, y: 50 }): Rect {
  const scale = Math.max(box.width / imageWidth, box.height / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return { x: box.x + (box.width - width) * focus.x / 100, y: box.y + (box.height - height) * focus.y / 100, width, height };
}
export function portalRect(source: Rect, aperture: Rect, progress: number): Rect {
  const p = ease(progress), scale = Math.exp(Math.log(Math.max(source.width / aperture.width, source.height / aperture.height) * 1.12) * p);
  const pan = ease(progress / .3);
  const cx = aperture.x + aperture.width / 2, cy = aperture.y + aperture.height / 2;
  const tx = Math.max(source.width * (1 - scale), Math.min(0, source.width / 2 - cx * scale + (cx - source.width / 2) * (1 - pan)));
  const ty = Math.max(source.height * (1 - scale), Math.min(0, source.height / 2 - cy * scale + (cy - source.height / 2) * (1 - pan)));
  return { x: aperture.x * scale + tx, y: aperture.y * scale + ty, width: aperture.width * scale, height: aperture.height * scale };
}
export const openings = {
  exterior: { x: .435, y: .429, width: .129, height: .309 },
  listings: { x: .105, y: .184, width: .193, height: .472 },
  team: { x: .405, y: .184, width: .192, height: .472 },
  contact: { x: .714, y: .184, width: .190, height: .472 },
} as const;
