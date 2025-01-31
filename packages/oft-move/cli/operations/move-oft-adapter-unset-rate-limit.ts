import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { unsetRateLimit } from '../../tasks/unSetRateLimit'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class AdapterUnsetRateLimit implements INewOperation {
    vm = 'move'
    operation = 'adapter-unset-rate-limit'
    description = 'Unset the rate limit configuration for a given endpoint ID'
    reqArgs = ['to_eid', 'oapp_config']

    async impl(args: any): Promise<void> {
        await unsetRateLimit(args.to_eid, OFTType.OFT_ADAPTER_FA, args.oapp_config)
    }
}

const NewOperation = new AdapterUnsetRateLimit()
export { NewOperation }
