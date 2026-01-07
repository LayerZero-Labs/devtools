import { KeypairSigner, PublicKey, Umi, publicKeyBytes } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { endpoint, OFT_PROGRAM_ID } from '../constants'
import { TestContext, OftKeys, PacketSentEvent } from '../types'
import { sendAndConfirm } from '../utils'
import { oft, OFT_DECIMALS } from '@layerzerolabs/oft-v2-solana-sdk'

const SIMULATION_EXECUTION_OPTIONS = Options.newOptions().addExecutorLzReceiveOption(200000, 200000 * 5)
const SIMULATION_COMPUTE_UNITS = 400000

export async function initOft(
    umi: Umi,
    keys: OftKeys,
    oftType: oft.types.OFTType,
    sharedDecimals = OFT_DECIMALS
): Promise<void> {
    const ix = oft.initOft(
        {
            payer: keys.oappAdmin,
            admin: keys.oappAdmin.publicKey,
            mint: keys.mint.publicKey,
            escrow: keys.escrow,
        },
        oftType,
        sharedDecimals,
        {
            oft: OFT_PROGRAM_ID,
            endpoint: endpoint.programId,
        }
    )

    await sendAndConfirm(umi, ix, keys.oappAdmin)
}

export async function send(
    context: TestContext,
    oftKeys: OftKeys,
    source: KeypairSigner,
    sourceTokenAccount: PublicKey,
    dest: PublicKey,
    dstEid: number,
    sendAmount: bigint,
    fee: UMI.EndpointProgram.types.MessagingFee,
    composeMsg?: Uint8Array,
    minAmountLd: bigint = 0n
): Promise<PacketSentEvent> {
    const { umi } = context

    const ix = await oft.send(
        umi.rpc,
        {
            payer: source,
            tokenMint: oftKeys.mint.publicKey,
            tokenEscrow: oftKeys.escrow.publicKey,
            tokenSource: sourceTokenAccount,
        },
        {
            dstEid,
            to: publicKeyBytes(dest),
            amountLd: sendAmount,
            minAmountLd,
            options: SIMULATION_EXECUTION_OPTIONS.toBytes(),
            composeMsg,
            nativeFee: fee.nativeFee,
            lzTokenFee: fee.lzTokenFee,
        },
        {
            oft: context.program.publicKey,
            endpoint: endpoint.programId,
            token: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
        }
    )

    const { signature } = await sendAndConfirm(
        umi,
        ix,
        source,
        SIMULATION_COMPUTE_UNITS,
        context.lookupTable === undefined ? undefined : [context.lookupTable]
    )

    return extractPacketSentEvent(context, signature)
}

async function extractPacketSentEvent(context: TestContext, signature: Uint8Array): Promise<PacketSentEvent> {
    const signatureBase58 = base58.deserialize(signature)[0]
    const maxAttempts = 10
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const events = await UMI.extractEventFromTransactionSignature(
            context.connection,
            toWeb3JsPublicKey(endpoint.programId),
            signatureBase58,
            UMI.EndpointProgram.events.getPacketSentEventSerializer(),
            { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
        )
        if (events && events.length > 0) {
            return events[0]
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error(`PacketSent event not found for signature ${signatureBase58}`)
}
