import {
    AccountMeta,
    Cluster,
    ClusterFilter,
    Commitment,
    Program,
    ProgramError,
    ProgramRepositoryInterface,
    PublicKey,
    RpcInterface,
    Signer,
    WrappedInstruction,
    createNullRpc,
} from '@metaplex-foundation/umi'
import { createDefaultProgramRepository } from '@metaplex-foundation/umi-program-repository'
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'
import { ComputeBudgetProgram } from '@solana/web3.js'
import { hexlify } from 'ethers/lib/utils'

import {
    EndpointProgram,
    EventPDA,
    MessageLibInterface,
    SimpleMessageLibProgram,
    SolanaPacketPath,
    UlnProgram,
    simulateWeb3JsTransaction,
} from '@layerzerolabs/lz-solana-sdk-v2/umi'

import * as accounts from './generated/omnicounter/accounts'
import * as errors from './generated/omnicounter/errors'
import * as instructions from './generated/omnicounter/instructions'
import * as types from './generated/omnicounter/types'
import { OmniCounterPDA } from './pda'

export { accounts, errors, instructions, types }
export { OMNICOUNTER_PROGRAM_ID } from './generated/omnicounter'

const ENDPOINT_PROGRAM_ID: PublicKey = EndpointProgram.ENDPOINT_PROGRAM_ID

export enum MessageType {
    VANILLA = 1,
}

export class OmniCounter {
    public readonly pda: OmniCounterPDA
    public readonly eventAuthority: PublicKey
    public readonly programRepo: ProgramRepositoryInterface
    public readonly endpointSDK: EndpointProgram.Endpoint

    constructor(
        public readonly programId: PublicKey,
        public endpointProgramId: PublicKey = EndpointProgram.ENDPOINT_PROGRAM_ID,
        rpc?: RpcInterface
    ) {
        this.pda = new OmniCounterPDA(programId)
        if (rpc === undefined) {
            rpc = createNullRpc()
            rpc.getCluster = (): Cluster => 'custom'
        }
        this.programRepo = createDefaultProgramRepository({ rpc: rpc }, [
            {
                name: 'omnicounter',
                publicKey: programId,
                getErrorFromCode(code: number, cause?: Error): ProgramError | null {
                    return errors.getOmnicounterErrorFromCode(code, this, cause)
                },
                getErrorFromName(name: string, cause?: Error): ProgramError | null {
                    return errors.getOmnicounterErrorFromName(name, this, cause)
                },
                isOnCluster(): boolean {
                    return true
                },
            } satisfies Program,
        ])
        this.eventAuthority = new EventPDA(programId).eventAuthority()[0]
        this.endpointSDK = new EndpointProgram.Endpoint(endpointProgramId)
    }

    getProgram(clusterFilter: ClusterFilter = 'custom'): Program {
        return this.programRepo.get('omnicounter', clusterFilter)
    }

    async getStore(rpc: RpcInterface, commitment: Commitment = 'confirmed'): Promise<accounts.Store | null> {
        const [count] = this.pda.oapp()
        return accounts.safeFetchStore({ rpc }, count, { commitment })
    }

    initStore(payer: Signer, admin: PublicKey, orderedNonce: boolean): WrappedInstruction {
        const [oapp] = this.pda.oapp()
        const remainingAccounts = this.endpointSDK.getRegisterOappIxAccountMetaForCPI(payer.publicKey, oapp)
        return instructions
            .initStore(
                { payer: payer, programs: this.programRepo },
                {
                    payer,
                    count: oapp,
                    lzReceiveTypesAccounts: this.pda.lzReceiveTypesAccounts()[0],

                    // args
                    admin: admin,
                    endpoint: this.endpointSDK.programId,
                    orderedNonce,
                    string: '',
                }
            )
            .addRemainingAccounts(remainingAccounts).items[0]
    }

    async send(
        rpc: RpcInterface,
        payer: PublicKey,
        params: EndpointProgram.types.MessagingFee & {
            dstEid: number
            message: string
            options: Uint8Array
        },
        remainingAccounts?: AccountMeta[],
        commitment: Commitment = 'confirmed'
    ): Promise<WrappedInstruction> {
        const { dstEid, nativeFee, lzTokenFee, message, options } = params
        const msgLibProgram = await this.getSendLibraryProgram(rpc, payer, dstEid)
        const [oapp] = this.pda.oapp()
        const [peer] = this.pda.peer(dstEid)
        const receiverInfo = await accounts.fetchPeer({ rpc }, peer, { commitment })
        const packetPath: SolanaPacketPath = {
            dstEid,
            sender: oapp,
            receiver: receiverInfo.address,
        }
        remainingAccounts =
            remainingAccounts ??
            (await this.endpointSDK.getSendIXAccountMetaForCPI(
                rpc,
                payer,
                {
                    path: packetPath,
                    msgLibProgram,
                },
                commitment
            ))
        return instructions
            .send(
                { programs: this.programRepo },
                {
                    peer: peer,
                    store: oapp,
                    endpoint: this.endpointSDK.pda.setting()[0],
                    // args
                    dstEid,
                    message,
                    options,
                    nativeFee: nativeFee,
                    lzTokenFee: lzTokenFee ?? 0,
                }
            )
            .addRemainingAccounts(remainingAccounts).items[0]
    }

    setPeer(admin: Signer, args: { peer: Uint8Array; remoteEid: number }): WrappedInstruction {
        const { remoteEid, peer } = args
        return instructions.setPeer(
            { programs: this.programRepo },
            {
                admin,
                store: this.pda.oapp()[0],
                peer: this.pda.peer(remoteEid)[0],
                nonceAccount: this.pda.nonce(this.pda.oapp()[0], remoteEid, peer)[0],
            },
            {
                remoteEid,
                peer,
            }
        ).items[0]
    }

    async quote(
        rpc: RpcInterface,
        payer: PublicKey,
        params: {
            dstEid: number
            message: string
            options: Uint8Array
            payInLzToken: boolean
        },
        remainingAccounts?: AccountMeta[],
        commitment: Commitment = 'confirmed'
    ): Promise<EndpointProgram.types.MessagingFee> {
        const { dstEid, message, options, payInLzToken } = params
        const msgLibProgram = await this.getSendLibraryProgram(rpc, payer, dstEid)
        const [oapp] = this.pda.oapp()

        // const [endpointSettingPDA] = endpoint.deriver.setting()
        const [peer] = this.pda.peer(dstEid)
        const receiverInfo = await accounts.fetchPeer({ rpc }, peer, { commitment })
        const packetPath: SolanaPacketPath = {
            dstEid,
            sender: oapp,
            receiver: receiverInfo.address,
        }
        remainingAccounts =
            remainingAccounts ??
            (await this.endpointSDK.getQuoteIXAccountMetaForCPI(rpc, payer, {
                path: packetPath,
                msgLibProgram,
            }))
        const ix = instructions
            .quote(
                {
                    programs: this.programRepo,
                },
                {
                    count: oapp,
                    endpoint: this.endpointSDK.pda.setting()[0],
                    // args
                    dstEid,
                    message,
                    options,
                    payInLzToken,
                    receiver: packetPath.receiver,
                }
            )
            .addRemainingAccounts(remainingAccounts).items[0]

        //TODO: use @solana-developers/helpers to get the compute units
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: 400000,
        })

        return simulateWeb3JsTransaction(
            rpc,
            [modifyComputeUnits, toWeb3JsInstruction(ix.instruction)],
            this.programId,
            payer,
            EndpointProgram.types.getMessagingFeeSerializer(),
            'confirmed'
        )
    }

    setOrderedNonce(admin: Signer, orderedNonce: boolean): WrappedInstruction {
        return instructions.setOrderedNonce(
            { programs: this.programRepo },
            {
                admin,
                count: this.pda.oapp(),
                orderedNonce,
            }
        ).items[0]
    }

    skipInboundNonce(
        admin: Signer,
        params: Pick<instructions.SkipInboundNonceInstructionDataArgs, 'srcEid' | 'sender' | 'nonce'>
    ): WrappedInstruction {
        const [receiver] = this.pda.oapp()
        const { srcEid, sender, nonce } = params
        const remainingAccounts = this.endpointSDK.getSkipIxAccountMetaForCPI(receiver, sender, srcEid, nonce)
        const builder = instructions
            .skipInboundNonce(
                { programs: this.programRepo },
                {
                    count: receiver,
                    admin,
                    nonceAccount: this.pda.nonce(receiver, srcEid, sender),
                    srcEid,
                    sender,
                    nonce,
                    receiver,
                }
            )
            .addRemainingAccounts(remainingAccounts)
        return builder.items[0]
    }

    async getSendLibraryProgram(
        rpc: RpcInterface,
        payer: PublicKey,
        dstEid: number
    ): Promise<SimpleMessageLibProgram.SimpleMessageLib | UlnProgram.Uln> {
        const [oapp] = this.pda.oapp()
        const sendLibInfo = await this.endpointSDK.getSendLibrary(rpc, oapp, dstEid)
        if (!sendLibInfo.programId) {
            throw new Error('Send library not initialized or blocked message library')
        }
        const { programId: msgLibProgram } = sendLibInfo
        const msgLibVersion = await this.endpointSDK.getMessageLibVersion(rpc, payer, msgLibProgram)
        if (msgLibVersion.major === 0n && msgLibVersion.minor == 0 && msgLibVersion.endpointVersion == 2) {
            return new SimpleMessageLibProgram.SimpleMessageLib(msgLibProgram)
        } else if (msgLibVersion.major === 3n && msgLibVersion.minor == 0 && msgLibVersion.endpointVersion == 2) {
            return new UlnProgram.Uln(msgLibProgram)
        }
        throw new Error(`Unsupported message library version: ${JSON.stringify(msgLibVersion, null, 2)}`)
    }
}

export async function getPeer(rpc: RpcInterface, dstEid: number, oftProgramId: PublicKey): Promise<string> {
    const [peer] = new OmniCounterPDA(oftProgramId).peer(dstEid)
    const info = await accounts.fetchPeer({ rpc }, peer)
    return hexlify(info.address)
}

export function initConfig(
    programId: PublicKey,
    accounts: {
        admin: Signer
        payer: Signer
    },
    remoteEid: number,
    programs?: {
        msgLib?: PublicKey
        endpoint?: PublicKey
    }
): WrappedInstruction {
    const { admin, payer } = accounts
    const pda = new OmniCounterPDA(programId)

    let msgLibProgram: PublicKey, endpointProgram: PublicKey
    if (programs === undefined) {
        msgLibProgram = UlnProgram.ULN_PROGRAM_ID
        endpointProgram = EndpointProgram.ENDPOINT_PROGRAM_ID
    } else {
        msgLibProgram = programs.msgLib ?? UlnProgram.ULN_PROGRAM_ID
        endpointProgram = programs.endpoint ?? EndpointProgram.ENDPOINT_PROGRAM_ID
    }

    const endpoint = new EndpointProgram.Endpoint(endpointProgram)
    let msgLib: MessageLibInterface
    if (msgLibProgram === SimpleMessageLibProgram.SIMPLE_MESSAGELIB_PROGRAM_ID) {
        msgLib = new SimpleMessageLibProgram.SimpleMessageLib(SimpleMessageLibProgram.SIMPLE_MESSAGELIB_PROGRAM_ID)
    } else {
        msgLib = new UlnProgram.Uln(msgLibProgram)
    }
    return endpoint.initOAppConfig(
        {
            delegate: admin,
            payer: payer.publicKey,
        },
        {
            msgLibSDK: msgLib,
            oapp: pda.oapp()[0],
            remote: remoteEid,
        }
    )
}

export function initSendLibrary(
    accounts: {
        admin: Signer
        oapp: PublicKey
    },
    remoteEid: number,
    endpointProgram: PublicKey = ENDPOINT_PROGRAM_ID
): WrappedInstruction {
    const { admin, oapp } = accounts
    const endpoint = new EndpointProgram.Endpoint(endpointProgram)
    return endpoint.initOAppSendLibrary(admin, { sender: oapp, remote: remoteEid })
}

export function initReceiveLibrary(
    accounts: {
        admin: Signer
        oapp: PublicKey
    },
    remoteEid: number,
    endpointProgram: PublicKey = ENDPOINT_PROGRAM_ID
): WrappedInstruction {
    const { admin, oapp } = accounts
    const endpoint = new EndpointProgram.Endpoint(endpointProgram)
    return endpoint.initOAppReceiveLibrary(admin, { receiver: oapp, remote: remoteEid })
}

export function initOAppNonce(
    accounts: {
        admin: Signer
        oapp: PublicKey
    },
    remoteEid: number,
    remoteOappAddr: Uint8Array, // must be 32 bytes
    endpointProgram: PublicKey = ENDPOINT_PROGRAM_ID
): WrappedInstruction {
    const { admin, oapp } = accounts
    const endpoint = new EndpointProgram.Endpoint(endpointProgram)

    return endpoint.initOAppNonce(admin, {
        localOApp: oapp,
        remote: remoteEid,
        remoteOApp: remoteOappAddr,
    })
}
