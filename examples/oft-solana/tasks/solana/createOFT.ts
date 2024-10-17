import assert from 'assert'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

import { TokenStandard, createAndMint } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox, setAuthority } from '@metaplex-foundation/mpl-toolbox'
import {
    EddsaInterface,
    createSignerFromKeypair,
    percentAmount,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import {
    fromWeb3JsPublicKey,
    toWeb3JsInstruction,
    toWeb3JsKeypair,
    toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID, createMultisig } from '@solana/spl-token'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { OFT_DECIMALS, OftPDA, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { createSolanaConnectionFactory } from '../common/utils'

import { sendAndConfirmTx } from './index'

const LOCAL_DECIMALS = 9

interface Args {
    amount: number
    eid: EndpointId
    programId: string
}

task('lz:oft:solana:create', 'Mints new SPL Token and creates new OFT Store account')
    .addParam('programId', 'The OFT Program id')
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addOptionalParam('amount', 'The initial supply to mint on solana', undefined, devtoolsTypes.int)
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())

        // Generate a wallet keypair from the private key stored in the environment
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        const programId = publicKey(taskArgs.programId)

        const eddsa: EddsaInterface = createWeb3JsEddsa()
        const oftDeriver = new OftPDA(programId)

        const lockBox = eddsa.generateKeypair()
        const escrowPK = lockBox.publicKey
        const [oftStorePda] = oftDeriver.oftStore(escrowPK)
        const mintKp = eddsa.generateKeypair()
        const mintPK = mintKp.publicKey
        const token = createSignerFromKeypair(umi, mintKp)

        const multiSigKey = await createMultisig(
            connection,
            toWeb3JsKeypair(umiWalletKeyPair),
            [toWeb3JsPublicKey(oftStorePda), toWeb3JsPublicKey(umiWalletKeyPair.publicKey)],
            1,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID
        )
        // amount cannot be 0, use undefined to represent "none"
        const amount = taskArgs.amount == 0 ? undefined : taskArgs.amount
        await createAndMint(umi, {
            mint: token, // New token account
            name: 'MockOFT', // Token name
            symbol: 'MOFT', // Token symbol
            isMutable: true, // Allow token metadata to be mutable
            decimals: LOCAL_DECIMALS, // Number of decimals for the token
            uri: '', // URI for token metadata
            sellerFeeBasisPoints: percentAmount(0), // Fee percentage
            authority: umiWalletSigner, // Authority for the token mint
            amount, // Initial amount to mint.  If 0, pass undefined.
            tokenOwner: umiWalletSigner.publicKey, // Owner of the token
            tokenStandard: TokenStandard.Fungible, // Token type (Fungible)
        }).sendAndConfirm(umi)

        const initOftIx = oft.initOft(
            {
                payer: createSignerFromKeypair({ eddsa: eddsa }, umiWalletKeyPair),
                admin: umiWalletKeyPair.publicKey,
                mint: mintPK,
                escrow: createSignerFromKeypair({ eddsa: eddsa }, lockBox),
            },
            types.OFTType.Native,
            OFT_DECIMALS,
            {
                oft: programId,
            }
        )
        const ixs = [toWeb3JsInstruction(initOftIx.instruction)]
        const signers = [umiWalletKeyPair, lockBox]

        const txResult = await sendAndConfirmTx(connection, signers, ixs)
        console.log(`initOFT transaction hash: ${txResult.hash}`)

        await setAuthority(umi, {
            owned: token.publicKey,
            owner: umiWalletSigner,
            newAuthority: fromWeb3JsPublicKey(multiSigKey),
            authorityType: 0,
        }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } })

        await setAuthority(umi, {
            owned: token.publicKey,
            owner: umiWalletSigner,
            newAuthority: fromWeb3JsPublicKey(multiSigKey),
            authorityType: 1,
        }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } })

        const outputDir = `./deployments/${endpointIdToNetwork(taskArgs.eid)}`
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true })
        }

        // Write the JSON file to the specified directory
        writeFileSync(
            `${outputDir}/OFT.json`,
            JSON.stringify(
                {
                    programId: taskArgs.programId,
                    mint: mintPK,
                    escrow: escrowPK,
                    oftStore: oftStorePda,
                },
                null,
                4
            )
        )
        console.log(`Accounts have been saved to ${outputDir}/OFT.json`)
    })
