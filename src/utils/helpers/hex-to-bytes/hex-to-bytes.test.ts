import { describe, expect, it } from 'vitest';

import { ReedSolomonError } from '../errors/errors.js';

import { hexToBytes } from './hex-to-bytes.js';

describe('hexToBytes', () => {
  it('parses prefixed, separated, and mixed-case hexadecimal bytes', () => {
    expect([...hexToBytes('  0x00, 0a\nFf  ')]).toEqual([0, 10, 255]);
    expect([...hexToBytes('0Xcafe')]).toEqual([0xca, 0xfe]);
  });

  it('accepts empty input and a prefix with no digits', () => {
    expect([...hexToBytes('')]).toEqual([]);
    expect([...hexToBytes('0x')]).toEqual([]);
  });

  it('rejects odd-length and non-hex input', () => {
    for (const input of ['0', 'abc', '0x1g', '12-34']) {
      expect(() => hexToBytes(input)).toThrow(ReedSolomonError);
    }
  });
});
