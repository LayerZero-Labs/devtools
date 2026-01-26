import { Account } from 'starknet'

import { formatEid } from '@layerzerolabs/devtools'
import { createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-starknet'
import { ChainType, EndpointId, Stage, endpointIdToChainType, endpointIdToStage } from '@layerzerolabs/lz-definitions'

export function assertStarknetEid(eid: EndpointId) {
    if (endpointIdToChainType(eid) !== ChainType.STARKNET) {
        throw new Error(`Expected Starknet EID but got ${formatEid(eid)}`)
    }
}

export async function getStarknetAccountFromEnv(eid: EndpointId): Promise<Account> {
    const isTestnet = endpointIdToStage(eid) !== Stage.MAINNET
    const address =
        (isTestnet ? process.env.STARKNET_ACCOUNT_ADDRESS_TESTNET : process.env.STARKNET_ACCOUNT_ADDRESS) ??
        process.env.STARKNET_ACCOUNT_ADDRESS
    const privateKey =
        (isTestnet ? process.env.STARKNET_PRIVATE_KEY_TESTNET : process.env.STARKNET_PRIVATE_KEY) ??
        process.env.STARKNET_PRIVATE_KEY

    if (!address || !privateKey) {
        throw new Error('STARKNET_ACCOUNT_ADDRESS and STARKNET_PRIVATE_KEY are required')
    }

    // Use createRpcUrlFactory() to read from environment variables (RPC_URL_STARKNET)
    const providerFactory = createConnectionFactory(createRpcUrlFactory())
    const provider = await providerFactory(eid)
    // starknet.js v8+ uses an options object for Account constructor
    return new Account({ provider, address, signer: privateKey })
}
