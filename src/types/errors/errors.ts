export type ReedSolomonErrorCode =
  /** A constructor or option value is out of range. */
  | 'INVALID_PARAMETER'
  /** Data, codeword or erasure positions passed to a method are invalid. */
  | 'INVALID_INPUT'
  /** More errors/erasures than the parity bytes can correct. */
  | 'TOO_MANY_ERRORS'
  /** The decoder could not produce a valid codeword. */
  | 'DECODE_FAILURE';
