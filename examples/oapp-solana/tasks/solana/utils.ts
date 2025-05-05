import { Connection, PublicKey } from '@solana/web3.js'
import { backOff } from 'exponential-backoff'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
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

export const findSolanaEndpointIdInGraph = async (
    hre: HardhatRuntimeEnvironment,
    oappConfig: string
): Promise<EndpointId> => {
    if (!oappConfig) throw new Error('Missing oappConfig')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
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

    for (const { vector } of graph.connections) {
        checkSolanaEndpoint(vector.from.eid)
        checkSolanaEndpoint(vector.to.eid)
        if (solanaEid) return solanaEid
    }

    throw new Error('No Solana Endpoint ID found. Ensure your OApp configuration includes a valid Solana endpoint.')
}

// Define interfaces for more explicit typing
interface PrioritizationFeeObject {
    slot: number
    prioritizationFee: number
}

interface Config {
    lockedWritableAccounts: PublicKey[]
}

export const getPrioritizationFees = async (
    connection: Connection,
    programId?: string // TODO: change to array of addresses / public keys to match lockedWritableAccounts' type
): Promise<{
    averageFeeIncludingZeros: number
    averageFeeExcludingZeros: number
    medianFee: number
}> => {
    try {
        const publicKey = new PublicKey(programId || PublicKey.default) // the account that will be written to

        const config: Config = {
            lockedWritableAccounts: [publicKey],
        }

        const prioritizationFeeObjects = (await connection.getRecentPrioritizationFees(
            config
        )) as PrioritizationFeeObject[]

        if (prioritizationFeeObjects.length === 0) {
            console.log('No prioritization fee data available.')
            return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
        }

        // Extract slots and sort them
        // const slots = prioritizationFeeObjects.map((feeObject) => feeObject.slot).sort((a, b) => a - b)

        // Calculate the average including zero fees
        const averageFeeIncludingZeros =
            prioritizationFeeObjects.length > 0
                ? Math.floor(
                      prioritizationFeeObjects.reduce((acc, feeObject) => acc + feeObject.prioritizationFee, 0) /
                          prioritizationFeeObjects.length
                  )
                : 0

        // Filter out prioritization fees that are equal to 0 for other calculations
        const nonZeroFees = prioritizationFeeObjects
            .map((feeObject) => feeObject.prioritizationFee)
            .filter((fee) => fee !== 0)

        // Calculate the average of the non-zero fees
        const averageFeeExcludingZeros =
            nonZeroFees.length > 0 ? Math.floor(nonZeroFees.reduce((acc, fee) => acc + fee, 0) / nonZeroFees.length) : 0

        // Calculate the median of the non-zero fees
        const sortedFees = nonZeroFees.sort((a, b) => a - b)
        let medianFee = 0
        if (sortedFees.length > 0) {
            const midIndex = Math.floor(sortedFees.length / 2)
            medianFee =
                sortedFees.length % 2 !== 0
                    ? sortedFees[midIndex]
                    : Math.floor((sortedFees[midIndex - 1] + sortedFees[midIndex]) / 2)
        }
        return { averageFeeIncludingZeros, averageFeeExcludingZeros, medianFee }
    } catch (error) {
        console.error('Error fetching prioritization fees:', error)
        return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
    }
}
