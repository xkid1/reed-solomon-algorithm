#ifndef REED_SOLOMON_H
#define REED_SOLOMON_H

#include <stddef.h>
#include <stdint.h>

#define RS_PARITY_BYTES 4

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Encode data using the matching GF(256), first-root-zero, four-byte profile.
 * The caller must provide an output buffer of RS_PARITY_BYTES bytes.
 */
void rs_encode(const uint8_t *data, size_t data_len, uint8_t *parity_out);

#ifdef __cplusplus
}
#endif

#endif
