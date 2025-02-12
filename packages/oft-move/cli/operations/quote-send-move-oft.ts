import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { quoteSendOFT } from '../../tasks/quoteSendOFT'

class QuoteSendOFT implements INewOperation {
    vm = 'move'
    operation = 'quote-send-move-oft'
    description = 'Call the Quote send method of a move OFT'
    reqArgs = ['amount_ld', 'min_amount_ld', 'to_address', 'gas_limit', 'dst_eid', 'oapp_config']

    async impl(args: any): Promise<void> {
        await quoteSendOFT(
            args.amount_ld,
            args.min_amount_ld,
            args.to_address,
            args.gas_limit,
            args.dst_eid,
            args.oapp_config
        )
    }
}

const NewOperation = new QuoteSendOFT()
export { NewOperation }
