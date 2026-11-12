#include <array>
#include <cstdint>
#include <iostream>

#include "xkid1-reed-solomon.h"

int main() {
    const std::array<uint8_t, 4> whitened = {0x18, 0x77, 0x33, 0x54};
    const std::array<uint8_t, RS_PARITY_BYTES> expected = {0x4e, 0x28, 0x71, 0x1f};
    std::array<uint8_t, RS_PARITY_BYTES> parity = {};

    rs_encode(whitened.data(), whitened.size(), parity.data());
    if (parity != expected) {
        std::cerr << "C++ firmware parity vector did not match\n";
        return 1;
    }

    std::cout << "C++ firmware API/linkage passed\n";
    return 0;
}
