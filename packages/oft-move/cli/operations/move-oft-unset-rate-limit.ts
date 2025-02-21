import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'

import { unsetRateLimit } from '../../tasks/unSetRateLimit'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

class SetFee implements INewOperation {
    vm = 'move'
    operation = 'unset-rate-limit'
    description = 'Unset the rate limit configuration for a given endpoint ID'
    reqArgs = ['to_eid', 'oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await unsetRateLimit(taskContext, args.to_eid, OFTType.OFT_FA)
    }
}

const NewOperation = new SetFee()
export { NewOperation }
