/* eslint-disable import/no-unresolved */
import { AptosClient } from 'aptos'

import { formatEid } from '@layerzerolabs/devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

// Example env variables
const RPC_URL_APTOS_TESTNET = process.env.RPC_URL_APTOS_TESTNET ?? 'https://fullnode.testnet.aptoslabs.com/v1'
const RPC_URL_APTOS_MAINNET = process.env.RPC_URL_APTOS_MAINNET ?? 'https://fullnode.mainnet.aptoslabs.com/v1'

/**
 * Creates a function that returns an AptosClient for a given EID.
 */
export function createAptosConnectionFactory() {
    return async (eid: EndpointId): Promise<AptosClient> => {
        if (endpointIdToChainType(eid) !== ChainType.APTOS) {
            throw new Error(`createAptosConnectionFactory() called with non-Aptos EID: ${formatEid(eid)}`)
        }

        switch (eid) {
            case EndpointId.APTOS_V2_TESTNET:
                return new AptosClient(RPC_URL_APTOS_TESTNET)
            case EndpointId.APTOS_V2_MAINNET:
                return new AptosClient(RPC_URL_APTOS_MAINNET)
            default:
                throw new Error(`Unsupported Aptos endpoint: ${formatEid(eid)}`)
        }
    }
}
