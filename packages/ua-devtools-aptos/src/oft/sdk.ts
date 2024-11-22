import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import {
    type OmniTransaction,
    type OmniPoint,
    formatEid,
    mapError,
    OmniAddress,
    denormalizePeer,
    normalizePeer,
    areBytes32Equal,
} from '@layerzerolabs/devtools'
import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
import { Ed25519Account } from '@aptos-labs/ts-sdk'
import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'
import { OmniSDK } from '@layerzerolabs/devtools-aptos'

// SDK for Initia FA based OFT
// This sdk never knows the signer.
// It gets the transaction payload from the monorepo sdk and then passes that to the user to sign with the signer.
export class OFT extends OmniSDK implements IOApp {
    public readonly sdk: AptosSDK
    public readonly oft: Oft<Ed25519Account>

    constructor(sdk: AptosSDK, point: OmniPoint) {
        super(sdk.getAptosClient(), point)
        this.sdk = sdk
        this.oft = new Oft(this.sdk, false)
    }

    async isInitialized(): Promise<boolean> {
        return this.oft.isInitialized()
    }

    async getOwner(): Promise<string | undefined> {
        const owner = await this.oft.getAdmin()
        return owner
    }

    async setOwner(newOwner: string): Promise<OmniTransaction> {
        console.log('newOwner:', newOwner)
        throw new Error('Not implemented')
    }

    async hasOwner(): Promise<boolean> {
        const owner = await this.getOwner()
        return owner !== undefined
    }

    async getEndpointSDK(): Promise<IEndpointV2> {
        // TODO: implement
        throw new Error('Not implemented')
    }

    async getPeer(eid: EndpointId): Promise<OmniAddress | undefined> {
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting peer for ${eidLabel}`)
        const peer = await mapError(
            () => this.oft.getPeer(eid),
            (error) => new Error(`Failed to get peer for ${eidLabel}: ${error}`)
        )

        // We run the hex string we got through a normalization/denormalization process
        // that will ensure that zero addresses will get stripped
        // and any network-specific logic will be applied
        return denormalizePeer(normalizePeer(peer, this.point.eid), eid)
    }

    async hasPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean> {
        const peer = await this.getPeer(eid)

        return areBytes32Equal(normalizePeer(peer, eid), normalizePeer(address, eid))
    }

    private encodeAddress(address: string | null | undefined): Uint8Array {
        const bytes = address ? Buffer.from(address.replace('0x', ''), 'hex') : new Uint8Array(0)
        const bytes32 = new Uint8Array(32)
        bytes32.set(bytes, 32 - bytes.length)
        return bytes32
    }

    async setPeer(eid: number, peer: string | null | undefined): Promise<OmniTransaction> {
        const encodedPeer = this.encodeAddress(peer)
        const payload = await this.oft.setPeerPayload(eid, encodedPeer)
        const sender = this.sdk.accounts.oft ?? ''

        const omniTransaction: OmniTransaction = {
            point: this.point,
            data: await this.serializeTransactionData(sender, payload),
        }

        return omniTransaction
    }

    async getDelegate(): Promise<string | undefined> {
        this.logger.debug(`Getting delegate`)

        const delegate = await mapError(
            () => this.oft.getDelegate(),
            (error) => new Error(`Failed to get delegate: ${error}`)
        )
        return this.logger.debug(delegate ? `Got delegate ${delegate}` : `OApp has no delegate`), delegate
    }

    async isDelegate(delegate: OmniAddress): Promise<boolean> {
        return delegate.toLowerCase() === (await this.getDelegate())?.toLowerCase()
    }

    async setDelegate(delegate: OmniAddress): Promise<OmniTransaction> {
        const description = `Setting delegate to ${delegate}`
        this.logger.debug(description)

        const payload = this.oft.setDelegatePayload(delegate)
        const sender = this.sdk.accounts.oft ?? ''
        const omniTransaction: OmniTransaction = {
            point: this.point,
            data: await this.serializeTransactionData(sender, payload),
            description: description,
        }

        return omniTransaction
    }

    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<string> {
        const enforcedOptions = await this.oft.getEnforcedOptions(eid, msgType)
        return enforcedOptions
    }

    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        if (enforcedOptions === undefined) {
            throw new Error('Enforced options are undefined')
        }
        // Replace with actual implementation
        throw new Error('Not implemented')
    }

    async getCallerBpsCap(): Promise<bigint | undefined> {
        return undefined
    }

    async setCallerBpsCap(): Promise<OmniTransaction> {
        // Replace with actual implementation
        throw new Error('Not implemented')
    }
}
