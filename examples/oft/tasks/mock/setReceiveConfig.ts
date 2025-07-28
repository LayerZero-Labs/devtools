// tasks/mock/setReceiveConfig.ts
import { Contract, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArgs {
    remoteEid: number // the source EID whose messages you will verify
    contractName: string // deployment name of the local OFT / LzApp
    dvn: string // address of your rescue DVN
    executorAddress: string // address of the executor
}

// SetConfigParam struct for V2 interface
interface SetConfigParam {
    configType: number
    config: string
}

// Simple helper functions
const SUCCESS_SYMBOL = '✅'

function encodeUlnConfig(config: {
    confirmations: bigint
    requiredDVNs: string[]
    optionalDVNs: string[]
    optionalDVNThreshold: number
}) {
    return ethers.utils.defaultAbiCoder.encode(
        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
        [
            config.confirmations,
            config.requiredDVNs.length,
            config.optionalDVNs.length,
            config.optionalDVNThreshold,
            config.requiredDVNs,
            config.optionalDVNs,
        ]
    )
}

async function getEndpointContract(hre: HardhatRuntimeEnvironment): Promise<Contract> {
    const endpointDep = await hre.deployments.get('EndpointV2')
    const signer = (await hre.ethers.getSigners())[0]
    return new Contract(endpointDep.address, endpointDep.abi, signer)
}

task(
    'lz:simple-dvn:set-receive-config',
    'Set ReceiveUln302 as receive library and configure ULN receive side to use your SimpleDVN for both ULN and Executor'
)
    .addParam('remoteEid', 'Remote/source EID', undefined, types.int)
    .addParam('contractName', 'Name of the local OFT/LzApp in deployments', undefined, types.string)
    .addParam('dvn', 'SimpleDVN address', undefined, types.string)
    .addParam('executorAddress', 'Executor address', undefined, types.string)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { remoteEid, contractName, dvn, executorAddress } = args

        // Get the OApp contract
        const oappDep = await hre.deployments.get(contractName)
        const oappAddress = oappDep.address

        // Get the Endpoint contract (V2 interface)
        const endpoint = await getEndpointContract(hre)

        // Get ReceiveUln302 address
        const recvUlnDep = await hre.deployments.get('ReceiveUln302')
        const receiveLibrary = recvUlnDep.address

        console.log(`\n📋 Setting up receive configuration for ${contractName}`)
        console.log(`   OApp:           ${oappAddress}`)
        console.log(`   Remote EID:     ${remoteEid}`)
        console.log(`   Receive Lib:    ${receiveLibrary}`)
        console.log(`   DVN:            ${dvn}`)
        console.log(`   Executor:       ${executorAddress}\n`)

        // 1️⃣ Set receive library using V2 interface
        console.log(`Setting receive library...`)
        const tx1 = await endpoint.setReceiveLibrary(oappAddress, remoteEid, receiveLibrary, 0)
        console.log(`${SUCCESS_SYMBOL} setReceiveLibrary txHash: ${(await tx1.wait()).transactionHash}`)

        // 2️⃣ Configure ULN with SimpleDVN using V2 interface
        const ulnConfig = encodeUlnConfig({
            confirmations: BigInt(1),
            requiredDVNs: [dvn],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        })

        const executorConfig = ethers.utils.defaultAbiCoder.encode(['address'], [executorAddress])

        const setConfigParams: SetConfigParam[] = [
            {
                configType: 2, // CONFIG_TYPE_ULN
                config: ulnConfig,
            },
            {
                configType: 1, // CONFIG_TYPE_EXECUTOR
                config: executorConfig,
            },
        ]

        console.log(`\nSetting ULN and Executor config...`)
        const tx2 = await endpoint.setConfig(oappAddress, receiveLibrary, setConfigParams)
        console.log(`${SUCCESS_SYMBOL} setConfig txHash: ${(await tx2.wait()).transactionHash}`)

        console.log(`\n🎉 Receive configuration completed successfully!`)
        console.log(`   Remote EID ${remoteEid} → Local OApp ${contractName}`)
        console.log(`   Using SimpleDVN: ${dvn}`)
        console.log(`   Using Executor: ${executorAddress}\n`)
    })
