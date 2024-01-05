import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IncrementOutput, IncrementType, IOmniCounter } from '@layerzerolabs/omnicounter-devtools'
import { EndpointFactory } from '@layerzerolabs/protocol-devtools'
import { OApp } from '@layerzerolabs/ua-devtools-evm'
import { Address } from '@layerzerolabs/devtools'
import { makeBytes32, OmniContract } from '@layerzerolabs/devtools-evm'

export class OmniCounter extends OApp implements IOmniCounter {
    public constructor(
        public override contract: OmniContract,
        protected override endpointFactory: EndpointFactory
    ) {
        super(contract, endpointFactory)
    }

    public async increment(
        eid: EndpointId,
        type: IncrementType,
        options: Uint8Array,
        receiver: Address
    ): Promise<IncrementOutput> {
        const data = this.contract.contract.interface.encodeFunctionData('increment', [eid, type, options])
        const endpointSdk = await super.getEndpointSDK()
        const messagingFee = await endpointSdk.quote(
            { dstEid: eid, options, message: data, receiver: makeBytes32(receiver), payInLzToken: false },
            this.contract.contract.address
        )
        const gasLimit = (await this.contract.contract.estimateGas.increment!(eid, type, options)).toBigInt()

        return {
            omniTransaction: super.createTransaction(data),
            messagingFee,
            gasLimit,
        }
    }
}
