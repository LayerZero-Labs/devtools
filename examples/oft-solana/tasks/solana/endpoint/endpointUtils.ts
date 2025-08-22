import { hexlify } from '@ethersproject/bytes'
import { Umi } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Connection, PublicKey } from '@solana/web3.js'
import { ethers } from 'ethers'

import { EndpointPDADeriver } from '@layerzerolabs/lz-solana-sdk-v2'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

export async function getInboundNonce(
    umi: Umi,
    connection: Connection,
    receiver: PublicKey,
    srcEid: number,
    senderNormalized: Uint8Array<ArrayBufferLike>
): Promise<bigint> {
    // we use EndpointPDADeriver + getAccountInfo  so that we can print the expected Nonce PDA if it's not found
    const epDeriver = new EndpointPDADeriver(new PublicKey(EndpointProgram.ENDPOINT_PROGRAM_ID))
    const [nonceAccount] = epDeriver.nonce(receiver, srcEid, senderNormalized)
    const accountInfo = await connection.getAccountInfo(nonceAccount)
    if (!accountInfo) {
        throw new Error(`Nonce account not found at address ${nonceAccount.toBase58()}`)
    }
    const nonceAccountInfo = await EndpointProgram.accounts.fetchNonce(umi, fromWeb3JsPublicKey(nonceAccount))
    const inboundNonce = nonceAccountInfo.inboundNonce
    return inboundNonce
}

/**
 * Generate a GUID for LayerZero messages
 */
export function generateGuid(
    nonce: string,
    srcEid: number,
    srcOapp: string,
    dstEid: number,
    localOapp: string
): string {
    // Validate inputs to prevent NaN values
    if (isNaN(srcEid) || srcEid < 0) {
        throw new Error(`Invalid srcEid: ${srcEid}. Must be a valid positive number.`)
    }
    if (isNaN(dstEid) || dstEid < 0) {
        throw new Error(`Invalid dstEid: ${dstEid}. Must be a valid positive number.`)
    }
    if (!nonce || nonce.trim() === '') {
        throw new Error(`Invalid nonce: ${nonce}. Must be a non-empty string.`)
    }
    const srcOappB32 = addressToBytes32(srcOapp)
    const localOappB32 = addressToBytes32(localOapp)
    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['uint64', 'uint32', 'bytes32', 'uint32', 'bytes32'],
            [nonce, srcEid, srcOappB32, dstEid, localOappB32]
        )
    )
}

// Helper to encode OFT message using existing utilities
// Note: check if this is exposed via any existing OFT SDKs
export function encodeOFTMessage(
    sendTo: string, // Recipient address (32 bytes)
    amountSD: bigint, // Amount in shared decimals (8 bytes)
    sender?: string, // Sender address (required when composeMsg is provided)
    composeMsg?: string // Optional compose message
): string {
    // Use existing addressToBytes32 utility
    const sendToBytes = addressToBytes32(sendTo)

    if (composeMsg && sender) {
        // With compose message: [sendTo(32) + amountSD(8) + sender(32) + composeMsg]
        const senderBytes = addressToBytes32(sender)
        return ethers.utils.solidityPack(
            ['bytes32', 'uint64', 'bytes32', 'bytes'],
            [hexlify(sendToBytes), amountSD, hexlify(senderBytes), composeMsg]
        )
    } else {
        // Without compose message: [sendTo(32) + amountSD(8)]
        return ethers.utils.solidityPack(['bytes32', 'uint64'], [hexlify(sendToBytes), amountSD])
    }
}
