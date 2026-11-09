import { ReedSolomonError } from '../errors/errors.js';

/** Parses hex (whitespace, commas and a leading `0x` are ignored). */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[\s,]/g, '').replace(/^0x/i, '');
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(clean)) {
    throw new ReedSolomonError(
      'INVALID_INPUT',
      'hex must contain an even number of hex digits',
    );
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
