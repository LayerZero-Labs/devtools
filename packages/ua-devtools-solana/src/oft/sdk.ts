import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import {
    type OmniAddress,
    type OmniTransaction,
    formatEid,
    areBytes32Equal,
    makeBytes32,
    Bytes,
    OmniPoint,
    normalizePeer,
    denormalizePeer,
    fromHex,
    toHex,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-solana'
import { type Logger, printBoolean, printJson } from '@layerzerolabs/io-devtools'
import { mapError, AsyncRetriable } from '@layerzerolabs/devtools'
import { assertValidSolanaAdmin, OmniSDK } from '@layerzerolabs/devtools-solana'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import assert from 'assert'
import {
    createNoopSigner,
    publicKey,
    type PublicKey as UmiPublicKey,
    Signer,
    TransactionBuilder,
    Umi,
    WrappedInstruction,
} from '@metaplex-foundation/umi'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { EndpointProgram, MessageLibPDADeriver, UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'

// TODO: Use exported interfaces when they are available
interface SetPeerAddressParam {
    peer: Uint8Array
    __kind: 'PeerAddress'
}
interface SetPeerFeeBpsParam {
    feeBps: number
    __kind: 'FeeBps'
}
interface SetPeerEnforcedOptionsParam {
    send: Uint8Array
    sendAndCall: Uint8Array
    __kind: 'EnforcedOptions'
}
interface SetPeerRateLimitParam {
    rateLimit?: {
        refillPerSecond: bigint
        capacity: bigint
    }
    __kind: 'OutboundRateLimit' | 'InboundRateLimit'
}
interface SetOFTConfigParams {
    __kind: 'Admin' | 'Delegate' | 'DefaultFee' | 'Paused' | 'Pauser' | 'Unpauser'
    admin?: UmiPublicKey
    delegate?: UmiPublicKey
    defaultFee?: number
    paused?: boolean
    pauser?: UmiPublicKey
    unpauser?: UmiPublicKey
}

/*
 * `@layerzerolabs/oft-v2-solana-sdk` is an OFT-specific Kinobi-based sdk, which
 * is oriented towards the Umi client.  `@layerzerolabs/lz-solana-sdk-v2` is a
 * Solita-based SDK oriented towards all other LayerZero Solana Endpoint programs,
 * and is tailored to the web3.js client.  Until the latter is updated, we live in
 * a mixed world.
 * As such, this OFT implementation uses oft-v2-solana-sdk to generate transaction
 * data,then converts into the Web3JS transaction format for signing and sending.
 */
export class OFT extends OmniSDK implements IOApp {
    protected readonly umi: Umi
    protected readonly umiUserAccount: UmiPublicKey
    protected readonly umiProgramId: UmiPublicKey
    protected readonly umiPublicKey: UmiPublicKey

    constructor(
        connection: Connection,
        point: OmniPoint,
        userAccount: PublicKey,
        public readonly programId: PublicKey,
        logger?: Logger
    ) {
        super(connection, point, userAccount, logger)
        // cache Umi-specific objects for reuse
        this.umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
        this.umiUserAccount = fromWeb3JsPublicKey(userAccount)
        this.umiProgramId = fromWeb3JsPublicKey(this.programId)
        this.umiPublicKey = fromWeb3JsPublicKey(this.publicKey)
    }

    @AsyncRetriable()
    async getOwner(): Promise<OmniAddress> {
        this.logger.debug(`Getting owner`)

        const config = await mapError(
            () => {
                return oft.accounts.fetchOFTStore(this.umi, this.umiPublicKey)
            },
            (error) => new Error(`Failed to get owner for ${this.label}: ${error}`)
        )

        const owner = config.admin
        return this.logger.debug(`Got owner: ${owner}`), owner
    }

    async hasOwner(address: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${address} is an owner`)

        const owner = await this.getOwner()
        const isOwner = areBytes32Equal(normalizePeer(address, this.point.eid), normalizePeer(owner, this.point.eid))

        return this.logger.debug(`Checked whether ${address} is an owner (${owner}): ${printBoolean(isOwner)}`), isOwner
    }

    async setOwner(address: OmniAddress): Promise<OmniTransaction> {
        await assertValidSolanaAdmin(this.connection, address)
        this.logger.debug(`Setting owner to ${address}`)

        return {
            ...(await this.createTransaction(this._umiToWeb3Tx([await this._setOFTAdminIx(address)]))),
            description: `Setting owner to ${address}`,
        }
    }

    @AsyncRetriable()
    async getEndpointSDK(): Promise<EndpointV2> {
        this.logger.debug(`Getting EndpointV2 SDK`)

        return new EndpointV2(
            this.connection,
            { eid: this.point.eid, address: EndpointProgram.PROGRAM_ID.toBase58() },
            this.userAccount
        )
    }

    @AsyncRetriable()
    async getPeer(eid: EndpointId): Promise<OmniAddress | undefined> {
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting peer for ${eidLabel}`)
        try {
            const peer = await oft.getPeerAddress(this.umi.rpc, this.umiPublicKey, eid, this.umiProgramId)

            // We run the hex string we got through a normalization/de-normalization process
            // that will ensure that zero addresses will get stripped
            // and any network-specific logic will be applied
            return denormalizePeer(fromHex(peer), eid)
        } catch (error) {
            if (String(error).match(/was not found at the provided address/i)) {
                return undefined
            }

            throw new Error(`Failed to get peer for ${eidLabel} for OFT ${this.label}: ${error}`)
        }
    }

    async hasPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean> {
        const peer = await this.getPeer(eid)

        return areBytes32Equal(normalizePeer(peer, eid), normalizePeer(address, eid))
    }

    async setPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const eidLabel = formatEid(eid)
        // We use the `mapError` and pretend `normalizePeer` is async to avoid having a let and a try/catch block
        const normalizedPeer = await mapError(
            async () => normalizePeer(address, eid),
            (error) =>
                new Error(`Failed to convert peer ${address} for ${eidLabel} for ${this.label} to bytes: ${error}`)
        )
        const peerAsBytes32 = makeBytes32(normalizedPeer)
        const delegate = await this.safeGetDelegate()

        const oftStore = this.umiPublicKey

        // the instructions vector is a vector of instructions that are executed in order
        // order matters because the accounts need to be initialized
        const instructions = [
            await this._createSetPeerAddressIx(normalizedPeer, eid), // admin
        ]

        const isSendLibraryInitialized = await this.isSendLibraryInitialized(eid)
        if (!isSendLibraryInitialized) {
            instructions.push(
                oft.initSendLibrary({ admin: delegate, oftStore }, eid) // delegate
            )
        }

        const isReceiveLibraryInitialized = await this.isReceiveLibraryInitialized(eid)
        if (!isReceiveLibraryInitialized) {
            instructions.push(
                oft.initReceiveLibrary({ admin: delegate, oftStore }, eid) // delegate
            )
        }

        // since the order is important, we push the instructions in the order we want them to be executed
        instructions.push(
            await this._setPeerEnforcedOptionsIx(new Uint8Array([0, 3]), new Uint8Array([0, 3]), eid), // admin
            await this._setPeerFeeBpsIx(eid), // admin
            oft.initOAppNonce({ admin: delegate, oftStore }, eid, normalizedPeer), // delegate
            await this._createSetPeerAddressIx(normalizedPeer, eid) // admin but is this needed?  set twice...
        )

        this.logger.debug(`Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32}`)
        return {
            ...(await this.createTransaction(this._umiToWeb3Tx(instructions))),
            description: `Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32} ${delegate.publicKey} ${(await this._getAdmin()).publicKey}`,
        }
    }

    @AsyncRetriable()
    async getDelegate(): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate`)

        const endpointSdk = await this.getEndpointSDK()
        const delegate = await endpointSdk.getDelegate(this.point.address)

        return this.logger.verbose(`Got delegate: ${delegate}`), delegate
    }

    @AsyncRetriable()
    async isDelegate(delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate`)

        const endpointSdk = await this.getEndpointSDK()
        const isDelegate = await endpointSdk.isDelegate(this.point.address, delegate)

        return this.logger.verbose(`Checked delegate: ${delegate}: ${printBoolean(isDelegate)}`), isDelegate
    }

    async setDelegate(delegate: OmniAddress): Promise<OmniTransaction> {
        await assertValidSolanaAdmin(this.connection, delegate)
        this.logger.debug(`Setting delegate to ${delegate}`)
        return {
            ...(await this.createTransaction(this._umiToWeb3Tx([await this._setOFTDelegateIx(delegate)]))),
            description: `Setting delegate to ${delegate}`,
        }
    }

    @AsyncRetriable()
    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes> {
        // First we check that we can understand the message type
        this.assertMsgType(msgType)

        const eidLabel = `eid ${eid} (${formatEid(eid)})`
        this.logger.verbose(`Getting enforced options for ${eidLabel} and message type ${msgType}`)

        try {
            const options = await oft.getEnforcedOptions(this.umi.rpc, this.umiPublicKey, eid, this.umiProgramId)
            const optionsForMsgType = msgType === MSG_TYPE_SEND ? options.send : options.sendAndCall

            return toHex(optionsForMsgType)
        } catch (error) {
            if (String(error).match(/was not found at the provided address/)) {
                return toHex(new Uint8Array(0))
            }

            throw new Error(
                `Failed to get enforced options for ${this.label} for ${eidLabel} and message type ${msgType}: ${error}`
            )
        }
    }

    async setOutboundRateLimit(
        eid: EndpointId,
        rateLimit: { refillPerSecond: bigint; capacity: bigint }
    ): Promise<OmniTransaction> {
        this.logger.verbose(`Setting outbound rate limit for ${eid} to ${printJson(rateLimit)}`)

        return {
            ...(await this.createTransaction(
                this._umiToWeb3Tx([await this._setPeerOutboundRateLimit(eid, rateLimit)])
            )),
            description: `Setting outbound rate limit for ${eid} to ${printJson(rateLimit)}`,
        }
    }

    async setInboundRateLimit(
        eid: EndpointId,
        rateLimit: { refillPerSecond: bigint; capacity: bigint }
    ): Promise<OmniTransaction> {
        this.logger.verbose(`Setting outbound rate limit for ${eid} to ${printJson(rateLimit)}`)

        return {
            ...(await this.createTransaction(this._umiToWeb3Tx([await this._setPeerInboundRateLimit(eid, rateLimit)]))),
            description: `Setting outbound rate limit for ${eid} to ${printJson(rateLimit)}`,
        }
    }

    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        this.logger.verbose(`Setting enforced options to ${printJson(enforcedOptions)}`)

        const optionsByEidAndMsgType = this.reduceEnforcedOptions(enforcedOptions)
        const emptyOptions = Options.newOptions().toBytes()
        const ixs: WrappedInstruction[] = []
        for (const [eid, optionsByMsgType] of optionsByEidAndMsgType) {
            const sendOption = optionsByMsgType.get(MSG_TYPE_SEND) ?? emptyOptions
            const sendAndCallOption = optionsByMsgType.get(MSG_TYPE_SEND_AND_CALL) ?? emptyOptions
            ixs.push(await this._setPeerEnforcedOptionsIx(sendOption, sendAndCallOption, eid))
        }

        return {
            ...(await this.createTransaction(this._umiToWeb3Tx(ixs))),
            description: `Setting enforced options to ${printJson(enforcedOptions)}`,
        }
    }

    async isSendLibraryInitialized(eid: EndpointId): Promise<boolean> {
        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.isSendLibraryInitialized(this.point.address, eid)
    }

    async initializeSendLibrary(eid: EndpointId): Promise<[OmniTransaction] | []> {
        this.logger.verbose(`Initializing send library on ${formatEid(eid)}`)

        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.initializeSendLibrary(this.point.address, eid)
    }

    async isReceiveLibraryInitialized(eid: EndpointId): Promise<boolean> {
        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.isReceiveLibraryInitialized(this.point.address, eid)
    }

    async initializeReceiveLibrary(eid: EndpointId): Promise<[OmniTransaction] | []> {
        this.logger.verbose(`Initializing receive library on ${formatEid(eid)}`)

        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.initializeReceiveLibrary(this.point.address, eid)
    }

    async isOAppConfigInitialized(eid: EndpointId): Promise<boolean> {
        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.isOAppConfigInitialized(this.point.address, eid)
    }

    async initializeOAppConfig(eid: EndpointId, lib: OmniAddress | null | undefined): Promise<[OmniTransaction] | []> {
        this.logger.verbose(`Initializing OApp config for library ${lib} on ${formatEid(eid)}`)

        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.initializeOAppConfig(this.point.address, eid, lib ?? undefined)
    }

    /**
     * Helper utility that takes an array of `OAppEnforcedOptionParam` objects and turns them into
     * a map keyed by `EndpointId` that contains another map keyed by `MsgType`.
     *
     * @param {OAppEnforcedOptionParam[]} enforcedOptions
     * @returns {Map<EndpointId, Map<MsgType, Uint8Array>>}
     */
    private reduceEnforcedOptions(
        enforcedOptions: OAppEnforcedOptionParam[]
    ): Map<EndpointId, Map<MsgType, Uint8Array>> {
        return enforcedOptions.reduce((optionsByEid, enforcedOption) => {
            const {
                eid,
                option: { msgType, options },
            } = enforcedOption

            // First we check that we can understand the message type
            this.assertMsgType(msgType)

            // Then we warn the user if they are trying to specify enforced options for eid & msgType more than once
            // in which case the former option will be ignored
            const optionsByMsgType = optionsByEid.get(eid) ?? new Map<MsgType, Uint8Array>()
            if (optionsByMsgType.has(msgType)) {
                this.logger.warn(`Duplicate enforced option for ${formatEid(eid)} and msgType ${msgType}`)
            }

            // We wrap the call with try/catch to deliver a better error message in case malformed options were passed
            try {
                optionsByMsgType.set(msgType, Options.fromOptions(options).toBytes())
            } catch (error) {
                throw new Error(
                    `Invalid enforced options for ${this.label} for ${formatEid(eid)} and msgType ${msgType}: ${options}: ${error}`
                )
            }

            optionsByEid.set(eid, optionsByMsgType)

            return optionsByEid
        }, new Map<EndpointId, Map<MsgType, Uint8Array>>())
    }

    /**
     * Helper method that asserts that `value` is a `MsgType` that the OFT understands
     * and prints out a friendly error message if it doesn't
     *
     * @param {unknown} value
     * @returns {undefined}
     */
    private assertMsgType(value: unknown): asserts value is MsgType {
        assert(
            isMsgType(value),
            `${this.label}: Invalid msgType received: ${value}. Expected one of ${MSG_TYPE_SEND} (send), ${MSG_TYPE_SEND_AND_CALL} (send and call)`
        )
    }

    async setCallerBpsCap(callerBpsCap: bigint): Promise<OmniTransaction | undefined> {
        this.logger.debug(`Setting caller BPS cap to ${callerBpsCap}`)

        throw new TypeError(`setCallerBpsCap() not implemented on Solana OFT SDK`)
    }

    @AsyncRetriable()
    async getCallerBpsCap(): Promise<bigint | undefined> {
        this.logger.debug(`Getting caller BPS cap`)

        throw new TypeError(`getCallerBpsCap() not implemented on Solana OFT SDK`)
    }

    public async sendConfigIsInitialized(eid: EndpointId): Promise<boolean> {
        // This method should check the same conditions that initConfig checks
        // All components must be initialized: OFT store, send/receive libraries, and ULN config accounts

        // Check OFT store exists
        const oftStoreInfo = await this.umi.rpc.getAccount(this.umiPublicKey)
        if (!oftStoreInfo.exists) {
            return false
        }

        // Check OFT send/receive libraries are initialized
        const sendLibInitialized = await this.isSendLibraryInitialized(eid)
        const receiveLibInitialized = await this.isReceiveLibraryInitialized(eid)

        if (!sendLibInitialized || !receiveLibInitialized) {
            return false
        }

        // Check ULN config accounts using MessageLibPDADeriver (same as wire command)
        try {
            const deriver = new MessageLibPDADeriver(UlnProgram.PROGRAM_ID)
            const [sendConfig, receiveConfig] = await Promise.all([
                deriver.sendConfig(eid, new PublicKey(this.point.address)),
                deriver.receiveConfig(eid, new PublicKey(this.point.address)),
            ])

            const [sendConfigInfo, receiveConfigInfo] = await Promise.all([
                this.connection.getAccountInfo(sendConfig[0]),
                this.connection.getAccountInfo(receiveConfig[0]),
            ])

            return sendConfigInfo != null && receiveConfigInfo != null
        } catch (error) {
            this.logger.debug(`ULN config check failed for eid ${eid}: ${error}`)
            return false
        }
    }

    public async initConfig(eid: EndpointId): Promise<OmniTransaction | undefined> {
        // Check if everything is already initialized - if so, no action needed
        if (await this.sendConfigIsInitialized(eid)) {
            return undefined
        }

        const delegateAddress = await this.getDelegate()
        // delegate may be undefined if it has not yet been set.  In this case, use admin, which must exist.
        const delegate = delegateAddress ? createNoopSigner(publicKey(delegateAddress)) : await this._getAdmin()
        const oftStore = this.umiPublicKey
        const instructions: WrappedInstruction[] = []

        // Now check individual components to determine which instructions to add
        const oftStoreExists = (await this.umi.rpc.getAccount(oftStore)).exists
        const sendLibInitialized = await this.isSendLibraryInitialized(eid)
        const receiveLibInitialized = await this.isReceiveLibraryInitialized(eid)

        // Check ULN config accounts
        const deriver = new MessageLibPDADeriver(UlnProgram.PROGRAM_ID)
        const [sendConfig, receiveConfig] = await Promise.all([
            deriver.sendConfig(eid, new PublicKey(this.point.address)),
            deriver.receiveConfig(eid, new PublicKey(this.point.address)),
        ])

        const [sendConfigInfo, receiveConfigInfo] = await Promise.all([
            this.connection.getAccountInfo(sendConfig[0]),
            this.connection.getAccountInfo(receiveConfig[0]),
        ])

        const ulnConfigExists = sendConfigInfo != null && receiveConfigInfo != null

        // Add oft.initConfig if either OFT store OR ULN config accounts don't exist
        // This single instruction handles both the store creation and ULN config account initialization
        if (!oftStoreExists || !ulnConfigExists) {
            instructions.push(
                oft.initConfig(
                    {
                        admin: delegate,
                        oftStore,
                        payer: delegate,
                    },
                    eid,
                    {
                        msgLib: fromWeb3JsPublicKey(UlnProgram.PROGRAM_ID),
                    }
                )
            )
        }

        // Add send/receive library initialization if needed
        if (!sendLibInitialized) {
            instructions.push(oft.initSendLibrary({ admin: delegate, oftStore }, eid))
        }

        if (!receiveLibInitialized) {
            instructions.push(oft.initReceiveLibrary({ admin: delegate, oftStore }, eid))
        }

        if (instructions.length === 0) {
            return undefined
        }

        return {
            ...(await this.createTransaction(this._umiToWeb3Tx(instructions))),
            description: `Initializing OFT config for eid ${eid} (${formatEid(eid)})`,
        }
    }

    protected async _setOFTConfigIx(param: SetOFTConfigParams) {
        return oft.setOFTConfig(
            {
                oftStore: this.umiPublicKey,
                admin: await this._getAdmin(),
            },
            param,
            {
                oft: this.umiProgramId,
            }
        )
    }

    protected async _setOFTAdminIx(address: OmniAddress) {
        return this._setOFTConfigIx({ __kind: 'Admin', admin: publicKey(address) })
    }

    protected async _setOFTDelegateIx(address: OmniAddress) {
        return this._setOFTConfigIx({ __kind: 'Delegate', delegate: publicKey(address) })
    }

    protected async _setPeerConfigIx(
        param:
            | (SetPeerAddressParam & { remote: number })
            | (SetPeerFeeBpsParam & { remote: number })
            | (SetPeerEnforcedOptionsParam & { remote: number })
            | (SetPeerRateLimitParam & { remote: number })
    ) {
        return oft.setPeerConfig(
            {
                oftStore: this.umiPublicKey,
                admin: await this._getAdmin(),
            },
            param,
            this.umiProgramId
        )
    }

    protected async _createSetPeerAddressIx(normalizedPeer: Uint8Array, eid: EndpointId) {
        return this._setPeerConfigIx({
            __kind: 'PeerAddress',
            peer: normalizedPeer,
            remote: eid,
        })
    }

    protected async _setPeerEnforcedOptionsIx(send: Uint8Array, sendAndCall: Uint8Array, eid: EndpointId) {
        return this._setPeerConfigIx({
            __kind: 'EnforcedOptions',
            send,
            sendAndCall,
            remote: eid,
        })
    }

    protected async _setPeerFeeBpsIx(eid: EndpointId, feeBps: number = 0) {
        return this._setPeerConfigIx({ __kind: 'FeeBps', feeBps, remote: eid })
    }

    protected async _setPeerOutboundRateLimit(
        eid: EndpointId,
        rateLimit: { refillPerSecond: bigint; capacity: bigint }
    ) {
        return this._setPeerConfigIx({
            __kind: 'OutboundRateLimit',
            rateLimit,
            remote: eid,
        })
    }

    protected async _setPeerInboundRateLimit(
        eid: EndpointId,
        rateLimit: { refillPerSecond: bigint; capacity: bigint }
    ) {
        return this._setPeerConfigIx({
            __kind: 'InboundRateLimit',
            rateLimit,
            remote: eid,
        })
    }

    // Convert Umi instructions to Web3JS Transaction
    protected _umiToWeb3Tx(ixs: WrappedInstruction[]): Transaction {
        const web3Transaction = new Transaction()
        const txBuilder = new TransactionBuilder(ixs)
        txBuilder.getInstructions().forEach((umiInstruction) => {
            const web3Instruction = new TransactionInstruction({
                programId: new PublicKey(umiInstruction.programId),
                keys: umiInstruction.keys.map((key) => ({
                    pubkey: new PublicKey(key.pubkey),
                    isSigner: key.isSigner,
                    isWritable: key.isWritable,
                })),
                data: Buffer.from(umiInstruction.data),
            })

            // Add the instruction to the Web3.js transaction
            web3Transaction.add(web3Instruction)
        })
        return web3Transaction
    }

    protected async safeGetDelegate() {
        const delegateAddress = await this.getDelegate()
        if (!delegateAddress) {
            throw new Error('No delegate found')
        }
        return createNoopSigner(publicKey(delegateAddress))
    }

    protected async _getAdmin(): Promise<Signer> {
        const owner = await this.getOwner()
        return createNoopSigner(publicKey(owner))
    }
}

type MsgType = 1 | 2

const MSG_TYPE_SEND = 1 satisfies MsgType
const MSG_TYPE_SEND_AND_CALL = 2 satisfies MsgType

const isMsgType = (value: unknown): value is MsgType => value === MSG_TYPE_SEND || value === MSG_TYPE_SEND_AND_CALL
