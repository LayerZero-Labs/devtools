import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { setRateLimit } from '../../tasks/setRateLimit'
import { OFTType, initializeTaskContext } from '@layerzerolabs/devtools-move'

class AdapterSetRateLimit implements INewOperation {
    vm = 'move'
    operation = 'adapter-set-rate-limit'
    description = `
Set the rate limit configuration for a given endpoint ID
The rate limit is the maximum amount of OFT that can be sent to the endpoint within a given window
The rate limit capacity recovers linearly at a rate of limit / window_seconds
*Important*: Setting the rate limit does not reset the current "in-flight" volume (in-flight refers to the decayed rate limit consumption). 
This means that if the rate limit is set lower than the current in-flight volume, 
the endpoint will not be able to receive OFT until the in-flight volume decays below the new rate limit.
In order to reset the in-flight volume, the rate limit must be unset and then set again.`

    reqArgs = ['rate_limit', 'window_seconds', 'to_eid', 'oapp_config']

    addArgs = [
        {
            name: '--window-seconds',
            arg: {
                help: 'window seconds',
                required: false,
            },
        },
        {
            name: '--rate-limit',
            arg: {
                help: 'rate limit in',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await setRateLimit(
            taskContext,
            BigInt(args.rate_limit),
            BigInt(args.window_seconds),
            args.to_eid,
            OFTType.OFT_ADAPTER_FA
        )
    }
}

const NewOperation = new AdapterSetRateLimit()
export { NewOperation }
