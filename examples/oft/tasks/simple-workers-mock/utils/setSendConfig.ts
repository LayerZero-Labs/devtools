import { Contract, ethers } from 'ethers'

import { Uln302 } from '@layerzerolabs/protocol-devtools-evm'

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

    console.log(`\n📋 Setting up executor send configuration for ${contractName}`)
    console.log(`   OApp:           ${oappAddress}`)
    console.log(`   Destination EID: ${dstEid}`)
    console.log(`   Send Lib:       ${sendLibrary}`)
    console.log(`   DVN:            ${dvnAddress}`)
    console.log(`   Executor:       ${executorAddress}\n`)

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

    console.log(`Setting ULN and Executor config...`)

    try {
        const tx = await endpointContract.setConfig(oappAddress, sendLibrary, setConfigParams)
        const receipt = await tx.wait()

        console.log(`✅ setConfig txHash: ${receipt.transactionHash}`)
        console.log(`\n🎉 Send configuration completed successfully!`)
        console.log(`   Local OApp ${contractName} → Destination EID ${dstEid}`)
        console.log(`   Using SimpleDVNMock: ${dvnAddress}`)
        console.log(`   Using SimpleExecutorMock: ${executorAddress}\n`)

        return receipt
    } catch (error: unknown) {
        console.log(`❌ Error occurred:`, error)
        throw error
    }
}
