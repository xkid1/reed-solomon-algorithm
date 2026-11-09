/** Machine-readable reason carried by every {@link ReedSolomonError}. */
import type { ReedSolomonErrorCode } from '../../../types/errors/errors.js';

/** The only error type thrown by this library. Branch on {@link ReedSolomonError.code}. */
export class ReedSolomonError extends Error {
  readonly code: ReedSolomonErrorCode;

  constructor(code: ReedSolomonErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ReedSolomonError';
    this.code = code;
  }
}
