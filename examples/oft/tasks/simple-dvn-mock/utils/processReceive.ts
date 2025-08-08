// tasks/simple-dvn-mock/utils/processReceive.ts
import { Contract } from 'ethers'

import { commit } from './commit'
import { SimpleDvnMockTaskArgs } from './common'
import { lzReceive } from './lzReceive'
import { verify } from './verify'

/**
 * Process received message through SimpleDVNMock: verify -> commit -> lzReceive
 */
export async function processReceive(
    dvnContract: Contract,
    dstOftContract: Contract,
    endpointContract: Contract,
    args: SimpleDvnMockTaskArgs
) {
    console.log('\n🚀 Starting SimpleDVNMock message processing...\n')

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

        console.log('🎉 SimpleDVNMock message processing completed successfully!')
    } catch (error) {
        console.error(`❌ Message processing failed:`, error)
        throw error
    }
}
