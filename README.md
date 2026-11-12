# @xkid1/reed-solomon-algorithm

[![CI](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/ci.yml)
[![Build](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/build.yml)
[![Test](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/test.yml)
[![Publish](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/publish.yml/badge.svg)](https://github.com/xkid1/reed-solomon-algorithm/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/%40xkid1%2Freed-solomon-algorithm)](https://www.npmjs.com/package/@xkid1/reed-solomon-algorithm)
[![npm profile: vkings1](https://img.shields.io/badge/npm-vkings1-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/~vkings1)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/xkid1/reed-solomon-algorithm/blob/main/LICENSE)
[![Built with TypeScript](https://img.shields.io/badge/Built_with-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Built with C](https://img.shields.io/badge/Built_with-C-00599C?logo=c&logoColor=white)](https://en.cppreference.com/w/c.html)
[![Built with C++](https://img.shields.io/badge/Built_with-C%2B%2B-00599C?logo=cplusplus&logoColor=white)](https://isocpp.org/)
[![Built with Rust](https://img.shields.io/badge/Built_with-Rust-CE422B?logo=rust&logoColor=white)](https://www.rust-lang.org/)

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

## Firmware and Gateway Integration

The firmware examples under [`firmware/`](./firmware) use the four-parity-byte GF(256) profile (polynomial `0x11d`, alpha `2`, first root `0`). For the telemetry gateway, whiten each data byte with the repeating key `19 6d 3f 9a 5b c2 e4 07` before computing parity. The receiver corrects the complete codeword first, then applies the same XOR key to recover the payload.

### C and C++

The Arduino library API is declared in [`xkid1-reed-solomon.h`](./firmware/rs-sensor-node/src/xkid1-reed-solomon.h). Call `rs_encode(data, data_len, parity)` with a four-byte parity output buffer. The sketch in [`TelemetryEncoder.ino`](./firmware/rs-sensor-node/examples/TelemetryEncoder/TelemetryEncoder.ino) whitens the telemetry bytes, encodes them, and prints the complete codeword.

Run the host-side C vector tests and the C++ header/linkage test with GCC and G++:

```sh
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT

cc -std=c11 -Wall -Wextra -Werror \
  -Ifirmware/rs-sensor-node/src \
  firmware/rs-sensor-node/src/xkid1-reed-solomon.c \
  firmware/rs-sensor-node/test/encoder_test.c \
  -o "$build_dir/c-test"
"$build_dir/c-test"

cc -std=c11 -Wall -Wextra -Werror \
  -Ifirmware/rs-sensor-node/src \
  -c firmware/rs-sensor-node/src/xkid1-reed-solomon.c \
  -o "$build_dir/encoder.o"
c++ -std=c++17 -Wall -Wextra -Werror \
  -Ifirmware/rs-sensor-node/src \
  firmware/rs-sensor-node/test/encoder_cpp_test.cpp "$build_dir/encoder.o" \
  -o "$build_dir/cpp-test"
"$build_dir/cpp-test"
```

For an Arduino board, install its board core and compile the example (replace the FQBN for your board):

```sh
arduino-cli compile --fqbn arduino:avr:uno \
  --libraries firmware/rs-sensor-node \
  firmware/rs-sensor-node/examples/TelemetryEncoder
```

### Rust

[`firmware/xkid1-reed-solomon`](./firmware/xkid1-reed-solomon) is a `no_std` encoder library. Its host example applies the same whitening key and prints the eight-byte telemetry codeword. Run its unit tests and example with:

```sh
cargo test --manifest-path firmware/xkid1-reed-solomon/Cargo.toml
cargo run --manifest-path firmware/xkid1-reed-solomon/Cargo.toml --example telemetry
```

The Rust example is a host executable, not an MCU runtime or board-specific firmware image. The library has not been validated against a particular embedded Rust target or HAL.

### TypeScript gateway, dashboard, and browser output

Run the end-to-end software simulation, which corrupts two transmitted bytes and verifies exact recovery:

```sh
yarn test-iot-loop
yarn test src/utils/hardware/hardware-integration.test.ts
yarn build
```

#### `src/server.ts`: start the gateway

Build the project and run the generated server:

```sh
yarn build
node dist/server.js
```

The HTTP server listens on port `4000`. Open [http://localhost:4000](http://localhost:4000) for the dashboard; `/events` is its Server-Sent Events endpoint. The server serves [`src/html/index.html`](./src/html/index.html) as the dashboard page.

The current server has no serial, radio, or socket input adapter. To connect hardware, your Node.js adapter must collect one complete codeword frame and pass its bytes to the exported `handleIncomingHardwareFrame(frame)` in [`src/server.ts`](./src/server.ts). The handler corrects the codeword, reverses telemetry whitening, parses the payload, and broadcasts a dashboard event. A frame should contain the whitened data followed by its four parity bytes.

To populate the dashboard without hardware, stop any server already using port `4000` with **Ctrl+C**, then run the opt-in demo server:

```sh
yarn server:demo
```

Open [http://localhost:4000](http://localhost:4000). If port `4000` is already in use, stop the existing server first or choose another port:

```sh
PORT=4001 yarn server:demo
```

The demo publishes a sample reading immediately and every two seconds, with two simulated corruptions that the gateway corrects before publishing. Demo mode is disabled when starting with `node dist/server.js` normally; it does not receive or transmit real hardware data.

#### `src/dashboard.ts`: parse telemetry payloads

`parseFixedPayloadToJSON` accepts at least four **un-whitened** bytes laid out as sensor ID, signed temperature in Celsius, and a big-endian battery voltage in millivolts. The gateway calls it after error correction and unwhitening. To try it from the built package:

```sh
yarn build
node --input-type=module -e "import { parseFixedPayloadToJSON } from './dist/dashboard.js'; console.log(parseFixedPayloadToJSON(new Uint8Array([1, 26, 13, 72])))"
```

The result includes an ISO timestamp and `Healthy`/`Low`/`Critical` battery status. The dashboard in `src/html/index.html` connects to `/events`, displays incoming readings, and retains only the latest ten entries. Serve it through `node dist/server.js`; opening the file directly does not provide the required `/events` endpoint.

#### `scripts/simulate-hardware.ts`: run the software-only IoT loop

```sh
yarn test-iot-loop
```

The simulation whitens sample telemetry, encodes it with the TypeScript library, corrupts two bytes, decodes and unwhitens the payload, then compares it to the original. It does not connect to physical hardware or exercise a radio/serial driver.

#### `scripts/benchmark.ts`: measure codec throughput

```sh
yarn benchmark
```

This runs encode, four-error correction, and two-erasure correction benchmarks using deterministic input data. Each benchmark warms up and runs for about two seconds; figures depend on the machine and Node.js version and are not hardware guarantees.

#### `scripts/build-browser.ts` and `scripts/build-browser.sh`: create a browser bundle

Either command builds the TypeScript package and emits a minified IIFE at `dist/index.global.min.js`:

```sh
yarn build:browser
# Equivalent shell entry point:
sh scripts/build-browser.sh
```

To run the TypeScript build script directly, first build `dist/index.js`, then bundle:

```sh
yarn build
yarn jiti scripts/build-browser.ts
```

The bundle exposes `window.ReedSolomonCodec`. To inspect it in a browser, serve `dist/` (for example, `python3 -m http.server 8000 --directory dist`), open the browser console at [http://localhost:8000](http://localhost:8000), and run:

```js
new window.ReedSolomonCodec.ReedSolomon(4).encode(new Uint8Array([1, 26, 12, 206]));
```

The browser bundle is separate from the telemetry dashboard; the dashboard uses the built Node.js server and SSE endpoint.

### QR codes, distributed storage, and backups

These are **not implemented** by this repository. It does not generate or scan QR codes, persist records, replicate data, or schedule backups. An application may pass an encoded codeword to an external QR or storage system, but must implement framing, size limits, persistence, replication, and recovery itself. Reed-Solomon parity protects one codeword only; it is not a distributed storage protocol, backup strategy, checksum, or cryptographic integrity mechanism.

### Legacy hardware support

The repository currently provides a portable C encoder and an Arduino-compatible sketch. Host C and C++ tests verify the API and parity vectors, but no particular legacy board, radio, serial adapter, or physical sensor has been tested. Board-specific electrical interfaces, transport framing, and Arduino compilation/upload require the target board's toolchain and hardware.

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

Development instructions are grouped by toolchain. The firmware and gateway integration details, including the complete C/C++ host test commands and browser/dashboard usage, are in [Firmware and Gateway Integration](#firmware-and-gateway-integration).

### Shared setup

The TypeScript package, gateway, simulation, benchmark, and browser builder use Node.js `>=26.13.0` and Yarn `4.18.0` via Corepack:

```sh
if ! command -v corepack >/dev/null 2>&1; then
  npm install --global corepack
fi
corepack enable
corepack install
yarn --version
yarn install --immutable
```

### TypeScript / Node.js

```sh
yarn test                         # Run Vitest unit and integration tests
yarn test:watch                   # Run Vitest in watch mode
yarn coverage                     # Run tests with coverage
yarn check                        # Format, lint, type-check, coverage, and build
yarn build                        # Build server, dashboard assets, JS, and declarations
yarn test-iot-loop                # Simulate the IoT telemetry loop
yarn benchmark                    # Benchmark encode, errors, and erasures
yarn build:browser                # Build the standalone browser IIFE
yarn test src/utils/hardware/hardware-integration.test.ts
```

To start the dashboard/gateway locally after building, run `node dist/server.js`, then open [http://localhost:4000](http://localhost:4000). The server exposes an SSE stream at `/events`; it does not include a physical-device input adapter.

To run `scripts/build-browser.sh` directly instead of `yarn build:browser`, use `sh scripts/build-browser.sh`. To invoke `scripts/build-browser.ts` directly, first run `yarn build`, then `yarn jiti scripts/build-browser.ts`.

To verify the packed TypeScript package in consumer projects, run:

```sh
bash scripts/smoke-consumer.sh
```

### C / C++

Use a C11 compiler and a C++17 compiler to run the portable encoder's vector tests and verify C++ header/linkage compatibility. See [C and C++ host tests](#c-and-c) for the full GCC/G++ commands. The Arduino sketch is optional and requires Arduino CLI plus a matching board core:

```sh
arduino-cli compile --fqbn arduino:avr:uno \
  --libraries firmware/rs-sensor-node \
  firmware/rs-sensor-node/examples/TelemetryEncoder
```

### Rust

The Rust firmware is an Edition 2024 `no_std` library; its `telemetry` example runs on the host. With Rust/Cargo installed, validate and run it using:

```sh
cargo fmt --check --manifest-path firmware/xkid1-reed-solomon/Cargo.toml
cargo test --all-targets --manifest-path firmware/xkid1-reed-solomon/Cargo.toml
cargo run --manifest-path firmware/xkid1-reed-solomon/Cargo.toml --example telemetry
```

The example prints `18 77 33 54 4e 28 71 1f`. A host build does not verify a specific MCU target or HAL.

## Package Contents

The npm package is restricted by the `files` allowlist in `package.json` to `dist/`, this README, and `LICENSE`. Source files, tests, workflows, and development configuration are not included. The `prepack` script builds `dist/` when creating a package tarball. Make sure a root-level `LICENSE` file is present in the checkout before packing so it is included.

## License

MIT. See the [repository license](https://github.com/xkid1/reed-solomon-algorithm/blob/main/LICENSE).
