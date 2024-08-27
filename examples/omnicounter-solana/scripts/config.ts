import { arrayify, hexZeroPad } from '@ethersproject/bytes'
import { Connection, Keypair, PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    EndpointProgram,
    ExecutorPDADeriver,
    SetConfigType,
    UlnProgram,
    buildVersionedTransaction,
} from '@layerzerolabs/lz-solana-sdk-v2'

import { OmniCounterProgram } from '../src'

const endpointProgram = new EndpointProgram.Endpoint(new PublicKey('76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6')) // endpoint program id, mainnet and testnet are the same
const ulnProgram = new UlnProgram.Uln(new PublicKey('7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH')) // uln program id, mainnet and testnet are the same
const executorProgram = new PublicKey('6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn') // executor program id, mainnet and testnet are the same

const counterProgram = new OmniCounterProgram.OmniCounter(new PublicKey('2tLJfE12h5RY7vJqK6i41taeg8ejzigoFXduBanDV4Cu'))

const connection = new Connection('https://api.mainnet-beta.solana.com')
const signer = Keypair.fromSecretKey(new Uint8Array([]))
const remotePeers: { [key in EndpointId]?: string } = {
    [EndpointId.ARBSEP_V2_TESTNET]: '0x7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH', // EVM counter addr
}

;(async () => {
    await initCounter(connection, signer, signer)
    for (const [remoteStr, remotePeer] of Object.entries(remotePeers)) {
        const remotePeerBytes = arrayify(hexZeroPad(remotePeer, 32))
        const remote = parseInt(remoteStr) as EndpointId
        await setPeers(connection, signer, remote, remotePeerBytes)
        await initSendLibrary(connection, signer, remote)
        await initReceiveLibrary(connection, signer, remote)
        await initOappNonce(connection, signer, remote, remotePeerBytes)
        await setSendLibrary(connection, signer, remote)
        await setReceiveLibrary(connection, signer, remote)
        await initUlnConfig(connection, signer, signer, remote)
        await setOappExecutor(connection, signer, remote)
    }
})()

async function initCounter(connection: Connection, payer: Keypair, admin: Keypair): Promise<void> {
    const [count] = counterProgram.idPDA()
    let current = false
    try {
        await OmniCounterProgram.accounts.Count.fromAccountAddress(connection, count, {
            commitment: 'confirmed',
        })
        current = true
    } catch (e) {
        /*count not init*/
    }
    const ix = await counterProgram.initCount(
        connection,
        payer.publicKey,
        admin.publicKey, // admin/delegate double check it, is the same public key
        endpointProgram
    )
    if (ix == null) {
        // already initialized
        return Promise.resolve()
    }
    sendAndConfirm(connection, [admin], [ix])
}

async function setPeers(
    connection: Connection,
    admin: Keypair,
    remote: EndpointId,
    remotePeer: Uint8Array
): Promise<void> {
    const ix = counterProgram.setRemote(admin.publicKey, remotePeer, remote)
    const [remotePDA] = counterProgram.omniCounterDeriver.remote(remote)
    let current = ''
    try {
        const info = await OmniCounterProgram.accounts.Remote.fromAccountAddress(connection, remotePDA, {
            commitment: 'confirmed',
        })
        current = Buffer.from(info.address).toString('hex')
    } catch (e) {
        /*remote not init*/
    }
    if (current == Buffer.from(remotePeer).toString('hex')) {
        return Promise.resolve()
    }
    sendAndConfirm(connection, [admin], [ix])
}

async function initSendLibrary(connection: Connection, admin: Keypair, remote: EndpointId): Promise<void> {
    const [id] = counterProgram.idPDA()
    const ix = await endpointProgram.initSendLibrary(connection, admin.publicKey, id, remote)
    if (ix == null) {
        return Promise.resolve()
    }
    sendAndConfirm(connection, [admin], [ix])
}

async function initReceiveLibrary(connection: Connection, admin: Keypair, remote: EndpointId): Promise<void> {
    const [id] = counterProgram.idPDA()
    const ix = await endpointProgram.initReceiveLibrary(connection, admin.publicKey, id, remote)
    if (ix == null) {
        return Promise.resolve()
    }
    sendAndConfirm(connection, [admin], [ix])
}

async function initOappNonce(
    connection: Connection,
    admin: Keypair,
    remote: EndpointId,
    remotePeer: Uint8Array
): Promise<void> {
    const [id] = counterProgram.idPDA()
    const ix = await endpointProgram.initOAppNonce(connection, admin.publicKey, remote, id, remotePeer)
    if (ix === null) return Promise.resolve()
    const current = false
    try {
        const nonce = await endpointProgram.getNonce(connection, id, remote, remotePeer)
        if (nonce) {
            console.log('nonce already set')
            return Promise.resolve()
        }
    } catch (e) {
        /*nonce not init*/
    }
    sendAndConfirm(connection, [admin], [ix])
}

async function setSendLibrary(connection: Connection, admin: Keypair, remote: EndpointId): Promise<void> {
    const [id] = counterProgram.idPDA()
    const sendLib = await endpointProgram.getSendLibrary(connection, id, remote)
    const current = sendLib ? sendLib.msgLib.toBase58() : ''
    const [expectedSendLib] = ulnProgram.deriver.messageLib()
    const expected = expectedSendLib.toBase58()
    if (current === expected) {
        return Promise.resolve()
    }
    const ix = await endpointProgram.setSendLibrary(admin.publicKey, id, ulnProgram.program, remote)
    sendAndConfirm(connection, [admin], [ix])
}

async function setReceiveLibrary(connection: Connection, admin: Keypair, remote: EndpointId): Promise<void> {
    const [id] = counterProgram.idPDA()
    const receiveLib = await endpointProgram.getReceiveLibrary(connection, id, remote)
    const current = receiveLib ? receiveLib.msgLib.toBase58() : ''
    const [expectedMessageLib] = ulnProgram.deriver.messageLib()
    const expected = expectedMessageLib.toBase58()
    if (current === expected) {
        return Promise.resolve()
    }
    const ix = await endpointProgram.setReceiveLibrary(admin.publicKey, id, ulnProgram.program, remote)
    sendAndConfirm(connection, [admin], [ix])
}

async function initUlnConfig(
    connection: Connection,
    payer: Keypair,
    admin: Keypair,
    remote: EndpointId
): Promise<void> {
    const [id] = counterProgram.idPDA()

    const current = await ulnProgram.getSendConfigState(connection, id, remote)
    if (current) {
        return Promise.resolve()
    }
    const ix = await endpointProgram.initOappConfig(admin.publicKey, ulnProgram, payer.publicKey, id, remote)
    sendAndConfirm(connection, [admin], [ix])
}

async function setOappExecutor(connection: Connection, admin: Keypair, remote: EndpointId): Promise<void> {
    const [id] = counterProgram.idPDA()
    const defaultOutboundMaxMessageSize = 10000

    const [executorPda] = new ExecutorPDADeriver(executorProgram).config()
    const expected: UlnProgram.types.ExecutorConfig = {
        maxMessageSize: defaultOutboundMaxMessageSize,
        executor: executorPda,
    }

    const current = (await ulnProgram.getSendConfigState(connection, id, remote))?.executor
    const ix = await endpointProgram.setOappConfig(connection, admin.publicKey, id, ulnProgram.program, remote, {
        configType: SetConfigType.EXECUTOR,
        value: expected,
    })
    if (
        current &&
        current.executor.toBase58() === expected.executor.toBase58() &&
        current.maxMessageSize === expected.maxMessageSize
    ) {
        return Promise.resolve()
    }
    await sendAndConfirm(connection, [admin], [ix])
}

async function sendAndConfirm(
    connection: Connection,
    signers: Signer[],
    instructions: TransactionInstruction[]
): Promise<void> {
    const tx = await buildVersionedTransaction(connection, signers[0].publicKey, instructions, 'confirmed')
    tx.sign(signers)
    const hash = await connection.sendTransaction(tx, { skipPreflight: true })
    await connection.confirmTransaction(hash, 'confirmed')
}
