import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { sendFromMoveVm } from '../../tasks/sendFromMoveVm'

class SendFromMoveOFT implements INewOperation {
    vm = 'move'
    operation = 'send-from-move-oft'
    description =
        'Call the send_withdraw method of a move OFT, and send the tokens from the source address to the destination address.'
    reqArgs = ['amount_ld', 'min_amount_ld', 'src_address', 'to_address', 'gas_limit', 'dst_eid']

    addArgs = [
        {
            name: '--src-address',
            arg: {
                help: 'source address',
                required: false,
            },
        },
        {
            name: '--dst-eid',
            arg: {
                help: 'destination endpoint id',
                required: false,
            },
        },
        {
            name: '--gas-limit',
            arg: {
                help: 'gas limit',
                required: false,
            },
        },
        {
            name: '--min-amount-ld',
            arg: {
                help: 'minimum amount to receive',
                required: false,
            },
        },
        {
            name: '--to-address',
            arg: {
                help: 'to address',
                required: false,
            },
        },
        {
            name: '--amount-ld',
            arg: {
                help: 'amount to send',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await sendFromMoveVm(
            BigInt(args.amount_ld),
            BigInt(args.min_amount_ld),
            args.to_address,
            BigInt(args.gas_limit),
            args.dst_eid,
            args.src_address
        )
    }
}

const NewOperation = new SendFromMoveOFT()
export { NewOperation }
