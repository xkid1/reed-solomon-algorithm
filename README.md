# @xkid1/reed-solomon-algorithm

[![CI](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/ci.yml)
[![Build](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/build.yml)
[![Test](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/test.yml)
[![Publish](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/publish.yml/badge.svg)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/%40xkid1%2Freed-solomon-algorithm)](https://www.npmjs.com/package/@xkid1/reed-solomon-algorithm)
[![npm profile: vkings1](https://img.shields.io/badge/npm-vkings1-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/~vkings1)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/xkid1/reed-solomon-algorithm/blob/main/LICENSE)
[![Built with TypeScript](https://img.shields.io/badge/Built_with-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A zero-runtime-dependency TypeScript library for Reed-Solomon encoding and decoding over GF(256), with correction of errors and erasures.

Maintainer: [vkings1 on npm](https://www.npmjs.com/~vkings1).

## Features

- Systematic encoding: the original data is followed by parity bytes.
- Corrects unknown errors and known-position erasures.
- Configurable first root and primitive polynomial.
- Byte-oriented API with helpers for hexadecimal conversion and code parameters.
- ESM package with TypeScript declarations.

## Requirements

- Node.js `>=26.13.0`

## Install

### npm registry

```sh
npm install @xkid1/reed-solomon-algorithm
```

If your npm configuration routes the `@xkid1` scope to another registry, specify npmjs explicitly:

```sh
npm install --registry=https://registry.npmjs.org @xkid1/reed-solomon-algorithm
```

### GitHub Packages

GitHub Packages requires authentication, including for public packages. Create a token with `read:packages` permission and configure `.npmrc`:

```ini
@xkid1:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Set `NODE_AUTH_TOKEN` in your shell to the token value, then install:

```sh
npm install @xkid1/reed-solomon-algorithm
```

Do not commit the token. For Yarn 4, configure the same scope in `.yarnrc.yml` with `npmRegistryServer: 'https://npm.pkg.github.com'` and `npmAuthToken: '${NODE_AUTH_TOKEN}'`.

## Quick Start

The API accepts `Uint8Array` values. The `parityBytes` constructor argument controls the correction capacity.

```ts
import { ReedSolomon } from '@xkid1/reed-solomon-algorithm';

const codec = new ReedSolomon(8);
const message = new TextEncoder().encode('hello');
const codeword = codec.encode(message);

// Simulate one unknown error in the transmitted codeword.
codeword[0] = (codeword[0] ?? 0) ^ 0xa5;

const result = codec.decode(codeword);
console.log(new TextDecoder().decode(result.message)); // hello
console.log(result.errors); // 1
console.log(codec.isValid(result.codeword)); // true
```

Encoding does not modify the input data. Decoding returns the recovered message, the corrected full codeword, and correction details.

## Erasures

If you know which codeword positions are unreliable, pass their zero-based positions to `decode`:

```ts
import { ReedSolomon } from '@xkid1/reed-solomon-algorithm';

const codec = new ReedSolomon(8);
const message = new TextEncoder().encode('hello');
const received = codec.encode(message);
received[2] = (received[2] ?? 0) ^ 0xff;

const result = codec.decode(received, { erasures: [2] });
console.log(new TextDecoder().decode(result.message)); // hello
console.log(result.erasures); // 1
console.log(result.corrections);
```

Erasure positions refer to bytes in the complete codeword, including the parity portion.

## Correction Capacity

For `p` parity bytes, the decoder can correct `e` unknown errors and `s` known erasures when:

$$2e + s \le p$$

Parity must be an integer from 1 to 254. A codeword contains at most 255 bytes, so the maximum data size is `255 - parityBytes`. The data passed to `encode` must contain at least one byte.

Beyond this capacity, decoding may throw `ReedSolomonError` or return a different valid codeword. If silent corruption detection matters, verify the recovered data with an outer checksum or authentication mechanism. Reed-Solomon coding is not encryption or a cryptographic integrity check.

## Helpers and Types

The package exports these APIs from its root entry point:

- `ReedSolomon`, `MAX_CODEWORD_LENGTH`
- `bytesToHex`, `hexToBytes`, `describeCode`
- `GaloisField`, `getField`, `DEFAULT_PRIMITIVE_POLYNOMIAL`
- `ReedSolomonError`, `ReedSolomonErrorCode`
- `ReedSolomonOptions`, `DecodeOptions`, `DecodeResult`, `Correction`, `CodeDescription`

For example, convert a message to and from hex:

```ts
import { bytesToHex, hexToBytes } from '@xkid1/reed-solomon-algorithm';

const bytes = hexToBytes('48656c6c6f');
console.log(new TextDecoder().decode(bytes)); // hello
console.log(bytesToHex(bytes)); // 48656c6c6f
```

`decode` returns a `DecodeResult` with `message`, `codeword`, `corrections`, `errors`, and `erasures`. Each correction includes its zero-based `position`, XOR `magnitude`, and `kind` (`error` or `erasure`). Invalid parameters, invalid inputs, over-capacity inputs, and decode failures throw `ReedSolomonError`, whose `code` property is machine-readable.

## Development

Use Node.js `>=26.13.0` and Yarn `4.18.0` via Corepack.

```sh
corepack enable
yarn install --immutable
```

Run the tests and checks:

```sh
yarn test             # Run unit tests
yarn test:watch       # Run tests in watch mode
yarn coverage         # Run tests with coverage
yarn check            # Formatting, lint, type-check, coverage, and build
yarn build            # Build JavaScript and TypeScript declarations
```

To verify the packed package in consumer projects, run:

```sh
bash scripts/smoke-consumer.sh
```

## Package Contents

The npm package is restricted by the `files` allowlist in `package.json` to `dist/`, this README, and `LICENSE`. Source files, tests, workflows, and development configuration are not included. The `prepack` script builds `dist/` when creating a package tarball. Make sure a root-level `LICENSE` file is present in the checkout before packing so it is included.

## License

MIT. See the [repository license](https://github.com/xkid1/reed-solomon-algorithm/blob/main/LICENSE).
