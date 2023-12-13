import { IOmniCounter } from '@layerzerolabs/omnicounter-utils'
import { EndpointFactory } from '@layerzerolabs/protocol-utils'
import { OApp } from '@layerzerolabs/ua-utils-evm'
import { OmniTransaction } from '@layerzerolabs/utils'
import { OmniContract } from '@layerzerolabs/utils-evm'

export class OmniCounter extends OApp implements IOmniCounter {
    public constructor(
        public override contract: OmniContract,
        protected override endpointFactory: EndpointFactory
    ) {
        super(contract, endpointFactory)
    }

    public async increment(eid: number, type: number, options: string): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('increment', [eid, type, options])
        return super.createTransaction(data)
    }
}
