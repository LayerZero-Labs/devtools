import { Chain, createPublicClient, decodeEventLog, http, PublicClient } from 'viem'
import { OVaultFailureReason, OVaultTransactionStep } from '../types'
import { V2 as scanClient, V2Types } from '@layerzerolabs/scan-client-v2'
import { OVaultComposerSyncAbi } from '../contracts/OVaultComposerSync'

async function getTxStatus(txHash: `0x${string}`, client: PublicClient) {
    const receipt = await client.getTransactionReceipt({ hash: txHash })
    if (receipt.status === 'reverted') {
        return {
            success: false,
            error: OVaultFailureReason.UNKNOWN,
        }
    } else if (receipt.status === 'success') {
        return {
            success: true,
        }
    }

    return {
        success: false,
    }
}

async function isRefunded(txHash: `0x${string}`, client: PublicClient) {
    const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
    })

    if (receipt.status !== 'success') {
        return false
    }

    for (const log of receipt.logs) {
        try {
            const values = decodeEventLog({
                abi: OVaultComposerSyncAbi,
                data: log.data as `0x${string}`,
                topics: log.topics,
            })

            if (values.eventName === 'Refunded') {
                return true
            }
        } catch (e) {
            // Ignore errors in decoding logs, they might not be OFT events
        }
    }

    return false
}

async function getLzTxStatus(txHash: `0x${string}`) {
    const messages = await scanClient.getMessagesBySrcTxHash(txHash)
    return messages
}

async function trackBBB(
    txHash: `0x${string}`,
    viemConfigs: {
        sourceChain: Chain
        hubChain: Chain
        dstChain: Chain
    }
) {
    const { sourceChain } = viemConfigs

    const sourceClient = createPublicClient({
        chain: sourceChain,
        transport: http(),
    })

    const sourceTx = await getTxStatus(txHash, sourceClient)

    // In a BBB transaction, the source chain transaction is the only transaction.
    // And if the source chain transaction fails, the transaction is refunded.
    return {
        step: sourceTx.success ? OVaultTransactionStep.COMPLETED : OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
        refunded: sourceTx.error ? true : undefined,
        failureReason: sourceTx.error,
    }
}

async function trackABB(
    txHash: `0x${string}`,
    viemConfigs: {
        sourceChain: Chain
        hubChain: Chain
        dstChain: Chain
    }
) {
    const { sourceChain, hubChain } = viemConfigs

    const sourceClient = createPublicClient({
        chain: sourceChain,
        transport: http(),
    })

    const hubClient = createPublicClient({
        chain: hubChain,
        transport: http(),
    })

    const sourceTx = await getTxStatus(txHash, sourceClient)

    if (sourceTx.error) {
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    } else if (!sourceTx.success) {
        // Transaction is still in progress
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
        }
    }

    // Source Tx is successful, now we need to track the hub chain transaction.
    const sourceToHubMessages = await getLzTxStatus(txHash)

    if (sourceToHubMessages.length === 0) {
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
        }
    }

    const sourceToHubMessage: V2Types.ScanAPIMessage = sourceToHubMessages[0]

    if (sourceToHubMessage.status.name === 'INFLIGHT' || sourceToHubMessage.status.name === 'CONFIRMING') {
        // Transaction is still in progress
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
        }
    }

    if (sourceToHubMessage.status.name !== 'DELIVERED') {
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    }

    // Track hub chain transaction
    const executorDst = sourceToHubMessage.destination as V2Types.ExecutorTx
    const composeTxHash = executorDst?.lzCompose?.txs?.[0]?.txHash as `0x${string}`
    const failedCompose = executorDst?.lzCompose?.failedTx?.[0]?.txHash as `0x${string}`
    if (failedCompose) {
        return {
            step: OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
            refunded: false,
        }
    }
    if (!composeTxHash) {
        // Waiting for the compose tx to be created
        return {
            step: OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
        }
    }
    const hubTx = await getTxStatus(composeTxHash, hubClient)

    const refunded = await isRefunded(composeTxHash, hubClient)

    return {
        step: hubTx.success ? OVaultTransactionStep.COMPLETED : OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
        refunded: hubTx.error || refunded ? true : undefined,
        failureReason: hubTx.error || (refunded ? OVaultFailureReason.UNKNOWN : undefined),
    }
}

async function trackBBA(
    txHash: `0x${string}`,
    viemConfigs: {
        sourceChain: Chain
        hubChain: Chain
        dstChain: Chain
    }
) {
    const { sourceChain, dstChain } = viemConfigs

    const sourceClient = createPublicClient({
        chain: sourceChain,
        transport: http(),
    })

    const dstClient = createPublicClient({
        chain: dstChain,
        transport: http(),
    })

    const sourceTx = await getTxStatus(txHash, sourceClient)

    if (sourceTx.error) {
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    } else if (!sourceTx.success) {
        // Transaction is still in progress
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
        }
    }

    const hubToDstMessages = await getLzTxStatus(txHash)

    if (hubToDstMessages.length === 0) {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
        }
    }

    const hubToDstMessage: V2Types.ScanAPIMessage = hubToDstMessages[0]

    if (hubToDstMessage.status.name === 'INFLIGHT' || hubToDstMessage.status.name === 'CONFIRMING') {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
        }
    }

    if (hubToDstMessage.status.name !== 'DELIVERED') {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    }

    // Track dst chain transaction
    const dstTxHash = hubToDstMessage.destination?.tx?.txHash as `0x${string}`
    if (!dstTxHash) {
        return {
            step: OVaultTransactionStep.DST_CHAIN_TRANSACTION,
        }
    }

    const dstTx = await getTxStatus(dstTxHash, dstClient)

    return {
        step: dstTx.success ? OVaultTransactionStep.COMPLETED : OVaultTransactionStep.DST_CHAIN_TRANSACTION,
        refunded: false,
        failureReason: dstTx.error,
    }
}

async function trackABA(
    txHash: `0x${string}`,
    viemConfigs: {
        sourceChain: Chain
        hubChain: Chain
        dstChain: Chain
    }
) {
    const { sourceChain, hubChain, dstChain } = viemConfigs

    const sourceClient = createPublicClient({
        chain: sourceChain,
        transport: http(),
    })

    const hubClient = createPublicClient({
        chain: hubChain,
        transport: http(),
    })

    const dstClient = createPublicClient({
        chain: dstChain,
        transport: http(),
    })

    const sourceTx = await getTxStatus(txHash, sourceClient)

    if (sourceTx.error) {
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    } else if (!sourceTx.success) {
        // Transaction is still in progress
        return {
            step: OVaultTransactionStep.SOURCE_CHAIN_TRANSACTION,
        }
    }

    const sourceToHubMessages = await getLzTxStatus(txHash)

    if (sourceToHubMessages.length === 0) {
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
        }
    }

    const sourceToHubMessage: V2Types.ScanAPIMessage = sourceToHubMessages[0]

    if (sourceToHubMessage.status.name === 'INFLIGHT' || sourceToHubMessage.status.name === 'CONFIRMING') {
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
        }
    }

    if (sourceToHubMessage.status.name !== 'DELIVERED') {
        return {
            step: OVaultTransactionStep.SOURCE_TO_HUB_LZ_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    }

    // Track hub chain transaction
    const executorDst = sourceToHubMessage.destination as V2Types.ExecutorTx
    const composeTxHash = executorDst?.lzCompose?.txs?.[0]?.txHash as `0x${string}`
    const failedCompose = executorDst?.lzCompose?.failedTx?.[0]?.txHash as `0x${string}`
    if (failedCompose) {
        return {
            step: OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
            refunded: false,
        }
    }
    if (!composeTxHash) {
        return {
            step: OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
        }
    }
    const hubTx = await getTxStatus(composeTxHash, hubClient)

    const refunded = await isRefunded(composeTxHash, hubClient)

    if (hubTx.success && refunded) {
        // Something went wrong on the hub chain, but the funds were refunded.
        return {
            step: OVaultTransactionStep.HUB_CHAIN_TRANSACTION,
            refunded: true,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    }

    // Track hub to dst chain transaction
    const hubToDstLzMessages = await getLzTxStatus(composeTxHash)
    if (hubToDstLzMessages.length === 0) {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
        }
    }

    const hubToDstMessage: V2Types.ScanAPIMessage = hubToDstLzMessages[0]

    if (hubToDstMessage.status.name === 'INFLIGHT' || hubToDstMessage.status.name === 'CONFIRMING') {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
        }
    }

    if (hubToDstMessage.status.name !== 'DELIVERED') {
        return {
            step: OVaultTransactionStep.HUB_TO_DST_LZ_TRANSACTION,
            failureReason: OVaultFailureReason.UNKNOWN,
        }
    }

    // Track dst chain transaction
    const dstTxHash = hubToDstMessage.destination?.tx?.txHash as `0x${string}`
    if (!dstTxHash) {
        // Waiting for the dst tx to be created
        return {
            step: OVaultTransactionStep.DST_CHAIN_TRANSACTION,
        }
    }

    const dstTx = await getTxStatus(dstTxHash, dstClient)

    return {
        step: dstTx.success ? OVaultTransactionStep.COMPLETED : OVaultTransactionStep.DST_CHAIN_TRANSACTION,
        refunded: false,
        failureReason: dstTx.error,
    }
}

/**
 * Track the OVault transaction
 * There are 4 possible scenarios:
 * 1. BBB - source chain, hub chain, dst chain are the same
 * 2. BBA - source chain, hub chain are the same, dst chain is different
 * 3. ABB - hub chain, dst chain are the same, source chain is different
 * 4. ABA - source chain, hub chain, dst chain are different. Source chain can optionally be the same as the dst chain.
 *
 * @param txHash - The hash of the transaction to track on the source chain.
 */
export async function trackOVaultSyncTransaction(
    txHash: `0x${string}`,
    viemConfigs: {
        sourceChain: Chain
        hubChain: Chain
        dstChain: Chain
    }
) {
    const { sourceChain, hubChain, dstChain } = viemConfigs
    if (sourceChain.id === hubChain.id && sourceChain.id === dstChain.id) {
        return trackBBB(txHash, viemConfigs)
    } else if (sourceChain.id === hubChain.id && hubChain.id !== dstChain.id) {
        return trackBBA(txHash, viemConfigs)
    } else if (sourceChain.id !== hubChain.id && hubChain.id === dstChain.id) {
        return trackABB(txHash, viemConfigs)
    } else {
        return trackABA(txHash, viemConfigs)
    }
}
