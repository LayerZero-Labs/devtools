import { createSignerFromKeypair, publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_DECIMALS, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { createMintAuthorityMultisig } from './multisig'

import { deriveConnection, deriveKeys, getExplorerTxLink, output } from './index'

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
}

// Define a Hardhat task for creating OFTAdapter on Solana
task('lz:oft-adapter:solana:create', 'Mints new SPL Token, Lockbox, and new OFT Adapter Store account')
    .addParam('mint', 'The Token Mint public key')
    .addParam('programId', 'The OFT Program id')
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addParam('tokenProgram', 'The Token Program public key', TOKEN_PROGRAM_ID.toBase58(), devtoolsTypes.string, true)
    .setAction(
        async ({
            eid,
            mint: mintStr,
            programId: programIdStr,
            tokenProgram: tokenProgramStr,
        }: CreateOFTAdapterTaskArgs) => {
            const { connection, umi, umiWalletKeyPair } = await deriveConnection(eid)
            const { programId, lockBox, escrowPK, oftStorePda, eddsa } = deriveKeys(programIdStr)
            const tokenProgram = publicKey(tokenProgramStr)
            const mint = publicKey(mintStr)
            const mintAuthorityPublicKey = await createMintAuthorityMultisig(
                connection,
                toWeb3JsKeypair(umiWalletKeyPair),
                toWeb3JsPublicKey(oftStorePda),
                toWeb3JsPublicKey(tokenProgram)
            )
            const initOftIx = oft.initOft(
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
            const { signature } = await transactionBuilder().add(initOftIx).sendAndConfirm(umi)
            console.log(`initOftTx: ${getExplorerTxLink(bs58.encode(signature), eid == EndpointId.SOLANA_V2_TESTNET)}`)

            output(eid, programIdStr, mint, mintAuthorityPublicKey.toBase58(), escrowPK, oftStorePda)
        }
    )
