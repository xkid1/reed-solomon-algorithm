import { ReedSolomonError } from '../helpers/errors/errors.js';

import type { Polynomial } from '../../types/reed-solomon/reed-solomon.js';

/** x^8 + x^4 + x^3 + x^2 + 1, the polynomial used by QR codes, CDs and most RS libraries. */
export const DEFAULT_PRIMITIVE_POLYNOMIAL = 0x11d;

/** Order of the multiplicative group of GF(2^8). */
const GROUP_ORDER = 255;

/**
 * Arithmetic in GF(2^8) with generator alpha = 2.
 *
 * Elements are bytes (0..255). Addition and subtraction are both XOR.
 * Methods do not range-check byte arguments for speed; pass values in 0..255.
 */
export class GaloisField {
  readonly primitivePolynomial: number;
  readonly #exp = new Uint8Array(512);
  readonly #log = new Uint8Array(256);

  /**
   * @param primitivePolynomial A degree-8 polynomial (0x100..0x1ff) for which alpha = 2 is a
   *   primitive element. Throws if it is not.
   */
  constructor(primitivePolynomial: number = DEFAULT_PRIMITIVE_POLYNOMIAL) {
    if (
      !Number.isInteger(primitivePolynomial) ||
      primitivePolynomial < 0x100 ||
      primitivePolynomial > 0x1ff
    ) {
      throw new ReedSolomonError(
        'INVALID_PARAMETER',
        'primitivePolynomial must be an integer between 0x100 and 0x1ff',
      );
    }
    this.primitivePolynomial = primitivePolynomial;

    const seen = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < GROUP_ORDER; i++) {
      if (seen[x] === 1) throw notPrimitive(primitivePolynomial);
      seen[x] = 1;
      this.#exp[i] = x;
      this.#log[x] = i;
      x <<= 1;
      if ((x & 0x100) !== 0) x ^= primitivePolynomial;
    }
    if (x !== 1) throw notPrimitive(primitivePolynomial);
    // Doubled table so mul() needs no modulo.
    for (let i = GROUP_ORDER; i < 512; i++)
      this.#exp[i] = this.#exp[i - GROUP_ORDER] ?? 0;
  }

  add(a: number, b: number): number {
    return a ^ b;
  }

  mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.#exp[(this.#log[a] ?? 0) + (this.#log[b] ?? 0)] ?? 0;
  }

  div(a: number, b: number): number {
    if (b === 0)
      throw new ReedSolomonError('INVALID_INPUT', 'division by zero in GF(256)');
    if (a === 0) return 0;
    return (
      this.#exp[
        ((this.#log[a] ?? 0) + GROUP_ORDER - (this.#log[b] ?? 0)) % GROUP_ORDER
      ] ?? 0
    );
  }

  inverse(a: number): number {
    if (a === 0)
      throw new ReedSolomonError('INVALID_INPUT', 'zero has no multiplicative inverse');
    return this.#exp[GROUP_ORDER - (this.#log[a] ?? 0)] ?? 0;
  }

  /** `a` raised to an integer power. Negative exponents are allowed for non-zero `a`. */
  pow(a: number, n: number): number {
    if (n === 0) return 1;
    if (a === 0) {
      if (n < 0)
        throw new ReedSolomonError(
          'INVALID_INPUT',
          '0 cannot be raised to a negative power',
        );
      return 0;
    }
    const e = ((((this.#log[a] ?? 0) * n) % GROUP_ORDER) + GROUP_ORDER) % GROUP_ORDER;
    return this.#exp[e] ?? 0;
  }

  /** alpha^i, for any integer i (reduced modulo 255). */
  exp(i: number): number {
    return this.#exp[((i % GROUP_ORDER) + GROUP_ORDER) % GROUP_ORDER] ?? 0;
  }

  /** Discrete logarithm base alpha. Throws for 0. */
  log(a: number): number {
    if (a === 0) throw new ReedSolomonError('INVALID_INPUT', 'log of zero is undefined');
    return this.#log[a] ?? 0;
  }

  polyScale(p: readonly number[], x: number): Polynomial {
    return p.map((c) => this.mul(c, x));
  }

  polyAdd(p: readonly number[], q: readonly number[]): Polynomial {
    const n = Math.max(p.length, q.length);
    const out = new Array<number>(n).fill(0);
    for (let i = 0; i < p.length; i++) out[n - p.length + i] = p[i] ?? 0;
    for (let i = 0; i < q.length; i++)
      out[n - q.length + i] = (out[n - q.length + i] ?? 0) ^ (q[i] ?? 0);
    return out;
  }

  polyMul(p: readonly number[], q: readonly number[]): Polynomial {
    const out = new Array<number>(p.length + q.length - 1).fill(0);
    for (let j = 0; j < q.length; j++) {
      const qj = q[j] ?? 0;
      for (let i = 0; i < p.length; i++)
        out[i + j] = (out[i + j] ?? 0) ^ this.mul(p[i] ?? 0, qj);
    }
    return out;
  }

  /** Horner evaluation of a highest-degree-first polynomial at `x`. */
  polyEval(p: ArrayLike<number>, x: number): number {
    let y = p.length === 0 ? 0 : p[0];
    for (let i = 1; i < p.length; i++) y = this.mul(y, x) ^ (p[i] ?? 0);
    return y;
  }
}

function notPrimitive(poly: number): ReedSolomonError {
  return new ReedSolomonError(
    'INVALID_PARAMETER',
    `0x${poly.toString(16)} is not primitive for alpha = 2 (the powers of 2 do not cover all 255 non-zero elements)`,
  );
}

const fields = new Map<number, GaloisField>();

/** Returns a cached field for the polynomial; tables are built once per polynomial. */
export function getField(
  primitivePolynomial: number = DEFAULT_PRIMITIVE_POLYNOMIAL,
): GaloisField {
  let field = fields.get(primitivePolynomial);
  if (field === undefined) {
    field = new GaloisField(primitivePolynomial);
    fields.set(primitivePolynomial, field);
  }
  return field;
}
