// tasks/simple-dvn-mock/utils/lzReceive.ts
import { Contract } from 'ethers'

import { ProcessedMessage, SimpleDvnMockTaskArgs, generateGuid, logTaskInfo, processMessage } from './common'

interface LzReceiveArgs extends SimpleDvnMockTaskArgs {
    guid?: string
}

/**
 * LayerZero lzReceive operation
 */
export async function lzReceive(endpointContract: Contract, dstOftContract: Contract, args: LzReceiveArgs) {
    const { srcEid, nonce, dstEid, guid } = args

    // Process message and common parameters
    const processed: ProcessedMessage = await processMessage(dstOftContract, args)
    const { srcOAppB32, localOappB32, message } = processed

    // Generate GUID if not provided
    const messageGuid = guid || generateGuid(nonce, srcEid, srcOAppB32, dstEid, localOappB32)

    // Build packet object (based on LayerZero packet structure)
    const packet = {
        version: 1,
        nonce: nonce,
        srcEid: srcEid,
        sender: srcOAppB32,
        dstEid: dstEid,
        receiver: localOappB32,
        guid: messageGuid,
        message: message,
    }

    // Empty extra data
    const extraData = '0x'

    // Log operation details
    logTaskInfo('endpoint.lzReceive', args, processed, {
        guid: messageGuid,
        endpoint: endpointContract.address,
    })

    // Execute lzReceive transaction
    const tx = await endpointContract.lzReceive(packet, processed.localOapp, messageGuid, message, extraData)
    const receipt = await tx.wait()

    console.log(`✅ endpoint.lzReceive txn: ${receipt.transactionHash}\n`)
    return receipt
}
