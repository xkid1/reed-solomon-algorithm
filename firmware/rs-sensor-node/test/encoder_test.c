#include <stdio.h>
#include <stdint.h>

#include "xkid1-reed-solomon.h"

static int matches_parity(const uint8_t *data, size_t data_len, const uint8_t *expected) {
    uint8_t parity[RS_PARITY_BYTES];
    rs_encode(data, data_len, parity);

    for (size_t i = 0; i < RS_PARITY_BYTES; i++) {
        if (parity[i] != expected[i]) {
            fprintf(stderr, "parity byte %zu: expected 0x%02x, got 0x%02x\n",
                    i, expected[i], parity[i]);
            return 0;
        }
    }
    return 1;
}

int main(void) {
    const uint8_t telemetry[] = {0x01, 0x1a, 0x0c, 0xce};
    const uint8_t telemetry_parity[] = {0x5f, 0x13, 0x6c, 0xf9};
    const uint8_t whitened[] = {0x18, 0x77, 0x33, 0x54};
    const uint8_t whitened_parity[] = {0x4e, 0x28, 0x71, 0x1f};

    if (!matches_parity(telemetry, sizeof(telemetry), telemetry_parity) ||
        !matches_parity(whitened, sizeof(whitened), whitened_parity)) {
        return 1;
    }

    puts("C firmware parity vectors passed");
    return 0;
}
