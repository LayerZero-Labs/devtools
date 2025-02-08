#[cfg(test)]
mod test_msg_codec {
    use anchor_lang::prelude::Pubkey;
    use oft::compose_msg_codec;
    use oft::instructions::ComposeParams;
    use oft::msg_codec;

    #[test]
    fn test_msg_codec_with_compose_msg() {
        let send_to: [u8; 32] = [1; 32];
        let amount_sd: u64 = 123456789;
        let sender: Pubkey = Pubkey::new_unique();
        let compose_params =
            ComposeParams { compose_gas: 1u64, compose_msg: vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
        let encoded = msg_codec::encode(send_to, amount_sd, sender, &Some(compose_params.clone()));

        assert_eq!(encoded.len(), 81 + compose_params.compose_msg.len());
        assert_eq!(msg_codec::send_to(&encoded), send_to);
        assert_eq!(msg_codec::amount_sd(&encoded), amount_sd);
        assert_eq!(
            msg_codec::compose_msg(&encoded),
            Some(
                [
                    sender.to_bytes().as_ref(),
                    &compose_params.compose_gas.to_be_bytes(),
                    &compose_params.compose_msg.as_slice()
                ]
                .concat()
            )
        );
    }

    #[test]
    fn test_msg_codec_without_compose_msg() {
        let send_to: [u8; 32] = [1; 32];
        let amount_sd: u64 = 123456789;
        let sender: Pubkey = Pubkey::new_unique();
        let encoded = msg_codec::encode(send_to, amount_sd, sender, &None);
        assert_eq!(encoded.len(), 41);
        assert_eq!(msg_codec::send_to(&encoded), send_to);
        assert_eq!(msg_codec::amount_sd(&encoded), amount_sd);
        assert_eq!(msg_codec::compose_msg(&encoded), None);
    }

    #[test]
    fn test_compose_msg_codec() {
        let nonce: u64 = 123456789;
        let src_eid: u32 = 10101;
        let amount_ld: u64 = 123456789;
        let compose_from: [u8; 32] = [1; 32];
        let compose_gas: u64 = 0;
        let compose_msg: Vec<u8> = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        let encoded = compose_msg_codec::encode(
            nonce,
            src_eid,
            amount_ld,
            &[&compose_from[..], &compose_gas.to_be_bytes(), &compose_msg].concat(),
        );
        assert_eq!(
            encoded.len(),
            20 + [&compose_from[..], &compose_gas.to_be_bytes(), &compose_msg].concat().len()
        );
        assert_eq!(compose_msg_codec::nonce(&encoded), nonce);
        assert_eq!(compose_msg_codec::src_eid(&encoded), src_eid);
        assert_eq!(compose_msg_codec::amount_ld(&encoded), amount_ld);
        assert_eq!(
            compose_msg_codec::compose_msg(&encoded),
            [&compose_gas.to_be_bytes(), compose_msg.as_slice()].concat().to_vec()
        );
    }
}
