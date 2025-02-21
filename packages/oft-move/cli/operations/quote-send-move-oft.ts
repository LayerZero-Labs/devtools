import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'

import { quoteSendOFT } from '../../tasks/quoteSendOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

class QuoteSendOFT implements INewOperation {
    vm = 'move'
    operation = 'quote-send-move-oft'
    description = 'Call the Quote send method of a move OFT'
    reqArgs = ['amount_ld', 'min_amount_ld', 'to_address', 'gas_limit', 'dst_eid', 'src_address', 'oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await quoteSendOFT(
            taskContext,
            args.amount_ld,
            args.min_amount_ld,
            args.to_address,
            args.gas_limit,
            args.dst_eid,
            args.src_address
        )
    }
}

const NewOperation = new QuoteSendOFT()
export { NewOperation }
