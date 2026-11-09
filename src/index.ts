export type { ReedSolomonErrorCode } from './types/errors/errors.js';
export { bytesToHex, describeCode, hexToBytes, ReedSolomonError } from './utils/index.js';

export { MAX_CODEWORD_LENGTH, ReedSolomon } from './libs/index.js';
export type {
  CodeDescription,
  Correction,
  DecodeOptions,
  DecodeResult,
  Polynomial,
  ReedSolomonOptions,
} from './types/reed-solomon/reed-solomon.js';
export { DEFAULT_PRIMITIVE_POLYNOMIAL, GaloisField, getField } from './utils/index.js';
