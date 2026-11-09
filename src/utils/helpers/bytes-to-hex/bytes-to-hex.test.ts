import { describe, expect, it } from 'vitest';

import { bytesToHex } from './bytes-to-hex.js';

describe('bytesToHex', () => {
  it('returns lowercase, two-digit hex for every byte without mutating input', () => {
    const bytes = Uint8Array.from([0, 1, 15, 16, 127, 128, 255]);
    const original = Uint8Array.from(bytes);

    expect(bytesToHex(bytes)).toBe('00010f107f80ff');
    expect([...bytes]).toEqual([...original]);
  });

  it('returns an empty string for an empty byte array', () => {
    expect(bytesToHex(new Uint8Array())).toBe('');
  });
});
