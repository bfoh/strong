import 'server-only';
const windows = new Map<string, { hits: number; until: number }>();
export function consumeRequestLimit(key: string, maximum: number, milliseconds = 600000) {
  const now = Date.now();
  if (windows.size >= 10000) for (const [name, value] of windows) if (value.until <= now) windows.delete(name);
  let window = windows.get(key);
  if (!window || window.until <= now) {
    if (windows.size >= 10000) return false;
    window = { hits: 0, until: now + milliseconds }; windows.set(key, window);
  }
  window.hits += 1; return window.hits <= maximum;
}
