import { createLut, extendLut } from '@metaplex-foundation/mpl-toolbox'
import {
    Context,
    KeypairSigner,
    PublicKey,
    Signer,
    Umi,
    none,
    publicKey,
    publicKeyBytes,
    some,
} from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { getPublicKey } from '@noble/secp256k1'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'

import {
    DST_EID,
    DVN_SIGNERS,
    INVALID_EID,
    SRC_EID,
    TON_EID,
    defaultMultiplierBps,
    dvns,
    endpoint,
    executor,
    priceFeed,
    simpleMessageLib,
    uln,
} from '../constants'
import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { OftKeySets } from '../types'
import { sendAndConfirm } from '../utils'

describe('LayerZero Infrastructure Setup', function () {
    let umi: Umi | Context
    let endpointAdmin: Signer
    let executorInExecutor: KeypairSigner
    let keys: OftKeySets

    before(function () {
        const context = getGlobalContext()
        umi = getGlobalUmi()
        endpointAdmin = umi.payer
        executorInExecutor = context.executor
        keys = getGlobalKeys()
    })

    it('Init Endpoint', async () => {
        await sendAndConfirm(
            umi,
            [
                endpoint.initEndpoint(endpointAdmin, {
                    eid: SRC_EID,
                    admin: endpointAdmin.publicKey,
                }),
                endpoint.registerLibrary(endpointAdmin, {
                    messageLibProgram: uln.programId,
                }),
                endpoint.registerLibrary(endpointAdmin, {
                    messageLibProgram: simpleMessageLib.programId,
                }),
                await endpoint.setDefaultSendLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: DST_EID,
                }),
                await endpoint.setDefaultReceiveLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: SRC_EID,
                }),
            ],
            endpointAdmin
        )
        await sendAndConfirm(
            umi,
            [
                await endpoint.setDefaultSendLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: INVALID_EID,
                }),
                await endpoint.setDefaultReceiveLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: INVALID_EID,
                }),
                await endpoint.setDefaultSendLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: TON_EID,
                }),
                await endpoint.setDefaultReceiveLibrary(umi.rpc, endpointAdmin, {
                    messageLibProgram: uln.programId,
                    remote: TON_EID,
                }),
            ],
            endpointAdmin
        )
    })

    it('Init Executor', async () => {
        await sendAndConfirm(
            umi,
            [
                executor.initExecutor(endpointAdmin, {
                    admins: [endpointAdmin.publicKey],
                    executors: [executorInExecutor.publicKey],
                    msglibs: [uln.pda.messageLib()[0], simpleMessageLib.pda.messageLib()[0]],
                    owner: endpointAdmin.publicKey,
                    priceFeed: priceFeed.pda.priceFeed()[0],
                }),
                executor.setPriceFeed(endpointAdmin, priceFeed.programId),
                executor.setDefaultMultiplierBps(endpointAdmin, defaultMultiplierBps),
                executor.setDstConfig(endpointAdmin, [
                    {
                        eid: DST_EID,
                        lzReceiveBaseGas: 10000,
                        lzComposeBaseGas: 10000,
                        multiplierBps: some(13000),
                        floorMarginUsd: some(10000n),
                        nativeDropCap: BigInt(1e7),
                    } satisfies UMI.ExecutorProgram.types.DstConfig,
                ]),
            ],
            endpointAdmin
        )
    })

    it('Init PriceFeed', async () => {
        const nativeTokenPriceUsd = BigInt(1e10)
        const priceRatio = BigInt(1e10)
        const gasPriceInUnit = BigInt(1e9)
        const gasPerByte = 1
        const modelType: UMI.PriceFeedProgram.types.ModelType = {
            __kind: 'Arbitrum',
            gasPerL2Tx: BigInt(1e6),
            gasPerL1CalldataByte: 1,
        }
        await sendAndConfirm(
            umi,
            [
                priceFeed.initPriceFeed(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    updaters: [endpointAdmin.publicKey],
                }),
                priceFeed.setSolPrice(endpointAdmin, nativeTokenPriceUsd),
                priceFeed.setPrice(endpointAdmin, {
                    dstEid: DST_EID,
                    priceRatio,
                    gasPriceInUnit,
                    gasPerByte,
                    modelType: modelType,
                }),
            ],
            endpointAdmin
        )
    })

    it('Init DVN', async () => {
        for (const programId of dvns) {
            const dvn = new UMI.DVNProgram.DVN(programId)
            await sendAndConfirm(
                umi,
                [
                    await dvn.initDVN(umi.rpc, endpointAdmin, {
                        admins: [endpointAdmin.publicKey],
                        signers: DVN_SIGNERS.map((signer) => getPublicKey(signer, false).subarray(1)),
                        msglibs: [uln.pda.messageLib()[0]],
                        quorum: 1,
                        vid: DST_EID % 30000,
                        priceFeed: priceFeed.pda.priceFeed()[0],
                    }),
                    dvn.setDefaultMultiplierBps(endpointAdmin, defaultMultiplierBps),
                    dvn.setPriceFeed(endpointAdmin, priceFeed.programId),
                    dvn.setDstConfig(endpointAdmin, [
                        {
                            eid: DST_EID,
                            dstGas: 10000,
                            multiplierBps: some(defaultMultiplierBps),
                            floorMarginUsd: none(),
                        },
                    ]),
                ],
                endpointAdmin
            )
        }
    })

    it('Init SimpleMessageLib', async () => {
        await sendAndConfirm(
            umi,
            [
                simpleMessageLib.initSimpleMessageLib(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    eid: SRC_EID,
                    nativeFee: 1e4,
                    lzTokenFee: 0,
                }),
                simpleMessageLib.setWhitelistCaller(endpointAdmin, endpointAdmin.publicKey),
            ],
            endpointAdmin
        )
    })

    it('Init UltraLightNode', async () => {
        const defaultNativeFeeBps = 100
        const maxMessageSize = 1024
        const requiredDvns = dvns.map((programId) => new UMI.DvnPDA(publicKey(programId)).config()[0]).sort()
        const sendUlnConfig: UMI.UlnProgram.types.UlnConfig = {
            confirmations: 1n,
            requiredDvnCount: requiredDvns.length,
            optionalDvnCount: 0,
            optionalDvnThreshold: 0,
            requiredDvns: requiredDvns,
            optionalDvns: [],
        }
        const receiveUlnConfig: UMI.UlnProgram.types.UlnConfig = {
            confirmations: 1n,
            requiredDvnCount: requiredDvns.length,
            optionalDvnCount: 0,
            optionalDvnThreshold: 0,
            requiredDvns: requiredDvns,
            optionalDvns: [],
        }
        const executorConfig: UMI.UlnProgram.types.ExecutorConfig = {
            maxMessageSize,
            executor: executor.pda.config()[0],
        }
        await sendAndConfirm(
            umi,
            [
                uln.initUln(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    eid: DST_EID,
                    endpointProgram: endpoint.programId,
                }),
                uln.setTreasury(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    lzToken: null,
                    nativeFeeBps: defaultNativeFeeBps,
                    nativeReceiver: endpointAdmin.publicKey,
                }),
                await uln.initOrUpdateDefaultConfig(umi.rpc, endpointAdmin, {
                    executorConfig: some(executorConfig),
                    receiveUlnConfig: some(receiveUlnConfig),
                    remote: SRC_EID,
                    sendUlnConfig: some(sendUlnConfig),
                }),
                await uln.initOrUpdateDefaultConfig(umi.rpc, endpointAdmin, {
                    executorConfig: some(executorConfig),
                    receiveUlnConfig: some(receiveUlnConfig),
                    remote: DST_EID,
                    sendUlnConfig: some(sendUlnConfig),
                }),
            ],
            endpointAdmin
        )

        await sendAndConfirm(
            umi,
            [
                await uln.initOrUpdateDefaultConfig(umi.rpc, endpointAdmin, {
                    executorConfig: some(executorConfig),
                    receiveUlnConfig: some(receiveUlnConfig),
                    remote: INVALID_EID,
                    sendUlnConfig: some(sendUlnConfig),
                }),
                await uln.initOrUpdateDefaultConfig(umi.rpc, endpointAdmin, {
                    executorConfig: some(executorConfig),
                    receiveUlnConfig: some(receiveUlnConfig),
                    remote: TON_EID,
                    sendUlnConfig: some(sendUlnConfig),
                }),
            ],
            endpointAdmin
        )
    })

    it('Init address lookup table', async function () {
        const context = getGlobalContext()
        const oftStores = [keys.native.oftStore, keys.adapter.oftStore]
        const remoteEids = [DST_EID, SRC_EID]
        const [oftEventAuthority] = new UMI.EventPDA(context.program.publicKey).eventAuthority()

        const recentSlot = await umi.rpc.getSlot({ commitment: 'finalized' })
        const [builder, input] = createLut(umi, {
            recentSlot,
            authority: umi.payer,
            payer: umi.payer,
            addresses: globalAddress(dvns, oftStores),
        })
        await builder.sendAndConfirm(umi)

        // Extend the lookup table with more addresses
        const extendAddresses = dedupeAddresses([
            ...oftStores.flatMap((store) =>
                remoteEids.flatMap((remote) => pathwayAddresses(store, remote, publicKeyBytes(store)))
            ),

            // executor
            executor.pda.context(umi.payer.publicKey, 1)[0],
            umi.payer.publicKey,

            // additional oapp pda
            oftEventAuthority,
            context.program.publicKey,
        ])

        const chunkSize = 20
        for (let index = 0; index < extendAddresses.length; index += chunkSize) {
            await extendLut(umi, {
                authority: umi.payer,
                address: input.publicKey,
                addresses: extendAddresses.slice(index, index + chunkSize),
            }).sendAndConfirm(umi)
        }

        input.addresses = [...input.addresses, ...extendAddresses]
        context.lookupTable = input
    })
})

function globalAddress(dvns: PublicKey[], oapps: PublicKey[]): PublicKey[] {
    const addresses: PublicKey[] = [
        publicKey('11111111111111111111111111111111'),
        publicKey('Sysvar1nstructions1111111111111111111111111'),
        fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
        fromWeb3JsPublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),

        // Programs
        endpoint.programId,
        uln.programId,
        executor.programId,
        priceFeed.programId,
        ...dvns,

        // Endpoint PDAs
        endpoint.pda.setting()[0],
        endpoint.eventAuthority,
        endpoint.pda.messageLibraryInfo(uln.pda.messageLib()[0])[0],

        // Uln PDAs
        uln.pda.messageLib()[0],
        uln.pda.setting()[0],
        uln.eventAuthority,

        // Worker Configs
        executor.pda.config()[0],
        executor.eventAuthority,
        priceFeed.pda.priceFeed()[0],

        ...dvns.map((dvn) => new UMI.DvnPDA(publicKey(dvn)).config()[0]),
        ...dvns.map((dvn) => new UMI.EventPDA(publicKey(dvn)).eventAuthority()[0]),

        // OApp
        ...oapps,
        ...oapps.map((oapp) => endpoint.pda.oappRegistry(oapp)[0]),
    ]

    return dedupeAddresses(addresses)
}

function pathwayAddresses(localOApp: PublicKey, remote: number, remoteOApp: Uint8Array): PublicKey[] {
    return [
        endpoint.pda.defaultSendLibraryConfig(remote)[0],
        endpoint.pda.oappRegistry(localOApp)[0],
        endpoint.pda.sendLibraryConfig(localOApp, remote)[0],
        endpoint.pda.nonce(localOApp, remote, remoteOApp)[0],
        endpoint.pda.pendingNonce(localOApp, remote, remoteOApp)[0],

        uln.pda.defaultSendConfig(remote)[0],
        uln.pda.defaultReceiveConfig(remote)[0],
        uln.pda.sendConfig(remote, localOApp)[0],
        uln.pda.receiveConfig(remote, localOApp)[0],
    ]
}

function dedupeAddresses(addresses: PublicKey[]): PublicKey[] {
    const seen = new Set<string>()
    return addresses.filter((address) => {
        const key = address.toString()
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}
