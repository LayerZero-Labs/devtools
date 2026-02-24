import { EndpointId } from '@layerzerolabs/lz-definitions'

export const SUI_ENDPOINT_V2_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.SUI_V2_MAINNET]: '0x31beaef889b08b9c3b37d19280fc1f8b75bae5b2de2410fc3120f403e9a36dac',
    [EndpointId.SUI_V2_TESTNET]: '0xabf9629418d997fcc742a5ca22820241b72fb53691f010bc964eb49b4bd2263a',
}

export const SUI_ULN_302_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.SUI_V2_MAINNET]: '0x3ce7457bed48ad23ee5d611dd3172ae4fbd0a22ea0e846782a7af224d905dbb0',
    [EndpointId.SUI_V2_TESTNET]: '0xf5d69c7b0922ce0ab4540525fbc66ca25ce9f092c64b032b91e4c5625ea0fb24',
}

export const SUI_EXECUTOR_ADDRESSES: Partial<Record<EndpointId, string>> = {
    [EndpointId.SUI_V2_MAINNET]: '0xde7fe1a6648d587fcc991f124f3aa5b6389340610804108094d5c5fbf61d1989',
    [EndpointId.SUI_V2_TESTNET]: '0xb9fdc6748fb939095e249b22717d564edf890681e387131d6c525d867d30f834',
}
