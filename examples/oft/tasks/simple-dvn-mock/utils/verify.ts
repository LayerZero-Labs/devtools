// tasks/simple-dvn-mock/utils/verify.ts
import { Contract } from 'ethers'

import { SimpleDvnMockTaskArgs, logTaskInfo, processMessage } from './common'

/**
 * DVN verify operation
 */
export async function verify(dvnContract: Contract, dstOftContract: Contract, args: SimpleDvnMockTaskArgs) {
    const { srcEid, nonce, dstEid } = args

    // Process message and common parameters
    const processed = await processMessage(dstOftContract, args)
    const { srcOAppB32, message, localOapp } = processed

    // Log operation details
    logTaskInfo('verify', args, processed)

    // Execute verify transaction
    const tx = await dvnContract.verify(message, nonce, srcEid, srcOAppB32, dstEid, localOapp)
    const receipt = await tx.wait()

    console.log(`✅ verify txn: ${receipt.transactionHash}\n`)
    return receipt
}
