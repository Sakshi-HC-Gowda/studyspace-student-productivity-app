/**
 * Unique id generation.
 *
 * `crypto.randomUUID` is available in all modern browsers over HTTPS/localhost;
 * the fallback keeps ids unique on older or non-secure contexts (e.g. a file://
 * preview) by combining a timestamp, a counter and random bits. Ids are unique
 * per call even within the same millisecond.
 */

let counter = 0;

export function createId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  counter = (counter + 1) % 1_000_000;
  const random = Math.floor(Math.random() * 0xffffffff).toString(16);
  return `id-${Date.now().toString(36)}-${counter.toString(36)}-${random}`;
}
