import { KeypairSigner, PublicKey, publicKeyBytes } from '@metaplex-foundation/umi'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'

import { endpoint } from '../constants'
import { TestContext, OftKeys } from '../types'

const DEFAULT_LZ_RECEIVE_OPTIONS = Options.newOptions().addExecutorLzReceiveOption(200000, 0)

export async function quoteSend(
    context: TestContext,
    oftKeys: OftKeys,
    payer: KeypairSigner,
    dest: PublicKey,
    dstEid: number,
    sendAmount: bigint,
    minAmount: bigint = 0n,
    composeMessage?: Uint8Array,
    options: Uint8Array = DEFAULT_LZ_RECEIVE_OPTIONS.toBytes()
): Promise<UMI.EndpointProgram.types.MessagingFee> {
    return oft.quote(
        context.umi.rpc,
        {
            payer: payer.publicKey,
            tokenMint: oftKeys.mint.publicKey,
            tokenEscrow: oftKeys.escrow.publicKey,
        },
        {
            dstEid,
            to: publicKeyBytes(dest),
            amountLd: sendAmount,
            minAmountLd: minAmount,
            options,
            composeMsg: composeMessage,
        },
        {
            oft: context.program.publicKey,
            endpoint: endpoint.programId,
        },
        undefined,
        context.lookupTable?.publicKey
    )
}

export async function quoteOft(
    context: TestContext,
    oftKeys: OftKeys,
    payer: KeypairSigner,
    dest: PublicKey,
    dstEid: number,
    sendAmount: bigint,
    minAmount: bigint = 0n,
    composeMessage?: Uint8Array,
    options: Uint8Array = DEFAULT_LZ_RECEIVE_OPTIONS.toBytes()
): Promise<oft.types.QuoteOFTResult> {
    return oft.quoteOft(
        context.umi.rpc,
        {
            payer: payer.publicKey,
            tokenMint: oftKeys.mint.publicKey,
            tokenEscrow: oftKeys.escrow.publicKey,
        },
        {
            dstEid,
            to: publicKeyBytes(dest),
            amountLd: sendAmount,
            minAmountLd: minAmount,
            options,
            composeMsg: composeMessage,
        },
        context.program.publicKey
    )
}
