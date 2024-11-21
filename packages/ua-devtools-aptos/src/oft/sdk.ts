import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import {
    // type OmniAddress,
    type OmniTransaction,
    type OmniPoint,
    // AsyncRetriable,
} from '@layerzerolabs/devtools'
import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
import { EndpointId } from '@layerzerolabs/lz-definitions'
// import { InputEntryFunctionData } from '@layerzerolabs/move-definitions'
// import { TransactionResponse } from '@layerzerlabs/move-suite'
import type { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
// import { Endpoint as EndpointV2 } from '@layerzerolabs/lz-movevm-sdk-v2'
import { Ed25519Account } from '@aptos-labs/ts-sdk'
import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'
import { OmniSDK } from '../../../devtools-aptos/src/omnigraph/sdk'

// SDK for Initia FA based OFT
// This sdk never knows the signer.
// It gets the transaction payload from the monorepo sdk and then passes that to the user to sign with the signer.
export class OFT extends OmniSDK implements IOApp {
    public readonly sdk: AptosSDK
    public readonly point: OmniPoint
    public readonly oft: Oft<Ed25519Account>

    constructor(sdk: AptosSDK, point: OmniPoint) {
        super(sdk, point)
        this.point = point
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

    async getPeer(eid: EndpointId): Promise<string | undefined> {
        return this.oft.getPeer(eid)
    }

    async hasPeer(eid: EndpointId): Promise<boolean> {
        return this.oft.hasPeer(eid)
    }

    // interface OmniTransaction {
    //     point: OmniPoint;
    //     data: string;
    //     description?: string;
    //     gasLimit?: string | bigint | number;
    //     value?: string | bigint | number;
    // }
    // interface TransactionResponse {
    //     hash: string;
    //     sender: string;
    //     raw: unknown;
    // }

    async setPeer(eid: number, peer: string | null | undefined): Promise<OmniTransaction> {
        const encodedPeer = peer ? new TextEncoder().encode(peer) : new Uint8Array(0)
        console.log('encodedPeer:', encodedPeer)

        const result = await this.oft.setPeerPayload(eid, encodedPeer)

        const omniTransaction: OmniTransaction = {
            point: this.point,
            data: result,
        }

        return omniTransaction
    }

    async getDelegate(): Promise<string | undefined> {
        const delegate = await this.oft.getDelegate()
        return delegate
    }

    async isDelegate(address: string): Promise<boolean> {
        return address !== undefined
    }

    async setDelegate(address: string): Promise<OmniTransaction> {
        // Replace with actual implementation
        if (address === undefined) {
            throw new Error('Address is undefined')
        }
        return address as unknown as OmniTransaction
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
