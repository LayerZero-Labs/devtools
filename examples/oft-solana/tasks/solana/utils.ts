import { Connection, PublicKey } from '@solana/web3.js'
import { backOff } from 'exponential-backoff'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

/**
 * Assert that the account is initialized on the Solana blockchain.  Due to eventual consistency, there is a race
 * between account creation and initialization.  This function will retry 10 times with backoff to ensure the account is
 * initialized.
 * @param connection {Connection}
 * @param publicKey {PublicKey}
 */
export const assertAccountInitialized = async (connection: Connection, publicKey: PublicKey) => {
    return backOff(
        async () => {
            const accountInfo = await connection.getAccountInfo(publicKey)
            if (!accountInfo) {
                throw new Error('Multisig account not found')
            }
            return accountInfo
        },
        {
            maxDelay: 30000,
            numOfAttempts: 10,
            startingDelay: 5000,
        }
    )
}

export const findSolanaEndpointIdInGraph = async (hre: HardhatRuntimeEnvironment, oappConfig: string) => {
    const graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    let solanaEid: EndpointId | null = null

    // Helper function to check and assign Solana Endpoint ID
    const checkSolanaEndpoint = (eid: EndpointId) => {
        if (endpointIdToChainType(eid) === ChainType.SOLANA) {
            if (solanaEid === null) {
                solanaEid = eid
            } else if (solanaEid !== eid) {
                throw new Error(`Multiple Solana Endpoint IDs found in the graph: ${solanaEid}, ${eid}`)
            }
        }
    }

    // Iterate through connections and check both `from` and `to` endpoints
    for (const connection of graph.connections) {
        checkSolanaEndpoint(connection.vector.from.eid)
        checkSolanaEndpoint(connection.vector.to.eid)
        // we also ahve the option of terminating early as soon as we find a solana endpoint
        // that means we assume that there will never be more than one solana endpoint in the graph
    }

    if (solanaEid === null) {
        throw new Error('No Solana Endpoint ID found in the graph')
    }

    return solanaEid
}
