import assert from 'assert'

import { web3 } from '@coral-xyz/anchor'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import {
    EddsaInterface,
    KeypairSigner,
    PublicKey,
    TransactionBuilder,
    Umi,
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import {
    fromWeb3JsInstruction,
    fromWeb3JsPublicKey,
    toWeb3JsInstruction,
    toWeb3JsKeypair,
    toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'
import {
    ExtensionType,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    createMintToInstruction,
    createMultisig,
    getAssociatedTokenAddressSync,
    getMintLen,
} from '@solana/spl-token'
import {
    Connection,
    Finality,
    Keypair,
    RpcResponseAndContext,
    SignatureResult,
    SystemProgram,
    TransactionInstruction,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { sha256 } from 'ethereumjs-util'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { buildVersionedTransaction } from '@layerzerolabs/lz-solana-sdk-v2'
import { OFT_DECIMALS, OftPDA, oft, types } from '@layerzerolabs/oft-v2-solana-sdk'

import { createSolanaConnectionFactory } from '../common/utils'

export const TRANSFER_FEE_BPS = 200n // 2%
export const MAX_TRANSFER_FEE = BigInt(Math.pow(10, OFT_DECIMALS))

interface Args {
    amount: number
    eid: EndpointId
    programId: string
}

export interface OftKeys {
    escrow: KeypairSigner
    mint: KeypairSigner
    tokenMintAuthority: PublicKey
    tokenWithdrawableAuthority: KeypairSigner
    transferFeeConfigAuthority: KeypairSigner
    oappAdmin: KeypairSigner
    oappAdminTokenAccount?: PublicKey
    oftStore: PublicKey
}

async function initMint(umi: Umi, keys: OftKeys, tokenProgram: PublicKey, enableTransferFee = false): Promise<void> {
    const connection = new web3.Connection(umi.rpc.getEndpoint())
    const multiSigKey = await createMultisig(
        connection,
        toWeb3JsKeypair(keys.oappAdmin),
        [toWeb3JsPublicKey(keys.oftStore), toWeb3JsPublicKey(keys.oappAdmin.publicKey)],
        1,
        undefined,
        {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
        },
        toWeb3JsPublicKey(tokenProgram)
    )
    keys.tokenMintAuthority = fromWeb3JsPublicKey(multiSigKey) // can set tokenMinAuthority to keys.oftConfig

    const mintLen = getMintLen(enableTransferFee ? [ExtensionType.TransferFeeConfig] : [])
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen)
    const mintAmount = 1000000000n

    const tokenAccount = getAssociatedTokenAddressSync(
        toWeb3JsPublicKey(keys.mint.publicKey),
        toWeb3JsPublicKey(keys.oappAdmin.publicKey), // owner,
        false,
        toWeb3JsPublicKey(tokenProgram)
    )
    keys.oappAdminTokenAccount = fromWeb3JsPublicKey(tokenAccount)

    // create mint token
    const createMintIx = [
        web3.SystemProgram.createAccount({
            fromPubkey: toWeb3JsPublicKey(keys.oappAdmin.publicKey),
            newAccountPubkey: toWeb3JsPublicKey(keys.mint.publicKey),
            space: mintLen,
            lamports: mintLamports,
            programId: toWeb3JsPublicKey(tokenProgram),
        }),
    ]
    if (enableTransferFee) {
        createMintIx.push(
            createInitializeTransferFeeConfigInstruction(
                toWeb3JsPublicKey(keys.mint.publicKey),
                toWeb3JsPublicKey(keys.transferFeeConfigAuthority.publicKey),
                toWeb3JsPublicKey(keys.tokenWithdrawableAuthority.publicKey),
                parseInt(TRANSFER_FEE_BPS.toString()), // 2%,
                MAX_TRANSFER_FEE, // 1 tokens max fee,
                toWeb3JsPublicKey(tokenProgram)
            )
        )
    }
    createMintIx.push(
        createInitializeMintInstruction(
            toWeb3JsPublicKey(keys.mint.publicKey),
            OFT_DECIMALS,
            toWeb3JsPublicKey(keys.tokenMintAuthority), // mint authority
            null,
            toWeb3JsPublicKey(tokenProgram)
        ),
        createAssociatedTokenAccountInstruction(
            toWeb3JsPublicKey(keys.oappAdmin.publicKey), // payer
            tokenAccount,
            toWeb3JsPublicKey(keys.oappAdmin.publicKey), // mint
            toWeb3JsPublicKey(keys.mint.publicKey), // owner
            toWeb3JsPublicKey(tokenProgram)
        ),
        createMintToInstruction(
            toWeb3JsPublicKey(keys.mint.publicKey),
            tokenAccount,
            toWeb3JsPublicKey(keys.tokenMintAuthority),
            mintAmount,
            [toWeb3JsKeypair(keys.oappAdmin)],
            toWeb3JsPublicKey(tokenProgram)
        )
    )

    await sendAndConfirm(umi, createMintIx, [keys.oappAdmin, keys.mint])
}

export async function sendAndConfirm(
    umi: Umi,
    instructions: web3.TransactionInstruction[],
    signers: KeypairSigner[]
): Promise<void> {
    await new TransactionBuilder(
        instructions.map((ix) => {
            return {
                instruction: fromWeb3JsInstruction(ix),
                signers: signers,
                bytesCreatedOnChain: 0,
            }
        }),
        { feePayer: signers[0] }
    ).sendAndConfirm(umi, { send: { preflightCommitment: 'confirmed', commitment: 'confirmed' } })
}

task('solinit', 'Mints new SPL Token and creates new OFT Config account')
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

        // Create a signer object for UMI to use in transactions
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)

        // Set the UMI environment to use the signer identity
        umi.use(signerIdentity(umiWalletSigner))

        // Define the OFT Program ID based on the task arguments
        const OFT_PROGRAM_ID = publicKey(taskArgs.programId)

        const LOCAL_DECIMALS = 9
        const SHARED_DECIMALS = 6

        // Interface to hold account details for saving later
        interface AccountDetails {
            name: string
            publicKey: string
        }

        // Interface for the JSON structure that will store account information
        interface AccountsJson {
            timestamp: string
            accounts: AccountDetails[]
        }

        // 2. Generate the accounts we want to create (SPL Token)

        // Generate a new keypair for the SPL token mint account
        // const token = generateSigner(umi)

        const eddsa: EddsaInterface = createWeb3JsEddsa()

        const oftDeriver = new OftPDA(OFT_PROGRAM_ID)
        const oftName = 'fafo6' // TODO getDeployName(tokenInfo)

        let ixs: TransactionInstruction[] = []
        let signers: Keypair[] = []

        const lockBox = eddsa.createKeypairFromSeed(sha256(Buffer.from(`${oftName}-v2-lockbox`, 'utf-8')))
        const escrowPK = lockBox.publicKey
        const [oftStorePda] = oftDeriver.oftStore(escrowPK)
        console.dir(oftStorePda, { depth: null })

        // TODO handle adapter case too
        // if (tokenInfo.type === 'OFT')

        const mintKp = eddsa.createKeypairFromSeed(sha256(Buffer.from(`${oftName}-v2`, 'utf-8')))
        const mintPK = mintKp.publicKey
        console.dir(mintPK)

        const multiSigKey = await createMultisig(
            connection,
            toWeb3JsKeypair(umiWalletKeyPair),
            [toWeb3JsPublicKey(oftStorePda), toWeb3JsPublicKey(umiWalletKeyPair.publicKey)],
            1,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID
        )

        const createMintIxs = [
            SystemProgram.createAccount({
                fromPubkey: toWeb3JsPublicKey(umiWalletKeyPair.publicKey),
                newAccountPubkey: toWeb3JsPublicKey(mintPK),
                space: getMintLen([]),
                lamports: await connection.getMinimumBalanceForRentExemption(getMintLen([])),
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
                toWeb3JsPublicKey(mintPK),
                LOCAL_DECIMALS,
                multiSigKey,
                multiSigKey,
                TOKEN_PROGRAM_ID
            ),
        ]
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
                oft: OFT_PROGRAM_ID,
            }
        )
        ixs = [...createMintIxs, toWeb3JsInstruction(initOftIx.instruction)]
        signers = [umiWalletKeyPair, mintKp, lockBox]

        const t = await sendAndConfirmTx(connection, signers, ixs)
        console.dir(t, { depth: null })
    })

interface TxResult {
    hash: string
    resp: RpcResponseAndContext<SignatureResult>
}

const sendAndConfirmTx = async (
    connection: Connection,
    signer: Keypair[] | Keypair, // the first one is the payer
    ixs: TransactionInstruction[],
    commitment: Finality = 'confirmed'
): Promise<TxResult> => {
    const signers: Keypair | Keypair[] = Array.isArray(signer)
        ? signer.map((s) => toWeb3JsKeypair(s))
        : [toWeb3JsKeypair(signer)]
    const tx = await buildVersionedTransaction(connection, signers[0].publicKey, ixs)
    tx.sign(signers)
    const hash = await connection.sendTransaction(tx, { skipPreflight: true })
    const resp = await connection.confirmTransaction(hash, commitment)
    return { hash, resp }
}
