import { Contract, ethers } from 'ethers'

import { createLogger } from '@layerzerolabs/io-devtools'
import { Uln302 } from '@layerzerolabs/protocol-devtools-evm'

const logger = createLogger()

export interface SetReceiveConfigArgs {
    srcEid: number
    contractName: string
}

export interface SetReceiveConfigParams {
    oappAddress: string
    receiveLibrary: string
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

const CONFIG_TYPE_ULN = 2

/**
 * Receive configuration setup
 */
export async function setReceiveConfig(
    endpointContract: Contract,
    params: SetReceiveConfigParams,
    args: SetReceiveConfigArgs
) {
    const { srcEid, contractName } = args
    const { oappAddress, receiveLibrary, dvnAddress, executorAddress, provider } = params

    logger.info(`\nSetting up executor receive configuration for ${contractName}`)
    logger.info(`   OApp:           ${oappAddress}`)
    logger.info(`   Source EID:     ${srcEid}`)
    logger.info(`   Receive Lib:    ${receiveLibrary}`)
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
        eid: srcEid,
        address: receiveLibrary,
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
            eid: srcEid,
            configType: CONFIG_TYPE_ULN,
            config: ulnConfig,
        },
    ]

    logger.info(`Setting ULN config...`)

    try {
        const tx = await endpointContract.setConfig(oappAddress, receiveLibrary, setConfigParams)
        const receipt = await tx.wait()

        logger.info(`setConfig txHash: ${receipt.transactionHash}`)
        logger.info(`\nReceive configuration completed successfully!`)
        logger.info(`   Source EID ${srcEid} → Local OApp ${contractName}`)
        logger.info(`   Using SimpleDVNMock: ${dvnAddress}`)
        logger.info(`   Using SimpleExecutorMock: ${executorAddress}\n`)

        return receipt
    } catch (error: unknown) {
        logger.error(`Error occurred:`, error)
        throw error
    }
}
