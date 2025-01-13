import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { unsetRateLimit } from '../../tasks/unsetRateLimit'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class AdapterUnsetRateLimit implements INewOperation {
    vm = 'move'
    operation = 'adapter-unset-rate-limit'
    description = 'Unset the rate limit configuration for a given endpoint ID'
    reqArgs = ['to_eid']

    async impl(args: any): Promise<void> {
        await unsetRateLimit(args.to_eid, OFTType.OFT_ADAPTER_FA)
    }
}

const NewOperation = new AdapterUnsetRateLimit()
export { NewOperation }
