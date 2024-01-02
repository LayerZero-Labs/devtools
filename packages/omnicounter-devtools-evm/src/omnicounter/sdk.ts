import { IOmniCounter } from '@layerzerolabs/omnicounter-devtools'
import { EndpointFactory } from '@layerzerolabs/protocol-devtools'
import { OApp } from '@layerzerolabs/ua-devtools-evm'
import { OmniTransaction } from '@layerzerolabs/devtools'
import { OmniContract } from '@layerzerolabs/devtools-evm'

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
