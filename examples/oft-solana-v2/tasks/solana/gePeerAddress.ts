// TODO delme
import assert from 'assert'

import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import {
    TransactionBuilder,
    createNoopSigner,
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import { fromWeb3JsPublicKey, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58'

import { OmniPoint, makeBytes32 } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorPDADeriver } from '@layerzerolabs/lz-solana-sdk-v2'
import { OftPDA, accounts, oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-solana'

import { createSolanaConnectionFactory } from '../common/utils'

const main = async () => {
    const connectionFactory = createSolanaConnectionFactory()
    const connection = await connectionFactory(40168)
    const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())

    // const pk = publicKey('J7321zQBrKjfqfvxuXApumU2dDSaJ3RFUf3NbU3tTk8y')
    //
    // const store = await accounts.fetchOFTStore(umi, pk)
    // console.dir(store)

    const deriver = new OftPDA(publicKey('gtWfAULoB7tXuNfBVnFrfGhzhhg1oiYSx2s6UqRZbvg'))
    const config = deriver.config()
    console.dir(config, { depth: null })
    const s = deriver.oftStore(publicKey('26JLf7p6yNnHFrfuqAVv97UFrt53cG84bxqUhMwPfAgo'))
    console.dir(s, { depth: 10 })
    // const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
    const o = await accounts.fetchOFTStore(umi, s[0])
    console.dir(o, { depth: 10 })
    console.log(o.admin)

    const eddsa = createWeb3JsEddsa()
    const pda = eddsa.findPda(publicKey('gtWfAULoB7tXuNfBVnFrfGhzhhg1oiYSx2s6UqRZbvg'), [
        Buffer.from('OFTStore', 'utf8'),
    ])
    console.dir({ pda: pda })

    const userAccount = new PublicKey('WHKCfkxo59jmFTgmQG3ZQQSjShJnBpsugSCMrtee96x')
    const programId = new PublicKey('gtWfAULoB7tXuNfBVnFrfGhzhhg1oiYSx2s6UqRZbvg')

    const solanaSdkFactory = createOFTFactory(
        () => userAccount,
        () => programId,
        connectionFactory
    )
    const p: OmniPoint = {
        address: 'J7321zQBrKjfqfvxuXApumU2dDSaJ3RFUf3NbU3tTk8y',
        eid: 40168,
    }
    const sdk = await solanaSdkFactory(p)
    const res = await sdk.getOwner()
    console.log(makeBytes32('0x1'))
    // const tx = await sdk.setPeer(EndpointId.SEPOLIA_V2_TESTNET, makeBytes32('0x1'))
    // const tx = await sdk.setDelegate('WHKCfkxo59jmFTgmQG3ZQQSjShJnBpsugSCMrtee96x')
    // const tx = await sdk.setEnforcedOptions([
    //     {
    //         eid: EndpointId.SEPOLIA_V2_TESTNET,
    //         option: {
    //             options: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
    //             msgType: 1,
    //         },
    //     },
    // ])
    // console.dir(tx, { depth: null })
    const privateKey = process.env.SOLANA_PRIVATE_KEY
    assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')
    const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))

    // Convert the UMI keypair to a format compatible with web3.js
    // This is necessary as the @layerzerolabs/lz-solana-sdk-v2 library uses web3.js keypairs
    const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)

    // Create a signer object for UMI to use in transactions
    const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)

    // Set the UMI environment to use the signer identity
    umi.use(signerIdentity(umiWalletSigner))

    console.log(await (await sdk.getEndpointSDK()).getDefaultReceiveLibrary(EndpointId.SEPOLIA_V2_TESTNET))
    console.log(await sdk.isReceiveLibraryInitialized(EndpointId.SEPOLIA_V2_TESTNET))
    console.log(
        await (
            await sdk.getEndpointSDK()
        ).getSendLibrary('J7321zQBrKjfqfvxuXApumU2dDSaJ3RFUf3NbU3tTk8y', EndpointId.SEPOLIA_V2_TESTNET)
    )
    console.log(await sdk.isSendLibraryInitialized(EndpointId.SEPOLIA_V2_TESTNET))

    const [executorPda] = new ExecutorPDADeriver(new PublicKey('6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn')).config()
    console.dir({ executorPda }, { depth: null })
    return
    // console.log(await sdk.getEnforcedOptions(EndpointId.SEPOLIA_V2_TESTNET, 1))
    // console.log(await sdk.getEnforcedOptions(EndpointId.SEPOLIA_V2_TESTNET, 2))
    // console.log(await sdk.getPeer(EndpointId.SEPOLIA_V2_TESTNET))
    // return
    //const uln = new UlnProgram.Uln(new Web3PublicKey('7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH'))
    const uln = new PublicKey('7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH')
    // const t = deserializeTransactionMessage(tx.data)
    const ix = oft.initConfig(
        {
            admin: createNoopSigner(publicKey('WHKCfkxo59jmFTgmQG3ZQQSjShJnBpsugSCMrtee96x')),
            oftStore: publicKey('J7321zQBrKjfqfvxuXApumU2dDSaJ3RFUf3NbU3tTk8y'),
            payer: createNoopSigner(publicKey('WHKCfkxo59jmFTgmQG3ZQQSjShJnBpsugSCMrtee96x')),
        },
        40161,
        {
            msgLib: fromWeb3JsPublicKey(uln),
        }
    )
    const txBuilder = new TransactionBuilder([ix])
    const web3Transaction = new Transaction()
    txBuilder.getInstructions().forEach((umiInstruction) => {
        const web3Instruction = new TransactionInstruction({
            programId: new PublicKey(umiInstruction.programId),
            keys: umiInstruction.keys.map((key) => ({
                pubkey: new PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
            })),
            data: Buffer.from(umiInstruction.data), // Data is a Buffer in both formats
        })

        // Add the instruction to the Web3.js transaction
        web3Transaction.add(web3Instruction)
    })
    const t = web3Transaction
    const { blockhash } = await connection.getLatestBlockhash('finalized')
    t.recentBlockhash = blockhash
    t.feePayer = web3WalletKeyPair.publicKey

    t.sign(web3WalletKeyPair)
    try {
        const txId = await sendAndConfirmTransaction(connection, t, [web3WalletKeyPair])
        console.log(`Transaction successful with ID: ${txId}`)
    } catch (error) {
        console.error('Transaction failed:', error)
    }
    // // @ts-ignore
    // const signedTx = unsignedTx.sign([umiWalletSigner])
    // console.dir({signedTx}, {depth: null})

    // sepolia todo
    // const peer = await oft.getPeerAddress(
    //     umi.rpc,
    //     publicKey('J7321zQBrKjfqfvxuXApumU2dDSaJ3RFUf3NbU3tTk8y'),
    //     40161,
    //     publicKey('gtWfAULoB7tXuNfBVnFrfGhzhhg1oiYSx2s6UqRZbvg')
    // )
    // console.dir(peer)
}

main()
