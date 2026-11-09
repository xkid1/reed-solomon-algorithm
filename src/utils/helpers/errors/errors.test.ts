import { describe, expect, it } from 'vitest';

import { ReedSolomonError } from './errors.js';

describe('ReedSolomonError', () => {
  it('retains its machine-readable code and message', () => {
    const error = new ReedSolomonError('INVALID_INPUT', 'bad input');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ReedSolomonError');
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.message).toBe('bad input');
  });

  it('forwards error options such as cause to Error', () => {
    const cause = new TypeError('cause');
    const error = new ReedSolomonError('DECODE_FAILURE', 'decode failed', { cause });

    expect(error.cause).toBe(cause);
    expect(error.code).toBe('DECODE_FAILURE');
  });
});
