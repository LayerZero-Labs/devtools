import type { IEndpoint } from '@layerzerolabs/utils'
import type { Address, OmniTransaction } from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniContract } from '@/omnigraph/types'
import { ignoreZero, makeZero } from '@/address'
import { omniContractToPoint } from '@/omnigraph/coordinates'

export class Endpoint implements IEndpoint {
    constructor(public readonly contract: OmniContract) {}

    async defaultSendLibrary(eid: EndpointId): Promise<string | undefined> {
        return ignoreZero(await this.contract.contract.defaultSendLibrary(eid))
    }

    async setDefaultSendLibrary(eid: EndpointId, address: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultSendLibrary', [
            eid,
            makeZero(address),
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
