import {
    CreateV1InstructionAccounts,
    CreateV1InstructionArgs,
    TokenStandard,
    createV1,
    mintV1,
} from '@metaplex-foundation/mpl-token-metadata'
import { setAuthority } from '@metaplex-foundation/mpl-toolbox'
import {
    createNoopSigner,
    createSignerFromKeypair,
    percentAmount,
    publicKey,
    transactionBuilder,
} from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_DECIMALS, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { createMintAuthorityMultisig } from './multisig'

import { deriveConnection, deriveKeys, getExplorerTxLink, output } from './index'

const DEFAULT_LOCAL_DECIMALS = 9

interface CreateOFTTaskArgs {
    /**
     * The initial supply to mint on solana.
     */
    amount: number

    /**
     * The endpoint ID for the Solana network.
     */
    eid: EndpointId

    /**
     * The number of decimal places to use for the token.
     */
    localDecimals: number

    /**
     * The optional token mint ID, for Mint-And-Burn-Adapter only.
     */
    mint?: string

    /**
     * The name of the token.
     */
    name: string

    /**
     * The program ID for the OFT program.
     */
    programId: string

    /**
     * The seller fee basis points.
     */
    sellerFeeBasisPoints: number

    /**
     * The symbol of the token.
     */
    symbol: string

    /**
     * Whether the token metadata is mutable.
     */
    tokenMetadataIsMutable: boolean

    /**
     * The CSV list of additional minters.
     */
    additionalMinters?: string[]

    /**
     * The token program ID, for Mint-And-Burn-Adapter only.
     */
    tokenProgram: string

    /**
     * If you plan to have only the OFTStore and no additional minters.  This is not reversible, and will result in
     * losing the ability to mint new tokens for everything but the OFTStore.  You should really be intentional about
     * using this flag, as it is not reversible.
     */
    onlyOftStore: boolean

    /**
     * The URI for the token metadata.
     */
    uri: string
}

// Define a Hardhat task for creating OFT on Solana
// * Create the SPL Multisig account for mint authority
// * Mint the new SPL Token
// * Initialize the OFT Store account
// * Set the mint/freeze authority to the multisig account
// Note:  Only supports SPL Token Standard.
task('lz:oft:solana:create', 'Mints new SPL Token and creates new OFT Store account')
    .addOptionalParam('amount', 'The initial supply to mint on solana', undefined, devtoolsTypes.int)
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addOptionalParam('localDecimals', 'Token local decimals (default=9)', DEFAULT_LOCAL_DECIMALS, devtoolsTypes.int)
    .addParam('name', 'Token Name', 'MockOFT', devtoolsTypes.string)
    .addParam('mint', 'The Token mint public key (used for MABA only)', '', devtoolsTypes.string)
    .addParam('programId', 'The OFT Program id')
    .addParam('sellerFeeBasisPoints', 'Seller fee basis points', 0, devtoolsTypes.int)
    .addParam('symbol', 'Token Symbol', 'MOFT', devtoolsTypes.string)
    .addParam('tokenMetadataIsMutable', 'Token metadata is mutable', true, devtoolsTypes.boolean)
    .addParam('additionalMinters', 'Comma-separated list of additional minters', undefined, devtoolsTypes.csv, true)
    .addOptionalParam(
        'onlyOftStore',
        'If you plan to have only the OFTStore and no additional minters.  This is not reversible, and will result in losing the ability to mint new tokens by everything but the OFTStore.',
        false,
        devtoolsTypes.boolean
    )
    .addParam(
        'tokenProgram',
        'The Token Program public key (used for MABA only)',
        TOKEN_PROGRAM_ID.toBase58(),
        devtoolsTypes.string
    )
    .addParam('uri', 'URI for token metadata', '', devtoolsTypes.string)
    .setAction(
        async ({
            amount,
            eid,
            localDecimals: decimals,
            mint: mintStr,
            name,
            programId: programIdStr,
            sellerFeeBasisPoints,
            symbol,
            tokenMetadataIsMutable: isMutable,
            additionalMinters: additionalMintersAsStrings,
            onlyOftStore,
            tokenProgram: tokenProgramStr,
            uri,
        }: CreateOFTTaskArgs) => {
            const isMABA = !!mintStr
            if (tokenProgramStr !== TOKEN_PROGRAM_ID.toBase58() && !isMABA) {
                throw new Error('Non-Mint-And-Burn-Adapter does not support custom token programs')
            }
            if (isMABA && amount) {
                throw new Error('Mint-And-Burn-Adapter does not support minting tokens')
            }
            const tokenProgramId = publicKey(tokenProgramStr)
            const { connection, umi, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
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
            const mintAuthorityPublicKey = await createMintAuthorityMultisig(
                connection,
                toWeb3JsKeypair(umiWalletKeyPair),
                toWeb3JsPublicKey(oftStorePda),
                toWeb3JsPublicKey(tokenProgramId), // Only configurable for MABA
                additionalMinters
            )
            console.log(`created SPL multisig @ ${mintAuthorityPublicKey.toBase58()}`)

            const mint = isMABA
                ? createNoopSigner(publicKey(mintStr))
                : createSignerFromKeypair(umi, eddsa.generateKeypair())
            const isTestnet = eid == EndpointId.SOLANA_V2_TESTNET
            if (!isMABA) {
                const createV1Args: CreateV1InstructionAccounts & CreateV1InstructionArgs = {
                    mint,
                    name,
                    symbol,
                    decimals,
                    uri,
                    isMutable,
                    sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints),
                    authority: umiWalletSigner, // authority is transferred later
                    tokenStandard: TokenStandard.Fungible,
                }
                const txBuilder = transactionBuilder().add(createV1(umi, createV1Args))
                if (amount) {
                    txBuilder.add(
                        mintV1(umi, {
                            ...createV1Args,
                            mint: publicKey(createV1Args.mint),
                            authority: umiWalletSigner,
                            amount,
                            tokenOwner: umiWalletSigner.publicKey,
                            tokenStandard: TokenStandard.Fungible,
                        })
                    )
                }
                const createTokenTx = await txBuilder.sendAndConfirm(umi)
                console.log(`createTokenTx: ${getExplorerTxLink(bs58.encode(createTokenTx.signature), isTestnet)}`)
            }

            const lockboxSigner = createSignerFromKeypair({ eddsa: eddsa }, lockBox)
            const { signature } = await transactionBuilder()
                .add(
                    oft.initOft(
                        {
                            payer: umiWalletSigner,
                            admin: umiWalletKeyPair.publicKey,
                            mint: mint.publicKey,
                            escrow: lockboxSigner,
                        },
                        types.OFTType.Native,
                        OFT_DECIMALS,
                        {
                            oft: programId,
                            token: tokenProgramId,
                        }
                    )
                )
                .sendAndConfirm(umi)
            console.log(`initOftTx: ${getExplorerTxLink(bs58.encode(signature), isTestnet)}`)

            if (!isMABA) {
                const { signature } = await transactionBuilder()
                    .add(
                        setAuthority(umi, {
                            owned: mint.publicKey,
                            owner: umiWalletSigner,
                            newAuthority: fromWeb3JsPublicKey(mintAuthorityPublicKey),
                            authorityType: 0,
                        })
                    )
                    .add(
                        setAuthority(umi, {
                            owned: mint.publicKey,
                            owner: umiWalletSigner,
                            newAuthority: fromWeb3JsPublicKey(mintAuthorityPublicKey),
                            authorityType: 1,
                        })
                    )
                    .sendAndConfirm(umi)
                console.log(`setAuthorityTx: ${getExplorerTxLink(bs58.encode(signature), isTestnet)}`)
            }
            output(eid, programIdStr, mint.publicKey, mintAuthorityPublicKey.toBase58(), escrowPK, oftStorePda)
        }
    )
