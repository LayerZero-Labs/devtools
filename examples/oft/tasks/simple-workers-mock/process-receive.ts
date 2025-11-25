import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SimpleDvnMockTaskArgs } from './utils/common'
import { processReceive } from './utils/processReceive'

interface ProcessReceiveTaskArgs extends SimpleDvnMockTaskArgs {
    guid?: string
}

task(
    'lz:simple-workers:process-receive',
    'Process received message through processReceive: SimpleDVNMock.verify -> DestinationExecutorMock.commitAndExecute'
)
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFT', types.string)
    .addOptionalParam('guid', 'Message GUID (if not provided, will be generated)', undefined, types.string)
    .setAction(async (args: ProcessReceiveTaskArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get SimpleDVNMock contract
        const dvnDep = await hre.deployments.get('SimpleDVNMock')
        const dvnContract = new Contract(dvnDep.address, dvnDep.abi, signer)

        // Get destination OFT contract
        const dstOappDep = await hre.deployments.get(args.dstContractName || 'MyOFT')
        const dstOftContract = new Contract(dstOappDep.address, dstOappDep.abi, signer)

        // Get DestinationExecutorMock contract
        const simpleExecutorMockDep = await hre.deployments.get('DestinationExecutorMock')
        const simpleExecutorMock = new Contract(simpleExecutorMockDep.address, simpleExecutorMockDep.abi, signer)

        // Get ReceiveUln302 address
        const receiveUln302Dep = await hre.deployments.get('ReceiveUln302')
        const receiveUln302Address = receiveUln302Dep.address

        await processReceive(dvnContract, dstOftContract, simpleExecutorMock, receiveUln302Address, args, hre)
    })
