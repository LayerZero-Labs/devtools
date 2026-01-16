import { createLut, extendLut } from '@metaplex-foundation/mpl-toolbox'
import {
    Context,
    KeypairSigner,
    PublicKey,
    Signer,
    TransactionBuilder,
    Umi,
    none,
    publicKey,
    publicKeyBytes,
    some,
} from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { getPublicKey } from '@noble/secp256k1'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { AccountInfo, Connection } from '@solana/web3.js'

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
    uln,
} from '../constants'
import { callSurfnetRpc, getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { OftKeySets } from '../types'
import { sendAndConfirm } from '../utils'

describe('LayerZero Infrastructure Setup', function () {
    const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'
    let umi: Umi | Context
    let endpointAdmin: Signer
    let executorInExecutor: KeypairSigner
    let keys: OftKeySets
    let connection: Connection

    before(function () {
        const context = getGlobalContext()
        umi = getGlobalUmi()
        endpointAdmin = umi.payer
        executorInExecutor = context.executor
        keys = getGlobalKeys()
        connection = context.connection
    })

    it('Init Endpoint', async function () {
        const endpointSettings = endpoint.pda.setting()[0]
        const existing = await connection.getAccountInfo(toWeb3JsPublicKey(endpointSettings))
        const needsInit = !existing || isClearedAccount(existing, SYSTEM_PROGRAM_ID)
        if (!needsInit && existing) {
            await ensureEndpointAdmin(endpointSettings, existing, endpointAdmin, connection)
        }
        const messageLibInfo = endpoint.pda.messageLibraryInfo(uln.pda.messageLib()[0])[0]
        const messageLibInfoExisting = await connection.getAccountInfo(toWeb3JsPublicKey(messageLibInfo))
        const shouldRegisterLibrary =
            !messageLibInfoExisting || isClearedAccount(messageLibInfoExisting, SYSTEM_PROGRAM_ID)
        const initInstructions: TransactionBuilder[] = []
        if (needsInit) {
            initInstructions.push(
                endpoint.initEndpoint(endpointAdmin, {
                    eid: SRC_EID,
                    admin: endpointAdmin.publicKey,
                })
            )
        }
        if (shouldRegisterLibrary) {
            initInstructions.push(
                endpoint.registerLibrary(endpointAdmin, {
                    messageLibProgram: uln.programId,
                })
            )
        }
        await sendAndConfirm(
            umi,
            [
                ...initInstructions,
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

    it('Init Executor', async function () {
        const executorConfig = executor.pda.config()[0]
        const existing = await connection.getAccountInfo(toWeb3JsPublicKey(executorConfig))
        const needsInit = !existing || isClearedAccount(existing, SYSTEM_PROGRAM_ID)
        if (!needsInit && existing) {
            await ensureExecutorOwner(executorConfig, existing, endpointAdmin, connection)
        }
        const initInstructions: TransactionBuilder[] = []
        if (needsInit) {
            initInstructions.push(
                executor.initExecutor(endpointAdmin, {
                    admins: [endpointAdmin.publicKey],
                    executors: [executorInExecutor.publicKey],
                    msglibs: [uln.pda.messageLib()[0]],
                    owner: endpointAdmin.publicKey,
                    priceFeed: priceFeed.pda.priceFeed()[0],
                })
            )
        } else {
            // Forked executor configs keep mainnet admins; reset to local admin so admin-only updates succeed.
            initInstructions.push(executor.setAdmins(endpointAdmin, [endpointAdmin.publicKey]))
        }
        initInstructions.push(
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
            ])
        )
        await sendAndConfirm(umi, initInstructions, endpointAdmin)
    })

    it('Init PriceFeed', async function () {
        const priceFeedConfig = priceFeed.pda.priceFeed()[0]
        const existing = await connection.getAccountInfo(toWeb3JsPublicKey(priceFeedConfig))
        const needsInit = !existing || isClearedAccount(existing, SYSTEM_PROGRAM_ID)
        if (!needsInit && existing) {
            await ensurePriceFeedAdmin(priceFeedConfig, existing, endpointAdmin, connection)
        }
        const nativeTokenPriceUsd = BigInt(1e10)
        const priceRatio = BigInt(1e10)
        const gasPriceInUnit = BigInt(1e9)
        const gasPerByte = 1
        const modelType: UMI.PriceFeedProgram.types.ModelType = {
            __kind: 'Arbitrum',
            gasPerL2Tx: BigInt(1e6),
            gasPerL1CalldataByte: 1,
        }
        const initInstructions: TransactionBuilder[] = []
        if (needsInit) {
            initInstructions.push(
                priceFeed.initPriceFeed(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    updaters: [endpointAdmin.publicKey],
                })
            )
        }
        initInstructions.push(
            priceFeed.setSolPrice(endpointAdmin, nativeTokenPriceUsd),
            priceFeed.setPrice(endpointAdmin, {
                dstEid: DST_EID,
                priceRatio,
                gasPriceInUnit,
                gasPerByte,
                modelType: modelType,
            })
        )
        await sendAndConfirm(umi, initInstructions, endpointAdmin)
    })

    it('Init DVN', async function () {
        for (const programId of dvns) {
            const dvn = new UMI.DVNProgram.DVN(programId)
            const config = new UMI.DvnPDA(publicKey(programId)).config()[0]
            const existing = await connection.getAccountInfo(toWeb3JsPublicKey(config))
            const needsInit = !existing || isClearedAccount(existing, SYSTEM_PROGRAM_ID)
            if (!needsInit && existing) {
                await ensureDvnAdmin(config, existing, endpointAdmin, connection)
            }
            await sendAndConfirm(
                umi,
                [
                    ...(needsInit
                        ? [
                              await dvn.initDVN(umi.rpc, endpointAdmin, {
                                  admins: [endpointAdmin.publicKey],
                                  signers: DVN_SIGNERS.map((signer) => getPublicKey(signer, false).subarray(1)),
                                  msglibs: [uln.pda.messageLib()[0]],
                                  quorum: 1,
                                  vid: DST_EID % 30000,
                                  priceFeed: priceFeed.pda.priceFeed()[0],
                              }),
                          ]
                        : []),
                    dvn.setDefaultMultiplierBps(endpointAdmin, defaultMultiplierBps),
                    dvn.setPriceFeed(endpointAdmin, priceFeed.programId),
                    UMI.DVNProgram.instructions.extendDvnConfig(
                        { programs: dvn.programRepo },
                        { admin: endpointAdmin, config }
                    ).items[0],
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

    it('Init UltraLightNode', async function () {
        const ulnSettings = uln.pda.setting()[0]
        const existing = await connection.getAccountInfo(toWeb3JsPublicKey(ulnSettings))
        const needsInit = !existing || isClearedAccount(existing, SYSTEM_PROGRAM_ID)
        if (!needsInit && existing) {
            await ensureUlnAdmin(ulnSettings, existing, endpointAdmin, connection)
        }
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
        const initInstructions: TransactionBuilder[] = []
        if (needsInit) {
            initInstructions.push(
                uln.initUln(endpointAdmin, {
                    admin: endpointAdmin.publicKey,
                    eid: DST_EID,
                    endpointProgram: endpoint.programId,
                })
            )
        }
        initInstructions.push(
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
            })
        )
        await sendAndConfirm(umi, initInstructions, endpointAdmin)

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

function isClearedAccount(account: AccountInfo<Buffer>, systemProgramId: string): boolean {
    return account.owner.toBase58() === systemProgramId
}

const ENDPOINT_ADMIN_OFFSET = 13
const ENDPOINT_EID_OFFSET = 8
const ULN_EID_OFFSET = 8
const ULN_ADMIN_OFFSET = 77
const EXECUTOR_OWNER_OFFSET = 9
const PRICEFEED_ADMIN_OFFSET = 8
const PRICEFEED_UPDATERS_OFFSET = 40

async function ensureEndpointAdmin(
    settingsPda: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    admin: Signer,
    connection: Connection
): Promise<void> {
    const desiredAdmin = toWeb3JsPublicKey(admin.publicKey)
    const desiredBytes = Buffer.from(desiredAdmin.toBytes())
    const data = Buffer.from(accountInfo.data)
    const currentBytes = Buffer.from(data.subarray(ENDPOINT_ADMIN_OFFSET, ENDPOINT_ADMIN_OFFSET + 32))
    const currentEid = data.readUInt32LE(ENDPOINT_EID_OFFSET)
    if (currentBytes.equals(desiredBytes) && currentEid === SRC_EID) {
        return
    }

    // Forked settings are owned by mainnet admin; reassign so local tests can set defaults.
    desiredBytes.copy(data, ENDPOINT_ADMIN_OFFSET)
    if (currentEid !== SRC_EID) {
        data.writeUInt32LE(SRC_EID, ENDPOINT_EID_OFFSET)
    }
    const safeLamports = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length)
    await callSurfnetRpc('surfnet_setAccount', [
        settingsPda.toString(),
        {
            data: data.toString('hex'),
            executable: accountInfo.executable,
            lamports: safeLamports,
            owner: accountInfo.owner.toBase58(),
            rentEpoch: 0,
        },
    ])
}

async function ensureUlnAdmin(
    settingsPda: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    admin: Signer,
    connection: Connection
): Promise<void> {
    const desiredAdmin = toWeb3JsPublicKey(admin.publicKey)
    const desiredBytes = Buffer.from(desiredAdmin.toBytes())
    const currentBytes = Buffer.from(accountInfo.data.subarray(ULN_ADMIN_OFFSET, ULN_ADMIN_OFFSET + 32))
    const data = Buffer.from(accountInfo.data)
    const currentEid = data.readUInt32LE(ULN_EID_OFFSET)
    if (currentBytes.equals(desiredBytes) && currentEid === DST_EID) {
        return
    }

    // Forked ULN settings are owned by mainnet admin; reassign for local config updates.
    desiredBytes.copy(data, ULN_ADMIN_OFFSET)
    if (currentEid !== DST_EID) {
        data.writeUInt32LE(DST_EID, ULN_EID_OFFSET)
    }
    const safeLamports = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length)
    await callSurfnetRpc('surfnet_setAccount', [
        settingsPda.toString(),
        {
            data: data.toString('hex'),
            executable: accountInfo.executable,
            lamports: safeLamports,
            owner: accountInfo.owner.toBase58(),
            rentEpoch: 0,
        },
    ])
}

async function ensureExecutorOwner(
    settingsPda: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    admin: Signer,
    connection: Connection
): Promise<void> {
    const desiredAdmin = toWeb3JsPublicKey(admin.publicKey)
    const desiredBytes = Buffer.from(desiredAdmin.toBytes())
    const currentBytes = Buffer.from(accountInfo.data.subarray(EXECUTOR_OWNER_OFFSET, EXECUTOR_OWNER_OFFSET + 32))
    if (currentBytes.equals(desiredBytes)) {
        return
    }

    // Forked executor config is owned by mainnet admin; reassign for local config updates.
    const data = Buffer.from(accountInfo.data)
    desiredBytes.copy(data, EXECUTOR_OWNER_OFFSET)
    const safeLamports = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length)
    await callSurfnetRpc('surfnet_setAccount', [
        settingsPda.toString(),
        {
            data: data.toString('hex'),
            executable: accountInfo.executable,
            lamports: safeLamports,
            owner: accountInfo.owner.toBase58(),
            rentEpoch: 0,
        },
    ])
}

async function ensurePriceFeedAdmin(
    settingsPda: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    admin: Signer,
    connection: Connection
): Promise<void> {
    const desiredAdmin = toWeb3JsPublicKey(admin.publicKey)
    const desiredBytes = Buffer.from(desiredAdmin.toBytes())
    const data = Buffer.from(accountInfo.data)
    const currentBytes = Buffer.from(data.subarray(PRICEFEED_ADMIN_OFFSET, PRICEFEED_ADMIN_OFFSET + 32))
    let needsUpdate = false
    if (!currentBytes.equals(desiredBytes)) {
        desiredBytes.copy(data, PRICEFEED_ADMIN_OFFSET)
        needsUpdate = true
    }

    const updatersLength = data.readUInt32LE(PRICEFEED_UPDATERS_OFFSET)
    const updatersStart = PRICEFEED_UPDATERS_OFFSET + 4
    let hasUpdater = false
    for (let i = 0; i < updatersLength; i += 1) {
        const start = updatersStart + i * 32
        if (data.subarray(start, start + 32).equals(desiredBytes)) {
            hasUpdater = true
            break
        }
    }
    if (!hasUpdater && updatersLength > 0) {
        data.set(desiredBytes, updatersStart)
        needsUpdate = true
    }
    if (!needsUpdate) {
        return
    }

    // Forked price feed uses mainnet admin/updaters; reset for local price updates.
    const safeLamports = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length)
    await callSurfnetRpc('surfnet_setAccount', [
        settingsPda.toString(),
        {
            data: data.toString('hex'),
            executable: accountInfo.executable,
            lamports: safeLamports,
            owner: accountInfo.owner.toBase58(),
            rentEpoch: 0,
        },
    ])
}

async function ensureDvnAdmin(
    settingsPda: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    admin: Signer,
    connection: Connection
): Promise<void> {
    const serializer = UMI.DVNProgram.accounts.getDvnConfigAccountDataSerializer()
    const [state] = serializer.deserialize(accountInfo.data)
    const desiredAdmin = admin.publicKey
    const desiredVid = DST_EID % 30000
    const desiredSigners = DVN_SIGNERS.map((signer) => getPublicKey(signer, false).subarray(1))
    const quorum = 1
    const needsAdminUpdate = !state.admins.some((current) => current === desiredAdmin)
    const needsVidUpdate = state.vid !== desiredVid
    const needsSignerUpdate =
        state.multisig.quorum !== quorum ||
        desiredSigners.some((signer) =>
            state.multisig.signers.every((current) => !Buffer.from(current).equals(Buffer.from(signer)))
        )
    if (!needsAdminUpdate && !needsVidUpdate && !needsSignerUpdate) {
        return
    }

    const nextAdmins = state.admins.length > 0 ? [desiredAdmin, ...state.admins.slice(1)] : [desiredAdmin]
    const nextSigners = [...state.multisig.signers]
    for (let i = 0; i < Math.min(nextSigners.length, desiredSigners.length); i += 1) {
        nextSigners[i] = desiredSigners[i]
    }
    const nextState = {
        ...state,
        admins: nextAdmins,
        vid: desiredVid,
        multisig: {
            ...state.multisig,
            signers: nextSigners,
            quorum,
        },
    }
    const data = Buffer.from(serializer.serialize(nextState))

    // Forked DVN config uses mainnet admins/vid/signers; reset so local config updates succeed.
    const safeLamports = await connection.getMinimumBalanceForRentExemption(data.length)
    await callSurfnetRpc('surfnet_setAccount', [
        settingsPda.toString(),
        {
            data: data.toString('hex'),
            executable: accountInfo.executable,
            lamports: safeLamports,
            owner: accountInfo.owner.toBase58(),
            rentEpoch: 0,
        },
    ])
}

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
