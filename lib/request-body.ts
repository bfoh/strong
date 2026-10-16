import 'server-only';

export class BodyTooLargeError extends Error {}

// Enforce the limit while reading, including chunked requests without Content-Length.
export async function boundedBody(req: Request, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(req.headers.get('content-length')) > maximum) throw new BodyTooLargeError();
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new BodyTooLargeError(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
