import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'

import { commitAndExecute } from './commitAndExecute'
import { SimpleDvnMockTaskArgs, generateGuid, processMessage } from './common'
import { verify } from './verify'

const logger = createLogger()

/**
 * Process received message through SimpleExecutorMock: verify -> commitAndExecute
 */
export async function processReceive(
    dvnContract: Contract,
    dstOftContract: Contract,
    destinationExecutorMock: Contract,
    receiveUln302Address: string,
    args: SimpleDvnMockTaskArgs,
    hre: HardhatRuntimeEnvironment
) {
    logger.info('\nStarting SimpleWorkers message processing...\n')

    try {
        // Step 1: DVN Verify
        logger.info('Step 1: DVN verifying message...')
        await verify(dvnContract, dstOftContract, args)
        logger.info('DVN verification completed\n')

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
            } catch (error) {
                logger.error('Failed to encode native drops:', error)
                logger.warn('Using empty native drops due to encoding error')
                nativeDropsHex = '0x'
            }
        }

        // Step 2: Executor CommitAndExecute (combines commitVerification + lzReceive)
        logger.info('Step 2: Executor committing verification and executing message delivery...')

        const srcEidStr = args.srcEid.toString()
        const dstEidStr = args.dstEid.toString()

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
            destinationExecutorMock,
            hre
        )
        logger.info('\nSimpleWorkers message processing completed successfully!')
    } catch (error) {
        logger.error(`Message processing failed:`, error)

        // Check if this is an RPC rate limit or connection error
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (
            errorMessage.includes('rate limit') ||
            errorMessage.includes('Too many requests') ||
            errorMessage.includes('CALL_EXCEPTION')
        ) {
            logger.warn('\nRPC connection failed during message processing!')
            logger.warn('IMPORTANT: Your outbound message may have been sent but not verified/executed.')
            logger.warn(
                "Due to LayerZero's ordered message delivery, you must handle this nonce before sending new messages."
            )
            logger.warn('\nTo recover:')
            logger.warn('1. Wait for RPC rate limits to reset (check error message for retry time)')
            logger.warn('2. Manually complete verification using the individual tasks:')
            logger.warn(
                `   - npx hardhat lz:simple-dvn:verify --src-eid ${args.srcEid} --dst-eid ${args.dstEid} --nonce ${args.nonce} --src-oapp ${args.srcOapp} --to-address ${args.toAddress} --amount ${args.amount}`
            )
            logger.warn(`   - npx hardhat lz:simple-workers:commit-and-execute ...`)
            logger.warn('3. Or skip this nonce if the message is no longer needed (advanced users only)')
            logger.warn('\nNOTE: All subsequent messages will be blocked until this nonce is resolved.\n')
        }

        throw error
    }
}
