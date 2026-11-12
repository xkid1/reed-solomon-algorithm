import { describe, expect, it } from 'vitest';

import { ReedSolomon } from '../../index.js';

describe('Hardware Firmware Integration Loop', () => {
  const PARITY_BYTES = 4;
  const codec = new ReedSolomon(PARITY_BYTES);

  // Must perfectly mirror the 8-byte static masking array in your C library
  const WHITENING_KEY = new Uint8Array([0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07]);

  it('should successfully repair and unscramble hardware data matching the firmware profile', () => {
    // 1. Mocking what the C firmware generated on the MCU node:
    // Sensor originally wants to send an all-zeros buffer [0, 0, 0, 0]
    // Whitening transforms it to: 0x00 ^ 0x19, 0x00 ^ 0x6D, 0x00 ^ 0x3F, 0x00 ^ 0x9A
    const firmwareWhitenedData = new Uint8Array([0x19, 0x6d, 0x3f, 0x9a]);

    // The exact parity bytes produced by your unrolled C loop 'rs_encode' for this payload
    const firmwareGeneratedParity = new Uint8Array([0x11, 0x3b, 0x1d, 0xe6]);

    // Construct the ideal systematic over-the-air transmission packet
    const cleanOtaPacket = new Uint8Array([
      ...firmwareWhitenedData,
      ...firmwareGeneratedParity,
    ]);

    // 2. Simulate 2 random byte corruptions caused by physical line noise
    const corruptedRxBuffer = new Uint8Array(cleanOtaPacket);
    corruptedRxBuffer[0] = 0xaa; // Destroys whitened data byte 0
    corruptedRxBuffer[5] = 0x55; // Destroys parity byte 1

    // 3. Execution Phase on the Gateway Server
    // Step A: Pass the corrupted hardware buffer straight to your npm package
    const decodeResult = codec.decode(corruptedRxBuffer);
    expect(decodeResult.errors).toBe(2); // Confirms your package detected and repaired both noise marks

    // Step B: Extract the fixed message and reverse the whitening sequence
    const cleanPayload = decodeResult.message;
    for (let i = 0; i < cleanPayload.length; i++) {
      cleanPayload[i] ^= WHITENING_KEY[i % WHITENING_KEY.length];
    }

    // 4. Verification Phase
    // The system must perfectly restore the original all-zeros configuration
    expect(cleanPayload[0]).toBe(0x00);
    expect(cleanPayload[1]).toBe(0x00);
    expect(cleanPayload[2]).toBe(0x00);
    expect(cleanPayload[3]).toBe(0x00);
  });
});
