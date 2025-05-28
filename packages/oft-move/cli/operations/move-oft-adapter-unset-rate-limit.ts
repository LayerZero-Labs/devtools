import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { unsetRateLimit } from '../../tasks/unSetRateLimit'
import { OFTType, initializeTaskContext } from '@layerzerolabs/devtools-move'

class AdapterUnsetRateLimit implements INewOperation {
    vm = 'move'
    operation = 'adapter-unset-rate-limit'
    description = 'Unset the rate limit configuration for a given endpoint ID'
    reqArgs = ['to_eid', 'oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await unsetRateLimit(taskContext, args.to_eid, OFTType.OFT_ADAPTER_FA)
    }
}

const NewOperation = new AdapterUnsetRateLimit()
export { NewOperation }
