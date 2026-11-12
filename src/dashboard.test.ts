import { describe, expect, it } from 'vitest';

import { parseFixedPayloadToJSON } from './dashboard.js';

describe('parseFixedPayloadToJSON', () => {
  it('parses positive and negative temperatures and a healthy battery', () => {
    expect(parseFixedPayloadToJSON(new Uint8Array([7, 22, 0x0d, 0x48]))).toMatchObject({
      sensorId: 7,
      temperatureCelsius: 22,
      batteryVoltageMilliVolts: 3400,
      batteryStatus: 'Healthy',
    });
    expect(parseFixedPayloadToJSON(new Uint8Array([8, 0xf6, 0x0e, 0x10]))).toMatchObject({
      sensorId: 8,
      temperatureCelsius: -10,
      batteryVoltageMilliVolts: 3600,
      batteryStatus: 'Healthy',
    });
  });

  it('classifies low and critical battery levels', () => {
    expect(
      parseFixedPayloadToJSON(new Uint8Array([1, 0, 0x0d, 0x3f])).batteryStatus,
    ).toBe('Low');
    expect(
      parseFixedPayloadToJSON(new Uint8Array([1, 0, 0x0b, 0xb7])).batteryStatus,
    ).toBe('Critical');
  });

  it('rejects payloads shorter than the telemetry layout', () => {
    expect(() => parseFixedPayloadToJSON(new Uint8Array([1, 2, 3]))).toThrow(
      'Invalid telemetry payload length',
    );
  });
});
