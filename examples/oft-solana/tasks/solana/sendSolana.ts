// tasks/solana/sendOFT.ts
import { fetchMint, fetchToken, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { SendResult } from '../common/types'

import { parseDecimalToUnits } from './utils'

import {
    TransactionType,
    addComputeUnitInstructions,
    deriveConnection,
    getAddressLookupTable,
    getLayerZeroScanLink,
    getSolanaDeployment,
} from './index'

export interface SolanaArgs {
    amount: string
    to: string
    srcEid: EndpointId
    dstEid: EndpointId
    oftAddress?: string
    oftProgramId?: string
    tokenProgram?: string
    computeUnitPriceScaleFactor?: number
}

export async function sendSolana({
    amount,
    to,
    srcEid,
    dstEid,
    oftAddress,
    oftProgramId,
    tokenProgram: tokenProgramStr,
    computeUnitPriceScaleFactor = 4,
}: SolanaArgs): Promise<SendResult> {
    // 1️⃣ RPC + UMI
    const { connection, umi, umiWalletSigner } = await deriveConnection(srcEid)

    // 2️⃣ Pick your OFT program ID (override or from deployment)
    const programId = oftProgramId ? publicKey(oftProgramId) : publicKey(getSolanaDeployment(srcEid).programId)

    // 3️⃣ Decide your store PDA (override or from your on‐disk deployment)
    const storePda = oftAddress ? publicKey(oftAddress) : publicKey(getSolanaDeployment(srcEid).oftStore)
    const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, storePda)
    const mintPk = new PublicKey(oftStoreInfo.tokenMint)
    const escrowPk = new PublicKey(oftStoreInfo.tokenEscrow)

    // 5️⃣ Attach token account & check balance
    const tokenProgramId = tokenProgramStr ? publicKey(tokenProgramStr) : fromWeb3JsPublicKey(TOKEN_PROGRAM_ID)
    const tokenAccount = findAssociatedTokenPda(umi, {
        mint: fromWeb3JsPublicKey(mintPk),
        owner: umiWalletSigner.publicKey,
        tokenProgramId,
    })
    if (!tokenAccount) throw new Error(`No token account for mint ${mintPk}`)
    const balance = (await fetchToken(umi, tokenAccount)).amount

    // 6️⃣ Normalize human→base units
    const decimals = (await fetchMint(umi, fromWeb3JsPublicKey(mintPk))).decimals
    const amountUnits = parseDecimalToUnits(amount, decimals)
    if (amountUnits === 0n || amountUnits > balance) {
        throw new Error(`Insufficient balance (need ${amountUnits}, have ${balance})`)
    }

    // 7️⃣ Quote (use our overridden `programId`)
    const recipient = addressToBytes32(to)
    const { nativeFee } = await oft.quote(
        umi.rpc,
        {
            payer: umiWalletSigner.publicKey,
            tokenMint: fromWeb3JsPublicKey(mintPk),
            tokenEscrow: fromWeb3JsPublicKey(escrowPk),
        },
        {
            payInLzToken: false,
            to: Buffer.from(recipient),
            dstEid: dstEid,
            amountLd: amountUnits,
            minAmountLd: (amountUnits * 9n) / 10n,
            options: Buffer.from(''),
            composeMsg: undefined,
        },
        { oft: programId }, // ← use override
        [],
        (await getAddressLookupTable(connection, umi, srcEid)).lookupTableAddress
    )

    // 8️⃣ Send (again passing `programId`)
    const ix = await oft.send(
        umi.rpc,
        {
            payer: umiWalletSigner,
            tokenMint: fromWeb3JsPublicKey(mintPk),
            tokenEscrow: fromWeb3JsPublicKey(escrowPk),
            tokenSource: tokenAccount[0],
        },
        {
            to: Buffer.from(recipient),
            dstEid: dstEid,
            amountLd: amountUnits,
            minAmountLd: (amountUnits * 9n) / 10n,
            options: Buffer.from(''),
            composeMsg: undefined,
            nativeFee,
        },
        { oft: programId, token: tokenProgramId } // ← use override
    )

    // 9️⃣ Compute units & submit
    let txB = transactionBuilder().add([ix])
    txB = await addComputeUnitInstructions(
        connection,
        umi,
        srcEid,
        txB,
        umiWalletSigner,
        computeUnitPriceScaleFactor,
        TransactionType.SendOFT
    )
    const { signature } = await txB.sendAndConfirm(umi)
    const txHash = bs58.encode(signature)

    const isTestnet = srcEid === EndpointId.SOLANA_V2_TESTNET

    const scanLink = getLayerZeroScanLink(txHash, isTestnet)

    return { txHash, scanLink }
}
