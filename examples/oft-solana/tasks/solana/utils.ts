import path from 'path'

import { Connection, PublicKey } from '@solana/web3.js'
import { backOff } from 'exponential-backoff'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { importDefault } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraphHardhat } from '@layerzerolabs/ua-devtools'

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

export const findSolanaEndpointIdInGraph = async (
    hre: HardhatRuntimeEnvironment,
    oappConfig: string
): Promise<EndpointId> => {
    if (!oappConfig) throw new Error('Missing oappConfig')

    let graph: OAppOmniGraphHardhat
    try {
        graph = await getLzConfig(oappConfig)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    let solanaEid: EndpointId | null = null

    const checkSolanaEndpoint = (eid: EndpointId) => {
        if (endpointIdToChainType(eid) === ChainType.SOLANA) {
            if (solanaEid && solanaEid !== eid) {
                throw new Error(`Multiple Solana Endpoint IDs found: ${solanaEid}, ${eid}`)
            }
            solanaEid = eid
        }
    }

    for (const vector of graph.connections) {
        checkSolanaEndpoint(vector.from.eid)
        checkSolanaEndpoint(vector.to.eid)
        if (solanaEid) return solanaEid
    }

    throw new Error('No Solana Endpoint ID found. Ensure your OApp configuration includes a valid Solana endpoint.')
}

export async function getLzConfig(configPath: string): Promise<OAppOmniGraphHardhat> {
    const lzConfigPath = path.resolve(path.join(process.cwd(), configPath))
    const lzConfigFile = await importDefault(lzConfigPath)
    const lzConfig = lzConfigFile as OAppOmniGraphHardhat
    return lzConfig
}
