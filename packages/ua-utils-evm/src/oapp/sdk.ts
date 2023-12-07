import type { IOApp } from '@layerzerolabs/ua-utils'
import type { Bytes32, Address, OmniTransaction } from '@layerzerolabs/utils'
import { omniContractToPoint, OmniContract, ignoreZero, makeBytes32, areBytes32Equal } from '@layerzerolabs/utils-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export class OApp implements IOApp {
    constructor(public readonly contract: OmniContract) {}

    async peers(eid: EndpointId): Promise<Bytes32 | undefined> {
        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean> {
        return areBytes32Equal(await this.peers(eid), address)
    }

    async setPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [eid, makeBytes32(address)])

        return this.createTransaction(data)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: omniContractToPoint(this.contract),
            data,
        }
    }
}
