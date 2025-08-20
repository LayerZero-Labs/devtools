import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SimpleDvnMockTaskArgs } from './utils/common'
import { verify } from './utils/verify'

task('lz:simple-dvn:verify', 'Call verify() on SimpleDVNMock to verify a message')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .setAction(async (args: SimpleDvnMockTaskArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get SimpleDVNMock contract
        const dvnDep = await hre.deployments.get('SimpleDVNMock')
        const dvnContract = new Contract(dvnDep.address, dvnDep.abi, signer)

        // Get destination OFT contract
        const dstOappDep = await hre.deployments.get(args.dstContractName || 'MyOFTMock')
        const dstOftContract = new Contract(dstOappDep.address, dstOappDep.abi, signer)

        await verify(dvnContract, dstOftContract, args)
    })
