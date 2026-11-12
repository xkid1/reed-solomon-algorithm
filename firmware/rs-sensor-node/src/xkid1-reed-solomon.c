#include <stdint.h>

#include "xkid1-reed-solomon.h"

enum { PRIMITIVE_POLY = 0x11d };

static uint8_t gf_exp[510];
static uint8_t gf_log[256];
static uint8_t tables_initialized;
static const uint8_t generator_poly[RS_PARITY_BYTES] = {0x0f, 0x36, 0x78, 0x40};

static void init_encoder(void) {
    if (tables_initialized) {
        return;
    }

    uint16_t x = 1;
    for (int i = 0; i < 255; i++) {
        gf_exp[i] = (uint8_t)x;
        gf_log[x] = (uint8_t)i;
        x <<= 1;
        if (x & 0x100) {
            x ^= PRIMITIVE_POLY;
        }
    }
    for (int i = 255; i < 510; i++) {
        gf_exp[i] = gf_exp[i - 255];
    }
    tables_initialized = 1;
}

void rs_encode(const uint8_t *data, size_t data_len, uint8_t *parity_out) {
    init_encoder();

    for (size_t i = 0; i < RS_PARITY_BYTES; i++) {
        parity_out[i] = 0;
    }
    for (size_t i = 0; i < data_len; i++) {
        uint8_t feedback = data[i] ^ parity_out[0];

        for (int j = 0; j < RS_PARITY_BYTES - 1; j++) {
            parity_out[j] = parity_out[j + 1];
        }
        parity_out[RS_PARITY_BYTES - 1] = 0;

        if (feedback != 0) {
            int log_fb = gf_log[feedback];
            for (size_t j = 0; j < RS_PARITY_BYTES; j++) {
                parity_out[j] ^= gf_exp[log_fb + gf_log[generator_poly[j]]];
            }
        }
    }
}
