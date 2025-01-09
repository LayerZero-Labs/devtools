import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { setFee } from '../../tasks/setFee'

class SetFee implements INewOperation {
    vm = 'move'
    operation = 'set-fee'
    description = 'Set the fee BPS for an OFT'
    reqArgs = ['fee_bps', 'to_eid']

    addArgs = [
        {
            name: '--to-eid',
            arg: {
                help: 'destination endpoint id',
                required: false,
            },
        },
        {
            name: '--fee-bps',
            arg: {
                help: 'fee BPS',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await setFee(BigInt(args.fee_bps), args.to_eid)
    }
}

const NewOperation = new SetFee()
export { NewOperation }
