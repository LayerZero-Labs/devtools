import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SimpleDvnMockTaskArgs } from './utils/common'
import { lzReceive } from './utils/lzReceive'

interface LzReceiveArgs extends SimpleDvnMockTaskArgs {
    guid?: string
}

task('lz:simple-dvn:lz-receive', 'Call endpoint.lzReceive() to deliver the message to destination OFT')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('guid', 'Message GUID (32-byte hex)', undefined, types.string)
    .setAction(async (args: LzReceiveArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get EndpointV2 contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        // Get destination OFT contract
        const dstOappDep = await hre.deployments.get(args.dstContractName || 'MyOFTMock')
        const dstOftContract = new Contract(dstOappDep.address, dstOappDep.abi, signer)

        await lzReceive(endpointContract, dstOftContract, args)
    })
