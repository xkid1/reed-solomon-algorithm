import { describe, expect, it } from 'vitest';

import { ReedSolomonError } from '../helpers/errors/errors.js';

import { DEFAULT_PRIMITIVE_POLYNOMIAL, GaloisField, getField } from './galois-field.js';

describe('GaloisField', () => {
  it('builds the default field tables and wraps exponents modulo 255', () => {
    const field = new GaloisField();

    expect(field.primitivePolynomial).toBe(DEFAULT_PRIMITIVE_POLYNOMIAL);
    expect(field.exp(0)).toBe(1);
    expect(field.exp(8)).toBe(0x1d);
    expect(field.exp(255)).toBe(1);
    expect(field.exp(-1)).toBe(field.exp(254));

    for (let exponent = 0; exponent < 255; exponent++) {
      expect(field.log(field.exp(exponent))).toBe(exponent);
    }
  });

  it('implements multiplicative inverses, division, and powers for every nonzero byte', () => {
    const field = new GaloisField();

    for (let value = 1; value < 256; value++) {
      const inverse = field.inverse(value);
      expect(field.mul(value, inverse)).toBe(1);
      expect(field.div(value, value)).toBe(1);
      expect(field.pow(value, 255)).toBe(1);
      expect(field.pow(value, -1)).toBe(inverse);
    }

    expect(field.add(0x53, 0xca)).toBe(0x99);
    expect(field.mul(0, 0xa5)).toBe(0);
    expect(field.div(0, 0xa5)).toBe(0);
    expect(field.pow(0, 0)).toBe(1);
    expect(field.pow(0, 3)).toBe(0);
  });

  it('adds, scales, multiplies, and evaluates highest-degree-first polynomials', () => {
    const field = new GaloisField();
    const sparsePolynomial: number[] = [];
    sparsePolynomial.length = 3;
    sparsePolynomial[2] = 3;
    const sparseAddend: number[] = [];
    sparseAddend.length = 2;
    sparseAddend[1] = 5;
    const sparseFactor: number[] = [];
    sparseFactor.length = 2;
    sparseFactor[1] = 2;
    const sparseEvaluation: number[] = [];
    sparseEvaluation.length = 3;
    sparseEvaluation[0] = 1;
    sparseEvaluation[2] = 3;

    expect(field.polyScale([1, 2, 3], 2)).toEqual([2, 4, 6]);
    expect(field.polyAdd([1, 2, 3], [4, 5])).toEqual([1, 6, 6]);
    expect(field.polyMul([1, 2], [1, 3])).toEqual([1, 1, 6]);
    expect(field.polyEval([1, 2, 3], 0)).toBe(3);
    expect(field.polyEval([1, 2, 3], 1)).toBe(0);
    expect(field.polyAdd(sparsePolynomial, [1])).toEqual([0, 0, 2]);
    expect(field.polyAdd([1, 2], sparseAddend)).toEqual([1, 7]);
    expect(field.polyMul(sparsePolynomial, sparseFactor)).toEqual([0, 0, 0, 6]);
    expect(field.polyMul([], [1])).toEqual([]);
    expect(field.polyMul([1], [])).toEqual([]);
    expect(field.polyEval(sparseEvaluation, 2)).toBe(7);
    expect(field.polyEval([], 7)).toBe(0);
  });

  it('handles a non-primitive polynomial whose powers repeat before zero', () => {
    expect(() => new GaloisField(0x101)).toThrow(ReedSolomonError);
  });

  it('rejects invalid and non-primitive polynomials and zero logarithms', () => {
    for (const polynomial of [-1, 0x200, 1.5, Number.NaN]) {
      expect(() => new GaloisField(polynomial)).toThrow(ReedSolomonError);
    }
    expect(() => new GaloisField(0x100)).toThrow(ReedSolomonError);

    const field = new GaloisField();
    expect(() => field.div(1, 0)).toThrow(ReedSolomonError);
    expect(() => field.inverse(0)).toThrow(ReedSolomonError);
    expect(() => field.pow(0, -1)).toThrow(ReedSolomonError);
    expect(() => field.log(0)).toThrow(ReedSolomonError);
  });

  it('caches fields by primitive polynomial', () => {
    expect(getField()).toBe(getField(DEFAULT_PRIMITIVE_POLYNOMIAL));
    expect(getField(0x11d)).toBeInstanceOf(GaloisField);
  });
});
