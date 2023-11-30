import { Address, OmniTransaction } from '@layerzerolabs/ua-utils'
import { omniContractToPoint, OmniContract, ignoreZero, makeZero } from '@layerzerolabs/utils-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IOApp } from '@layerzerolabs/ua-utils'

export class OApp implements IOApp {
    constructor(public readonly contract: OmniContract) {}

    async peers(eid: EndpointId): Promise<string | undefined> {
        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async setPeer(eid: EndpointId, address: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [eid, makeZero(address)])

        return this.createTransaction(data)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: omniContractToPoint(this.contract),
            data,
        }
    }
}
