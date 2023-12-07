import type { IOApp } from '@layerzerolabs/ua-utils'
import type { Address, OmniTransaction } from '@layerzerolabs/utils'
import { omniContractToPoint, OmniContract, ignoreZero, makeZeroAddress, makeBytes32 } from '@layerzerolabs/utils-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export class OApp implements IOApp {
    constructor(public readonly contract: OmniContract) {}

    async peers(eid: EndpointId): Promise<string | undefined> {
        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async setPeer(eid: EndpointId, address: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [
            eid,
            makeBytes32(makeZeroAddress(address)),
        ])

        return this.createTransaction(data)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: omniContractToPoint(this.contract),
            data,
        }
    }
}
