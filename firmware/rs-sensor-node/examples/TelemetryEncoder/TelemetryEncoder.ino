#include <xkid1-reed-solomon.h>

const uint8_t telemetry[] = {0x01, 0x1a, 0x0c, 0xce};
const uint8_t whiteningKey[] = {0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07};
uint8_t whitenedTelemetry[sizeof(telemetry)];
uint8_t parity[RS_PARITY_BYTES];

void setup() {
  Serial.begin(115200);
  // The gateway removes this mask only after correcting the full codeword.
  for (size_t i = 0; i < sizeof(telemetry); i++) {
    whitenedTelemetry[i] = telemetry[i] ^ whiteningKey[i % sizeof(whiteningKey)];
  }
  rs_encode(whitenedTelemetry, sizeof(whitenedTelemetry), parity);

  Serial.print("Codeword:");
  for (uint8_t value : whitenedTelemetry) {
    Serial.print(' ');
    Serial.print(value, HEX);
  }
  for (uint8_t value : parity) {
    Serial.print(' ');
    Serial.print(value, HEX);
  }
  Serial.println();
}

void loop() {}