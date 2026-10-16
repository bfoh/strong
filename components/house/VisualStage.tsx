'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { photo, type HouseSettings, type HouseView, type Room } from '@/lib/house/config';
import { clamp, coverRect, ease, openings, portalRect, type Rect } from '@/lib/house/portal';
export type VisualHandle = { scene: (view: HouseView) => void; arrival: (p: number) => void; door: (room: Room, p: number) => void; ready: () => boolean };
type Command = { type: 'scene'; view: HouseView } | { type: 'arrival'; p: number } | { type: 'door'; room: Room; p: number };
const rooms: Room[] = ['listings', 'team', 'contact'];
const VisualStage = forwardRef<VisualHandle, { settings: HouseSettings; enabled: boolean; onFailure: () => void }>(({ settings, enabled, onFailure }, ref) => {
  const canvas = useRef<HTMLCanvasElement>(null), images = useRef<Record<string, HTMLImageElement>>({}), last = useRef<Command>({ type: 'scene', view: 'exterior' });
  const paint = useRef<(command: Command) => void>(() => {}), loaded = useRef(false);
  const [ready, setReady] = useState(false);
  useImperativeHandle(ref, () => ({
    scene: view => { last.current = { type: 'scene', view }; paint.current(last.current); },
    arrival: p => { last.current = { type: 'arrival', p }; paint.current(last.current); },
    door: (room, p) => { last.current = { type: 'door', room, p }; paint.current(last.current); },
    ready: () => loaded.current,
  }), []);
  useEffect(() => {
    const el = canvas.current;
    if (!enabled || !el) { loaded.current = false; return; }
    const ctx = el.getContext('2d', { alpha: false }); if (!ctx) { onFailure(); return; }
    let disposed = false;
    const pendingImages: HTMLImageElement[] = [];
    const drawImage = (key: string, rect: Rect) => {
      const img = images.current[key]; if (!img) return;
      const target = coverRect(img.naturalWidth, img.naturalHeight, rect, settings.focus[key as keyof HouseSettings['focus']]);
      ctx.drawImage(img, target.x, target.y, target.width, target.height);
    };
    const aperture = (key: keyof typeof openings, bounds: Rect): Rect => {
      const img = images.current[key === 'exterior' ? 'exterior' : 'hallway'];
      const fitted = coverRect(img?.naturalWidth || 1672, img?.naturalHeight || 941, bounds, settings.focus[key === 'exterior' ? 'exterior' : 'hallway']), d = openings[key];
      return { x: fitted.x + d.x * fitted.width, y: fitted.y + d.y * fitted.height, width: d.width * fitted.width, height: d.height * fitted.height };
    };
    const hallway = (bounds: Rect) => {
      drawImage('hallway', bounds);
      for (const room of rooms) {
        const opening = aperture(room, bounds);
        ctx.save(); ctx.beginPath(); ctx.rect(opening.x, opening.y, opening.width, opening.height); ctx.clip();
        drawImage(room, opening); ctx.restore();
      }
    };
    const drawScene = (key: string, bounds: Rect) => key === 'hallway' ? hallway(bounds) : drawImage(key, bounds);
    const portal = (source: 'exterior' | 'hallway', room: 'hallway' | Room, p: number, box: Rect) => {
      const key = source === 'exterior' ? 'exterior' : room as Room;
      const hole = aperture(key, box), crossing = clamp(p / .78), projected = portalRect(box, hole, crossing);
      const settle = ease((p - .78) / .22);
      // The destination is present through the opening from the beginning.
      // Once the jamb clears the viewport, its full photograph gently settles into view.
      const destination = {
        x: projected.x * (1 - settle), y: projected.y * (1 - settle),
        width: projected.width + (box.width - projected.width) * settle,
        height: projected.height + (box.height - projected.height) * settle,
      };
      {
        const extra = 1 + (settings.motion.arrivalZoom - 1) * ease(p / .78) * (1 - settle);
        destination.x -= destination.width * (extra - 1) / 2;
        destination.y -= destination.height * (extra - 1) / 2;
        destination.width *= extra; destination.height *= extra;
      }
      drawScene(room, destination);
      if (p >= .78) return;
      const scale = projected.width / hole.width;
      const tx = projected.x - hole.x * scale, ty = projected.y - hole.y * scale;
      ctx.save(); ctx.translate(tx, ty); ctx.scale(scale, scale);
      ctx.beginPath(); ctx.rect(-box.width * 20, -box.height * 20, box.width * 40, box.height * 40); ctx.rect(hole.x, hole.y, hole.width, hole.height); ctx.clip('evenodd');
      drawScene(source, box);
      ctx.restore();
    };
    const render = (command: Command) => {
      if (!loaded.current || disposed) return;
      const bounds = el.getBoundingClientRect(), w = bounds.width, h = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#30261f'; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingQuality = 'high';
      const box = { x: 0, y: 0, width: w, height: h };
      if (command.type === 'arrival') portal('exterior', 'hallway', clamp(command.p / .94), box);
      else if (command.type === 'door') portal('hallway', command.room, command.p, box);
      else drawScene(command.view === 'property' ? 'listings' : command.view, box);
      for (const room of rooms) {
        const d = aperture(room, box);
        el.parentElement?.style.setProperty('--door-' + room + '-x', ((d.x + d.width / 2) / w * 100) + '%');
        el.parentElement?.style.setProperty('--door-' + room + '-y', Math.min(87, (d.y + d.height) / h * 100 + 8) + '%');
      }
      el.dataset.command = command.type;
      el.dataset.progress = command.type === 'scene' ? '1' : command.p.toFixed(4);
    };
    paint.current = render;
    const load = async () => {
      try {
        const entries = await Promise.all(Object.entries(settings.images).map(async ([key, name]) => {
          const img = new Image(); pendingImages.push(img); img.decoding = 'async'; img.src = photo(name);
          await img.decode(); return [key, img] as const;
        }));
        if (disposed) return;
        images.current = Object.fromEntries(entries); loaded.current = true; setReady(true); render(last.current);
      } catch { if (!disposed) { loaded.current = false; setReady(false); onFailure(); } }
    };
    void load();
    const resize = new ResizeObserver(() => render(last.current)); resize.observe(el);
    return () => { disposed = true; loaded.current = false; images.current = {}; pendingImages.forEach(img => { img.src = ''; }); resize.disconnect(); paint.current = () => {}; };
  }, [settings, enabled, onFailure]);
  return <canvas ref={canvas} className={ready && enabled ? 'house-canvas is-ready' : 'house-canvas'} aria-hidden="true"/>;
});
VisualStage.displayName = 'VisualStage';
export default VisualStage;
