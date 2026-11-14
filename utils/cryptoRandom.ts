/**
 * Cryptographically strong pseudo-random number utilities backed by Web Crypto API.
 * Compatible with modern browsers and Node.js runtimes.
 */

const UINT32_RANGE = 0x100000000;

/**
 * Returns a cryptographically random floating-point number in [0, 1).
 */
export function cryptoRandomFloat(): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] / UINT32_RANGE;
}

/**
 * Returns a cryptographically random integer in [0, maxExclusive).
 */
export function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || !Number.isFinite(maxExclusive)) {
    return 0;
  }
  return Math.floor(cryptoRandomFloat() * maxExclusive);
}

/**
 * Generates an RFC 4122 version 4 UUID using Web Crypto API.
 */
export function cryptoRandomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
