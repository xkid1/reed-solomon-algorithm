import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';

import { parseFixedPayloadToJSON } from './dashboard.js';

import { ReedSolomon } from './index.js';

const PARITY_BYTES = 4;
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const codec = new ReedSolomon(PARITY_BYTES);
const WHITENING_KEY = new Uint8Array([0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07]);
const demoMode = process.argv.includes('--demo');

const dashboardClients = new Set<ServerResponse>();
// eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed local asset URL
const dashboardHtml = readFileSync(new URL('./html/index.html', import.meta.url), 'utf8');

const server = createServer((request, response) => {
  if (request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(dashboardHtml);
    return;
  }

  if (request.url === '/events') {
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    });
    response.write(': connected\n\n');
    dashboardClients.add(response);
    response.on('close', () => dashboardClients.delete(response));
    return;
  }

  response.writeHead(404);
  response.end('Not found');
});

/**
 * Call this function whenever your hardware gateway receives raw bytes from an ESP32/STM32 node.
 */
export function handleIncomingHardwareFrame(rawBuffer: Uint8Array): void {
  try {
    // Step 1: Repair physical channel transmission errors using your library
    const decodeResult = codec.decode(rawBuffer);
    const fixedPayload = decodeResult.message;

    // Step 2: Strip out the hardware whitening mask
    for (let i = 0; i < fixedPayload.length; i++) {
      fixedPayload[i] ^= WHITENING_KEY[i % WHITENING_KEY.length];
    }

    // Step 3: Parse clean bytes into highly scannable JSON metrics
    const dashboardMetrics = parseFixedPayloadToJSON(fixedPayload);

    // Enrich with error statistics so the dashboard shows real-time link health
    const linkStatus = decodeResult.errors === 0 ? 'Excellent' : 'Degraded';
    const generalizedPayload = JSON.stringify({
      ...dashboardMetrics,
      linkErrorsCorrected: decodeResult.errors,
      linkStatus,
    });

    console.log(`📢 Broadcasting live metrics for Sensor #${dashboardMetrics.sensorId}`);
    for (const client of dashboardClients) {
      client.write(`data: ${generalizedPayload}\n\n`);
    }
  } catch (error) {
    console.error('⚠️ Frame dropped:', error);
  }
}

server.listen(port, () => {
  console.log(
    `🚀 Telemetry event stream active at http://localhost:${String(port)}/events`,
  );

  if (!demoMode) {
    return;
  }

  console.log(
    '📡 Demo telemetry enabled; publishing a corrected sample every 2 seconds.',
  );
  let sampleIndex = 0;
  const publishDemoFrame = () => {
    const telemetry = new Uint8Array([1, 20 + (sampleIndex % 8), 0x0e, 0x74]);
    sampleIndex++;

    const whitened = new Uint8Array(telemetry.length);
    for (let i = 0; i < telemetry.length; i++) {
      whitened[i] = telemetry[i] ^ WHITENING_KEY[i % WHITENING_KEY.length];
    }

    const frame = codec.encode(whitened);
    frame[0] ^= 0x55;
    frame[5] ^= 0xa5;
    handleIncomingHardwareFrame(frame);
  };

  publishDemoFrame();
  const demoTimer = setInterval(publishDemoFrame, 2_000);
  server.on('close', () => {
    clearInterval(demoTimer);
  });
});
