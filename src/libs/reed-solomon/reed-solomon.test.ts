import { describe, expect, it, vi } from 'vitest';

import { ReedSolomonError } from '../../utils/helpers/errors/errors.js';
import { MAX_CODEWORD_LENGTH, ReedSolomon as ReedSolomonFromBarrel } from '../index.js';

import { ReedSolomon } from './reed-solomon.js';

vi.mock('@utils', async () => {
  const [{ DEFAULT_PRIMITIVE_POLYNOMIAL, getField }, { ReedSolomonError: ErrorType }] =
    await Promise.all([
      import('../../utils/galois-field/galois-field.js'),
      import('../../utils/helpers/errors/errors.js'),
    ]);

  return {
    DEFAULT_PRIMITIVE_POLYNOMIAL,
    getField,
    ReedSolomonError: ErrorType,
  };
});

describe('ReedSolomon', () => {
  it('exports the codec and maximum length from the library barrel', () => {
    expect(ReedSolomonFromBarrel).toBe(ReedSolomon);
    expect(MAX_CODEWORD_LENGTH).toBe(255);
  });

  it('encodes the Hello golden vector without mutating its input', () => {
    const data = new TextEncoder().encode('Hello');
    const original = Uint8Array.from(data);
    const codec = new ReedSolomon(6);

    const codeword = codec.encode(data);

    expect([...codeword]).toEqual([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xc0, 0x88, 0x66, 0x17, 0x75, 0x0e,
    ]);
    expect([...data]).toEqual([...original]);
    expect(codec.isValid(codeword)).toBe(true);
  });

  it('corrects a corrupted byte and reports its exact correction', () => {
    const codec = new ReedSolomon(6);
    const message = Uint8Array.from([1, 2, 3, 4, 5]);
    const codeword = codec.encode(message);
    const received = Uint8Array.from(codeword);
    received[2] = received[2] ^ 0xa7;

    const result = codec.decode(received);

    expect([...result.message]).toEqual([...message]);
    expect([...result.codeword]).toEqual([...codeword]);
    expect(result.errors).toBe(1);
    expect(result.erasures).toBe(0);
    expect(result.corrections).toEqual([{ position: 2, magnitude: 0xa7, kind: 'error' }]);
    expect(codec.isValid(received)).toBe(false);
    expect(codec.isValid(result.codeword)).toBe(true);
  });

  it('corrects every nonzero single-byte error at every codeword position', () => {
    const codec = new ReedSolomon(6);
    const codeword = codec.encode(Uint8Array.from([3, 17, 29, 41, 53, 67, 79, 97]));

    for (let position = 0; position < codeword.length; position++) {
      for (let magnitude = 1; magnitude <= 255; magnitude++) {
        const received = Uint8Array.from(codeword);
        received[position] = received[position] ^ magnitude;
        const result = codec.decode(received);

        expect([...result.codeword]).toEqual([...codeword]);
        expect(result.corrections).toEqual([{ position, magnitude, kind: 'error' }]);
      }
    }
  });

  it('rejects invalid parity sizes and input data', () => {
    for (const parityBytes of [0, 255, 1.5, Number.NaN]) {
      expect(() => new ReedSolomon(parityBytes)).toThrow(ReedSolomonError);
    }

    const codec = new ReedSolomon(4);
    expect(() => codec.encode(new Uint8Array())).toThrow(ReedSolomonError);
    expect(() => codec.encode(new Uint8Array(codec.maxDataBytes + 1))).toThrow(
      ReedSolomonError,
    );
    expect(() => codec.encode([1, 2, 3] as unknown as Uint8Array)).toThrow(
      ReedSolomonError,
    );
  });

  it('exposes capacity and returns a defensive copy of the generator polynomial', () => {
    const codec = new ReedSolomon(5);
    const generator = codec.generatorPolynomial;

    expect(codec.maxErrors).toBe(2);
    expect(codec.maxErasures).toBe(5);
    expect(codec.maxDataBytes).toBe(250);
    expect(generator).toHaveLength(6);
    generator[0] = 0;
    expect(codec.generatorPolynomial[0]).toBe(1);
  });

  it('computes parity, returns clean decode results, and recognizes zero words', () => {
    const codec = new ReedSolomon(4);
    const data = Uint8Array.from([0, 0, 0]);
    const codeword = codec.encode(data);
    const result = codec.decode(codeword);

    expect([...codec.computeParity(data)]).toEqual([...codeword.slice(data.length)]);
    expect([...result.message]).toEqual([...data]);
    expect([...result.codeword]).toEqual([...codeword]);
    expect(result.corrections).toEqual([]);
    expect(result.errors).toBe(0);
    expect(result.erasures).toBe(0);
    expect([...codec.syndromes(codeword)]).toEqual([0, 0, 0, 0]);
    expect(codec.isValid(codeword)).toBe(true);
  });

  it('corrects mixed errors and erased bytes at the full correction capacity', () => {
    const codec = new ReedSolomon(8);
    const message = Uint8Array.from([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
    const codeword = codec.encode(message);
    const received = Uint8Array.from(codeword);
    const errorMagnitudes = new Map([
      [2, 0x53],
      [17, 0xa6],
    ]);
    const erasurePositions = [0, 5, 18, 19];

    for (const [position, magnitude] of errorMagnitudes) {
      received[position] = received[position] ^ magnitude;
    }
    for (const position of erasurePositions) received[position] = 0;

    const result = codec.decode(received, { erasures: erasurePositions });

    expect([...result.message]).toEqual([...message]);
    expect([...result.codeword]).toEqual([...codeword]);
    expect(result.errors).toBe(2);
    expect(result.erasures).toBe(4);
    expect(result.corrections).toEqual(
      [
        ...erasurePositions.map((position) => ({
          position,
          magnitude: codeword[position] ?? 0,
          kind: 'erasure' as const,
        })),
        ...[...errorMagnitudes].map(([position, magnitude]) => ({
          position,
          magnitude,
          kind: 'error' as const,
        })),
      ].sort((left, right) => left.position - right.position),
    );
  });

  it('reports intact erased positions with zero magnitude and corrects all parity erasures', () => {
    const codec = new ReedSolomon(4);
    const message = Uint8Array.from([0x31, 0x72, 0xa4, 0xf0]);
    const codeword = codec.encode(message);

    const intact = codec.decode(codeword, { erasures: [1] });
    expect(intact.corrections).toEqual([{ position: 1, magnitude: 0, kind: 'erasure' }]);

    const erasedPositions = [0, 2, 5, 7];
    const erased = codec.decode(codeword, { erasures: erasedPositions });
    expect([...erased.codeword]).toEqual([...codeword]);
    expect(erased.erasures).toBe(4);
    expect(erased.errors).toBe(0);
    expect(erased.corrections.map(({ position }) => position)).toEqual(erasedPositions);
  });

  it('supports first-root variants and a custom primitive polynomial', () => {
    const message = Uint8Array.from([4, 8, 15, 16, 23, 42]);

    for (const firstRoot of [0, 1, 2, 112, 254]) {
      const codec = new ReedSolomon(8, { firstRoot });
      const codeword = codec.encode(message);
      const received = Uint8Array.from(codeword);
      received[1] = received[1] ^ 0x34;
      received[codeword.length - 1] = received[codeword.length - 1] ^ 0x91;

      expect([...codec.decode(received).codeword]).toEqual([...codeword]);
    }

    const custom = new ReedSolomon(8, { firstRoot: 3, primitivePolynomial: 0x12d });
    const codeword = custom.encode(message);
    const received = Uint8Array.from(codeword);
    received[3] = received[3] ^ 0x77;
    expect([...custom.decode(received).codeword]).toEqual([...codeword]);
  });

  it('encodes maximum-length codewords at both parity boundaries', () => {
    const oneParity = new ReedSolomon(1);
    const dataAtMaximum = new Uint8Array(oneParity.maxDataBytes);
    expect(oneParity.encode(dataAtMaximum)).toHaveLength(255);

    const maximumParity = new ReedSolomon(254);
    expect(maximumParity.maxDataBytes).toBe(1);
    expect(maximumParity.encode(Uint8Array.from([0x5a]))).toHaveLength(255);
  });

  it('rejects invalid options, codeword lengths, and erasure positions', () => {
    for (const firstRoot of [-1, 255, 1.5, Number.NaN]) {
      expect(() => new ReedSolomon(4, { firstRoot })).toThrow(ReedSolomonError);
    }
    expect(() => new ReedSolomon(4, { primitivePolynomial: 0x100 })).toThrow(
      ReedSolomonError,
    );

    const codec = new ReedSolomon(4);
    for (const codeword of [
      new Uint8Array(4),
      new Uint8Array(256),
      [1, 2, 3, 4, 5] as unknown as Uint8Array,
    ]) {
      expect(() => codec.syndromes(codeword)).toThrow(ReedSolomonError);
      expect(() => codec.decode(codeword)).toThrow(ReedSolomonError);
    }
    expect(() => codec.computeParity(new Uint8Array())).toThrow(ReedSolomonError);

    const validCodeword = codec.encode(Uint8Array.from([1, 2, 3]));
    for (const erasures of [[-1], [validCodeword.length], [1.5], [1, 1]]) {
      expect(() => codec.decode(validCodeword, { erasures })).toThrow(ReedSolomonError);
    }
    expect(() => codec.decode(validCodeword, { erasures: [0, 1, 2, 3, 4] })).toThrow(
      ReedSolomonError,
    );
  });

  it('decodes an RS(255, 223) word with sixteen errors', () => {
    const codec = new ReedSolomon(32);
    const message = Uint8Array.from({ length: 223 }, (_, index) => index);
    const codeword = codec.encode(message);
    const received = Uint8Array.from(codeword);

    for (let position = 0; position < 16; position++) {
      received[position] = received[position] ^ (position + 1);
    }

    const result = codec.decode(received);
    expect([...result.message]).toEqual([...message]);
    expect([...result.codeword]).toEqual([...codeword]);
    expect(result.errors).toBe(16);
  });

  it('uses deterministic seeded trials for errors and erasures within capacity', () => {
    const randomByte = createRng(0x5eed);

    for (let trial = 0; trial < 40; trial++) {
      const parityBytes = 2 + (randomByte() % 15);
      const codec = new ReedSolomon(parityBytes);
      const dataLength = 1 + (randomByte() % codec.maxDataBytes);
      const message = Uint8Array.from({ length: dataLength }, () => randomByte());
      const codeword = codec.encode(message);
      const erasureCount = randomByte() % (parityBytes + 1);
      const maxErrors = Math.floor((parityBytes - erasureCount) / 2);
      const errorCount = maxErrors === 0 ? 0 : randomByte() % (maxErrors + 1);
      const positions = shuffledPositions(codeword.length, randomByte);
      const errorPositions = positions.slice(0, errorCount);
      const erasures = positions.slice(errorCount, errorCount + erasureCount);
      const received = Uint8Array.from(codeword);

      for (const position of errorPositions) {
        received[position] = received[position] ^ (1 + (randomByte() % 255));
      }
      for (const position of erasures) received[position] = 0;

      const result = codec.decode(received, { erasures });
      expect([...result.message]).toEqual([...message]);
      expect([...result.codeword]).toEqual([...codeword]);
      expect(result.errors).toBe(errorCount);
      expect(result.erasures).toBe(erasureCount);
    }
  });

  it('rejects or miscorrects a deterministic word beyond correction capacity', () => {
    const codec = new ReedSolomon(4);
    const codeword = codec.encode(Uint8Array.from([1, 2, 3, 4, 5, 6]));
    const received = Uint8Array.from(codeword);
    for (const [position, magnitude] of [
      [0, 0x31],
      [3, 0x72],
      [7, 0xa4],
    ]) {
      received[position] = (received[position] ?? 0) ^ magnitude;
    }

    const outcome = (() => {
      try {
        return { error: null, corrected: codec.decode(received).codeword };
      } catch (error) {
        return { error, corrected: null };
      }
    })();
    const rejected = outcome.error instanceof ReedSolomonError;
    const miscorrected =
      outcome.corrected?.some((value, index) => value !== codeword[index]) ?? false;

    expect(rejected || miscorrected).toBe(true);
  });
});

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state >>> 24;
  };
}

function shuffledPositions(length: number, randomByte: () => number): number[] {
  const positions = Array.from({ length }, (_, index) => index);
  for (let index = positions.length - 1; index > 0; index--) {
    const otherIndex = randomByte() % (index + 1);
    const current = positions[index] ?? 0;
    positions[index] = positions[otherIndex] ?? 0;
    positions[otherIndex] = current;
  }
  return positions;
}
