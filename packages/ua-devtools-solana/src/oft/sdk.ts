import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import { OftTools, OFT_SEED } from '@layerzerolabs/lz-solana-sdk-v2'
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
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
import { Logger, printJson } from '@layerzerolabs/io-devtools'
import { mapError, AsyncRetriable } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-solana'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'

export class OFT extends OmniSDK implements IOApp {
    constructor(
        connection: Connection,
        point: OmniPoint,
        userAccount: PublicKey,
        public readonly mintAccount: PublicKey,
        logger?: Logger
    ) {
        super(connection, point, userAccount, logger)
    }

    getOwner(): Promise<OmniAddress | undefined> {
        throw new Error('Method not implemented.')
    }

    hasOwner(): Promise<boolean> {
        throw new Error('Method not implemented.')
    }

    setOwner(): Promise<OmniTransaction> {
        throw new Error('Method not implemented.')
    }

    get configAccount(): PublicKey {
        return PublicKey.findProgramAddressSync([Buffer.from(OFT_SEED), this.mintAccount.toBuffer()], this.publicKey)[0]
    }

    @AsyncRetriable()
    async getEndpointSDK(): Promise<IEndpointV2> {
        this.logger.debug(`Getting EndpointV2 SDK`)

        throw new TypeError(`getEndpointSDK() not implemented on Solana OFT SDK`)
    }

    @AsyncRetriable()
    async getPeer(eid: EndpointId): Promise<OmniAddress | undefined> {
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting peer for ${eidLabel}`)
        try {
            const peer = await OftTools.getPeerAddress(this.connection, this.configAccount, eid, this.publicKey)

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
                new Error(`Failed to convert peer ${address} for ${eidLabel} for OApp ${this.label} to bytes: ${error}`)
        )
        const peerAsBytes32 = makeBytes32(normalizedPeer)

        this.logger.debug(`Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32}`)

        const transaction = new Transaction().add(
            await OftTools.createSetPeerIx(this.userAccount, this.configAccount, eid, normalizedPeer, this.publicKey)
        )

        return {
            ...(await this.createTransaction(transaction)),
            description: `Setting peer for eid ${eid} (${eidLabel}) to address ${peerAsBytes32}`,
        }
    }

    @AsyncRetriable()
    async getDelegate(): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate`)

        throw new TypeError(`getDelegate() not implemented on Solana OFT SDK`)
    }

    @AsyncRetriable()
    async isDelegate(delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate`)

        throw new TypeError(`isDelegate() not implemented on Solana OFT SDK`)
    }

    async setDelegate(delegate: OmniAddress): Promise<OmniTransaction> {
        this.logger.debug(`Setting delegate to ${delegate}`)

        throw new TypeError(`setDelegate() not implemented on Solana OFT SDK`)
    }

    @AsyncRetriable()
    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes> {
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting enforced options for ${eidLabel} and message type ${msgType}`)

        throw new TypeError(`getEnforcedOptions() not implemented on Solana OFT SDK`)
    }

    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting enforced options to ${printJson(enforcedOptions)}`)

        throw new TypeError(`setEnforcedOptions() not implemented on Solana OFT SDK`)
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
