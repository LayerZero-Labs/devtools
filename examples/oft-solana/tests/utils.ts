import {
    AddressLookupTableInput,
    Context,
    ProgramRepositoryInterface,
    PublicKey,
    RpcConfirmTransactionResult,
    Signer,
    TransactionBuilder,
    Umi,
    WrappedInstruction,
    createNoopSigner,
    publicKeyBytes,
} from '@metaplex-foundation/umi'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'
import {
    fromWeb3JsInstruction,
    fromWeb3JsPublicKey,
    toWeb3JsKeypair,
    toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'
import {
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    createMultisig,
    getAssociatedTokenAddressSync,
    getMintLen,
} from '@solana/spl-token'
import { Options, PacketSerializer, PacketV1Codec } from '@layerzerolabs/lz-v2-utilities'
import { sign, utils } from '@noble/secp256k1'
import * as web3 from '@solana/web3.js'
import { hexlify } from '@ethersproject/bytes'
import { DST_EID, DVN_SIGNERS, dvns, endpoint, executor, OFT_DECIMALS, SRC_EID, uln } from './constants'
import { oft, OftPDA } from '@layerzerolabs/oft-v2-solana-sdk'
import { OftKeys, PacketSentEvent, TestContext } from './types'

async function signWithECDSA(
    data: Buffer,
    privateKey: Uint8Array
): Promise<{ signature: Uint8Array; recoveryId: number }> {
    const [signature, recoveryId] = await sign(Uint8Array.from(data), utils.bytesToHex(privateKey), {
        canonical: true,
        recovered: true,
        der: false,
    })
    return {
        signature,
        recoveryId,
    }
}

export async function initMint(
    context: TestContext,
    keys: OftKeys,
    tokenProgram: PublicKey,
    decimals: number = OFT_DECIMALS
): Promise<void> {
    const { connection } = context
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
    keys.tokenMintAuthority = fromWeb3JsPublicKey(multiSigKey)

    const mintLen = getMintLen([])
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen)
    const mintAmount = 100000 * 10 ** decimals

    const tokenAccount = getAssociatedTokenAddressSync(
        toWeb3JsPublicKey(keys.mint.publicKey),
        toWeb3JsPublicKey(keys.oappAdmin.publicKey),
        false,
        toWeb3JsPublicKey(tokenProgram)
    )
    keys.oappAdminTokenAccount = fromWeb3JsPublicKey(tokenAccount)

    const createMintIx = [
        web3.SystemProgram.createAccount({
            fromPubkey: toWeb3JsPublicKey(keys.oappAdmin.publicKey),
            newAccountPubkey: toWeb3JsPublicKey(keys.mint.publicKey),
            space: mintLen,
            lamports: mintLamports,
            programId: toWeb3JsPublicKey(tokenProgram),
        }),
    ]

    createMintIx.push(
        createInitializeMintInstruction(
            toWeb3JsPublicKey(keys.mint.publicKey),
            decimals,
            toWeb3JsPublicKey(keys.tokenMintAuthority),
            null,
            toWeb3JsPublicKey(tokenProgram)
        ),
        createAssociatedTokenAccountInstruction(
            toWeb3JsPublicKey(keys.oappAdmin.publicKey),
            tokenAccount,
            toWeb3JsPublicKey(keys.oappAdmin.publicKey),
            toWeb3JsPublicKey(keys.mint.publicKey),
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

    await sendAndConfirm(context.umi, createMintIx, [keys.oappAdmin, keys.mint])
}

export async function setPeerConfig(
    umi: Umi,
    keys: OftKeys,
    pda: OftPDA,
    programRepo: ProgramRepositoryInterface,
    peerAddress: Uint8Array,
    dstEid: number = DST_EID
): Promise<PublicKey> {
    const [peer] = pda.peer(keys.oftStore, dstEid)

    const ix = oft.setPeerConfig(
        {
            admin: keys.oappAdmin,
            oftStore: keys.oftStore,
        },
        {
            __kind: 'PeerAddress',
            remote: dstEid,
            peer: peerAddress,
        },
        programRepo
    )
    await sendAndConfirm(umi, ix, keys.oappAdmin)
    return peer
}

export async function verifyByDvn(context: TestContext, packetSentEvent: PacketSentEvent): Promise<void> {
    const packetBytes = packetSentEvent.encodedPacket

    const expiration = BigInt(Math.floor(new Date().getTime() / 1000 + 120))
    const { umi } = context
    for (const programId of dvns) {
        const dvn = new UMI.DVNProgram.DVN(programId)
        const [requiredDVN] = dvn.pda.config()
        await new TransactionBuilder(
            [
                uln.initVerify(umi.payer, {
                    dvn: requiredDVN,
                    packetBytes,
                }),
                await dvn.invoke(
                    umi.rpc,
                    umi.payer,
                    {
                        vid: DST_EID % 30000,
                        instruction: uln.verify(createNoopSigner(requiredDVN), { packetBytes, confirmations: 10 })
                            .instruction,
                        expiration,
                    },
                    {
                        sign: async (message: Buffer): Promise<{ signature: Uint8Array; recoveryId: number }[]> => {
                            return Promise.all(DVN_SIGNERS.map(async (s) => signWithECDSA(message, s)))
                        },
                    }
                ),
            ],
            { addressLookupTables: context.lookupTable === undefined ? undefined : [context.lookupTable] }
        ).sendAndConfirm(umi, {
            send: { preflightCommitment: 'confirmed', commitment: 'confirmed' },
        })
    }
}

export async function commitVerification(
    context: TestContext,
    sender: Uint8Array,
    receiver: PublicKey,
    packetSentEvent: PacketSentEvent
): Promise<void> {
    const packetBytes = packetSentEvent.encodedPacket
    const deserializedPacket = PacketV1Codec.fromBytes(packetSentEvent.encodedPacket)
    const { umi } = context
    const expiration = BigInt(Math.floor(new Date().getTime() / 1000 + 120))

    await new TransactionBuilder([
        endpoint.initVerify(umi.payer, {
            srcEid: SRC_EID,
            sender,
            receiver,
            nonce: BigInt(deserializedPacket.nonce()),
        }),
        await uln.commitVerification(umi.rpc, packetBytes, endpoint.programId),
    ]).sendAndConfirm(umi, { send: { preflightCommitment: 'confirmed', commitment: 'confirmed' } })

    for (const programId of dvns) {
        const dvn = new UMI.DVNProgram.DVN(programId)
        const [requiredDVN] = dvn.pda.config()
        await new TransactionBuilder([
            await dvn.invoke(
                umi.rpc,
                umi.payer,
                {
                    vid: DST_EID % 30000,
                    instruction: uln.closeVerify(createNoopSigner(requiredDVN), {
                        receiver,
                        packetBytes,
                    }).instruction,
                    expiration,
                },
                {
                    sign: async (message: Buffer): Promise<{ signature: Uint8Array; recoveryId: number }[]> => {
                        return Promise.all(DVN_SIGNERS.map(async (s) => signWithECDSA(message, s)))
                    },
                }
            ),
        ]).sendAndConfirm(umi, { send: { preflightCommitment: 'confirmed', commitment: 'confirmed' } })
    }
}

export async function verifyAndReceive(
    context: TestContext,
    oftKeys: OftKeys,
    packetSentEvent: PacketSentEvent
): Promise<string> {
    const { umi } = context
    await verifyByDvn(context, packetSentEvent)
    await commitVerification(context, publicKeyBytes(oftKeys.oftStore), oftKeys.oftStore, packetSentEvent)
    return receive(context, umi, packetSentEvent)
}

export async function receive(context: TestContext, umi: Context, packetSentEvent: PacketSentEvent): Promise<string> {
    const deserializedPacket = PacketSerializer.deserialize(packetSentEvent.encodedPacket)
    const { options } = packetSentEvent
    const lzReceiveOptions = Options.fromOptions(hexlify(options)).decodeExecutorLzReceiveOption()
    const { instructions, signers, addressLookupTables } = await executor.execute(umi.rpc, umi.payer, {
        packet: deserializedPacket,
        extraData: new Uint8Array(2).fill(0),
        value: lzReceiveOptions?.value,
    })
    const newAddressLookupTables = [
        ...(context.lookupTable ? [context.lookupTable] : []),
        ...(addressLookupTables || []),
    ]
    const { signature } = await sendAndConfirm(
        umi,
        instructions.map((ix, index) => ({
            instruction: ix,
            signers: index === 0 ? signers : [],
            bytesCreatedOnChain: 0,
        })),
        [umi.payer, ...signers],
        200_000,
        newAddressLookupTables
    )
    return signature
}

export async function sendAndConfirm(
    umi: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    instructions: WrappedInstruction | WrappedInstruction[] | web3.TransactionInstruction[],
    signers: Signer | Signer[],
    computeUnitsLimit = 0,
    addressLookupTables?: AddressLookupTableInput[]
): Promise<{
    signature: Uint8Array
    result: RpcConfirmTransactionResult
}> {
    if (!Array.isArray(instructions)) {
        instructions = [instructions]
    }
    if (instructions[0] instanceof web3.TransactionInstruction) {
        instructions = (instructions as web3.TransactionInstruction[]).map((ix) => {
            return {
                instruction: fromWeb3JsInstruction(ix),
                signers: [],
                bytesCreatedOnChain: 0,
            }
        })
    } else {
        instructions = instructions as WrappedInstruction[]
    }
    const feePayer = Array.isArray(signers) ? signers[0] : signers
    if (Array.isArray(signers) && signers.length > 1) {
        const ixSigners = signers.slice(1)
        instructions.forEach((ix) => {
            ix.signers = ixSigners
        })
    }
    if (computeUnitsLimit > 0) {
        const computeUnitsBudgetIX = web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnitsLimit,
        })
        instructions = [
            {
                instruction: fromWeb3JsInstruction(computeUnitsBudgetIX),
                signers: [],
                bytesCreatedOnChain: 0,
            },
            ...instructions,
        ]
    }
    return new TransactionBuilder(instructions, { feePayer: feePayer, addressLookupTables })
        .sendAndConfirm(umi, {
            send: { preflightCommitment: 'confirmed', commitment: 'confirmed' },
        })
        .then((result) => {
            return { signature: result.signature, result: result.result }
        })
}
