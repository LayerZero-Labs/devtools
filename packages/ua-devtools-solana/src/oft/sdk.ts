import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import { OftTools, EndpointProgram, OftProgram } from '@layerzerolabs/lz-solana-sdk-v2'
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
import { OmniSDK } from '@layerzerolabs/devtools-solana'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import assert from 'assert'

export class OFT extends OmniSDK implements IOApp {
    constructor(
        connection: Connection,
        point: OmniPoint,
        userAccount: PublicKey,
        public readonly programId: PublicKey,
        logger?: Logger
    ) {
        super(connection, point, userAccount, logger)
    }

    @AsyncRetriable()
    async getOwner(): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting owner`)

        const config = await mapError(
            () => OftProgram.accounts.OftConfig.fromAccountAddress(this.connection, this.publicKey),
            (error) => new Error(`Failed to get owner for ${this.label}: ${error}`)
        )

        const owner = config.admin.toBase58()

        return this.logger.debug(`Got owner: ${owner}`), owner
    }

    async hasOwner(address: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${address} is an owner`)

        const owner = await this.getOwner()
        const isOwner = areBytes32Equal(normalizePeer(address, this.point.eid), normalizePeer(owner, this.point.eid))

        return this.logger.debug(`Checked whether ${address} is an owner (${owner}): ${printBoolean(isOwner)}`), isOwner
    }

    async setOwner(address: OmniAddress): Promise<OmniTransaction> {
        this.logger.debug(`Setting owner to ${address}`)

        const transaction = await mapError(
            async () =>
                new Transaction().add(
                    await OftTools.createTransferAdminIx(
                        this.programId,
                        this.userAccount, // Signer
                        this.publicKey, // OFT Config account
                        new PublicKey(address) // Owner account
                    )
                ),
            (error) => new Error(`Failed to set owner for ${this.label} to ${address}: ${error}`)
        )

        return {
            ...(await this.createTransaction(transaction)),
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
            const peer = await OftTools.getPeerAddress(this.connection, this.programId, this.publicKey, eid)

            // We run the hex string we got through a normalization/denormalization process
            // that will ensure that zero addresses will get stripped
            // and any network-specific logic will be applied
            return denormalizePeer(fromHex(peer), eid)
        } catch (error) {
            if (String(error).match(/Unable to find Peer account at/i)) {
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

        this.logger.debug(`Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32}`)

        const transaction = new Transaction().add(
            await OftTools.createSetPeerIx(this.programId, this.userAccount, this.publicKey, eid, normalizedPeer)
        )

        return {
            ...(await this.createTransaction(transaction)),
            description: `Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32}`,
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
        this.logger.debug(`Setting delegate to ${delegate}`)

        const transaction = await mapError(
            async () => {
                const instruction = await OftTools.createSetDelegateIx(
                    this.programId,
                    this.userAccount,
                    this.publicKey,
                    new PublicKey(delegate)
                )
                return new Transaction().add(instruction)
            },
            (error) => new Error(`Failed to set delegate for ${this.label} to ${delegate}: ${error}`)
        )

        return {
            ...(await this.createTransaction(transaction)),
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
            const options = await OftTools.getEnforcedOptions(this.connection, this.programId, this.publicKey, eid)
            const optionsForMsgType = msgType === MSG_TYPE_SEND ? options.send : options.sendAndCall

            return toHex(optionsForMsgType)
        } catch (error) {
            if (String(error).match(/Unable to find EnforcedOptions account/)) {
                return toHex(new Uint8Array(0))
            }

            throw new Error(
                `Failed to get enforced options for ${this.label} for ${eidLabel} and message type ${msgType}: ${error}`
            )
        }
    }

    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        this.logger.verbose(`Setting enforced options to ${printJson(enforcedOptions)}`)

        const transaction = new Transaction()
        const optionsByEidAndMsgType = this.reduceEnforcedOptions(enforcedOptions)
        const emptyOptions = Options.newOptions().toBytes()

        for (const [eid, optionsByMsgType] of optionsByEidAndMsgType) {
            const sendOption = optionsByMsgType.get(MSG_TYPE_SEND) ?? emptyOptions
            const sendAndCallOption = optionsByMsgType.get(MSG_TYPE_SEND_AND_CALL) ?? emptyOptions

            const instruction = await OftTools.createSetEnforcedOptionsIx(
                this.programId, // OFT Program ID
                this.userAccount, // your admin address
                this.publicKey, // your OFT Config
                eid, // destination endpoint id for the options to apply to
                sendOption,
                sendAndCallOption
            )

            transaction.add(instruction)
        }

        return {
            ...(await this.createTransaction(transaction)),
            description: `Setting enforced options to ${printJson(enforcedOptions)}`,
        }
    }

    async isNonceInitialized(eid: EndpointId, peer: OmniAddress): Promise<boolean> {
        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.isOAppNonceInitialized(this.point.address, eid, peer)
    }

    async initializeNonce(eid: EndpointId, peer: OmniAddress): Promise<[OmniTransaction] | []> {
        this.logger.verbose(`Initializing OApp nonce for peer ${peer} on ${formatEid(eid)}`)

        const endpointSdk = await this.getEndpointSDK()
        return endpointSdk.initializeOAppNonce(this.point.address, eid, peer)
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
}

type MsgType = 1 | 2

const MSG_TYPE_SEND = 1 satisfies MsgType
const MSG_TYPE_SEND_AND_CALL = 2 satisfies MsgType

const isMsgType = (value: unknown): value is MsgType => value === MSG_TYPE_SEND || value === MSG_TYPE_SEND_AND_CALL
