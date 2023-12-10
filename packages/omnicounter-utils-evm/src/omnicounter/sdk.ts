import { IOmniCounterApp } from '@layerzerolabs/omnicounter-utils'
import { OApp } from '@layerzerolabs/ua-utils-evm'
import { OmniTransaction } from '@layerzerolabs/utils'

export class OmniCounterApp extends OApp implements IOmniCounterApp {
    public async increment(eid: number, type: number, options: string): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('increment', [eid, type, options])
        return super.createTransaction(data)
    }
}
