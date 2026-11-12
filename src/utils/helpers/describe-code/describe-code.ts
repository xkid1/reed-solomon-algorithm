import { MAX_CODEWORD_LENGTH } from '../../../libs/index.js';
import { ReedSolomonError } from '../errors/errors.js';

import type { CodeDescription } from '../../../types/reed-solomon/reed-solomon.js';

/** Capacity of an RS(n, k) code over GF(256). */
export function describeCode(n: number, k: number): CodeDescription {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(k) ||
    k < 1 ||
    k >= n ||
    n > MAX_CODEWORD_LENGTH
  ) {
    throw new ReedSolomonError(
      'INVALID_PARAMETER',
      'require integers with 0 < k < n <= 255',
    );
  }
  const parityBytes = n - k;
  return {
    n,
    k,
    parityBytes,
    minDistance: parityBytes + 1,
    maxErrors: Math.floor(parityBytes / 2),
    maxErasures: parityBytes,
    rate: k / n,
    overheadPercent: (100 * parityBytes) / k,
    shortened: n < MAX_CODEWORD_LENGTH,
  };
}
