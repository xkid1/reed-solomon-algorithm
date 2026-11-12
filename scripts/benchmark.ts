import { ReedSolomon } from '../src/index.js';

/**
 * Runs a function repeatedly for a target duration to calculate operational speed.
 */
function runBenchmark(
  name: string,
  dataSizeBytes: number,
  fn: () => void,
  targetDurationMs = 2000,
) {
  // Warm up the engine to trigger V8 JIT compilation optimized paths
  for (let i = 0; i < 1000; i++) fn();

  let iterations = 0;
  const targetDurationNs = BigInt(targetDurationMs) * 1_000_000n;

  const startTime = process.hrtime.bigint();
  let elapsedNs = 0n;

  while (elapsedNs < targetDurationNs) {
    fn();
    iterations++;
    elapsedNs = process.hrtime.bigint() - startTime;
  }

  const elapsedSeconds = Number(elapsedNs) / 1_000_000_000;
  const opsPerSec = iterations / elapsedSeconds;
  const totalBytesProcessed = iterations * dataSizeBytes;
  const throughputMBs = totalBytesProcessed / elapsedSeconds / (1024 * 1024);

  console.log(`\n🔹 ${name}`);
  console.log(`  Iterations:  ${iterations.toLocaleString()}`);
  console.log(`  Ops/Sec:     ${Math.round(opsPerSec).toLocaleString()} ops/s`);
  console.log(`  Throughput:  ${throughputMBs.toFixed(2)} MB/s`);
}

function main() {
  console.log('=== @xkid1/reed-solomon-algorithm Benchmark Suite ===');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Architecture:   ${process.arch} (${process.platform})`);

  // --- Benchmark 1: Standard Payload Encoding ---
  // A typical 200-byte message with 32 parity bytes
  const parityBytes = 32;
  const codec = new ReedSolomon(parityBytes);
  const messageData = new Uint8Array(200);
  for (let i = 0; i < messageData.length; i++) {
    messageData[i] = (i * 73 + 19) & 0xff;
  }

  runBenchmark(
    'Systematic Encode (200 bytes data -> 232 bytes codeword)',
    messageData.length,
    () => {
      codec.encode(messageData);
    },
  );

  // --- Benchmark 2: Decode with Error Correction ---
  const codeword = codec.encode(messageData);
  // Inject 4 unknown errors (well within the 32 parity byte limit, 2e <= 32)
  const erroneousCodeword = new Uint8Array(codeword);
  erroneousCodeword[5] ^= 0x5a;
  erroneousCodeword[25] ^= 0xa5;
  erroneousCodeword[50] ^= 0xff;
  erroneousCodeword[100] ^= 0x11;

  runBenchmark(
    'Decode & Correct Errors (4 Unknown Errors)',
    erroneousCodeword.length,
    () => {
      codec.decode(erroneousCodeword);
    },
  );

  // --- Benchmark 3: Decode with Erasures (Known Positions) ---
  const erasureCodeword = new Uint8Array(codeword);
  erasureCodeword[10] ^= 0x22;
  erasureCodeword[20] ^= 0x44;
  const options = { erasures: [10, 20] };

  runBenchmark(
    'Decode & Correct Erasures (2 Known Erasures)',
    erasureCodeword.length,
    () => {
      codec.decode(erasureCodeword, options);
    },
  );
}

main();
