// tasks/simple-dvn-mock/utils/commit.ts
import { Contract } from 'ethers'

import { SimpleDvnMockTaskArgs, logTaskInfo, processMessage } from './common'

/**
 * DVN commit operation
 */
export async function commit(dvnContract: Contract, dstOftContract: Contract, args: SimpleDvnMockTaskArgs) {
    const { srcEid, nonce, dstEid } = args

    // Process message and common parameters
    const processed = await processMessage(dstOftContract, args)
    const { srcOAppB32, message, localOapp } = processed

    // Log operation details
    logTaskInfo('commit', args, processed)

    // Execute commit transaction
    const tx = await dvnContract.commit(message, nonce, srcEid, srcOAppB32, dstEid, localOapp)
    const receipt = await tx.wait()

    console.log(`✅ commit txn: ${receipt.transactionHash}\n`)
    return receipt
}
