pub const EXECUTOR_ID: u8 = 1; // WORKER_ID

pub const LZ_RECEIVE_TYPE: u8 = 1; // OPTION_TYPE

pub const LZ_COMPOSE_TYPE: u8 = 3; // OPTION_TYPE

pub fn executor_lz_receive_option(gas_limit: u128) -> Vec<u8> {
    let params = gas_limit.to_be_bytes();
    let mut options = Vec::with_capacity(6 + params.len()); // 2 + 1 + 2 + 1 + 16
    options.extend_from_slice(&3u16.to_be_bytes()); // option type
    options.push(EXECUTOR_ID); // worker id
    options.extend_from_slice(&(params.len() as u16 + 1).to_be_bytes());
    options.push(LZ_RECEIVE_TYPE); // option type
    options.extend_from_slice(&params);
    options
}

pub fn executor_lz_compose_option(index: u16, gas_limit: u128) -> Vec<u8> {
    let mut params: Vec<u8> = Vec::with_capacity(2 + 16);
    params.extend_from_slice(&index.to_be_bytes());
    params.extend_from_slice(&gas_limit.to_be_bytes());

    let mut options = Vec::with_capacity(9 + params.len()); // 2 + 1 + 2 + 1 + 2 + 1 + 2 + 16
    options.extend_from_slice(&3u16.to_be_bytes()); // option type
    options.push(EXECUTOR_ID); // worker id
    options.extend_from_slice(&(params.len() as u16 + 1).to_be_bytes());
    options.push(LZ_COMPOSE_TYPE); // option type
    options.extend_from_slice(&params);
    options
}
