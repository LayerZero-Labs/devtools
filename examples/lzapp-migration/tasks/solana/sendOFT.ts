import { fetchToken, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import {
    TransactionType,
    addComputeUnitInstructions,
    deriveConnection,
    getExplorerTxLink,
    getLayerZeroScanLink,
    getSolanaDeployment,
} from './index'

interface Args {
    amount: bigint
    to: string
    fromEid: EndpointId
    toEid: EndpointId
    tokenProgram: string
    computeUnitPriceScaleFactor: number
}

// Define a Hardhat task for sending OFT from Solana
task('lz:oft:solana:send', 'Send tokens from Solana to a target EVM chain')
    .addParam('amount', 'The amount of tokens to send', undefined, devtoolsTypes.bigint)
    .addParam('fromEid', 'The source endpoint ID', undefined, devtoolsTypes.eid)
    .addParam('to', 'The recipient address on the destination chain')
    .addParam('toEid', 'The destination endpoint ID', undefined, devtoolsTypes.eid)
    .addParam('tokenProgram', 'The Token Program public key', TOKEN_PROGRAM_ID.toBase58(), devtoolsTypes.string, true)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, devtoolsTypes.float, true)
    .setAction(
        async ({ amount, fromEid, to, toEid, tokenProgram: tokenProgramStr, computeUnitPriceScaleFactor }: Args) => {
            const { connection, umi, umiWalletSigner } = await deriveConnection(fromEid)

            const solanaDeployment = getSolanaDeployment(fromEid)

            const oftProgramId = publicKey(solanaDeployment.programId)
            const mint = publicKey(solanaDeployment.mint)
            const umiEscrowPublicKey = publicKey(solanaDeployment.escrow)
            const tokenProgramId = publicKey(tokenProgramStr) // tokenProgramStr is always defined due to the default value set via addParam

            const tokenAccount = findAssociatedTokenPda(umi, {
                mint: publicKey(solanaDeployment.mint),
                owner: umiWalletSigner.publicKey,
                tokenProgramId,
            })

            if (!tokenAccount) {
                throw new Error(
                    `No token account found for mint ${solanaDeployment.mint} and owner ${umiWalletSigner.publicKey} in program ${tokenProgramId}`
                )
            }

            const tokenAccountData = await fetchToken(umi, tokenAccount)
            const balance = tokenAccountData.amount

            if (amount == BigInt(0) || amount > balance) {
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

            console.log(`\n✅ Sent ${amount} token(s) to destination EID: ${toEid}!`)
            const isTestnet = fromEid == EndpointId.SOLANA_V2_TESTNET
            console.log(
                `\nView Solana transaction here: ${getExplorerTxLink(transactionSignatureBase58.toString(), isTestnet)}`
            )
            console.log(
                `\nTrack cross-chain transfer here: ${getLayerZeroScanLink(transactionSignatureBase58, isTestnet)}\n`
            )
        }
    )
