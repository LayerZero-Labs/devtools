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

import * as accounts from './generated/my_oapp/accounts'
import * as errors from './generated/my_oapp/errors'
import * as instructions from './generated/my_oapp/instructions'
import * as types from './generated/my_oapp/types'
import { MyOAppPDA as MyOAppPDA } from './pda'
import { SetPeerAddressParam, SetPeerEnforcedOptionsParam } from './types'

export { accounts, errors, instructions, types }
export { MY_OAPP_PROGRAM_ID } from './generated/my_oapp'

const ENDPOINT_PROGRAM_ID: PublicKey = EndpointProgram.ENDPOINT_PROGRAM_ID

export enum MessageType {
    VANILLA = 1,
    COMPOSED_TYPE = 2,
}

export class MyOApp {
    public readonly pda: MyOAppPDA
    public readonly eventAuthority: PublicKey
    public readonly programRepo: ProgramRepositoryInterface
    public readonly endpointSDK: EndpointProgram.Endpoint

    constructor(
        public readonly programId: PublicKey,
        public endpointProgramId: PublicKey = EndpointProgram.ENDPOINT_PROGRAM_ID,
        rpc?: RpcInterface
    ) {
        this.pda = new MyOAppPDA(programId)
        if (rpc === undefined) {
            rpc = createNullRpc()
            rpc.getCluster = (): Cluster => 'custom'
        }
        this.programRepo = createDefaultProgramRepository({ rpc: rpc }, [
            {
                name: 'myoapp',
                publicKey: programId,
                getErrorFromCode(code: number, cause?: Error): ProgramError | null {
                    return errors.getMyOappErrorFromCode(code, this, cause)
                },
                getErrorFromName(name: string, cause?: Error): ProgramError | null {
                    return errors.getMyOappErrorFromName(name, this, cause)
                },
                isOnCluster(): boolean {
                    return true
                },
            } satisfies Program,
        ])
        this.eventAuthority = new EventPDA(programId).eventAuthority()[0]
        this.endpointSDK = new EndpointProgram.Endpoint(endpointProgramId)
    }

    async getEnforcedOptions(rpc: RpcInterface, remoteEid: number): Promise<types.EnforcedOptions> {
        const [peer] = this.pda.peer(remoteEid)
        const peerInfo = await accounts.fetchPeerConfig({ rpc }, peer)
        return peerInfo.enforcedOptions
    }

    getProgram(clusterFilter: ClusterFilter = 'custom'): Program {
        return this.programRepo.get('myoapp', clusterFilter)
    }

    async getStore(rpc: RpcInterface, commitment: Commitment = 'confirmed'): Promise<accounts.Store | null> {
        const [count] = this.pda.oapp()
        return accounts.safeFetchStore({ rpc }, count, { commitment })
    }

    initStore(payer: Signer, admin: PublicKey): WrappedInstruction {
        const [oapp] = this.pda.oapp()
        const remainingAccounts = this.endpointSDK.getRegisterOappIxAccountMetaForCPI(payer.publicKey, oapp)
        return instructions
            .initStore(
                { payer: payer, programs: this.programRepo },
                {
                    payer,
                    store: oapp,
                    lzReceiveTypesAccounts: this.pda.lzReceiveTypesAccounts()[0],
                    lzComposeTypesAccounts: this.pda.lzComposeTypesAccounts()[0],

                    // args
                    admin: admin,
                    endpoint: this.endpointSDK.programId,
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
            composeMsg?: Uint8Array
        },
        remainingAccounts?: AccountMeta[],
        commitment: Commitment = 'confirmed'
    ): Promise<WrappedInstruction> {
        const { dstEid, nativeFee, lzTokenFee, message, options, composeMsg } = params
        const msgLibProgram = await this.getSendLibraryProgram(rpc, payer, dstEid)
        const [oapp] = this.pda.oapp()
        const [peer] = this.pda.peer(dstEid)
        const receiverInfo = await accounts.fetchPeerConfig({ rpc }, peer, { commitment })
        const packetPath: SolanaPacketPath = {
            dstEid,
            sender: oapp,
            receiver: receiverInfo.peerAddress,
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
        if (remainingAccounts === undefined) {
            throw new Error('Failed to get remaining accounts for send instruction')
        }
        return instructions
            .send(
                { programs: this.programRepo },
                {
                    store: oapp,
                    peer: peer,
                    endpoint: this.endpointSDK.pda.setting()[0],
                    // args
                    dstEid,
                    message,
                    composeMsg: composeMsg ?? null,
                    options,
                    nativeFee: nativeFee,
                    lzTokenFee: lzTokenFee ?? 0,
                }
            )
            .addRemainingAccounts(remainingAccounts).items[0]
    }

    setPeerConfig(
        accounts: {
            admin: Signer
        },
        param: (SetPeerAddressParam | SetPeerEnforcedOptionsParam) & {
            remote: number
        }
    ): WrappedInstruction {
        const { admin } = accounts
        const { remote } = param
        let config: types.PeerConfigParamArgs
        if (param.__kind === 'PeerAddress') {
            if (param.peer.length !== 32) {
                throw new Error('Peer must be 32 bytes (left-padded with zeroes)')
            }
            config = types.peerConfigParam('PeerAddress', [param.peer])
        } else if (param.__kind === 'EnforcedOptions') {
            config = {
                __kind: 'EnforcedOptions',
                send: param.send,
                sendAndCall: param.sendAndCall,
            }
        } else {
            throw new Error('Invalid peer config')
        }

        return instructions.setPeerConfig(
            { programs: this.programRepo },
            {
                admin,
                store: this.pda.oapp()[0],
                peer: this.pda.peer(remote)[0],
                // args
                remoteEid: remote,
                config,
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
            composeMsg?: Uint8Array
            payInLzToken: boolean
        },
        remainingAccounts?: AccountMeta[],
        commitment: Commitment = 'confirmed'
    ): Promise<EndpointProgram.types.MessagingFee> {
        const { dstEid, message, options, payInLzToken, composeMsg } = params
        const msgLibProgram = await this.getSendLibraryProgram(rpc, payer, dstEid)
        const [oapp] = this.pda.oapp()

        // const [endpointSettingPDA] = endpoint.deriver.setting()
        const [peer] = this.pda.peer(dstEid)
        const receiverInfo = await accounts.fetchPeerConfig({ rpc }, peer, { commitment })
        const packetPath: SolanaPacketPath = {
            dstEid,
            sender: oapp,
            receiver: receiverInfo.peerAddress,
        }
        remainingAccounts =
            remainingAccounts ??
            (await this.endpointSDK.getQuoteIXAccountMetaForCPI(rpc, payer, {
                path: packetPath,
                msgLibProgram,
            }))
        if (remainingAccounts === undefined) {
            throw new Error('Failed to get remaining accounts for quote instruction')
        }
        const ix = instructions
            .quoteSend(
                {
                    programs: this.programRepo,
                },
                {
                    store: oapp,
                    peer,
                    endpoint: this.endpointSDK.pda.setting()[0],
                    // args
                    dstEid,
                    message,
                    composeMsg: composeMsg ?? null,
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
    const [peer] = new MyOAppPDA(oftProgramId).peer(dstEid)
    const info = await accounts.fetchPeerConfig({ rpc }, peer)
    return hexlify(info.peerAddress)
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
    const pda = new MyOAppPDA(programId)

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
