import { Contract, ethers } from 'ethers'

import { Uln302 } from '@layerzerolabs/protocol-devtools-evm'

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

    console.log(`\n📋 Setting up executor receive configuration for ${contractName}`)
    console.log(`   OApp:           ${oappAddress}`)
    console.log(`   Source EID:     ${srcEid}`)
    console.log(`   Receive Lib:    ${receiveLibrary}`)
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

    console.log(`Setting ULN config...`)

    try {
        const tx = await endpointContract.setConfig(oappAddress, receiveLibrary, setConfigParams)
        const receipt = await tx.wait()

        console.log(`✅ setConfig txHash: ${receipt.transactionHash}`)
        console.log(`\n🎉 Receive configuration completed successfully!`)
        console.log(`   Source EID ${srcEid} → Local OApp ${contractName}`)
        console.log(`   Using SimpleDVNMock: ${dvnAddress}`)
        console.log(`   Using SimpleExecutorMock: ${executorAddress}\n`)

        return receipt
    } catch (error: unknown) {
        console.log(`❌ Error occurred:`, error)
        throw error
    }
}
