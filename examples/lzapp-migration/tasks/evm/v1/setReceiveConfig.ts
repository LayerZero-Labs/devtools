// tasks/lz/set-receive-dvn.ts
import { Contract, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { COLORS, SUCCESS_SYMBOL, encodeUlnConfig, getLibraryIndex } from '../../common/taskHelper'

interface TaskArgs {
    remoteEid: number // the source EID whose messages you will verify
    contractName: string // deployment name of the local OFT / LzApp
    dvn: string // address of your rescue DVN
    executorAddress: string // address of the executor
}

// ULN = config-type 2 in Endpoint V1
const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

task(
    'lz:lzapp:set-receive-config',
    'Set ReceiveUln301 as receive library and configure ULN receive side to only your rescue DVN for both DVN and Executor'
)
    .addParam('remoteEid', 'Remote/source EID', undefined, types.int)
    .addParam('contractName', 'Name of the local LzApp in deployments', undefined, types.string)
    .addParam('dvn', 'Rescue-DVN address', undefined, types.string)
    .addParam('executorAddress', 'Rescue-DVN address', undefined, types.string)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { remoteEid, contractName, dvn, executorAddress } = args

        // Locate the LzApp deployment
        const lzAppDep = await hre.deployments.get(contractName)
        const lzApp = new Contract(lzAppDep.address, lzAppDep.abi, (await hre.ethers.getSigners())[0])

        // Locate ReceiveUln301
        const recvUlnDep = await hre.deployments.get('ReceiveUln301')
        const recvUlnAddr = recvUlnDep.address

        // Find its index in Endpoint.libraryLookup
        const recvLibIdx = await getLibraryIndex(hre, recvUlnAddr)
        if (recvLibIdx === undefined) {
            console.error(COLORS.error(`ReceiveUln301 not registered in Endpoint.libraryLookup`))
            return
        }

        // 1️⃣ Set receive library version
        console.log(`\nSwitching receive library to index ${recvLibIdx} (${recvUlnAddr})`)
        const tx = await lzApp.setReceiveVersion(recvLibIdx)
        console.log(`${SUCCESS_SYMBOL} txHash: ${(await tx.wait()).transactionHash}`)

        // 2️⃣ Encode minimal ULN config for receive-side: only your DVN
        const encodedCfg = encodeUlnConfig({
            confirmations: BigInt(1),
            requiredDVNs: [dvn],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        })

        console.log(`\nUpdating ULN receive-config for eid ${remoteEid} → rescue DVN ${dvn}`)
        const tx2 = await lzApp.setConfig(recvLibIdx, remoteEid, CONFIG_TYPE_ULN, encodedCfg)
        console.log(`${SUCCESS_SYMBOL} txHash: ${(await tx2.wait()).transactionHash}\n`)

        const encodedAddress = ethers.utils.defaultAbiCoder.encode(['address'], [executorAddress])

        console.log(`\nUpdating Executor receive-config for eid ${remoteEid} → rescue DVN ${dvn}`)
        const tx3 = await lzApp.setConfig(recvLibIdx, remoteEid, CONFIG_TYPE_EXECUTOR, encodedAddress)
        console.log(`${SUCCESS_SYMBOL} txHash: ${(await tx3.wait()).transactionHash}\n`)
    })
