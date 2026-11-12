#![no_std]

const PRIMITIVE_POLY: u16 = 0x11d;
pub const PARITY_BYTES: usize = 4;

pub struct ReedSolomonEncoder {
    gf_exp: [u8; 510],
    gf_log: [u8; 256],
}

impl ReedSolomonEncoder {
    pub fn new() -> Self {
        let mut gf_exp = [0u8; 510];
        let mut gf_log = [0u8; 256];
        let mut value = 1u16;

        for i in 0..255 {
            gf_exp[i] = value as u8;
            gf_log[value as usize] = i as u8;
            value <<= 1;
            if value & 0x100 != 0 {
                value ^= PRIMITIVE_POLY;
            }
        }
        for i in 255..510 {
            gf_exp[i] = gf_exp[i - 255];
        }

        Self { gf_exp, gf_log }
    }

    pub fn encode(&self, data: &[u8]) -> [u8; PARITY_BYTES] {
        const GENERATOR_POLY: [u8; PARITY_BYTES] = [0x0f, 0x36, 0x78, 0x40];
        let mut parity = [0u8; PARITY_BYTES];
        for &byte in data {
            let feedback = byte ^ parity[0];
            for index in 0..PARITY_BYTES - 1 {
                parity[index] = parity[index + 1];
            }
            parity[PARITY_BYTES - 1] = 0;

            if feedback != 0 {
                let log_feedback = self.gf_log[feedback as usize] as usize;
                for (index, value) in parity.iter_mut().enumerate() {
                    let coefficient = GENERATOR_POLY[index];
                    if coefficient != 0 {
                        let log_coefficient = self.gf_log[coefficient as usize] as usize;
                        *value ^= self.gf_exp[log_feedback + log_coefficient];
                    }
                }
            }
        }
        parity
    }
}

impl Default for ReedSolomonEncoder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::{PARITY_BYTES, ReedSolomonEncoder};

    #[test]
    fn encodes_a_codeword_matching_the_typescript_library() {
        let encoder = ReedSolomonEncoder::new();
        assert_eq!(
            encoder.encode(&[0x01, 0x1a, 0x0c, 0xce]),
            [0x5f, 0x13, 0x6c, 0xf9]
        );
        assert_eq!(PARITY_BYTES, 4);
    }

    #[test]
    fn encodes_the_whitened_telemetry_profile() {
        let encoder = ReedSolomonEncoder::new();
        assert_eq!(
            encoder.encode(&[0x18, 0x77, 0x33, 0x54]),
            [0x4e, 0x28, 0x71, 0x1f]
        );
    }

    #[test]
    fn encodes_the_complete_whitened_telemetry_codeword() {
        const WHITENING_KEY: [u8; 8] = [0x19, 0x6d, 0x3f, 0x9a, 0x5b, 0xc2, 0xe4, 0x07];
        let telemetry = [0x01, 0x1a, 0x0c, 0xce];
        let mut whitened = [0u8; 4];
        for (index, byte) in telemetry.iter().enumerate() {
            whitened[index] = byte ^ WHITENING_KEY[index % WHITENING_KEY.len()];
        }
        let parity = ReedSolomonEncoder::new().encode(&whitened);
        let codeword = [
            whitened[0],
            whitened[1],
            whitened[2],
            whitened[3],
            parity[0],
            parity[1],
            parity[2],
            parity[3],
        ];

        assert_eq!(codeword, [0x18, 0x77, 0x33, 0x54, 0x4e, 0x28, 0x71, 0x1f]);
    }

    #[test]
    fn encodes_empty_data_as_zero_parity() {
        let encoder = ReedSolomonEncoder::new();
        assert_eq!(encoder.encode(&[]), [0; PARITY_BYTES]);
    }
}
