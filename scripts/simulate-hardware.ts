import { ReedSolomon } from '../src/index.js';
// 1. Core Config (Matches our 4 parity byte hardware profile)
const PARITY_BYTES = 4;
const codec = new ReedSolomon(PARITY_BYTES);
const WHITENING_KEY = new Uint8Array([0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07]);

// --- MOCK FIRMWARE SIDE (Simulating an ESP32 / Arduino Node) ---
function mockFirmwarePack(sensorPayload: Uint8Array): Uint8Array {
  // Step A: Whiten data to eliminate dangerous long rows of zeros/ones
  const whitenedData = new Uint8Array(sensorPayload);
  for (let i = 0; i < whitenedData.length; i++) {
    whitenedData[i] ^= WHITENING_KEY[i % WHITENING_KEY.length];
  }

  // Step B: Calculate Reed-Solomon parity blocks over the whitened space
  // This simulates what your C loop 'rs_encode' outputs onto your serial lines
  const fullCodeword = codec.encode(whitenedData);

  return fullCodeword; // Clean 8-byte over-the-air packet [Data(4) + Parity(4)]
}

// --- GATEWAY RECEIVER SIDE (Your Server Backend Setup) ---
function gatewayReceiveAndProcess(rawIncomingFrame: Uint8Array): Uint8Array {
  console.log(
    '\n📥 Gateway Raw Frame Arrived:',
    Array.from(rawIncomingFrame)
      .map((b) => '0x' + b.toString(16).toUpperCase())
      .join(' '),
  );

  // Step A: Clean and fix the raw channel data using your library
  const result = codec.decode(rawIncomingFrame);
  const correctedPayload = result.message;

  console.log(`✨ Reed-Solomon Check Passed! Errors corrected on wire: ${result.errors}`);

  // Step B: Strip out the whitening mask to expose the real numbers
  for (let i = 0; i < correctedPayload.length; i++) {
    correctedPayload[i] ^= WHITENING_KEY[i % WHITENING_KEY.length];
  }

  console.log(
    '📊 Successfully Recovered Telemetry Metrics:',
    Array.from(correctedPayload),
  );
  return correctedPayload;
}

// ========================================================
// 🏃 RUN THE SIMULATION LOOP
// ========================================================
function runSimulation() {
  console.log('=== Starting End-to-End IoT Protection Pipeline Test ===');

  // Ideal Telemetry Data from a mock thermometer sensor: [SensorID, Temp, BattHigh, BattLow]
  const originalSensorMetrics = new Uint8Array([0x01, 0x1a, 0x0c, 0xce]);
  console.log('🔬 1. Original Sensor State:', Array.from(originalSensorMetrics));

  // Pacify through our virtual MCU node firmware
  const transmissionFrame = mockFirmwarePack(originalSensorMetrics);

  // Inject destructive physical environment line noise!
  // We flip 2 completely random bytes within our 8-byte channel container limit (Max capacity for 4 parity blocks)
  const noisyOtaBuffer = new Uint8Array(transmissionFrame);
  noisyOtaBuffer[0] ^= 0xff; // Blasts the first telemetry data byte
  noisyOtaBuffer[5] ^= 0xaa; // Blasts the second parity byte

  console.log('⚡ 2. Noise injected into communication medium...');

  // Send the broken data buffer into your server handler
  const recoveredMetrics = gatewayReceiveAndProcess(noisyOtaBuffer);
  if (!recoveredMetrics.every((value, index) => value === originalSensorMetrics[index])) {
    throw new Error('The gateway did not recover the original sensor metrics.');
  }
}

runSimulation();
