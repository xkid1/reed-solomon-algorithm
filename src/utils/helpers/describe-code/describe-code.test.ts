import { describe, expect, it, vi } from 'vitest';

import * as utilities from '../../index.js';
import { ReedSolomonError } from '../errors/errors.js';

import { describeCode } from './describe-code.js';

vi.mock('@libs', () => ({ MAX_CODEWORD_LENGTH: 255 }));

describe('describeCode', () => {
  it('re-exports utility APIs from the utility barrel', () => {
    expect(utilities.bytesToHex(Uint8Array.from([0, 255]))).toBe('00ff');
    expect([...utilities.hexToBytes('a1')]).toEqual([0xa1]);
    expect(utilities.describeCode(10, 8).parityBytes).toBe(2);
    expect(utilities.getField()).toBeInstanceOf(utilities.GaloisField);
    expect(utilities.ReedSolomonError).toBe(ReedSolomonError);
    expect(utilities.DEFAULT_PRIMITIVE_POLYNOMIAL).toBe(0x11d);
    expect(utilities.Logger).toBeDefined();
  });

  it('describes an RS(255, 223) code exactly', () => {
    expect(describeCode(255, 223)).toEqual({
      n: 255,
      k: 223,
      parityBytes: 32,
      minDistance: 33,
      maxErrors: 16,
      maxErasures: 32,
      rate: 223 / 255,
      overheadPercent: (100 * 32) / 223,
      shortened: false,
    });
  });

  it('describes a shortened code and odd parity capacity', () => {
    expect(describeCode(12, 7)).toEqual({
      n: 12,
      k: 7,
      parityBytes: 5,
      minDistance: 6,
      maxErrors: 2,
      maxErasures: 5,
      rate: 7 / 12,
      overheadPercent: (100 * 5) / 7,
      shortened: true,
    });
  });

  it('rejects invalid dimensions', () => {
    const invalidDimensions: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [9, 10],
      [256, 1],
      [10.5, 2],
      [Number.NaN, 1],
    ];
    for (const [n, k] of invalidDimensions) {
      expect(() => describeCode(n, k)).toThrow(ReedSolomonError);
    }
  });
});
