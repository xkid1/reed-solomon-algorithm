use rs_sensors_node::{PARITY_BYTES, ReedSolomonEncoder};

const WHITENING_KEY: [u8; 8] = [0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07];

fn main() {
    let telemetry = [0x01, 0x1a, 0x0c, 0xce];
    let mut whitened = [0u8; 4];
    for (index, byte) in telemetry.iter().enumerate() {
        whitened[index] = *byte ^ WHITENING_KEY[index % WHITENING_KEY.len()];
    }

    let parity = ReedSolomonEncoder::new().encode(&whitened);
    let mut codeword = [0u8; 4 + PARITY_BYTES];
    codeword[..4].copy_from_slice(&whitened);
    codeword[4..].copy_from_slice(&parity);
    for byte in codeword {
        print!("{byte:02x} ");
    }
    println!();
}
