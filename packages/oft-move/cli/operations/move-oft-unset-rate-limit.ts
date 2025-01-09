import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { unsetRateLimit } from '../../tasks/unsetRateLimit'

class SetFee implements INewOperation {
    vm = 'move'
    operation = 'unset-rate-limit'
    description = 'Unset the rate limit configuration for a given endpoint ID'
    reqArgs = ['to_eid']

    async impl(args: any): Promise<void> {
        await unsetRateLimit(args.to_eid)
    }
}

const NewOperation = new SetFee()
export { NewOperation }
