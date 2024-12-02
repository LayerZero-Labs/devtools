import { createSignerFromKeypair, publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_DECIMALS, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { checkMultisigSigners, createMintAuthorityMultisig } from './multisig'

import { deriveConnection, deriveKeys, getExplorerTxLink, output } from './index'

interface CreateOFTAdapterTaskArgs {
    /**
     * The CSV list of additional minters.
     */
    additionalMinters?: string[]

    /**
     * The endpoint ID for the Solana network.
     */
    eid: EndpointId

    /**
     * The token mint public key.
     */
    mint: string

    /**
     * If you plan to have only the OFTStore and no additional minters.  This is not reversible, and will result in
     * losing the ability to mint new tokens for everything but the OFTStore.  You should really be intentional about
     * using this flag, as it is not reversible.
     */
    onlyOftStore: boolean

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
task('lz:oft-adapter:solana:create', 'Creates new OFT Adapter (OFT Store PDA)')
    .addParam('mint', 'The Token Mint public key')
    .addParam('programId', 'The OFT program ID')
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addParam('tokenProgram', 'The Token Program public key', TOKEN_PROGRAM_ID.toBase58(), devtoolsTypes.string, true)
    .addParam('additionalMinters', 'Comma-separated list of additional minters', undefined, devtoolsTypes.csv, true)
    .addOptionalParam(
        'onlyOftStore',
        'If you plan to have only the OFTStore and no additional minters.  This is not reversible, and will result in losing the ability to mint new tokens by everything but the OFTStore.',
        false,
        devtoolsTypes.boolean
    )
    .setAction(
        async ({
            additionalMinters: additionalMintersAsStrings,
            eid,
            mint: mintStr,
            onlyOftStore,
            programId: programIdStr,
            tokenProgram: tokenProgramStr,
        }: CreateOFTAdapterTaskArgs) => {
            const { connection, umi, umiWalletKeyPair } = await deriveConnection(eid)
            const { programId, lockBox, escrowPK, oftStorePda, eddsa } = deriveKeys(programIdStr)
            if (!additionalMintersAsStrings) {
                if (!onlyOftStore) {
                    throw new Error('If you want to proceed with only the OFTStore, please specify --onlyOFTStore')
                }
                console.log(
                    'No additional minters specified.  This will result in only the OFTStore being able to mint new tokens.'
                )
            }
            const additionalMinters = additionalMintersAsStrings?.map((minter) => new PublicKey(minter)) ?? []
            const tokenProgram = publicKey(tokenProgramStr)
            const mint = publicKey(mintStr)
            const mintAuthorityPublicKey = await createMintAuthorityMultisig(
                connection,
                toWeb3JsKeypair(umiWalletKeyPair),
                toWeb3JsPublicKey(oftStorePda),
                toWeb3JsPublicKey(tokenProgram),
                additionalMinters
            )
            console.log(`created SPL multisig @ ${mintAuthorityPublicKey.toBase58()}`)
            await checkMultisigSigners(connection, mintAuthorityPublicKey, [
                toWeb3JsPublicKey(oftStorePda),
                ...additionalMinters,
            ])
            const initOftIx = oft.initOft(
                {
                    payer: createSignerFromKeypair({ eddsa: eddsa }, umiWalletKeyPair),
                    admin: umiWalletKeyPair.publicKey,
                    mint,
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
