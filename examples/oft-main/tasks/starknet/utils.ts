import { Account } from 'starknet'

import { formatEid } from '@layerzerolabs/devtools'
import { createConnectionFactory } from '@layerzerolabs/devtools-starknet'
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

    const providerFactory = createConnectionFactory()
    return new Account(await providerFactory(eid), address, privateKey)
}
