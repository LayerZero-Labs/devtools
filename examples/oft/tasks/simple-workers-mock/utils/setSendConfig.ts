import { Contract, ethers } from 'ethers'

import { createLogger } from '@layerzerolabs/io-devtools'
import { Uln302 } from '@layerzerolabs/protocol-devtools-evm'

const logger = createLogger()

export interface SetSendConfigArgs {
    dstEid: number
    contractName: string
    dvn?: string
    executorAddress?: string
}

export interface SetSendConfigParams {
    oappAddress: string
    sendLibrary: string
    dvnAddress: string
    executorAddress: string
    provider: ethers.providers.Provider
}

// SetConfigParam struct for V2 interface
interface SetConfigParam {
    eid: number
    configType: number
    config: string
}

// Executor configuration
// interface ExecutorConfig {
//     maxMessageSize: number
//     executorAddress: string
// }

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

/**
 * Send configuration setup
 */
export async function setSendConfig(endpointContract: Contract, params: SetSendConfigParams, args: SetSendConfigArgs) {
    const { dstEid, contractName } = args
    const { oappAddress, sendLibrary, dvnAddress, executorAddress, provider } = params

    logger.info(`\nSetting up executor send configuration for ${contractName}`)
    logger.info(`   OApp:           ${oappAddress}`)
    logger.info(`   Destination EID: ${dstEid}`)
    logger.info(`   Send Lib:       ${sendLibrary}`)
    logger.info(`   DVN:            ${dvnAddress}`)
    logger.info(`   Executor:       ${executorAddress}\n`)

    // Validate addresses
    if (!dvnAddress || dvnAddress === ethers.constants.AddressZero) {
        throw new Error(`Invalid DVN address: ${dvnAddress}`)
    }

    if (!executorAddress || executorAddress === ethers.constants.AddressZero) {
        throw new Error(`Invalid executor address: ${executorAddress}`)
    }

    // Set up ULN SDK
    const uln302 = new Uln302(provider as ethers.providers.BaseProvider, {
        eid: dstEid,
        address: sendLibrary,
    })

    const MAX_MESSAGE_SIZE = 10000

    const executorConfig = uln302.encodeExecutorConfig({
        maxMessageSize: MAX_MESSAGE_SIZE,
        executor: executorAddress,
    })

    // Configure ULN with SimpleDVNMock using V2 interface
    const ulnConfig = uln302.encodeUlnConfig({
        confirmations: BigInt(1),
        requiredDVNs: [dvnAddress],
        optionalDVNs: [],
        optionalDVNThreshold: 0,
    })

    const setConfigParams: SetConfigParam[] = [
        {
            eid: dstEid,
            configType: CONFIG_TYPE_EXECUTOR,
            config: executorConfig,
        },
        {
            eid: dstEid,
            configType: CONFIG_TYPE_ULN,
            config: ulnConfig,
        },
    ]

    logger.info(`Setting ULN and Executor config...`)

    try {
        const tx = await endpointContract.setConfig(oappAddress, sendLibrary, setConfigParams)
        const receipt = await tx.wait()

        logger.info(`setConfig txHash: ${receipt.transactionHash}`)
        logger.info(`\nSend configuration completed successfully!`)
        logger.info(`   Local OApp ${contractName} → Destination EID ${dstEid}`)
        logger.info(`   Using SimpleDVNMock: ${dvnAddress}`)
        logger.info(`   Using SimpleExecutorMock: ${executorAddress}\n`)

        return receipt
    } catch (error: unknown) {
        logger.error(`Error occurred:`, error)
        throw error
    }
}
