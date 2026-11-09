export interface ReedSolomonOptions {
  /** Primitive polynomial of GF(2^8). Default `0x11d`. */
  primitivePolynomial?: number;
  /** Exponent of the first generator root: roots are alpha^firstRoot ... alpha^(firstRoot+parity-1). Default `0`. */
  firstRoot?: number;
}

export interface DecodeOptions {
  /** 0-based positions in the codeword that are known to be unreliable (lost or flagged). */
  erasures?: readonly number[];
}

export interface Correction {
  /** 0-based position in the codeword. */
  position: number;
  /** XOR difference between the received byte and the corrected byte. */
  magnitude: number;
  /** `erasure` if the caller flagged the position, `error` if the decoder located it. */
  kind: 'error' | 'erasure';
}

export interface DecodeResult {
  /** The recovered data (codeword without parity). */
  message: Uint8Array;
  /** The full corrected codeword. */
  codeword: Uint8Array;
  /** Every corrected position, sorted by position. */
  corrections: Correction[];
  /** Number of errors the decoder had to locate. */
  errors: number;
  /** Number of erasures the caller supplied. */
  erasures: number;
}

export interface CodeDescription {
  /** Codeword length. */
  n: number;
  /** Data length. */
  k: number;
  parityBytes: number;
  /** Minimum Hamming distance, `n - k + 1`. */
  minDistance: number;
  /** Unknown-position errors correctable. */
  maxErrors: number;
  /** Known-position erasures correctable. */
  maxErasures: number;
  /** `k / n`. */
  rate: number;
  /** Parity as a percentage of data, `100 * (n - k) / k`. */
  overheadPercent: number;
  /** Shortened code (`n < 255`). */
  shortened: boolean;
}

/** Polynomial coefficients, highest degree first. */
export type Polynomial = number[];
