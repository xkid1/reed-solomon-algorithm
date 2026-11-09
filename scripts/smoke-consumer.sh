#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
CONSUMER_DIR="$TEMP_DIR/consumer"

trap 'rm -rf "$TEMP_DIR"' EXIT

cd "$ROOT_DIR"
yarn pack --out "$TEMP_DIR/package.tgz"
if tar -tzf "$TEMP_DIR/package.tgz" | grep -Eq '/[^/]+\.(test|spec)\.(js|d\.ts)$'; then
	printf 'Package archive contains test files.\n' >&2
	exit 1
fi

mkdir -p "$CONSUMER_DIR"
cd "$CONSUMER_DIR"
npm init -y >/dev/null
npm pkg set type=module >/dev/null
npm install --no-audit --no-fund "$TEMP_DIR/package.tgz"

node --input-type=module <<'NODE'
import { bytesToHex, hexToBytes, ReedSolomon } from '@xkid1/reed-solomon-algorithm';

const message = hexToBytes('48656c6c6f');
const codec = new ReedSolomon(6);
const codeword = codec.encode(message);
if (bytesToHex(codeword) !== '48656c6c6fc0886617750e') {
	throw new Error('ESM consumer encoded an unexpected codeword');
}

codeword[0] = (codeword[0] ?? 0) ^ 0xa5;
const decoded = codec.decode(codeword);
if (bytesToHex(decoded.message) !== '48656c6c6f') {
	throw new Error('ESM consumer failed to decode the message');
}
NODE

node <<'NODE'
const { bytesToHex, hexToBytes, ReedSolomon } = require('@xkid1/reed-solomon-algorithm');

const message = hexToBytes('48656c6c6f');
const codec = new ReedSolomon(6);
if (bytesToHex(codec.encode(message)) !== '48656c6c6fc0886617750e') {
	throw new Error('CommonJS consumer encoded an unexpected codeword');
}
NODE

cat > "$CONSUMER_DIR/consumer.ts" <<'TS'
import { bytesToHex, hexToBytes, ReedSolomon } from '@xkid1/reed-solomon-algorithm';
import type { DecodeResult, ReedSolomonOptions } from '@xkid1/reed-solomon-algorithm';

const options: ReedSolomonOptions = { firstRoot: 1 };
const codec = new ReedSolomon(8, options);
const message = hexToBytes('48656c6c6f');
const result: DecodeResult = codec.decode(codec.encode(message));
const resultHex: string = bytesToHex(result.message);
void resultHex;
TS

"$ROOT_DIR/node_modules/.bin/tsc" \
	--noEmit \
	--strict \
	--skipLibCheck \
	--target ES2022 \
	--module NodeNext \
	--moduleResolution NodeNext \
	"$CONSUMER_DIR/consumer.ts"

printf 'Packed ESM, CommonJS, and TypeScript consumers passed.\n'
