import { EndpointId } from '@layerzerolabs/lz-definitions'

export const STARKNET_ENDPOINT_V2_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.STARKNET_V2_MAINNET]: '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68',
    [EndpointId.STARKNET_V2_TESTNET]: '0x0316d70a6e0445a58c486215fac8ead48d3db985acde27efca9130da4c675878',
}

export const STARKNET_ULN_302_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.STARKNET_V2_MAINNET]: '0x0727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38',
    [EndpointId.STARKNET_V2_TESTNET]: '0x0706572d6f7b938c813a20dc1b0328b83de939066e25bd0fbe14c270077f769d',
}

export const STARKNET_EXECUTOR_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.STARKNET_V2_MAINNET]: '0x03887bd8da2999d39e2e88fe55733c4cac8e20a6d51bfe162176c9f2eb134c65',
    [EndpointId.STARKNET_V2_TESTNET]: '0x068ffdaca6533001344f377beaf1137360168604b227df3e8cf735fe06da47a9',
}
