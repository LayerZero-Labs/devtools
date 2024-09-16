import assert from 'assert'

import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import {
    EddsaInterface,
    Keypair as UmiKeypair,
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import { toWeb3JsInstruction, toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, createMultisig, getMintLen } from '@solana/spl-token'
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

interface Args {
    amount: number
    eid: EndpointId
    programId: string
    oftName: string
}

function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

task('lz:oft:solana:create', 'Mints new SPL Token and creates new OFT Store account')
    .addParam('programId', 'The OFT Program id')
    .addParam('eid', 'Solana mainnet or testnet', undefined, devtoolsTypes.eid)
    .addParam('oftName', 'oft name', undefined, devtoolsTypes.string, true)
    .addOptionalParam('amount', 'The initial supply to mint on solana', undefined, devtoolsTypes.int)
    .setAction(async (taskArgs: Args) => {
        if (!taskArgs.oftName) {
            taskArgs.oftName = generateRandomString(10)
        }

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

        // 2. Generate the accounts we want to create (SPL Token)

        // Generate a new keypair for the SPL token mint account
        // const token = generateSigner(umi)

        const eddsa: EddsaInterface = createWeb3JsEddsa()

        const oftDeriver = new OftPDA(OFT_PROGRAM_ID)
        const oftName = taskArgs.oftName

        let ixs: TransactionInstruction[] = []
        let signers: UmiKeypair[] = []

        const lockBox = eddsa.createKeypairFromSeed(sha256(Buffer.from(`${oftName}-v2-lockbox`, 'utf-8')))
        const escrowPK = lockBox.publicKey
        console.dir({ escrowPk: lockBox.publicKey })
        const [oftStorePda] = oftDeriver.oftStore(escrowPK)
        console.dir({ oftStorePda }, { depth: null })

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

        console.dir({
            oftName,
            programId: taskArgs.programId,
            mint: mintPK,
            escrow: escrowPK,
            oftStore: oftStorePda,
        })
    })

interface TxResult {
    hash: string
    resp: RpcResponseAndContext<SignatureResult>
}

const sendAndConfirmTx = async (
    connection: Connection,
    signer: UmiKeypair[] | UmiKeypair, // the first one is the payer
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
