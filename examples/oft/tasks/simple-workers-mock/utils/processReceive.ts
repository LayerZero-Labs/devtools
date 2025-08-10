import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { commitAndExecute } from './commitAndExecute'
import { SimpleDvnMockTaskArgs, generateGuid, processMessage } from './common'
import { verify } from './verify'

/**
 * Process received message through SimpleExecutorMock: verify -> commitAndExecute
 */
export async function processReceive(
    dvnContract: Contract,
    dstOftContract: Contract,
    simpleExecutorMock: Contract,
    receiveUln302Address: string,
    args: SimpleDvnMockTaskArgs,
    hre: HardhatRuntimeEnvironment
) {
    console.log('\n🚀 Starting SimpleExecutorMock message processing...\n')

    try {
        // Step 1: Verify
        console.log('📋 Step 1: Verifying message...')
        await verify(dvnContract, dstOftContract, args)
        console.log('✅ Verification completed\n')

        // Process message to get the required parameters
        const processed = await processMessage(dstOftContract, args)
        const { srcOAppB32, message, localOappB32 } = processed

        // Generate GUID
        const guid = generateGuid(args.nonce, args.srcEid, srcOAppB32, args.dstEid, localOappB32)

        // Step 2: CommitAndExecute (combines commit + lzReceive)
        console.log('📝📦 Step 2: Executing commitAndExecute...')
        await commitAndExecute(
            {
                receiveLib: receiveUln302Address,
                srcEid: args.srcEid.toString(),
                sender: srcOAppB32,
                receiver: processed.localOapp,
                nonce: args.nonce,
                guid: guid,
                message: message,
                extraData: '0x',
                gas: '200000',
                value: '0',
                nativeDrops: '0x', // Empty native drops by default
            },
            simpleExecutorMock,
            hre
        )
        console.log('✅ CommitAndExecute completed\n')

        console.log('🎉 SimpleExecutorMock message processing completed successfully!')
    } catch (error) {
        console.error(`❌ Message processing failed:`, error)
        throw error
    }
}
