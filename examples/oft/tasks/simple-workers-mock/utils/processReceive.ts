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
        const { srcOAppB32, message, localOappB32, nativeDrops } = processed

        // Generate GUID
        const guid = generateGuid(args.nonce, args.srcEid, srcOAppB32, args.dstEid, localOappB32)

        // Convert native drops to hex-encoded format for commitAndExecute
        let nativeDropsHex = '0x'
        if (nativeDrops.length > 0) {
            try {
                // ABI encode the native drop params as NativeDropParam[]
                const nativeDropParams = nativeDrops.map((drop) => ({
                    _receiver: drop.recipient,
                    _amount: drop.amount,
                }))

                nativeDropsHex = hre.ethers.utils.defaultAbiCoder.encode(
                    ['tuple(address _receiver, uint256 _amount)[]'],
                    [nativeDropParams]
                )
                console.log(`📦 Encoded ${nativeDrops.length} native drop(s) for execution`)
            } catch (error) {
                console.error('❌ Failed to encode native drops:', error)
                console.warn('⚠️  Using empty native drops due to encoding error')
                nativeDropsHex = '0x'
            }
        }

        // Step 2: CommitAndExecute (combines commit + lzReceive)
        console.log('📝📦 Step 2: Executing commitAndExecute...')

        // Debug: Log the input values before conversion
        console.log('Debug - Input values:')
        console.log(`  args.srcEid: ${args.srcEid} (type: ${typeof args.srcEid})`)
        console.log(`  args.dstEid: ${args.dstEid} (type: ${typeof args.dstEid})`)
        console.log(`  args.nonce: ${args.nonce} (type: ${typeof args.nonce})`)

        const srcEidStr = args.srcEid.toString()
        const dstEidStr = args.dstEid.toString()

        console.log(`  srcEidStr: ${srcEidStr}`)
        console.log(`  dstEidStr: ${dstEidStr}`)

        await commitAndExecute(
            {
                receiveLib: receiveUln302Address,
                srcEid: srcEidStr,
                sender: srcOAppB32,
                receiver: processed.localOapp,
                nonce: args.nonce,
                message: message,
                dstEid: dstEidStr,
                guid: guid,
                extraData: '0x',
                gas: '200000',
                value: '0',
                nativeDrops: nativeDropsHex,
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
