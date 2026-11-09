import {
  DEFAULT_PRIMITIVE_POLYNOMIAL,
  getField,
  type GaloisField,
} from '../../utils/galois-field/galois-field.js';
import { ReedSolomonError } from '../../utils/helpers/errors/errors.js';

import type {
  Correction,
  DecodeOptions,
  DecodeResult,
  Polynomial,
  ReedSolomonOptions,
} from '../../types/reed-solomon/reed-solomon.js';

/** Longest codeword (data + parity) possible over GF(256). */
export const MAX_CODEWORD_LENGTH = 255;

/**
 * Systematic Reed-Solomon codec over GF(2^8).
 *
 * With `parityBytes = p`, a codeword corrects `e` unknown errors and `s` erasures whenever
 * `2e + s <= p`.
 *
 * ```ts
 * const rs = new ReedSolomon(10);
 * const codeword = rs.encode(new TextEncoder().encode('hello'));
 * codeword[0] ^= 0xff; // corrupt
 * const { message } = rs.decode(codeword);
 * ```
 */
export class ReedSolomon {
  readonly parityBytes: number;
  readonly firstRoot: number;
  readonly field: GaloisField;
  readonly #generator: Polynomial;

  /** @param parityBytes Number of parity bytes, 1..254. */
  constructor(parityBytes: number, options: ReedSolomonOptions = {}) {
    const { primitivePolynomial = DEFAULT_PRIMITIVE_POLYNOMIAL, firstRoot = 0 } = options;
    if (
      !Number.isInteger(parityBytes) ||
      parityBytes < 1 ||
      parityBytes > MAX_CODEWORD_LENGTH - 1
    ) {
      throw new ReedSolomonError(
        'INVALID_PARAMETER',
        'parityBytes must be an integer between 1 and 254',
      );
    }
    if (
      !Number.isInteger(firstRoot) ||
      firstRoot < 0 ||
      firstRoot >= MAX_CODEWORD_LENGTH
    ) {
      throw new ReedSolomonError(
        'INVALID_PARAMETER',
        'firstRoot must be an integer between 0 and 254',
      );
    }
    this.parityBytes = parityBytes;
    this.firstRoot = firstRoot;
    this.field = getField(primitivePolynomial);

    let generator: Polynomial = [1];
    for (let i = 0; i < parityBytes; i++) {
      generator = this.field.polyMul(generator, [1, this.field.exp(firstRoot + i)]);
    }
    this.#generator = generator;
  }

  /** Most unknown-position errors a codeword can correct. */
  get maxErrors(): number {
    return Math.floor(this.parityBytes / 2);
  }

  /** Most known-position erasures a codeword can correct. */
  get maxErasures(): number {
    return this.parityBytes;
  }

  /** Longest data block that can be encoded with this many parity bytes. */
  get maxDataBytes(): number {
    return MAX_CODEWORD_LENGTH - this.parityBytes;
  }

  /** Generator polynomial coefficients, highest degree first (a copy). */
  get generatorPolynomial(): Uint8Array {
    return Uint8Array.from(this.#generator);
  }

  /** Returns `data` followed by `parityBytes` parity bytes. The input is not modified. */
  encode(data: Uint8Array): Uint8Array {
    if (!(data instanceof Uint8Array)) {
      throw new ReedSolomonError('INVALID_INPUT', 'data must be a Uint8Array');
    }
    if (data.length < 1 || data.length > this.maxDataBytes) {
      throw new ReedSolomonError(
        'INVALID_INPUT',
        `data length must be between 1 and ${String(this.maxDataBytes)} bytes for ${String(this.parityBytes)} parity bytes`,
      );
    }
    const gen = this.#generator;
    const out = new Uint8Array(data.length + this.parityBytes);
    out.set(data);
    for (let i = 0; i < data.length; i++) {
      const coef = out[i] ?? 0;
      if (coef !== 0) {
        for (let j = 1; j < gen.length; j++) {
          out[i + j] = (out[i + j] ?? 0) ^ this.field.mul(gen[j] ?? 0, coef);
        }
      }
    }
    out.set(data); // long division scrambled the data part; the remainder is the parity
    return out;
  }

  /** Returns only the parity bytes for `data`. */
  computeParity(data: Uint8Array): Uint8Array {
    return this.encode(data).slice(data.length);
  }

  /** The `parityBytes` syndromes of a received word. All zero means it is a valid codeword. */
  syndromes(codeword: Uint8Array): Uint8Array {
    this.#assertCodeword(codeword);
    return Uint8Array.from(this.#syndromes(codeword));
  }

  /** `true` if `codeword` has all-zero syndromes (no detectable corruption). */
  isValid(codeword: Uint8Array): boolean {
    return this.syndromes(codeword).every((s) => s === 0);
  }

  /**
   * Corrects errors (unknown positions) and erasures (known positions).
   *
   * @throws {ReedSolomonError} `TOO_MANY_ERRORS` or `DECODE_FAILURE` when the word cannot be
   *   corrected. Beyond the correction capacity a decoder can also silently return a different
   *   valid codeword; add an outer checksum if you need to rule that out.
   */
  decode(codeword: Uint8Array, options: DecodeOptions = {}): DecodeResult {
    this.#assertCodeword(codeword);
    const n = codeword.length;
    const erasures = this.#normalizeErasures(options.erasures ?? [], n);
    if (erasures.length > this.parityBytes) {
      throw new ReedSolomonError(
        'TOO_MANY_ERRORS',
        `${String(erasures.length)} erasures exceed the ${String(this.parityBytes)} parity bytes`,
      );
    }

    const work = Array.from(codeword);
    for (const p of erasures) work[p] = 0;

    const synd = this.#paddedSyndromes(work);
    let fixed = work;
    let errorPositions: number[] = [];

    if (synd.some((s) => s !== 0)) {
      const forney = this.#forneySyndromes(synd, erasures, n);
      const locator = this.#errorLocator(forney, erasures.length);
      errorPositions = this.#findErrors([...locator].reverse(), n);
      const erased = new Set(erasures);
      if (errorPositions.some((p) => erased.has(p))) {
        throw new ReedSolomonError(
          'DECODE_FAILURE',
          'error locator collided with an erasure',
        );
      }
      fixed = this.#correctErrata(work, synd, [...erasures, ...errorPositions]);
      if (this.#paddedSyndromes(fixed).some((s) => s !== 0)) {
        throw new ReedSolomonError(
          'DECODE_FAILURE',
          'residual syndromes are non-zero after correction',
        );
      }
    }

    const corrected = Uint8Array.from(fixed);
    const toCorrection =
      (kind: Correction['kind']) =>
      (position: number): Correction => ({
        position,
        magnitude: (codeword[position] ?? 0) ^ (corrected[position] ?? 0),
        kind,
      });
    const corrections = [
      ...erasures.map(toCorrection('erasure')),
      ...errorPositions.map(toCorrection('error')),
    ].sort((a, b) => a.position - b.position);

    return {
      message: corrected.slice(0, n - this.parityBytes),
      codeword: corrected,
      corrections,
      errors: errorPositions.length,
      erasures: erasures.length,
    };
  }

  // ---- internals -------------------------------------------------------------------------

  #assertCodeword(codeword: Uint8Array): void {
    if (!(codeword instanceof Uint8Array)) {
      throw new ReedSolomonError('INVALID_INPUT', 'codeword must be a Uint8Array');
    }
    if (codeword.length <= this.parityBytes || codeword.length > MAX_CODEWORD_LENGTH) {
      throw new ReedSolomonError(
        'INVALID_INPUT',
        `codeword length must be between ${String(this.parityBytes + 1)} and ${String(MAX_CODEWORD_LENGTH)} bytes`,
      );
    }
  }

  #normalizeErasures(erasures: readonly number[], n: number): number[] {
    const seen = new Set<number>();
    for (const p of erasures) {
      if (!Number.isInteger(p) || p < 0 || p >= n) {
        throw new ReedSolomonError(
          'INVALID_INPUT',
          `erasure position ${String(p)} is outside 0..${String(n - 1)}`,
        );
      }
      if (seen.has(p)) {
        throw new ReedSolomonError(
          'INVALID_INPUT',
          `erasure position ${String(p)} is listed twice`,
        );
      }
      seen.add(p);
    }
    return [...erasures];
  }

  #syndromes(word: ArrayLike<number>): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.parityBytes; i++) {
      out.push(this.field.polyEval(word, this.field.exp(this.firstRoot + i)));
    }
    return out;
  }

  /** Syndromes with a leading 0, the layout the evaluator step expects. */
  #paddedSyndromes(word: ArrayLike<number>): number[] {
    return [0, ...this.#syndromes(word)];
  }

  /** Syndromes with the erasure contribution removed (modified Forney syndromes). */
  #forneySyndromes(
    padded: readonly number[],
    erasures: readonly number[],
    n: number,
  ): number[] {
    const f = this.field;
    const out = padded.slice(1);
    for (const pos of erasures) {
      const x = f.exp(n - 1 - pos);
      for (let j = 0; j < out.length - 1; j++)
        out[j] = f.mul(out[j] ?? 0, x) ^ (out[j + 1] ?? 0);
    }
    return out;
  }

  /** Berlekamp-Massey. `synd` has `parityBytes` entries (no leading pad). */
  #errorLocator(synd: readonly number[], erasureCount: number): Polynomial {
    const f = this.field;
    let errLoc: Polynomial = [1];
    let oldLoc: Polynomial = [1];
    for (let i = 0; i < this.parityBytes - erasureCount; i++) {
      let delta = synd[i] ?? 0;
      for (let j = 1; j < errLoc.length; j++) {
        delta ^= f.mul(errLoc[errLoc.length - 1 - j] ?? 0, synd[i - j] ?? 0);
      }
      oldLoc = [...oldLoc, 0];
      if (delta !== 0) {
        if (oldLoc.length > errLoc.length) {
          const next = f.polyScale(oldLoc, delta);
          oldLoc = f.polyScale(errLoc, f.inverse(delta));
          errLoc = next;
        }
        errLoc = f.polyAdd(errLoc, f.polyScale(oldLoc, delta));
      }
    }
    while (errLoc.length > 1 && errLoc[0] === 0) errLoc.shift();
    const errors = errLoc.length - 1;
    if (2 * errors + erasureCount > this.parityBytes) {
      throw new ReedSolomonError(
        'TOO_MANY_ERRORS',
        `locator degree ${String(errors)} with ${String(erasureCount)} erasures exceeds the ${String(this.parityBytes)} parity bytes`,
      );
    }
    return errLoc;
  }

  /** Chien search. `locatorReversed` is the locator with lowest degree first. */
  #findErrors(locatorReversed: readonly number[], n: number): number[] {
    const wanted = locatorReversed.length - 1;
    const positions: number[] = [];
    for (let i = 0; i < n; i++) {
      if (this.field.polyEval(locatorReversed, this.field.exp(i)) === 0)
        positions.push(n - 1 - i);
    }
    if (positions.length !== wanted) {
      throw new ReedSolomonError(
        'DECODE_FAILURE',
        'could not locate all errors (too many errors)',
      );
    }
    return positions;
  }

  /** Forney algorithm: returns a corrected copy of `word`. */
  #correctErrata(
    word: readonly number[],
    padded: readonly number[],
    positions: readonly number[],
  ): number[] {
    const f = this.field;
    const n = word.length;
    const coefPos = positions.map((p) => n - 1 - p);

    let locator: Polynomial = [1];
    for (const c of coefPos) locator = f.polyMul(locator, [f.exp(c), 1]);

    const product = f.polyMul([...padded].reverse(), locator);
    const evaluator =
      product.length > locator.length
        ? product.slice(product.length - locator.length)
        : product;

    const xs = coefPos.map((c) => f.exp(c));
    const out = [...word];
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i] ?? 0;
      const xiInv = f.inverse(xi);
      let prime = 1;
      for (let j = 0; j < xs.length; j++) {
        if (j !== i) prime = f.mul(prime, 1 ^ f.mul(xiInv, xs[j] ?? 0));
      }
      const y = f.mul(f.pow(xi, 1 - this.firstRoot), f.polyEval(evaluator, xiInv));
      const position = positions[i] ?? 0;
      out[position] = (out[position] ?? 0) ^ f.div(y, prime);
    }
    return out;
  }
}
