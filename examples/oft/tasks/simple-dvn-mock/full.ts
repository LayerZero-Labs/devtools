// tasks/simple-dvn-mock/full.ts
import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { commit } from './utils/commit'
import { SimpleDvnMockTaskArgs } from './utils/common'
import { lzReceive } from './utils/lzReceive'
import { verify } from './utils/verify'

interface FullTaskArgs extends SimpleDvnMockTaskArgs {
    guid?: string
}

task('lz:simple-dvn:full', 'Execute the full SimpleDVNMock flow: verify -> commit -> lzReceive')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('guid', 'Message GUID (if not provided, will be generated)', undefined, types.string)
    .setAction(async (args: FullTaskArgs, hre: HardhatRuntimeEnvironment) => {
        console.log('\n🚀 Starting full SimpleDVNMock flow...\n')

        const signer = (await hre.ethers.getSigners())[0]

        // Get SimpleDVNMock contract
        const dvnDep = await hre.deployments.get('SimpleDVNMock')
        const dvnContract = new Contract(dvnDep.address, dvnDep.abi, signer)

        // Get destination OFT contract
        const dstOappDep = await hre.deployments.get(args.dstContractName || 'MyOFTMock')
        const dstOftContract = new Contract(dstOappDep.address, dstOappDep.abi, signer)

        // Get LayerZero endpoint contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        try {
            // Step 1: Verify
            console.log('📋 Step 1: Verifying message...')
            await verify(dvnContract, dstOftContract, args)
            console.log('✅ Verification completed\n')

            // Step 2: Commit
            console.log('📝 Step 2: Committing verification...')
            await commit(dvnContract, dstOftContract, args)
            console.log('✅ Commit completed\n')

            // Step 3: LzReceive
            console.log('📦 Step 3: Executing lzReceive...')
            await lzReceive(endpointContract, dstOftContract, args)
            console.log('✅ LzReceive completed\n')

            console.log('🎉 Full SimpleDVNMock flow completed successfully!')
        } catch (error) {
            console.error(`❌ Full flow failed:`, error)
            throw error
        }
    })
