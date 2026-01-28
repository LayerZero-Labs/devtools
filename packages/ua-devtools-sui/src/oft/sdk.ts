import { Transaction } from '@mysten/sui/transactions'
import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import { endpointIdToStage, Stage, type EndpointId } from '@layerzerolabs/lz-definitions'
import {
    areBytes32Equal,
    formatEid,
    fromHex,
    isZero,
    toHex,
    type Bytes,
    type OmniAddress,
    type OmniTransaction,
} from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-sui'
import { EndpointV2, SUI_ENDPOINT_V2_ADDRESSES } from '@layerzerolabs/protocol-devtools-sui'
import { SDK } from '@layerzerolabs/lz-sui-sdk-v2'
import type { OApp, Endpoint } from '@layerzerolabs/lz-sui-sdk-v2'

export class OFT extends OmniSDK implements IOApp {
    private sdk?: SDK
    private oapp?: OApp
    private endpoint?: Endpoint

    async getEndpointSDK(): Promise<EndpointV2> {
        const endpoint = SUI_ENDPOINT_V2_ADDRESSES[this.point.eid]
        if (!endpoint) {
            throw new Error(
                `No Sui EndpointV2 address configured for eid ${this.point.eid} (${formatEid(this.point.eid)})`
            )
        }
        return new EndpointV2(this.client, { eid: this.point.eid, address: endpoint })
    }

    async getOwner(): Promise<OmniAddress | undefined> {
        return this.getDelegate()
    }

    async hasOwner(_address: OmniAddress): Promise<boolean> {
        const owner = await this.getOwner()
        return owner === _address
    }

    async setOwner(_address: OmniAddress): Promise<OmniTransaction> {
        return this.setDelegate(_address)
    }

    async getPeer(_eid: EndpointId): Promise<OmniAddress | undefined> {
        try {
            const peer = await this.getOApp().getPeer(_eid)
            return isZero(peer) ? undefined : toHex(peer)
        } catch (error) {
            if (isMissingSuiPeer(error)) {
                return undefined
            }
            throw error
        }
    }

    async hasPeer(_eid: EndpointId, _address: OmniAddress | null | undefined): Promise<boolean> {
        const peer = await this.getPeer(_eid)
        // Use areBytes32Equal for comparison since getPeer returns 32-byte padded addresses
        // while _address may be a 20-byte EVM address
        return areBytes32Equal(peer, _address)
    }

    async setPeer(_eid: EndpointId, _peer: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const tx = new Transaction()
        // Peer addresses must be 32 bytes (bytes32), so we need to pad shorter addresses to 32 bytes
        let peerBytes: Uint8Array
        if (_peer) {
            const rawBytes = fromHex(_peer)
            if (rawBytes.length === 32) {
                peerBytes = rawBytes
            } else if (rawBytes.length <= 32) {
                // Pad shorter addresses (20-byte EVM, 31-byte Starknet, etc.) to 32 bytes with leading zeros
                peerBytes = new Uint8Array(32)
                peerBytes.set(rawBytes, 32 - rawBytes.length)
            } else {
                throw new Error(`Invalid peer address length: ${rawBytes.length}. Expected 32 bytes or less.`)
            }
        } else {
            peerBytes = new Uint8Array(32)
        }
        await this.getOApp().setPeerMoveCall(tx, _eid, peerBytes)
        return this.createTransaction(tx)
    }

    async getDelegate(): Promise<OmniAddress | undefined> {
        try {
            return this.getEndpoint().getDelegate(this.point.address)
        } catch (error) {
            if (isMissingSuiPeer(error)) {
                return undefined
            }
            throw error
        }
    }

    async isDelegate(_address: OmniAddress): Promise<boolean> {
        const delegate = await this.getDelegate()
        return delegate === _address
    }

    async setDelegate(_address: OmniAddress): Promise<OmniTransaction> {
        const tx = new Transaction()
        await this.getOApp().setDelegateMoveCall(tx, _address)
        return this.createTransaction(tx)
    }

    async getEnforcedOptions(_eid: EndpointId, _msgType: number): Promise<Bytes> {
        try {
            const options = await this.getOApp().getEnforcedOptions(_eid, _msgType)
            return toHex(options)
        } catch (error) {
            if (isMissingSuiPeer(error)) {
                return '0x'
            }
            throw error
        }
    }

    async setEnforcedOptions(_enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        const tx = new Transaction()
        for (const { eid, option } of _enforcedOptions) {
            await this.getOApp().setEnforcedOptionsMoveCall(tx, eid, option.msgType, fromHex(option.options))
        }
        return this.createTransaction(tx)
    }

    async getCallerBpsCap(): Promise<bigint | undefined> {
        return this.notImplemented('getCallerBpsCap')
    }

    async setCallerBpsCap(_callerBpsCap: bigint): Promise<OmniTransaction | undefined> {
        return this.notImplemented('setCallerBpsCap')
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Sui OFT SDK`)
    }

    private getSdk(): SDK {
        if (!this.sdk) {
            const stage = endpointIdToStage(this.point.eid) as Stage
            this.sdk = new SDK({ client: this.client, stage })
        }
        return this.sdk
    }

    private getOApp(): OApp {
        if (!this.oapp) {
            this.oapp = this.getSdk().getOApp(this.point.address)
        }
        return this.oapp
    }

    private getEndpoint(): Endpoint {
        if (!this.endpoint) {
            this.endpoint = this.getSdk().getEndpoint()
        }
        return this.endpoint
    }
}

const isMissingSuiPeer = (error: unknown): boolean => {
    const message =
        typeof error === 'string'
            ? error.toLowerCase()
            : error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: unknown }).message).toLowerCase()
              : ''
    if (!message) {
        return false
    }
    return (
        message.includes('missing transaction sender') ||
        (message.includes('move abort') &&
            // Check for peer/enforced_options patterns in the error message
            // The error format is: oapp_peer") ... function_name: Some("get_peer")
            (message.includes('oapp_peer') || message.includes('enforced_options')))
    )
}
