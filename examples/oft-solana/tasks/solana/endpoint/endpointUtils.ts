import { arrayify, hexlify } from '@ethersproject/bytes'
import { Umi } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Connection, PublicKey } from '@solana/web3.js'

import { EndpointPDADeriver } from '@layerzerolabs/lz-solana-sdk-v2'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'
import { keccak256 } from '@layerzerolabs/lz-v2-utilities'

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

export function generatePayloadHash(guid: string, message: string): string {
    // Convert to bytes
    const guidBytes = arrayify(guid)
    const messageBytes = arrayify(message)

    // Concatenate guid and message bytes (equivalent to Solana's hashv(&[&guid[..], &message[..]]))
    const payloadBytes = new Uint8Array(guidBytes.length + messageBytes.length)
    payloadBytes.set(guidBytes, 0)
    payloadBytes.set(messageBytes, guidBytes.length)

    // Hash using keccak256 (equivalent to Solana's hashv)
    return keccak256(hexlify(payloadBytes))
}
