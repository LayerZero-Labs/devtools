// tasks/mock/setReceiveConfig.ts
import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Uln302 } from '@layerzerolabs/protocol-devtools-evm'

interface TaskArgs {
    srcEid: number // the source EID whose messages you will verify
    contractName: string // deployment name of the local OFT
    dvn?: string // address of your rescue DVN
    executorAddress?: string // address of the executor
}

// SetConfigParam struct for V2 interface
interface SetConfigParam {
    eid: number
    configType: number
    config: string
}

async function getEndpointContract(hre: HardhatRuntimeEnvironment): Promise<Contract> {
    const endpointDep = await hre.deployments.get('EndpointV2')
    const signer = (await hre.ethers.getSigners())[0]
    return new Contract(endpointDep.address, endpointDep.abi, signer)
}

task('lz:simple-dvn:set-receive-config', 'Configure ULN receive side to use your SimpleDVN for both ULN and Executor')
    .addParam('srcEid', 'Peer/source EID', undefined, types.int)
    .addParam('contractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('executorAddress', 'Executor address', undefined, types.string) // default value obtained from Executor deployment
    .addOptionalParam('dvn', 'SimpleDVN address', undefined, types.string) // default value obtained from SimpleDVN deployment
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { srcEid, contractName, dvn, executorAddress } = args

        // Get the OApp contract
        const oappDep = await hre.deployments.get(contractName)
        const oappAddress = oappDep.address

        // Get the Endpoint contract (V2 interface)
        const endpoint = await getEndpointContract(hre)

        // Get ReceiveUln302 address
        const recvUlnDep = await hre.deployments.get('ReceiveUln302')
        const receiveLibrary = recvUlnDep.address

        let appliedExecutorAddress = executorAddress
        if (!executorAddress) {
            appliedExecutorAddress = (await hre.deployments.get('Executor')).address
        }

        // Get SimpleDVN address
        const dvnDep = await hre.deployments.get('SimpleDVN')
        const dvnAddress = dvn || dvnDep.address // if dvn is not provided, use the deployed SimpleDVN

        console.log(`\n📋 Setting up receive configuration for ${contractName}`)
        console.log(`   OApp:           ${oappAddress}`)
        console.log(`   Source EID:     ${srcEid}`)
        console.log(`   Receive Lib:    ${receiveLibrary}`)
        console.log(`   DVN:            ${dvnAddress}`)
        console.log(`   Executor:       ${appliedExecutorAddress}\n`)

        // Debug: Check if dvnAddress is valid
        if (!dvnAddress || dvnAddress === hre.ethers.constants.AddressZero) {
            throw new Error(`Invalid DVN address: ${dvnAddress}`)
        }

        // set up ULN SDK
        const uln302 = new Uln302(hre.ethers.provider, {
            eid: srcEid,
            address: receiveLibrary,
        })

        // Configure ULN with SimpleDVN using V2 interface
        const ulnConfig = uln302.encodeUlnConfig({
            confirmations: BigInt(1),
            requiredDVNs: [dvnAddress],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        })

        if (!appliedExecutorAddress || appliedExecutorAddress === hre.ethers.constants.AddressZero) {
            throw new Error(`Invalid executor address: ${appliedExecutorAddress}`)
        }

        const setConfigParams: SetConfigParam[] = [
            {
                eid: srcEid,
                configType: 2, // CONFIG_TYPE_ULN
                config: ulnConfig,
            },
        ]

        console.log(`Setting ULN and Executor config...`)
        try {
            const tx = await endpoint.setConfig(oappAddress, receiveLibrary, setConfigParams)
            console.log(`✅ setConfig txHash: ${(await tx.wait()).transactionHash}`)

            console.log(`\n🎉 Receive configuration completed successfully!`)
            console.log(`   Source EID ${srcEid} → Local OApp ${contractName}`)
            console.log(`   Using SimpleDVN: ${dvnAddress}`)
            console.log(`   Using Executor: ${appliedExecutorAddress}\n`)
        } catch (error: unknown) {
            console.log(`❌ Error occurred:`, error)
            throw error
        }
    })
