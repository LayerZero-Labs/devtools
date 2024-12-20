import { createSignerFromKeypair, publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_DECIMALS, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { addComputeUnitInstructions, deriveConnection, deriveKeys, getExplorerTxLink, output } from './index'

interface CreateOFTAdapterTaskArgs {
    /**
     * The endpoint ID for the Solana network.
     */
    eid: EndpointId

    /**
     * The token mint public key.
     */
    mint: string

    /**
     * The OFT Program id.
     */
    programId: string

    /**
     * The Token Program public key.
     */
    tokenProgram: string

    computeUnitPriceScaleFactor: number
}

// Define a Hardhat task for creating OFTAdapter on Solana
task('lz:oft-adapter:solana:create', 'Creates new OFT Adapter (OFT Store PDA)')
    .addParam('mint', 'The Token Mint public key')
    .addParam('programId', 'The OFT program ID')
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addParam('tokenProgram', 'The Token Program public key', TOKEN_PROGRAM_ID.toBase58(), devtoolsTypes.string, true)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, devtoolsTypes.float, true)
    .setAction(
        async ({
            eid,
            mint: mintStr,
            programId: programIdStr,
            tokenProgram: tokenProgramStr,
            computeUnitPriceScaleFactor,
        }: CreateOFTAdapterTaskArgs) => {
            const { connection, umi, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
            const { programId, lockBox, escrowPK, oftStorePda, eddsa } = deriveKeys(programIdStr)

            const tokenProgram = publicKey(tokenProgramStr)
            const mint = publicKey(mintStr)

            const mintPDA = await getMint(connection, new PublicKey(mintStr), undefined, new PublicKey(tokenProgramStr))

            const mintAuthority = mintPDA.mintAuthority

            let txBuilder = transactionBuilder().add(
                oft.initOft(
                    {
                        payer: createSignerFromKeypair({ eddsa: eddsa }, umiWalletKeyPair),
                        admin: umiWalletKeyPair.publicKey,
                        mint: mint,
                        escrow: createSignerFromKeypair({ eddsa: eddsa }, lockBox),
                    },
                    types.OFTType.Adapter,
                    OFT_DECIMALS,
                    {
                        oft: programId,
                        token: tokenProgram ? publicKey(tokenProgram) : undefined,
                    }
                )
            )
            txBuilder = await addComputeUnitInstructions(
                connection,
                umi,
                eid,
                txBuilder,
                umiWalletSigner,
                computeUnitPriceScaleFactor
            )
            const { signature } = await txBuilder.sendAndConfirm(umi)
            console.log(`initOftTx: ${getExplorerTxLink(bs58.encode(signature), eid == EndpointId.SOLANA_V2_TESTNET)}`)

            output(eid, programIdStr, mint, mintAuthority ? mintAuthority.toBase58() : '', escrowPK, oftStorePda)
        }
    )
