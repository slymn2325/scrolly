export function secureRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

export function secureRandomInt(max: number): number {
  return Math.floor(secureRandom() * max);
}

export function secureId(): string {
  return globalThis.crypto.randomUUID();
}
