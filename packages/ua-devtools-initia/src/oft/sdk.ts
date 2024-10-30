// import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
// import { Stage } from '@layerzerolabs/lz-definitions'

// // your oft contract address.
// const address = '0x123'
// const url = 'https://rpc.initiation-1.initia.xyz/'
// // url is the initia chain full node url
// const sdk = new InitiaSDK({
//     stage: Stage.SANDBOX,
//     provider: InitiaProvider.from(url),
//     accounts: {
//         oft: address,
//     },
// })
// // false means native type, true is adapter type.
// export const oft = new Oft(sdk, false)

import { SDK as InitiaSDK } from '@layerzerolabs/lz-initia-sdk-v2'
import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import {
    // type OmniAddress,
    type OmniTransaction,
    type OmniPoint,
    // AsyncRetriable,
} from '@layerzerolabs/devtools'
import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
import { InitiaProvider } from '@layerzerolabs/lz-corekit-initia'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'
// import { TransactionResponse } from '@layerzerolabs/move-definitions'
// import { TransactionResponse } from '@layerzerlabs/move-suite'
import type { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
// import { Endpoint as EndpointV2 } from '@layerzerolabs/lz-movevm-sdk-v2'
import { MnemonicKey } from '@initia/initia.js'

// SDK for Initia FA based OFT
export class OFT implements IOApp {
    public readonly sdk: InitiaSDK
    public readonly point: OmniPoint
    public readonly oft: Oft<MnemonicKey>
    private readonly mnemonic: string

    constructor(address: string, url: string, mnemonic: string) {
        this.sdk = new InitiaSDK({
            stage: Stage.TESTNET,
            provider: InitiaProvider.from(url),
            accounts: {
                oft: address,
                endpoint: '0x55c9aa355f26e5f311af070ca7da9990d01fb7db',
            },
        })
        this.mnemonic = mnemonic
        this.oft = new Oft(this.sdk, false)
        this.point = {
            eid: 40326 as EndpointId,
            address: address,
        }
    }

    async isInitialized(): Promise<boolean> {
        return this.oft.isInitialized()
    }

    async getOwner(): Promise<string | undefined> {
        console.log(`Getting owner`)
        this.sdk.accounts

        return undefined
    }

    async setOwner(newOwner: string): Promise<OmniTransaction> {
        const owner = newOwner
        return owner as unknown as OmniTransaction
    }

    async hasOwner(): Promise<boolean> {
        const owner = await this.getOwner()
        return owner !== undefined
    }

    async getEndpointSDK(): Promise<IEndpointV2> {
        // Replace with actual implementation
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

    async setPeer(eid: EndpointId, peer: string | null | undefined): Promise<OmniTransaction> {
        const signer = new MnemonicKey({ mnemonic: this.mnemonic })
        const encodedPeer = peer ? new TextEncoder().encode(peer) : new Uint8Array(0)
        console.log('encodedPeer:', encodedPeer)
        const response = await this.oft.setPeer(signer, eid, encodedPeer)

        const omniTransaction: OmniTransaction = {
            point: this.point,
            data: response.hash,
        }
        return omniTransaction
    }

    async getDelegate(): Promise<string | undefined> {
        return undefined
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
        if (eid === undefined) {
            throw new Error('Endpoint ID is undefined')
        }
        if (msgType === undefined) {
            throw new Error('Message type is undefined')
        }
        // Replace with actual implementation
        throw new Error('Not implemented')
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
