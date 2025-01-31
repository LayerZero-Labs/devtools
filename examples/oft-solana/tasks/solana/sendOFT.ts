import { fetchToken, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import {
    TransactionType,
    addComputeUnitInstructions,
    deriveConnection,
    getExplorerTxLink,
    getLayerZeroScanLink,
} from './index'

interface Args {
    amount: number
    to: string
    fromEid: EndpointId
    toEid: EndpointId
    programId: string
    mint: string
    escrow: string
    tokenProgram: string
    computeUnitPriceScaleFactor: number
}

// Define a Hardhat task for sending OFT from Solana
task('lz:oft:solana:send', 'Send tokens from Solana to a target EVM chain')
    .addParam('amount', 'The amount of tokens to send', undefined, types.int)
    .addParam('fromEid', 'The source endpoint ID', undefined, types.eid)
    .addParam('to', 'The recipient address on the destination chain')
    .addParam('toEid', 'The destination endpoint ID', undefined, types.eid)
    .addParam('mint', 'The OFT token mint public key', undefined, types.string)
    .addParam('programId', 'The OFT program ID', undefined, types.string)
    .addParam('escrow', 'The OFT escrow public key', undefined, types.string)
    .addParam('tokenProgram', 'The Token Program public key', TOKEN_PROGRAM_ID.toBase58(), types.string, true)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, types.float, true)
    .setAction(
        async ({
            amount,
            fromEid,
            to,
            toEid,
            mint: mintStr,
            programId: programIdStr,
            escrow: escrowStr,
            tokenProgram: tokenProgramStr,
            computeUnitPriceScaleFactor,
        }: Args) => {
            const { connection, umi, umiWalletSigner } = await deriveConnection(fromEid)

            const oftProgramId = publicKey(programIdStr)
            const mint = publicKey(mintStr)
            const umiEscrowPublicKey = publicKey(escrowStr)
            const tokenProgramId = tokenProgramStr ? publicKey(tokenProgramStr) : fromWeb3JsPublicKey(TOKEN_PROGRAM_ID)

            const tokenAccount = findAssociatedTokenPda(umi, {
                mint: publicKey(mintStr),
                owner: umiWalletSigner.publicKey,
                tokenProgramId,
            })

            if (!tokenAccount) {
                throw new Error(
                    `No token account found for mint ${mintStr} and owner ${umiWalletSigner.publicKey} in program ${tokenProgramId}`
                )
            }

            const tokenAccountData = await fetchToken(umi, tokenAccount)
            const balance = Number(tokenAccountData.amount)

            if (amount == 0 || amount > balance) {
                throw new Error(
                    `Attempting to send ${amount}, but ${umiWalletSigner.publicKey} only has balance of ${balance}`
                )
            }

            const recipientAddressBytes32 = addressToBytes32(to)

            const { nativeFee } = await oft.quote(
                umi.rpc,
                {
                    payer: umiWalletSigner.publicKey,
                    tokenMint: mint,
                    tokenEscrow: umiEscrowPublicKey,
                },
                {
                    payInLzToken: false,
                    to: Buffer.from(recipientAddressBytes32),
                    dstEid: toEid,
                    amountLd: BigInt(amount),
                    minAmountLd: 1n,
                    options: Buffer.from(''),
                    composeMsg: undefined,
                },
                {
                    oft: oftProgramId,
                }
            )

            const ix = await oft.send(
                umi.rpc,
                {
                    payer: umiWalletSigner,
                    tokenMint: mint,
                    tokenEscrow: umiEscrowPublicKey,
                    tokenSource: tokenAccount[0],
                },
                {
                    to: Buffer.from(recipientAddressBytes32),
                    dstEid: toEid,
                    amountLd: BigInt(amount),
                    minAmountLd: (BigInt(amount) * BigInt(9)) / BigInt(10),
                    options: Buffer.from(''),
                    composeMsg: undefined,
                    nativeFee,
                },
                {
                    oft: oftProgramId,
                    token: tokenProgramId,
                }
            )

            let txBuilder = transactionBuilder().add([ix])
            txBuilder = await addComputeUnitInstructions(
                connection,
                umi,
                fromEid,
                txBuilder,
                umiWalletSigner,
                computeUnitPriceScaleFactor,
                TransactionType.SendOFT
            )
            const { signature } = await txBuilder.sendAndConfirm(umi)
            const transactionSignatureBase58 = bs58.encode(signature)

            console.log(`✅ Sent ${amount} token(s) to destination EID: ${toEid}!`)
            const isTestnet = fromEid == EndpointId.SOLANA_V2_TESTNET
            console.log(
                `View Solana transaction here: ${getExplorerTxLink(transactionSignatureBase58.toString(), isTestnet)}`
            )
            console.log(
                `Track cross-chain transfer here: ${getLayerZeroScanLink(transactionSignatureBase58, isTestnet)}`
            )
        }
    )
