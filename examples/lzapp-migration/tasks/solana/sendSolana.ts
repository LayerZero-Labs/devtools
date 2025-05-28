import { fetchToken, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { SendResult } from '../common/types'
import { DebugLogger } from '../common/utils'

import { deriveConnection, getLayerZeroScanLink, getSolanaDeployment } from './index'

export interface SolanaArgs {
    amount: string
    to: string
    srcEid: EndpointId
    dstEid: EndpointId
    oftAddress?: string
    oftProgramId?: string
    tokenProgram?: string
}

export async function sendSolana(args: SolanaArgs): Promise<SendResult> {
    const { amount, to, srcEid, dstEid, oftAddress, oftProgramId, tokenProgram } = args
    const { connection, umi, umiWalletSigner } = await deriveConnection(srcEid)

    const deployment = getSolanaDeployment(srcEid)
    const programId = publicKey(oftProgramId ?? deployment.programId)
    const storePda = publicKey(oftAddress ?? deployment.oftStore)
    const store = await oft.accounts.fetchOFTStore(umi, storePda)
    const tokenProgramId = publicKey(tokenProgram ?? TOKEN_PROGRAM_ID.toBase58())

    const tokenAccount = findAssociatedTokenPda(umi, {
        mint: publicKey(store.tokenMint),
        owner: umiWalletSigner.publicKey,
        tokenProgramId,
    })
    const balance = (await fetchToken(umi, tokenAccount)).amount
    const amountBn = BigInt(amount)
    if (amountBn === 0n || amountBn > balance) throw new Error('Insufficient balance')

    const recipient = addressToBytes32(to)
    const { nativeFee } = await oft.quote(
        umi.rpc,
        {
            payer: umiWalletSigner.publicKey,
            tokenMint: publicKey(store.tokenMint),
            tokenEscrow: publicKey(store.tokenEscrow),
        },
        {
            payInLzToken: false,
            to: Buffer.from(recipient),
            dstEid,
            amountLd: amountBn,
            minAmountLd: amountBn,
            options: Buffer.from(''),
        },
        { oft: programId }
    )
    const ix = await oft.send(
        umi.rpc,
        {
            payer: umiWalletSigner,
            tokenMint: publicKey(store.tokenMint),
            tokenEscrow: publicKey(store.tokenEscrow),
            tokenSource: tokenAccount[0],
        },
        {
            to: Buffer.from(recipient),
            dstEid,
            amountLd: amountBn,
            minAmountLd: amountBn,
            options: Buffer.from(''),
            nativeFee,
        },
        { oft: programId, token: tokenProgramId }
    )
    const { signature } = await umi.sendAndConfirm(ix)
    const txHash = bs58.encode(signature)
    const scanLink = getLayerZeroScanLink(txHash, srcEid === EndpointId.SOLANA_V2_TESTNET)
    DebugLogger.keyValue('txHash', txHash)
    return { txHash, scanLink }
}
