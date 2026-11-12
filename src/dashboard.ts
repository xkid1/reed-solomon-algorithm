export interface TelemetryDashboardMetrics {
  timestamp: string;
  sensorId: number;
  temperatureCelsius: number;
  batteryVoltageMilliVolts: number;
  batteryStatus: 'Healthy' | 'Low' | 'Critical';
}

/**
 * Transforms fixed, un-whitened hardware byte arrays into standard JSON streams.
 * Payload shape: [SensorID (1B), Temp (1B), BatteryHigh (1B), BatteryLow (1B)]
 */
export function parseFixedPayloadToJSON(payload: Uint8Array): TelemetryDashboardMetrics {
  if (payload.length < 4) {
    throw new Error('Invalid telemetry payload length: Expected at least 4 bytes.');
  }

  const sensorId = payload[0];

  // Handle signed numbers for temperatures below 0°C using standard Int8 mapping
  const rawTemp = payload[1];
  const temperatureCelsius = rawTemp > 127 ? rawTemp - 256 : rawTemp;

  // Unpack high and low bytes into a unified 16-bit unsigned integer (Big-Endian)
  const batteryVoltageMilliVolts = (payload[2] << 8) | payload[3];

  // Determine health metrics thresholds
  let batteryStatus: 'Healthy' | 'Low' | 'Critical' = 'Healthy';
  if (batteryVoltageMilliVolts < 3000) batteryStatus = 'Critical';
  else if (batteryVoltageMilliVolts < 3400) batteryStatus = 'Low';

  return {
    timestamp: new Date().toISOString(),
    sensorId,
    temperatureCelsius,
    batteryVoltageMilliVolts,
    batteryStatus,
  };
}

// Example usage within your gateway pipeline loop:
// const metricsJson = parseFixedPayloadToJSON(repairedAndUnscrambledBytes);
// io.emit('dashboard:update', metricsJson); // Casts to your React/Vue dashboard UI instantly
