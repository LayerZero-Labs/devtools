module oft::new_get_next_object_address {
    use std::signer;
    use initia_std::object;
    use initia_std::account;
    use std::bcs;
    use std::vector;
    use std::debug;

    const OBJECT_CODE_DEPLOYMENT_DOMAIN_SEPARATOR: vector<u8> = b"initia_std::object_code_deployment";

    #[view]
    public fun get_next_address(publisher: address): address {
        let sequence_number = account::get_sequence_number(publisher) + 2;
        let seed = vector[];
        vector::append(
            &mut seed,
            bcs::to_bytes(&OBJECT_CODE_DEPLOYMENT_DOMAIN_SEPARATOR)
        );
        vector::append(&mut seed, bcs::to_bytes(&sequence_number));
        
        let next_address = object::create_object_address(&publisher, seed);
        debug::print(&next_address); // This will help us see the address in the logs
        next_address
    }
} 