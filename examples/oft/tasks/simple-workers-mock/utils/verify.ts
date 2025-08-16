import { Contract } from 'ethers'

import { createLogger } from '@layerzerolabs/io-devtools'

import { SimpleDvnMockTaskArgs, logTaskInfo, processMessage } from './common'

const logger = createLogger()

/**
 * DVN verify operation
 */
export async function verify(dvnContract: Contract, dstOftContract: Contract, args: SimpleDvnMockTaskArgs) {
    const { srcEid, nonce, dstEid } = args

    // Process message and common parameters
    const processed = await processMessage(dstOftContract, args)
    const { srcOAppB32, message, localOapp } = processed

    // Log operation details
    logTaskInfo('DVN verify', args, processed)

    // Execute verify transaction
    const tx = await dvnContract.verify(message, nonce, srcEid, srcOAppB32, dstEid, localOapp)
    const receipt = await tx.wait()

    logger.info(`DVN verify transaction: ${receipt.transactionHash}\n`)
    return receipt
}
