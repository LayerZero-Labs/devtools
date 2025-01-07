import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { quoteSendOFTFA } from '../../tasks/quoteSendOFTFA'

class QuoteSendOFTFA implements INewOperation {
    vm = 'move'
    operation = 'quoteSend'
    description = 'Quote send an OFT with FA'
    reqArgs = ['amount_ld', 'min_amount_ld', 'to_address', 'gas_limit', 'dst_eid']

    addArgs = [
        {
            name: '--dst-eid',
            arg: {
                help: 'destination endpoint id',
                required: true,
            },
        },
        {
            name: '--gas-limit',
            arg: {
                help: 'gas limit',
                required: true,
            },
        },
        {
            name: '--min-amount-ld',
            arg: {
                help: 'minimum amount to receive',
                required: true,
            },
        },
        {
            name: '--to-address',
            arg: {
                help: 'to address',
                required: true,
            },
        },
        {
            name: '--amount-ld',
            arg: {
                help: 'amount to send',
                required: true,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await quoteSendOFTFA(args.amount_ld, args.min_amount_ld, args.to_address, args.gas_limit, args.dst_eid)
    }
}

const NewOperation = new QuoteSendOFTFA()
export { NewOperation }
