import { Contract } from 'ethers'

import { SimpleDvnMockTaskArgs, logTaskInfo, processMessage } from './common'

/**
 * DVN commit operation
 *
 * Note: In most cases you should not call `commit` and `lzReceive` directly.
 * Prefer using `commitAndExecute`, which performs both steps atomically
 * through `SimpleExecutorMock.commitAndExecute` for development/testing.
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
