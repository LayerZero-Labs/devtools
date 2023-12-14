import type { IOApp } from '@layerzerolabs/ua-utils'
import type { Bytes32, Address, OmniTransaction } from '@layerzerolabs/utils'
import {
    type OmniContract,
    ignoreZero,
    makeBytes32,
    areBytes32Equal,
    isZero,
    formatOmniContract,
} from '@layerzerolabs/utils-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { EndpointFactory, IEndpoint } from '@layerzerolabs/protocol-utils'
import { OmniSDK } from '@layerzerolabs/utils-evm'

export class OApp extends OmniSDK implements IOApp {
    constructor(
        contract: OmniContract,
        protected readonly endpointFactory: EndpointFactory
    ) {
        super(contract)
    }

    async callEndpoint(callData: string): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('callEndpoint', [callData])
        return this.createTransaction(data)
    }

    async getEndpointSDK(): Promise<IEndpoint> {
        let address: string

        // First we'll need the endpoint address from the contract
        try {
            address = await this.contract.contract.endpoint()
        } catch (error) {
            // We'll just wrap the error in some nice words
            throw new Error(`Failed to get endpoint address for OApp ${formatOmniContract(this.contract)}: ${error}`)
        }

        // We'll also do an additional check to see whether the endpoint has been set to a non-zero address
        if (isZero(address)) {
            throw new Error(
                `Endpoint cannot be instantiated: Endpoint address has been set to a zero value for OApp ${formatOmniContract(
                    this.contract
                )}`
            )
        }

        return await this.endpointFactory({ address, eid: this.contract.eid })
    }

    async getPeer(eid: EndpointId): Promise<Bytes32 | undefined> {
        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean> {
        return areBytes32Equal(await this.getPeer(eid), address)
    }

    async setPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [eid, makeBytes32(address)])
        return this.createTransaction(data)
    }
}
